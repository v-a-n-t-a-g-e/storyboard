// Stepped time-driven slideshow runtime (vanilla — no framework).
// Hand-edit freely: change the easing curve, swap `Next ▶` for a different
// label, restyle via style.css, etc.

import { bootstrap } from './bootstrap.js'
import { buildSegments, lerpCamera, prepareSplineSegment, splineCameraAt } from './cameraPath.js'
import { applySlideState, resolveCamera } from './sceneState.js'

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export async function start({ isPreview }) {
  document.body.classList.add('slideshow-body')

  const { canvas, viewer, manifest, ...boot } = await bootstrap({ isPreview })

  // ── Layout ─────────────────────────────────────────────────────────
  // Move the bootstrap-created canvas inside our layout container.
  const root = document.createElement('div')
  root.className = 'slideshow'
  const stage = document.createElement('div')
  stage.className = 'stage'
  stage.appendChild(canvas)
  const aside = document.createElement('aside')
  const desc = document.createElement('div')
  desc.className = 'desc'
  const descP = document.createElement('p')
  desc.appendChild(descP)
  const footer = document.createElement('div')
  footer.className = 'footer'
  const backBtn = document.createElement('button')
  backBtn.textContent = '← Back'
  const counter = document.createElement('span')
  const nextBtn = document.createElement('button')
  footer.appendChild(backBtn)
  footer.appendChild(counter)
  footer.appendChild(nextBtn)
  aside.appendChild(desc)
  aside.appendChild(footer)
  root.appendChild(stage)
  root.appendChild(aside)
  document.body.appendChild(root)

  // ── State ──────────────────────────────────────────────────────────
  let slides = boot.slides
  let segments = []
  let stops = []
  let stopIdx = 0
  let playing = false
  let stopRequested = false

  function recompute() {
    segments = slides.length > 0 ? buildSegments(slides) : []
    stops = slides.length > 0 ? [slides[0], ...segments.map((g) => g[g.length - 1])] : []
    if (stopIdx > segments.length) stopIdx = segments.length
    render()
  }

  function render() {
    const stop = stops[stopIdx] ?? null
    descP.textContent = stop?.description ?? ''
    counter.textContent = `${stopIdx + 1} / ${stops.length}`
    const done = stops.length > 0 && stopIdx >= segments.length
    backBtn.disabled = playing || stopIdx === 0
    if (done) {
      nextBtn.disabled = false
      nextBtn.textContent = 'Restart ↺'
      nextBtn.onclick = restart
    } else {
      nextBtn.disabled = playing
      nextBtn.textContent = playing ? 'Playing…' : 'Next →'
      nextBtn.onclick = playNext
    }
  }

  // ── Animation ─────────────────────────────────────────────────────
  function rafLoop(durationMs, onTick) {
    return new Promise((resolve) => {
      const start = performance.now()
      function frame() {
        if (stopRequested) return resolve()
        const raw = Math.min((performance.now() - start) / durationMs, 1)
        onTick(raw)
        if (raw < 1) requestAnimationFrame(frame)
        else resolve()
      }
      requestAnimationFrame(frame)
    })
  }

  async function playNext() {
    if (playing || stopIdx >= segments.length) return
    playing = true
    render()

    const group = segments[stopIdx]
    const cameras = group.map((s) => resolveCamera(viewer, manifest, s))
    const subDurMs = group.slice(0, -1).map((s) => (s.transition?.duration ?? 1) * 1000)
    const totalMs = subDurMs.reduce((a, b) => a + b, 0)

    let cumMs = 0
    const subFracs = [0]
    for (const d of subDurMs) { cumMs += d; subFracs.push(totalMs ? cumMs / totalMs : 0) }

    let lastWaypoint = 0
    const tickWaypoints = (easedT) => {
      let wp = 0
      for (let i = 1; i < subFracs.length - 1; i++) {
        if (easedT >= subFracs[i]) wp = i
      }
      if (wp !== lastWaypoint) {
        lastWaypoint = wp
        applySlideState(viewer, manifest, group[wp])
      }
    }

    if (cameras.length === 2) {
      await rafLoop(totalMs, (raw) => {
        const easedT = easeInOut(raw)
        tickWaypoints(easedT)
        const cam = lerpCamera(cameras[0], cameras[1], easedT)
        viewer.camera.up.set(...(cam.up ?? [0, 1, 0]))
        viewer.setCameraState(cam)
      })
    } else {
      const prepared = prepareSplineSegment(cameras, subDurMs)
      await rafLoop(totalMs, (raw) => {
        const easedT = easeInOut(raw)
        tickWaypoints(easedT)
        const cam = splineCameraAt(prepared, easedT)
        viewer.camera.up.set(...(cam.up ?? [0, 1, 0]))
        viewer.setCameraState(cam)
      })
    }

    if (!stopRequested) applySlideState(viewer, manifest, group[group.length - 1])
    playing = false
    if (stopRequested) return
    stopIdx += 1
    if (stopIdx >= segments.length) viewer.endPlayback?.()
    render()
  }

  function playBack() {
    if (playing || stopIdx === 0) return
    stopIdx -= 1
    const slide = stops[stopIdx]
    applySlideState(viewer, manifest, slide)
    const cam = resolveCamera(viewer, manifest, slide)
    viewer.camera.up.set(...(cam.up ?? [0, 1, 0]))
    viewer.setCameraState(cam)
    render()
  }

  function restart() {
    stopIdx = 0
    goToStart()
    render()
  }

  backBtn.onclick = playBack

  // ── Init ──────────────────────────────────────────────────────────
  viewer.beginPlayback?.()
  recompute()

  function goToStart() {
    if (slides.length === 0) return
    applySlideState(viewer, manifest, slides[0])
    const cam = resolveCamera(viewer, manifest, slides[0])
    viewer.camera.up.set(...(cam.up ?? [0, 1, 0]))
    viewer.setCameraState(cam)
  }

  goToStart()

  boot.onUpdate((next) => {
    slides = next
    // Reset playback to a sane state when the storyboard changes underneath.
    stopRequested = true
    queueMicrotask(() => {
      stopRequested = false
      stopIdx = 0
      playing = false
      recompute()
      goToStart()
    })
  })

  boot.onStop(() => {
    stopRequested = true
    viewer.endPlayback?.()
    viewer.dispose?.()
  })
}
