<script>
  import { project } from './lib/project.svelte.js'
  import { storyboard } from './lib/storyboard.svelte.js'
  import { thumbnailStore } from './lib/thumbnails.svelte.js'
  import SplashScreen from './lib/SplashScreen.svelte'
  import SlideGrid from './lib/SlideGrid.svelte'
  import Viewer from './lib/Viewer.svelte'
  import PreviewFrame from './lib/PreviewFrame.svelte'

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

  function handleViewerConfirm(payload) {
    if (viewerMode === 'new') {
      const slide = storyboard.insertSlide(viewerSlideIndex, payload)
      thumbnailStore.generateOne(project.handle, slide)
    } else {
      storyboard.updateSlide(viewerSlideIndex, payload)
      const slide = storyboard.current.slides[viewerSlideIndex]
      thumbnailStore.generateOne(project.handle, slide)
    }
    viewerOpen = false
  }

  function handleViewerCancel() {
    viewerOpen = false
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

  function getInitialSlide() {
    if (viewerMode === 'edit') {
      return storyboard.current?.slides[viewerSlideIndex] ?? null
    }
    return null
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
{:else if previewKind === 'time' || previewKind === 'scroll'}
  <PreviewFrame mode={previewKind} onCancel={handlePreviewCancel} />
{:else if viewerOpen}
  <Viewer
    captureMode={true}
    initialCamera={getInitialCamera()}
    initialSlide={getInitialSlide()}
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
