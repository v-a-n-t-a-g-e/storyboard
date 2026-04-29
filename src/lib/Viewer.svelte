<script>
  import { SceneViewer } from '@krisenstab/vantage'
  import { CatmullRomCurve3, Vector3 } from 'three'
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { onMount } from 'svelte'

  let {
    captureMode = false,
    initialCamera = null,
    initialSlide = null,
    onConfirm = () => {},
    onCancel = () => {},
    previewMode = false,
    slides = [],
    onPreviewDone = () => {},
  } = $props()

  let canvas = $state(null)
  let viewer = null
  let manifest = $state(null)
  let previewRunning = $state(false)
  let stopRequested = false

  // ── Capture-mode panel state ────────────────────────────────────────────────
  let fov = $state(initialCamera?.fov ?? 50)
  let projectionRef = $state(initialSlide?.projectionRef ?? null)
  /** @type {Record<string, boolean>} */
  let objectVis = $state({ ...(initialSlide?.visibility?.objects ?? {}) })
  /** @type {Record<string, boolean>} */
  let projectionVis = $state({ ...(initialSlide?.visibility?.projections ?? {}) })

  // Manifest entries → indices into viewer.scene.children (env at 0, then objects).
  function getObjectMesh(i) {
    return viewer?.scene?.children?.[1 + i] ?? null
  }

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

  /** Apply a slide's visibility overrides on top of manifest defaults. */
  function applySlideState(slide) {
    if (!manifest) return
    for (let i = 0; i < manifest.objects.length; i++) {
      const entry = manifest.objects[i]
      const v = slide.visibility?.objects?.[entry.id] ?? entry.visible
      const mesh = getObjectMesh(i)
      if (mesh) mesh.visible = v
    }
    const projs = manifest.projections ?? []
    for (let i = 0; i < projs.length; i++) {
      const entry = projs[i]
      const v = slide.visibility?.projections?.[entry.id] ?? entry.visible
      if (viewer.projections[i]) viewer.projections[i].visible = v
    }
  }

  /** Resolve the camera for a slide, honoring projectionRef when present. */
  function resolveCamera(slide) {
    if (slide.projectionRef && manifest?.projections) {
      const idx = manifest.projections.findIndex((p) => p.id === slide.projectionRef)
      if (idx >= 0 && viewer.projections[idx]) {
        const proj = viewer.projections[idx].projection
        const fwd = new Vector3(0, 0, -1).applyQuaternion(proj.quaternion)
        return {
          position: [proj.position.x, proj.position.y, proj.position.z],
          target: [
            proj.position.x + fwd.x,
            proj.position.y + fwd.y,
            proj.position.z + fwd.z,
          ],
          fov: slide.camera.fov,
        }
      }
    }
    return slide.camera
  }

  async function startPreview() {
    previewRunning = true
    stopRequested = false
    viewer.beginPlayback?.()
    applySlideState(slides[0])
    viewer.setCameraState(resolveCamera(slides[0]))
    await new Promise((r) => requestAnimationFrame(r))

    const segments = buildSegments(slides)

    for (const group of segments) {
      if (stopRequested) break

      const cameras = group.map((s) => resolveCamera(s))
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

      if (!stopRequested) applySlideState(group[group.length - 1])
    }

    viewer.endPlayback?.()
    previewRunning = false
    if (!stopRequested) onPreviewDone()
  }

  onMount(() => {
    viewer = new SceneViewer(canvas)
    viewer.openProject(project.handle.fs.readFile).then((m) => {
      manifest = m
      if (captureMode) {
        if (initialSlide) applySlideState(initialSlide)
        if (initialCamera !== null) viewer.setCameraState(initialCamera)
      }
      if (previewMode && slides.length > 0) {
        startPreview()
      }
    })
    return () => {
      viewer.dispose?.()
    }
  })

  // ── Capture-mode panel handlers ─────────────────────────────────────────────
  function setObjectVisible(id, defaultVisible, value) {
    const next = { ...objectVis }
    if (value === defaultVisible) delete next[id]
    else next[id] = value
    objectVis = next
    const i = manifest.objects.findIndex((o) => o.id === id)
    const mesh = getObjectMesh(i)
    if (mesh) mesh.visible = value
  }

  function setProjectionVisible(id, defaultVisible, value) {
    const next = { ...projectionVis }
    if (value === defaultVisible) delete next[id]
    else next[id] = value
    projectionVis = next
    const i = manifest.projections.findIndex((p) => p.id === id)
    if (viewer.projections[i]) viewer.projections[i].visible = value
  }

  function isObjectVisible(entry) {
    return objectVis[entry.id] ?? entry.visible
  }
  function isProjectionVisible(entry) {
    return projectionVis[entry.id] ?? entry.visible
  }

  function handleFovChange(v) {
    fov = v
    const c = viewer.getCameraState()
    viewer.setCameraState({ ...c, fov: v })
  }

  function previewProjectionPose() {
    if (!projectionRef || !manifest?.projections) return
    const idx = manifest.projections.findIndex((p) => p.id === projectionRef)
    if (idx < 0 || !viewer.projections[idx]) return
    const proj = viewer.projections[idx].projection
    const fwd = new Vector3(0, 0, -1).applyQuaternion(proj.quaternion)
    viewer.setCameraState({
      position: [proj.position.x, proj.position.y, proj.position.z],
      target: [
        proj.position.x + fwd.x,
        proj.position.y + fwd.y,
        proj.position.z + fwd.z,
      ],
      fov,
    })
  }

  function handleBack() {
    stopRequested = true
    onCancel()
  }

  async function handleSave() {
    await storyboard.save(project.handle)
    await project.save()
  }

  function handleCapture() {
    const visibility = {}
    if (Object.keys(objectVis).length) visibility.objects = objectVis
    if (Object.keys(projectionVis).length) visibility.projections = projectionVis
    onConfirm({
      camera: viewer.getCameraState(),
      visibility: Object.keys(visibility).length ? visibility : undefined,
      projectionRef: projectionRef ?? null,
    })
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

  {#if captureMode && manifest}
    <div
      class="pointer-events-auto absolute right-4 top-16 flex max-h-[calc(100vh-6rem)] w-72 flex-col gap-4 overflow-y-auto rounded-md bg-neutral-900/85 p-4 text-xs text-neutral-200 backdrop-blur"
    >
      <section>
        <div class="mb-1 text-neutral-400">Field of view</div>
        <div class="flex items-center gap-2">
          <input
            type="range"
            min="10"
            max="120"
            step="1"
            value={fov}
            oninput={(e) => handleFovChange(Number(e.currentTarget.value))}
            class="flex-1"
          />
          <input
            type="number"
            min="10"
            max="120"
            step="1"
            value={fov}
            oninput={(e) => handleFovChange(Number(e.currentTarget.value))}
            class="w-14 rounded bg-neutral-800 px-1.5 py-0.5 text-right"
          />
        </div>
      </section>

      {#if (manifest.projections ?? []).length > 0}
        <section>
          <div class="mb-1 text-neutral-400">Camera from projection</div>
          <div class="flex items-center gap-2">
            <select
              bind:value={projectionRef}
              class="flex-1 rounded bg-neutral-800 px-1.5 py-1 text-neutral-100"
            >
              <option value={null}>(none — manual)</option>
              {#each manifest.projections as p (p.id)}
                <option value={p.id}>{p.name}</option>
              {/each}
            </select>
            <button
              class="cursor-pointer rounded bg-neutral-800 px-2 py-1 text-neutral-300 transition hover:bg-neutral-700 disabled:opacity-40"
              disabled={!projectionRef}
              onclick={previewProjectionPose}
              title="Snap viewer camera to projection pose"
            >
              Pose
            </button>
          </div>
        </section>
      {/if}

      {#if manifest.objects.length > 0}
        <section>
          <div class="mb-1 text-neutral-400">Objects</div>
          <ul class="flex flex-col gap-1">
            {#each manifest.objects as o (o.id)}
              <li class="flex items-center justify-between gap-2">
                <span class="truncate" title={o.name}>{o.name}</span>
                <input
                  type="checkbox"
                  checked={isObjectVisible(o)}
                  onchange={(e) => setObjectVisible(o.id, o.visible, e.currentTarget.checked)}
                />
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if (manifest.projections ?? []).length > 0}
        <section>
          <div class="mb-1 text-neutral-400">Projections</div>
          <ul class="flex flex-col gap-1">
            {#each manifest.projections as p (p.id)}
              <li class="flex items-center justify-between gap-2">
                <span class="truncate" title={p.name}>{p.name}</span>
                <input
                  type="checkbox"
                  checked={isProjectionVisible(p)}
                  onchange={(e) => setProjectionVisible(p.id, p.visible, e.currentTarget.checked)}
                />
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  {/if}
</div>
