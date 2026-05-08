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

      // for (const obj of sceneState.objects) {
      //   if (visible) viewer.projections[i].projection.project(obj.object)
      //   else viewer.projections[i].projection.unproject(obj.object)
      // }
      // console.log(viewer.projections[i])
      // viewer.projections[i].visible = value
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

<div class="flex h-screen w-screen flex-col">
  <header class="flex items-center px-5 py-2.5">
    <div class="h-px w-5 bg-black"></div>
    <button
      class="flex cursor-pointer items-center gap-1.5 px-2.5 py-0.75 hover:framed-2.5"
      onclick={handleBack}
    >
      &larr; {captureMode ? 'Cancel' : 'Back'}
    </button>
    <div class="h-px w-5 bg-black"></div>
    <span class="px-2.5 text-sm">{storyboard.current?.name}</span>
    <div class="h-px flex-1 bg-black"></div>

    {#if captureMode}
      <button
        class="flex cursor-pointer items-center gap-1.5 px-2.5 py-0.75 text-brand hover:framed-2.5"
        onclick={handleCapture}
      >
        Capture Position
      </button>
    {:else}
      <button
        class="flex cursor-pointer items-center gap-1.5 px-2.5 py-0.75 hover:framed-2.5"
        onclick={handleSave}
      >
        Save
      </button>
    {/if}
    <div class="h-px w-5 bg-black"></div>
  </header>

  <div class="relative min-h-0 min-w-0 flex-1">
    <canvas bind:this={canvas} class="h-full w-full"></canvas>

    {#if captureMode && manifest}
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
</div>
