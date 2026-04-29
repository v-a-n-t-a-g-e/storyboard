/** @typedef {{ duration: number, vh: number, continuous: boolean }} Transition */
/** @typedef {{ objects?: Record<string, boolean>, projections?: Record<string, boolean> }} VisibilityOverrides */
/** @typedef {{ id: string, camera: { position: [number, number, number], target: [number, number, number], fov: number }, transition: Transition, title: string, description: string, visibility?: VisibilityOverrides, projectionRef?: string | null }} Slide */
/** @typedef {{ id: string, name: string, slides: Slide[], lastModified?: string }} StoryboardData */

import { SvelteDate } from 'svelte/reactivity'

const STORE_PATH = 'storyboards.json'

let all = $state(/** @type {StoryboardData[]} */ ([]))
let current = $state(/** @type {StoryboardData|null} */ (null))
let currentId = $state(/** @type {string|null} */ (null))
let loading = $state(false)
let dirty = $state(false)

export const storyboard = {
  get all() {
    return all
  },
  get current() {
    return current
  },
  get currentId() {
    return currentId
  },
  get loading() {
    return loading
  },
  get dirty() {
    return dirty
  },

  /** Load all storyboards from storyboards.json, migrating from old format if needed. */
  async loadAll(handle) {
    loading = true
    dirty = false
    try {
      try {
        const file = await handle.fs.readFile(STORE_PATH)
        const data = JSON.parse(await file.text())
        all = (data.storyboards ?? []).map(migrateBoard)
      } catch {
        // Try migrating from old per-file format
        all = await migrateFromOldFormat(handle)
      }
    } finally {
      loading = false
    }
  },

  /** Return the id of the most recently modified storyboard, or null. */
  latestId() {
    if (all.length === 0) return null
    return all.reduce((a, b) => ((a.lastModified ?? '') >= (b.lastModified ?? '') ? a : b)).id
  },

  /** Create a new storyboard and open it. */
  async createBoard(handle, name) {
    dirty = false
    /** @type {StoryboardData} */
    const board = {
      id: crypto.randomUUID(),
      name,
      slides: [],
      lastModified: new SvelteDate().toISOString(),
    }
    all = [...all, board]
    current = board
    currentId = board.id
    dirty = true
  },

  /** Open a storyboard by id (sync — data already loaded). */
  openBoard(id) {
    syncCurrentToAll()
    const board = all.find((b) => b.id === id)
    if (!board) return
    current = board
    currentId = id
  },

  /** Duplicate a storyboard and open the copy. */
  async duplicateBoard(handle, id) {
    const source = all.find((b) => b.id === id)
    if (!source) return
    dirty = false
    /** @type {StoryboardData} */
    const board = {
      id: crypto.randomUUID(),
      name: `${source.name} Copy`,
      slides: source.slides.map((s) => ({ ...s, id: crypto.randomUUID() })),
      lastModified: new SvelteDate().toISOString(),
    }
    all = [...all, board]
    current = board
    currentId = board.id
    dirty = true
  },

  /** Delete a storyboard by id. */
  async deleteBoard(handle, id) {
    all = all.filter((b) => b.id !== id)
    if (currentId === id) {
      current = null
      currentId = null
    }
    // await writeAll(handle)
    dirty = true
  },

  /** Rename a storyboard. */
  async renameBoard(handle, id, name) {
    all = all.map((b) => (b.id === id ? { ...b, name } : b))
    if (currentId === id) current = { ...current, name }
    // await writeAll(handle)
    dirty = true
  },

  /**
   * Sync current → all (updating lastModified) and write storyboards.json.
   * Also call project.save() separately if needed.
   */
  async save(handle) {
    if (current && currentId) {
      const now = new SvelteDate().toISOString()
      current = { ...current, lastModified: now }
    }
    syncCurrentToAll()
    await writeAll(handle)
    dirty = false
  },

  /**
   * Insert a new slide after `afterIndex` (-1 to prepend). `payload` may be either a
   * camera object (legacy) or a partial slide `{ camera, visibility?, projectionRef? }`.
   * Returns the new slide.
   */
  insertSlide(afterIndex, payload) {
    const patch = payload && 'camera' in payload ? payload : { camera: payload }
    /** @type {Slide} */
    const slide = {
      id: crypto.randomUUID(),
      camera: patch.camera,
      transition: { duration: 1, vh: 30, continuous: false },
      title: '',
      description: '',
      ...(patch.visibility ? { visibility: patch.visibility } : {}),
      ...(patch.projectionRef ? { projectionRef: patch.projectionRef } : {}),
    }
    const slides = [...current.slides]
    slides.splice(afterIndex + 1, 0, slide)
    current = { ...current, slides }
    dirty = true
    return slide
  },

  /** Duplicate the slide at `index`, inserting the copy immediately after it. Returns the new slide id. */
  duplicateSlide(index) {
    const source = current.slides[index]
    const copy = { ...source, id: crypto.randomUUID() }
    const slides = [...current.slides]
    slides.splice(index + 1, 0, copy)
    current = { ...current, slides }
    dirty = true
    return copy.id
  },

  /** Delete the slide at `index`. */
  deleteSlide(index) {
    const slides = current.slides.filter((_, i) => i !== index)
    current = { ...current, slides }
    dirty = true
  },

  /** Update the transition of the slide at `index`. */
  updateTransition(index, transition) {
    const slides = current.slides.map((s, i) => (i === index ? { ...s, transition } : s))
    current = { ...current, slides }
    dirty = true
  },

  /**
   * Update the slide at `index`. `payload` may be a camera object (legacy) or a
   * partial slide `{ camera?, visibility?, projectionRef? }`. `projectionRef: null`
   * clears the link.
   */
  updateSlide(index, payload) {
    const patch = payload && 'camera' in payload ? payload : { camera: payload }
    const slides = current.slides.map((s, i) => {
      if (i !== index) return s
      const next = { ...s }
      if (patch.camera) next.camera = patch.camera
      if (patch.visibility !== undefined) next.visibility = patch.visibility
      if (patch.projectionRef !== undefined) next.projectionRef = patch.projectionRef
      return next
    })
    current = { ...current, slides }
    dirty = true
  },

  /**
   * Move the slide at `fromIndex` to insertion position `insertAt` (0–N).
   * Resets `continuous` easing on the new first slide if needed.
   */
  reorderSlides(fromIndex, insertAt) {
    const slides = [...current.slides]
    const [removed] = slides.splice(fromIndex, 1)
    const adjusted = insertAt > fromIndex ? insertAt - 1 : insertAt
    slides.splice(adjusted, 0, removed)
    // First slide can't be a waypoint
    if (slides[0].transition?.continuous) {
      slides[0] = { ...slides[0], transition: { ...slides[0].transition, continuous: false } }
    }
    current = { ...current, slides }
    dirty = true
  },

  /** Reset all state (when closing a project). */
  reset() {
    all = []
    current = null
    currentId = null
    loading = false
    dirty = false
  },
}

/** Sync current board state into all (in-memory only, no disk write). */
function syncCurrentToAll() {
  if (current && currentId) {
    all = all.map((b) => (b.id === currentId ? { ...b, ...current } : b))
  }
}

/** Write the full storyboards array to storyboards.json. */
async function writeAll(handle) {
  await handle.fs.writeFile(STORE_PATH, JSON.stringify({ storyboards: all }, null, 2))
}

/** Migrate a board's slide transitions from the old easing-string format to the new boolean format. */
function migrateBoard(board) {
  return {
    ...board,
    slides: board.slides.map((s) => {
      if (!s.transition || typeof s.transition.continuous === 'boolean') return s
      const { easing, ...rest } = s.transition
      return { ...s, transition: { ...rest, continuous: easing === 'continuous' } }
    }),
  }
}

/** Attempt to migrate from the old per-file format. Returns [] if not found. */
async function migrateFromOldFormat(handle) {
  try {
    const indexFile = await handle.fs.readFile('storyboards/_index.json')
    const entries = JSON.parse(await indexFile.text())
    const boards = []
    for (const entry of entries) {
      try {
        const file = await handle.fs.readFile(`storyboards/${entry.filename}`)
        const data = JSON.parse(await file.text())
        boards.push({
          id: crypto.randomUUID(),
          name: data.name ?? entry.name,
          slides: data.slides ?? [],
          lastModified: new Date().toISOString(),
        })
      } catch {
        // skip unreadable files
      }
    }
    return boards
  } catch {
    return []
  }
}
