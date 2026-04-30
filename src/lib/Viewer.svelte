<script>
  import { SceneViewer } from '@krisenstab/vantage'
  import { Vector3 } from 'three'
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { applySlideState, resolveCamera } from '$preview/sceneState.js'
  import { onMount } from 'svelte'

  let {
    captureMode = false,
    initialCamera = null,
    initialSlide = null,
    onConfirm = () => {},
    onCancel = () => {},
  } = $props()

  let canvas = $state(null)
  let viewer = null
  let manifest = $state(null)

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

  onMount(() => {
    viewer = new SceneViewer(canvas)
    viewer.openProject(project.handle.fs.readFile).then((m) => {
      manifest = m
      if (captureMode) {
        if (initialSlide) applySlideState(viewer, manifest, initialSlide)
        if (initialCamera !== null) viewer.setCameraState(initialCamera)
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

<div class="flex h-screen w-screen flex-col bg-black lg:flex-row">
  <div class="relative min-h-0 min-w-0 flex-1">
    <canvas bind:this={canvas} class="h-full w-full"></canvas>

    <div class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
      <div>
        <button
          class="pointer-events-auto cursor-pointer rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition hover:bg-neutral-800/80"
          onclick={handleBack}
        >
          &larr; {captureMode ? 'Cancel' : 'Back'}
        </button>
        <span class="ml-3 text-sm text-neutral-400">{storyboard.current?.name}</span>
      </div>

      {#if captureMode}
        <button
          class="pointer-events-auto cursor-pointer rounded-md bg-blue-600/90 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-blue-500/90"
          onclick={handleCapture}
        >
          Capture Position
        </button>
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
