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
  let playing = $state(false)
  let stopIdx = $state(0)
  let stopRequested = false

  // Pre-compute segments + per-stop description map for the stepped slideshow.
  const segments = $derived(previewMode && slides.length > 0 ? buildSegments(slides) : [])
  const stops = $derived(
    previewMode && slides.length > 0
      ? [slides[0], ...segments.map((g) => g[g.length - 1])]
      : []
  )
  const done = $derived(previewMode && stops.length > 0 && stopIdx >= segments.length)
  const currentStop = $derived(stops[stopIdx] ?? null)

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

  function startPreview() {
    stopRequested = false
    stopIdx = 0
    playing = false
    viewer.beginPlayback?.()
    viewer.setCameraState(slides[0].camera)
  }

  /**
   * Play the next segment (stops[stopIdx] → stops[stopIdx + 1]).
   * Auto-plays through any continuous waypoints inside the segment, then pauses.
   */
  async function playNext() {
    if (playing || stopIdx >= segments.length) return
    playing = true

    const group = segments[stopIdx]
    const cameras = group.map((s) => s.camera)
    const subDurMs = group.slice(0, -1).map((s) => (s.transition?.duration ?? 1) * 1000)
    const totalMs = subDurMs.reduce((a, b) => a + b, 0)

    if (cameras.length === 2) {
      await animateCamera(cameras[0], cameras[1], totalMs, easeInOut)
    } else {
      await animateSplineWithTiming(cameras, subDurMs, totalMs, easeInOut)
    }

    playing = false
    if (stopRequested) return
    stopIdx += 1
    if (stopIdx >= segments.length) {
      viewer.endPlayback?.()
    }
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

<div class="flex h-screen w-screen flex-col bg-black lg:flex-row">
  <div class="relative min-h-0 min-w-0 flex-1">
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
      {:else if !previewMode}
        <button
          class="pointer-events-auto cursor-pointer rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition hover:bg-neutral-800/80"
          onclick={handleSave}
        >
          Save
        </button>
      {/if}
    </div>
  </div>

  {#if previewMode}
    <aside
      class="flex shrink-0 flex-col border-t border-neutral-800 bg-neutral-950 max-lg:max-h-[40vh] max-lg:min-h-32 lg:w-96 lg:border-t-0 lg:border-l"
    >
      <div class="min-h-0 flex-1 overflow-y-auto p-6">
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-neutral-100">
          {currentStop?.description ?? ''}
        </p>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400">
        <span>{stopIdx + 1} / {stops.length}</span>
        <button
          class="cursor-pointer rounded-md bg-neutral-800 px-4 py-1.5 text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-default disabled:opacity-40"
          disabled={playing || done}
          onclick={playNext}
        >
          {#if done}
            Done
          {:else if playing}
            Playing…
          {:else}
            Next ▶
          {/if}
        </button>
      </div>
    </aside>
  {/if}
</div>
