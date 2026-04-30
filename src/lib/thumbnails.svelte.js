import { SceneViewer } from '@krisenstab/vantage'
import { applySlideState, resolveCamera } from '$preview/sceneState.js'

// Off-screen canvas and viewer instance — created lazily, reused across calls.
let canvas = null
let viewer = null
let manifest = null
let ready = false
let initPromise = null

// Unexported state — exposed via getters below.
let thumbnails = $state({})
let generating = $state(false)

export const thumbnailStore = {
  get thumbnails() {
    return thumbnails
  },
  get generating() {
    return generating
  },
  generateAll,
  generateOne,
  disposeViewer,
}

async function ensureReady(handle) {
  if (ready) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    canvas = document.createElement('canvas')
    // Give the canvas real CSS dimensions so SceneViewer's internal
    // ResizeObserver sizes the WebGL renderer correctly. Position it
    // off-screen so it's never visible.
    Object.assign(canvas.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: '500px',
      height: '500px',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-1',
    })
    document.body.appendChild(canvas)

    viewer = new SceneViewer(canvas)
    manifest = await viewer.openProject(handle.fs.readFile)
    // Wait two frames so the ResizeObserver has fired and the renderer
    // has set the canvas pixel dimensions before we capture anything.
    await waitFrame()
    await waitFrame()
    ready = true
  })()

  return initPromise
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

async function captureSlide(slide) {
  applySlideState(viewer, manifest, slide)
  viewer.setCameraState(resolveCamera(viewer, manifest, slide))
  await waitFrame()
  await waitFrame() // two frames for the renderer to settle
  thumbnails[slide.id] = canvas.toDataURL('image/jpeg', 0.92)
}

/** Generate thumbnails for all slides. Called when SlideGrid mounts. */
async function generateAll(handle, slides) {
  if (slides.length === 0) return
  generating = true
  try {
    await ensureReady(handle)
    for (const slide of slides) {
      await captureSlide(slide)
    }
  } finally {
    generating = false
  }
}

/** Generate (or regenerate) a thumbnail for a single slide. */
async function generateOne(handle, slide) {
  await ensureReady(handle)
  await captureSlide(slide)
}

/** Tear down the off-screen viewer. Call when a storyboard is closed. */
function disposeViewer() {
  if (viewer) {
    viewer.dispose?.()
    viewer = null
  }
  if (canvas) {
    canvas.remove()
    canvas = null
  }
  manifest = null
  ready = false
  initPromise = null
  thumbnails = {}
  generating = false
}
