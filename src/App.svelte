<script>
  import { project } from './lib/project.svelte.js'
  import { storyboard } from './lib/storyboard.svelte.js'
  import { thumbnailStore } from './lib/thumbnails.svelte.js'
  import SplashScreen from './lib/SplashScreen.svelte'
  import SlideGrid from './lib/SlideGrid.svelte'
  import Viewer from './lib/Viewer.svelte'
  import ScrollyPreview from './lib/ScrollyPreview.svelte'

  // Viewer navigation state
  let viewerOpen = $state(false)
  let viewerMode = $state('new') // 'new' | 'edit'
  let viewerSlideIndex = $state(null)
  /** @type {'time' | 'scroll' | null} */
  let previewKind = $state(null)

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
    previewKind = null
  }

  function handlePreviewCancel() {
    previewKind = null
  }

  // Reset viewer state when storyboard is cleared
  $effect(() => {
    if (!storyboard.current) {
      viewerOpen = false
      viewerSlideIndex = null
      viewerMode = 'new'
      previewKind = null
    }
  })

  function getInitialCamera() {
    if (viewerMode === 'edit') {
      return storyboard.current?.slides[viewerSlideIndex]?.camera ?? null
    }
    return storyboard.current?.slides.at(-1)?.camera ?? null
  }
</script>

<svelte:window
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
{:else if previewKind === 'time'}
  <Viewer
    onCancel={handlePreviewCancel}
    onPreviewDone={handlePreviewDone}
    previewMode={true}
    slides={storyboard.current.slides}
  />
{:else if previewKind === 'scroll'}
  <ScrollyPreview
    onCancel={handlePreviewCancel}
    slides={storyboard.current.slides}
  />
{:else if viewerOpen}
  <Viewer
    captureMode={true}
    initialCamera={getInitialCamera()}
    onCancel={handleViewerCancel}
    onConfirm={handleViewerConfirm}
  />
{:else}
  <SlideGrid
    onNewSlide={handleNewSlide}
    onOpenSlide={handleOpenSlide}
    onPreview={(kind) => (previewKind = kind)}
  />
{/if}
