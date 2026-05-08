import { SceneViewer } from '@krisenstab/vantage'

/**
 * Boot a SceneViewer for preview/export.
 *
 *   isPreview === true   → Embedded in narrator: parent talks to us via
 *                          postMessage. We never touch the filesystem
 *                          directly; readFile is proxied to the parent.
 *
 *   isPreview === false  → Static export: fetch ./storyboard.json, and
 *                          load assets from ./assets/<path> via fetch.
 *
 * Returns: { canvas, viewer, manifest, slides, onUpdate(cb), onStop(cb) }.
 *   - onUpdate(cb) invokes cb(slides) every time the parent posts new slides.
 *   - onStop(cb)   invokes cb() on a parent stop signal (preview only).
 */
export async function bootstrap({ isPreview }) {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)

  const viewer = new SceneViewer(canvas)

  /** @type {((slides: any[]) => void) | null} */
  let updateCb = null
  /** @type {(() => void) | null} */
  let stopCb = null

  let slides
  let manifest

  if (isPreview) {
    // ── Embedded preview ────────────────────────────────────────────
    // Wait for the parent to tell us what to render. Asset reads are
    // proxied via postMessage round-trips because the parent owns the
    // FileSystemDirectoryHandle.
    const initPromise = new Promise((resolve) => {
      window.addEventListener('message', function onMsg(e) {
        const m = e.data
        if (!m || m.source !== 'narrator') return
        if (m.type === 'narrator-init') {
          window.removeEventListener('message', onMsg)
          resolve(m)
        }
      })
    })

    // Tell the parent we're ready to receive init.
    window.parent?.postMessage({ source: 'narrator', type: 'narrator-ready' }, '*')

    const init = await initPromise
    slides = init.slides

    // Wire the rest of the message protocol.
    let nextReqId = 1
    /** @type {Map<number, { resolve: (f: File) => void, reject: (e: Error) => void }>} */
    const pendingReads = new Map()

    window.addEventListener('message', (e) => {
      const m = e.data
      if (!m || m.source !== 'narrator') return
      if (m.type === 'narrator-fs-read-result') {
        const pending = pendingReads.get(m.id)
        if (!pending) return
        pendingReads.delete(m.id)
        if (m.ok) pending.resolve(new File([m.buffer], m.path ?? 'asset'))
        else pending.reject(new Error(m.error || 'narrator-fs-read failed'))
      } else if (m.type === 'narrator-update') {
        slides = m.slides
        updateCb?.(slides)
      } else if (m.type === 'narrator-stop') {
        stopCb?.()
      }
    })

    /** @param {string} path */
    const readFile = (path) =>
      new Promise((resolve, reject) => {
        const id = nextReqId++
        pendingReads.set(id, { resolve, reject })
        window.parent?.postMessage({ source: 'narrator', type: 'narrator-fs-read', id, path }, '*')
      })

    manifest = await viewer.openProject(readFile)
  } else {
    // ── Static export ───────────────────────────────────────────────
    const sb = await fetch('./storyboard.json').then((r) => r.json())
    slides = sb.slides

    /** @param {string} path */
    const readFile = async (path) => {
      const res = await fetch('./assets/' + path)
      if (!res.ok) throw new Error(`Failed to fetch asset ${path}: ${res.status}`)
      const buf = await res.arrayBuffer()
      return new File([buf], path)
    }

    manifest = await viewer.openProject(readFile)
  }

  return {
    canvas,
    viewer,
    manifest,
    get slides() {
      return slides
    },
    onUpdate(cb) {
      updateCb = cb
    },
    onStop(cb) {
      stopCb = cb
    },
  }
}
