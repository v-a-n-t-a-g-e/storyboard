<script>
  import { SceneViewer } from '@krisenstab/vantage'
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { buildSegments, lerpCamera, prepareSplineSegment, splineCameraAt } from './cameraPath.js'
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
   * per-segment timing. Easing shapes the speed profile of the whole group.
   */
  function animateSplineWithTiming(cameras, subDurationMs, totalMs, easeFn) {
    const prepared = prepareSplineSegment(cameras, subDurationMs)
    return rafLoop(totalMs, (raw) => {
      viewer.setCameraState(splineCameraAt(prepared, easeFn(raw)))
    })
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
