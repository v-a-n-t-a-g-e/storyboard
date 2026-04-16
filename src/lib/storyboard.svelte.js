/** @typedef {'ease-in-out'|'ease-in'|'ease-out'|'linear'|'continuous'} Easing */
/** @typedef {{ duration: number, easing: Easing }} Transition */
/** @typedef {{ id: string, camera: { position: [number, number, number], target: [number, number, number], fov: number }, transition: Transition, title: string, description: string }} Slide */
/** @typedef {{ id: string, name: string, slides: Slide[], lastModified?: string }} StoryboardData */

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
				all = data.storyboards ?? []
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
		return all.reduce((a, b) =>
			(a.lastModified ?? '') >= (b.lastModified ?? '') ? a : b,
		).id
	},

	/** Create a new storyboard, open it, and save. */
	async createBoard(handle, name) {
		dirty = false
		/** @type {StoryboardData} */
		const board = {
			id: crypto.randomUUID(),
			name,
			slides: [],
			lastModified: new Date().toISOString(),
		}
		all = [...all, board]
		current = board
		currentId = board.id
		await writeAll(handle)
	},

	/** Open a storyboard by id (sync — data already loaded). */
	openBoard(id) {
		const board = all.find((b) => b.id === id)
		if (!board) return
		current = board
		currentId = id
		dirty = false
	},

	/** Delete a storyboard by id and save. */
	async deleteBoard(handle, id) {
		all = all.filter((b) => b.id !== id)
		if (currentId === id) {
			current = null
			currentId = null
		}
		await writeAll(handle)
	},

	/** Rename a storyboard and save. */
	async renameBoard(handle, id, name) {
		all = all.map((b) => (b.id === id ? { ...b, name } : b))
		if (currentId === id) current = { ...current, name }
		await writeAll(handle)
	},

	/**
	 * Sync current → all (updating lastModified) and write storyboards.json.
	 * Also call project.save() separately if needed.
	 */
	async save(handle) {
		if (current && currentId) {
			const now = new Date().toISOString()
			all = all.map((b) =>
				b.id === currentId ? { ...b, ...current, lastModified: now } : b,
			)
		}
		await writeAll(handle)
		dirty = false
	},

	/** Insert a new slide after `afterIndex` (-1 to prepend). Returns the new slide. */
	insertSlide(afterIndex, camera) {
		/** @type {Slide} */
		const slide = {
			id: crypto.randomUUID(),
			camera,
			transition: { duration: 1, easing: 'ease-in-out' },
			title: '',
			description: '',
		}
		const slides = [...current.slides]
		slides.splice(afterIndex + 1, 0, slide)
		current = { ...current, slides }
		dirty = true
		return slide
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

	/** Update the camera of the slide at `index`. */
	updateSlide(index, camera) {
		const slides = current.slides.map((s, i) => (i === index ? { ...s, camera } : s))
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
		if (slides[0].transition?.easing === 'continuous') {
			slides[0] = { ...slides[0], transition: { ...slides[0].transition, easing: 'ease-in-out' } }
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

/** Write the full storyboards array to storyboards.json. */
async function writeAll(handle) {
	await handle.fs.writeFile(STORE_PATH, JSON.stringify({ storyboards: all }, null, 2))
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
