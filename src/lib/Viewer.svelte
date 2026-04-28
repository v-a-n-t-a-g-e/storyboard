<script>
  import { SceneViewer } from '@krisenstab/vantage'
  import { CatmullRomCurve3, Vector3 } from 'three'
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { onMount } from 'svelte'

  let {
    captureMode = false,
    initialCamera = null,
    onConfirm = () => {},
    onCancel = () => {},
    previewMode = false,
    slides = [],
    onPreviewDone = () => {},
  } = $props()

  let canvas = $state(null)
  let viewer = null
  let previewRunning = $state(false)
  let stopRequested = false

  // ── Easing ──────────────────────────────────────────────────────────────────
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

  // ── Camera lerp (stop → stop, no waypoints) ─────────────────────────────────
  function lerpCamera(from, to, t) {
    return {
      position: /** @type {[number,number,number]} */ (
        from.position.map((v, i) => v + (to.position[i] - v) * t)
      ),
      target: /** @type {[number,number,number]} */ (
        from.target.map((v, i) => v + (to.target[i] - v) * t)
      ),
      fov: from.fov + (to.fov - from.fov) * t,
    }
  }

  function rafLoop(durationMs, onTick) {
    return new Promise((resolve) => {
      const start = performance.now()
      function frame() {
        if (stopRequested) {
          resolve()
          return
        }
        const raw = Math.min((performance.now() - start) / durationMs, 1)
        onTick(raw)
        if (raw < 1) requestAnimationFrame(frame)
        else resolve()
      }
      requestAnimationFrame(frame)
    })
  }

  /** Animate between two camera states (simple lerp with easing). */
  function animateCamera(from, to, durationMs, easeFn) {
    return rafLoop(durationMs, (raw) => {
      viewer.setCameraState(lerpCamera(from, to, easeFn(raw)))
    })
  }

  /**
   * Animate through an array of camera states using a Catmull-Rom spline with
   * per-segment timing. Each subDurationMs entry controls exactly when the camera
   * reaches the corresponding control point.
   * Easing is applied globally (shapes the speed profile of the whole group).
   */
  function animateSplineWithTiming(cameras, subDurationMs, totalMs, easeFn) {
    const N = cameras.length
    const posCurve = new CatmullRomCurve3(cameras.map((c) => new Vector3(...c.position)))
    const tgtCurve = new CatmullRomCurve3(cameras.map((c) => new Vector3(...c.target)))

    // Cumulative time fractions: timeFrac[i] = when camera should be at cameras[i]
    const timeFrac = [0]
    let cum = 0
    for (const d of subDurationMs) {
      cum += d
      timeFrac.push(cum / totalMs)
    }

    // Arc-length fractions for each control point.
    // Control point i sits at raw spline param i/(N-1).
    // getLengths(D)[k] = cumulative arc length at raw param k/D.
    const D = Math.max(200, N * 100)
    const lengths = posCurve.getLengths(D)
    const totalLen = lengths[lengths.length - 1]
    const arcFrac = [0]
    for (let i = 1; i < N - 1; i++) {
      arcFrac.push(lengths[Math.round((i / (N - 1)) * D)] / totalLen)
    }
    arcFrac.push(1.0)

    const fovStart = cameras[0].fov
    const fovEnd = cameras[N - 1].fov

    return rafLoop(totalMs, (raw) => {
      const t = easeFn(raw) // global easing applied to time
      let seg = 0
      while (seg < N - 2 && t >= timeFrac[seg + 1]) seg++
      const span = timeFrac[seg + 1] - timeFrac[seg]
      const tLocal = span > 0 ? (t - timeFrac[seg]) / span : 1
      const u = Math.max(0, Math.min(1, arcFrac[seg] + tLocal * (arcFrac[seg + 1] - arcFrac[seg])))
      const pos = posCurve.getPointAt(u)
      const tgt = tgtCurve.getPointAt(u)
      viewer.setCameraState({
        position: /** @type {[number,number,number]} */ ([pos.x, pos.y, pos.z]),
        target: /** @type {[number,number,number]} */ ([tgt.x, tgt.y, tgt.z]),
        fov: fovStart + (fovEnd - fovStart) * t,
      })
    })
  }

  /**
   * Group slides into segments delimited by stop slides.
   * Returns arrays of slide objects: each group starts and ends with a stop.
   * e.g. [Stop, WP, WP, Stop] and [Stop, Stop]
   */
  /**
   * Group slides into segments delimited by stops.
   * A slide is a waypoint (not a stop) if its outgoing transition easing is 'continuous'.
   * A segment closes when we encounter a stop at i > groupStart; slide i is included
   * in the closing segment and also begins the next one.
   */
  function buildSegments(slides) {
    const N = slides.length
    const segments = []
    let groupStart = 0
    for (let i = 0; i < N - 1; i++) {
      if (!slides[i].transition?.continuous && i > groupStart) {
        segments.push(slides.slice(groupStart, i + 1))
        groupStart = i
      }
    }
    // Always flush remaining slides (last slide is always a stop)
    segments.push(slides.slice(groupStart))
    return segments
  }

  async function startPreview() {
    previewRunning = true
    stopRequested = false
    viewer.beginPlayback?.()
    viewer.setCameraState(slides[0].camera)
    await new Promise((r) => requestAnimationFrame(r))

    const segments = buildSegments(slides)

    for (const group of segments) {
      if (stopRequested) break

      const cameras = group.map((s) => s.camera)
      // Sub-durations come from the departure transition of each slide except the last (arriving stop)
      const subDurMs = group.slice(0, -1).map((s) => (s.transition?.duration ?? 1) * 1000)
      const totalMs = subDurMs.reduce((a, b) => a + b, 0)

      const easeFn = easeInOut

      if (cameras.length === 2) {
        // Simple stop-to-stop: linear lerp with easing
        await animateCamera(cameras[0], cameras[1], totalMs, easeFn)
      } else {
        // Continuous waypoints: Catmull-Rom spline with per-segment timing
        await animateSplineWithTiming(cameras, subDurMs, totalMs, easeFn)
      }
    }

    viewer.endPlayback?.()
    previewRunning = false
    if (!stopRequested) onPreviewDone()
  }

  onMount(() => {
    viewer = new SceneViewer(canvas)
    viewer.openProject(project.handle.fs.readFile).then(() => {
      if (captureMode && initialCamera !== null) {
        viewer.setCameraState(initialCamera)
      }
      if (previewMode && slides.length > 0) {
        startPreview()
      }
    })
    return () => {
      viewer.dispose?.()
    }
  })

  function handleBack() {
    stopRequested = true
    onCancel()
  }

  async function handleSave() {
    await storyboard.save(project.handle)
    await project.save()
  }

  function handleCapture() {
    onConfirm(viewer.getCameraState())
  }
</script>

<div class="relative h-screen w-screen bg-black">
  <canvas bind:this={canvas} class="h-full w-full"></canvas>

  <div class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
    <div>
      <button
        class="pointer-events-auto cursor-pointer rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition hover:bg-neutral-800/80"
        onclick={handleBack}
      >
        {#if previewMode}
          ✕ Stop
        {:else}
          &larr; {captureMode ? 'Cancel' : 'Back'}
        {/if}
      </button>
      {#if !previewMode}
        <span class="ml-3 text-sm text-neutral-400">{storyboard.current?.name}</span>
      {/if}
    </div>

    {#if captureMode}
      <button
        class="pointer-events-auto cursor-pointer rounded-md bg-blue-600/90 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-blue-500/90"
        onclick={handleCapture}
      >
        Capture Position
      </button>
    {:else if previewMode}
      <div class="pointer-events-none text-xs text-neutral-400">
        {previewRunning ? 'Playing…' : 'Done'}
      </div>
    {:else}
      <button
        class="pointer-events-auto cursor-pointer rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition hover:bg-neutral-800/80"
        onclick={handleSave}
      >
        Save
      </button>
    {/if}
  </div>
</div>
