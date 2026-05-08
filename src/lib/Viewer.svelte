<script>
  import { SceneViewer } from '@krisenstab/vantage'
  import { project } from './project.svelte.js'
  import { applySlideState } from '$preview/sceneState.js'
  import { setVisibilityOverride, projectionPose } from './captureState.svelte.js'
  import CapturePanel from './CapturePanel.svelte'
  import { onMount } from 'svelte'

  let {
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
      if (initialSlide) applySlideState(viewer, manifest, initialSlide)
      if (initialCamera !== null) viewer.setCameraState(initialCamera)
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
    }
  }

  let prevProjectionRef = null

  $effect(() => {
    if (!viewer || !manifest?.projections) return
    const ref = projectionRef
    if (ref) {
      const idx = manifest.projections.findIndex((p) => p.id === ref)
      if (idx >= 0 && viewer.projections[idx]) {
        const { state, up } = projectionPose(viewer.projections[idx].projection)
        viewer.camera.up.set(up.x, up.y, up.z)
        viewer.setCameraState(state)
        fov = state.fov
        viewer.rig.enabled = false
      }
    } else if (prevProjectionRef) {
      viewer.camera.up.set(0, 1, 0)
      viewer.rig.enabled = true
    }
    prevProjectionRef = ref
  })

  function handleFovChange(v) {
    fov = v
    const c = viewer.getCameraState()
    viewer.setCameraState({ ...c, fov: v })
  }

  function handleBack() {
    onCancel()
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

<div class="relative h-screen w-screen">
  <canvas bind:this={canvas} class="h-full w-full"></canvas>

  <header class="absolute inset-x-0 top-0 z-10 flex items-center px-5 py-2.5">
    <div class="h-px w-5 bg-black"></div>
    <div class="hover:bg-white">
      <button
        class="flex cursor-pointer items-center gap-1.5 px-2.5 py-0.75 hover:framed-2.5"
        onclick={handleBack}
      >
        Cancel
      </button>
    </div>
    <div class="h-px flex-1 bg-black"></div>

    <div class="hover:bg-white">
      <button
        class="flex cursor-pointer items-center gap-1.5 px-2.5 py-0.75 hover:framed-2.5"
        onclick={handleCapture}
      >
        Capture Position
      </button>
    </div>

    <div class="h-px w-5 bg-black"></div>
  </header>

  {#if manifest}
    {#if projectionRef}
      <div class="absolute inset-0 cursor-not-allowed"></div>
    {/if}
    <CapturePanel
      {fov}
      {manifest}
      {objectVis}
      onFovChange={handleFovChange}
      onToggleObject={toggleObject}
      onToggleProjection={toggleProjection}
      {projectionVis}
      bind:projectionRef
    />
  {/if}
</div>
