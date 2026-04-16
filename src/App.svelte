<script>
  import { project } from './lib/project.svelte.js'
  import { storyboard } from './lib/storyboard.svelte.js'
  import { thumbnailStore } from './lib/thumbnails.svelte.js'
  import SplashScreen from './lib/SplashScreen.svelte'
  import SlideGrid from './lib/SlideGrid.svelte'
  import Viewer from './lib/Viewer.svelte'

  let dragCount = $state(0)

  // Viewer navigation state
  let viewerOpen = $state(false)
  let viewerMode = $state('new') // 'new' | 'edit'
  let viewerSlideIndex = $state(null)
  let previewOpen = $state(false)

  // Auto-open last modified storyboard when a project is opened
  $effect(() => {
    const handle = project.handle
    if (!handle) return
    storyboard.loadAll(handle).then(() => {
      const id = storyboard.latestId()
      if (id) {
        storyboard.openBoard(id)
      } else {
        storyboard.createBoard(handle, 'Untitled')
      }
    })
  })

  function handleOpenSlide(index) {
    viewerSlideIndex = index
    viewerMode = 'edit'
    viewerOpen = true
  }

  function handleNewSlide(afterIndex) {
    viewerSlideIndex = afterIndex
    viewerMode = 'new'
    viewerOpen = true
  }

  function handleViewerConfirm(camera) {
    if (viewerMode === 'new') {
      const slide = storyboard.insertSlide(viewerSlideIndex, camera)
      thumbnailStore.generateOne(project.handle, slide.id, camera)
    } else {
      const slide = storyboard.current.slides[viewerSlideIndex]
      storyboard.updateSlide(viewerSlideIndex, camera)
      thumbnailStore.generateOne(project.handle, slide.id, camera)
    }
    viewerOpen = false
  }

  function handleViewerCancel() {
    viewerOpen = false
  }

  function handlePreviewDone() {
    previewOpen = false
  }

  function handlePreviewCancel() {
    previewOpen = false
  }

  // Reset viewer state when storyboard is cleared
  $effect(() => {
    if (!storyboard.current) {
      viewerOpen = false
      viewerSlideIndex = null
      viewerMode = 'new'
      previewOpen = false
    }
  })

  function isFileDrag(e) {
    return e.dataTransfer?.types?.includes('Files') ?? false
  }

  function handleDragEnter(e) {
    if (isFileDrag(e)) dragCount++
  }

  function handleDragLeave(e) {
    if (isFileDrag(e)) dragCount--
  }

  function handleDragOver(e) {
    if (isFileDrag(e)) e.preventDefault()
  }

  async function handleDrop(e) {
    if (!isFileDrag(e)) return
    e.preventDefault()
    dragCount = 0
    await project.drop(e)
  }

  function getInitialCamera() {
    if (viewerMode === 'edit') {
      return storyboard.current?.slides[viewerSlideIndex]?.camera ?? null
    }
    return storyboard.current?.slides.at(-1)?.camera ?? null
  }
</script>

<svelte:window
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
  onbeforeunload={(e) => {
    if (storyboard.dirty) {
      e.preventDefault()
      return ''
    }
  }}
/>

{#if !project.handle}
  <SplashScreen />
{:else if storyboard.loading || !storyboard.current}
  <!-- Loading: project open but storyboard not yet resolved -->
  <div class="flex h-screen w-screen items-center justify-center bg-neutral-950">
    <span class="text-sm text-neutral-600">Opening…</span>
  </div>
{:else if previewOpen}
  <Viewer
    previewMode={true}
    slides={storyboard.current.slides}
    onPreviewDone={handlePreviewDone}
    onCancel={handlePreviewCancel}
  />
{:else if viewerOpen}
  <Viewer
    captureMode={true}
    initialCamera={getInitialCamera()}
    onConfirm={handleViewerConfirm}
    onCancel={handleViewerCancel}
  />
{:else}
  <SlideGrid
    onOpenSlide={handleOpenSlide}
    onNewSlide={handleNewSlide}
    onPreview={() => (previewOpen = true)}
  />
{/if}

{#if dragCount > 0}
  <div
    class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm"
  >
    <div class="rounded-xl border-2 border-dashed border-neutral-500 px-12 py-8 text-neutral-300">
      Drop project here
    </div>
  </div>
{/if}
