<script>
  import { project } from './lib/project.svelte.js'
  import { storyboard } from './lib/storyboard.svelte.js'
  import { thumbnailStore } from './lib/thumbnails.svelte.js'
  import SplashScreen from './lib/SplashScreen.svelte'
  import StoryboardPicker from './lib/StoryboardPicker.svelte'
  import SlideGrid from './lib/SlideGrid.svelte'
  import Viewer from './lib/Viewer.svelte'

  let dragCount = $state(0)

  // Viewer navigation state
  let viewerOpen = $state(false)
  let viewerMode = $state('new') // 'new' | 'edit'
  let viewerSlideIndex = $state(null)

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

  // Reset viewer state when storyboard closes
  $effect(() => {
    if (!storyboard.current) {
      viewerOpen = false
      viewerSlideIndex = null
      viewerMode = 'new'
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
    // new slide: start from last slide's camera position
    return storyboard.current?.slides.at(-1)?.camera ?? null
  }
</script>

<svelte:window
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
/>

{#if !project.handle}
  <SplashScreen />
{:else if !storyboard.current}
  <StoryboardPicker />
{:else if viewerOpen}
  <Viewer
    captureMode={true}
    initialCamera={getInitialCamera()}
    onConfirm={handleViewerConfirm}
    onCancel={handleViewerCancel}
  />
{:else}
  <SlideGrid onOpenSlide={handleOpenSlide} onNewSlide={handleNewSlide} />
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
