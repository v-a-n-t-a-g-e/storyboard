<script>
  import { SceneViewer } from '@krisenstab/vantage'
  import { project } from './project.svelte.js'
  import { buildSegments, lerpCamera, prepareSplineSegment, splineCameraAt } from './cameraPath.js'
  import { onMount } from 'svelte'

  let { slides = [], onCancel = () => {} } = $props()

  let canvas = $state(null)
  let scroller = $state(null)
  let viewer = null

  // Build segment metadata + cumulative vh map for the scroll-driven update.
  // Computed once from the slides snapshot taken at mount.
  const path = $derived.by(() => {
    const segments = buildSegments(slides)
    const segData = []
    const stops = []
    let cumVh = 0
    stops.push({ id: slides[0].id, description: slides[0].description ?? '', cumVh: 0 })
    for (const seg of segments) {
      const cameras = seg.map((s) => s.camera)
      const subVh = seg.slice(0, -1).map((s) => s.transition?.vh ?? 30)
      const segVh = subVh.reduce((a, b) => a + b, 0)
      const startVh = cumVh
      if (cameras.length === 2) {
        segData.push({ kind: 'lerp', cameras, startVh, segVh })
      } else {
        segData.push({
          kind: 'spline',
          prepared: prepareSplineSegment(cameras, subVh),
          startVh,
          segVh,
        })
      }
      cumVh += segVh
      const closing = seg[seg.length - 1]
      stops.push({ id: closing.id, description: closing.description ?? '', cumVh })
    }
    return { segData, stops, totalVh: cumVh }
  })

  let pending = false
  function scheduleUpdate() {
    if (pending || !viewer || !scroller) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      update()
    })
  }

  function clamp01(x) {
    return Math.max(0, Math.min(1, x))
  }

  function update() {
    if (!viewer || !scroller) return
    const vhPx = window.innerHeight / 100
    const scrollVh = scroller.scrollTop / vhPx
    const segData = path.segData
    let seg = segData[0]
    for (const s of segData) {
      if (scrollVh <= s.startVh + s.segVh) {
        seg = s
        break
      }
      seg = s
    }
    const t = clamp01((scrollVh - seg.startVh) / Math.max(1e-6, seg.segVh))
    if (seg.kind === 'lerp') {
      viewer.setCameraState(lerpCamera(seg.cameras[0], seg.cameras[1], t))
    } else {
      viewer.setCameraState(splineCameraAt(seg.prepared, t))
    }
  }

  onMount(() => {
    viewer = new SceneViewer(canvas)
    viewer.openProject(project.handle.fs.readFile).then(() => {
      viewer.beginPlayback?.()
      viewer.setCameraState(slides[0].camera)
      update()
    })
    return () => {
      viewer?.endPlayback?.()
      viewer?.dispose?.()
    }
  })

  function handleStop() {
    onCancel()
  }
</script>

<div bind:this={scroller} onscroll={scheduleUpdate} class="fixed inset-0 overflow-y-auto bg-black">
  <div class="relative w-full" style="height: calc({path.totalVh}vh + 100vh);">
    <div class="sticky top-0 h-screen w-screen">
      <canvas bind:this={canvas} class="h-full w-full"></canvas>
    </div>

    {#each path.stops as stop (stop.id)}
      {#if stop.description?.trim()}
        <div
          class="pointer-events-none absolute right-8 max-w-md"
          style="top: calc({stop.cumVh}vh + 50vh - 4rem);"
        >
          <p
            class="whitespace-pre-wrap rounded-md bg-neutral-900/80 px-4 py-3 text-sm text-neutral-100 backdrop-blur"
          >
            {stop.description}
          </p>
        </div>
      {/if}
    {/each}
  </div>

  <button
    class="fixed top-4 left-4 cursor-pointer rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition hover:bg-neutral-800/80"
    onclick={handleStop}
  >
    ✕ Stop
  </button>
</div>
