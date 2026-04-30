<script>
  import { SceneViewer } from '@krisenstab/vantage'
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { applySlideState } from '$preview/sceneState.js'
  import { setVisibilityOverride, projectionPose } from './captureState.svelte.js'
  import CapturePanel from './CapturePanel.svelte'
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

  // svelte-ignore state_referenced_locally
  let fov = $state(initialCamera?.fov ?? 50)
  // svelte-ignore state_referenced_locally
  let projectionRef = $state(initialSlide?.projectionRef ?? null)
  /** @type {Record<string, boolean>} */
  // svelte-ignore state_referenced_locally
  let objectVis = $state({ ...(initialSlide?.visibility?.objects ?? {}) })
  /** @type {Record<string, boolean>} */
  // svelte-ignore state_referenced_locally
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

  function toggleObject(entry, value) {
    objectVis = setVisibilityOverride(objectVis, entry.id, entry.visible, value)
    const i = manifest.objects.findIndex((o) => o.id === entry.id)
    const mesh = getObjectMesh(i)
    if (mesh) mesh.visible = value
  }

  function toggleProjection(entry, value) {
    projectionVis = setVisibilityOverride(projectionVis, entry.id, entry.visible, value)
    const i = manifest.projections.findIndex((p) => p.id === entry.id)
    if (viewer.projections[i]) {
      viewer.projections[i].visible = value
      viewer.projections[i].projection.visible = value

      console.log(viewer)

      // for (const obj of sceneState.objects) {
      //   if (visible) viewer.projections[i].projection.project(obj.object)
      //   else viewer.projections[i].projection.unproject(obj.object)
      // }
      // console.log(viewer.projections[i])
      // viewer.projections[i].visible = value
    }
  }

  function handleFovChange(v) {
    fov = v
    const c = viewer.getCameraState()
    viewer.setCameraState({ ...c, fov: v })
  }

  function handlePose() {
    if (!projectionRef || !manifest?.projections) return
    const idx = manifest.projections.findIndex((p) => p.id === projectionRef)
    if (idx < 0 || !viewer.projections[idx]) return
    viewer.setCameraState(projectionPose(viewer.projections[idx].projection, fov))
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
    if (Object.keys(objectVis).length) visibility.objects = { ...objectVis }
    if (Object.keys(projectionVis).length) visibility.projections = { ...projectionVis }
    onConfirm({
      camera: viewer.getCameraState(),
      visibility: Object.keys(visibility).length ? visibility : null,
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
    <CapturePanel
      {fov}
      {manifest}
      {objectVis}
      onFovChange={handleFovChange}
      onPose={handlePose}
      onToggleObject={toggleObject}
      onToggleProjection={toggleProjection}
      {projectionVis}
      bind:projectionRef
    />
  {/if}
</div>
