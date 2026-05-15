// Scroll-driven scrollytelling runtime (vanilla — no framework).
// The page is one tall scroller; the canvas is sticky; camera state is a
// pure function of scrollTop. Hand-edit text styling/positioning in style.css
// or the DOM template below.

import { bootstrap } from './bootstrap.js'
import { buildSegments, lerpCamera, prepareSplineSegment, splineCameraAt } from './cameraPath.js'
import { applySlideState, resolveCamera } from './sceneState.js'

function clamp01(x) {
  return Math.max(0, Math.min(1, x))
}

export async function start({ isPreview }) {
  const { canvas, viewer, manifest, ...boot } = await bootstrap({ isPreview })

  // ── Layout ─────────────────────────────────────────────────────────
  const scroller = document.createElement('div')
  scroller.className = 'scrolly'
  const track = document.createElement('div')
  track.className = 'track'
  const sticky = document.createElement('div')
  sticky.className = 'sticky'
  sticky.appendChild(canvas)
  track.appendChild(sticky)
  scroller.appendChild(track)
  document.body.appendChild(scroller)

  // ── State / path computation ──────────────────────────────────────
  let slides = boot.slides
  /** @type {Array<{ kind: 'lerp'|'spline', cameras?: any[], prepared?: any, slides: any[], startVh: number, segVh: number }>} */
  let segData = []
  /** @type {Array<{ id: string, description: string, cumVh: number }>} */
  let stops = []

  function recompute() {
    track.replaceChildren(sticky) // wipe stop cards while keeping canvas
    segData = []
    stops = []
    if (!slides || slides.length === 0) {
      track.style.height = '100vh'
      return
    }
    const segments = buildSegments(slides)
    let cumVh = 0
    stops.push({ id: slides[0].id, description: slides[0].description ?? '', cumVh: 0 })
    for (const seg of segments) {
      const cameras = seg.map((s) => resolveCamera(viewer, manifest, s))
      const subVh = seg.slice(0, -1).map((s) => s.transition?.vh ?? 75)
      const segVh = subVh.reduce((a, b) => a + b, 0)
      const startVh = cumVh
      const total = segVh || 1
      let cumFrac = 0
      const subFracs = [0]
      for (const vh of subVh) { cumFrac += vh; subFracs.push(cumFrac / total) }
      if (cameras.length === 2) {
        segData.push({ kind: 'lerp', cameras, subFracs, slides: seg, startVh, segVh })
      } else {
        segData.push({
          kind: 'spline',
          prepared: prepareSplineSegment(cameras, subVh),
          subFracs,
          slides: seg,
          startVh,
          segVh,
        })
      }
      cumVh += segVh
      const closing = seg[seg.length - 1]
      stops.push({ id: closing.id, description: closing.description ?? '', cumVh })
    }
    track.style.height = `calc(${cumVh}vh + 100vh)`

    // Render stop cards.
    for (const stop of stops) {
      if (!stop.description?.trim()) continue
      const card = document.createElement('div')
      card.className = 'stop-card'
      card.style.top = `calc(${stop.cumVh}vh + 50vh - 4rem)`
      const p = document.createElement('p')
      p.textContent = stop.description
      card.appendChild(p)
      track.appendChild(card)
    }
  }

  // ── Animation loop ────────────────────────────────────────────────
  let pending = false
  function scheduleUpdate() {
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      update()
    })
  }

  // Track which segment's stop-state we last applied, so we update
  // visibility overrides as the user scrolls between segments.
  let lastAppliedSegIdx = -1
  let lastAppliedWaypointIdx = -1

  function update() {
    if (segData.length === 0) return
    const vhPx = window.innerHeight / 100
    const scrollVh = scroller.scrollTop / vhPx
    let segIdx = 0
    for (let i = 0; i < segData.length; i++) {
      segIdx = i
      if (scrollVh <= segData[i].startVh + segData[i].segVh) break
    }
    const seg = segData[segIdx]
    const t = clamp01((scrollVh - seg.startVh) / Math.max(1e-6, seg.segVh))
    let cam
    if (seg.kind === 'lerp') {
      cam = lerpCamera(seg.cameras[0], seg.cameras[1], t)
    } else {
      cam = splineCameraAt(seg.prepared, t)
    }
    viewer.camera.up.set(...(cam.up ?? [0, 1, 0]))
    viewer.setCameraState(cam)

    // Apply visibility when crossing into a new segment or a new waypoint within the segment.
    let waypointIdx = 0
    for (let i = 1; i < seg.subFracs.length - 1; i++) {
      if (t >= seg.subFracs[i]) waypointIdx = i
    }
    if (segIdx !== lastAppliedSegIdx || waypointIdx !== lastAppliedWaypointIdx) {
      lastAppliedSegIdx = segIdx
      lastAppliedWaypointIdx = waypointIdx
      applySlideState(viewer, manifest, seg.slides[waypointIdx])
    }
  }

  scroller.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate)

  // ── Init ──────────────────────────────────────────────────────────
  viewer.beginPlayback?.()
  recompute()
  if (slides.length > 0) {
    applySlideState(viewer, manifest, slides[0])
    const initCam = resolveCamera(viewer, manifest, slides[0])
    viewer.camera.up.set(...(initCam.up ?? [0, 1, 0]))
    viewer.setCameraState(initCam)
  }
  update()

  boot.onUpdate((next) => {
    slides = next
    lastAppliedSegIdx = -1
    lastAppliedWaypointIdx = -1
    recompute()
    update()
  })

  boot.onStop(() => {
    viewer.endPlayback?.()
    viewer.dispose?.()
  })
}
