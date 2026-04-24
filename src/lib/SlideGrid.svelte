<script>
  import { onMount } from 'svelte'
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'
  import SlideCard from './SlideCard.svelte'
  import StoryboardHeader from './StoryboardHeader.svelte'

  let { onOpenSlide, onNewSlide, onPreview } = $props()

  let dragFromIndex = $state(null)
  let dropPosition = $state(null) // 0–N insertion point

  onMount(() => {
    thumbnailStore.generateAll(project.handle, storyboard.current.slides)
  })

  // ── DnD ──────────────────────────────────────────────────────────────────

  function onDragStart(e, index) {
    dragFromIndex = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  function onDragOver(e, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    dropPosition = e.clientX < rect.left + rect.width / 2 ? index : index + 1
  }

  function onDrop(e) {
    e.preventDefault()
    if (
      dragFromIndex !== null &&
      dropPosition !== null &&
      dropPosition !== dragFromIndex &&
      dropPosition !== dragFromIndex + 1
    ) {
      storyboard.reorderSlides(dragFromIndex, dropPosition)
    }
    dragFromIndex = null
    dropPosition = null
  }

  function onDragEnd() {
    dragFromIndex = null
    dropPosition = null
  }
</script>

<div class="flex h-screen w-screen flex-col">
  <StoryboardHeader {onPreview} />

  <!-- Slide grid -->
  <div
    style="scrollbar-color: #404040 transparent;"
    class="flex flex-wrap content-start gap-4 overflow-y-auto p-8"
  >
    {#if storyboard.current?.slides.length === 0}
      <button
        class="flex aspect-video w-64 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-700 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
        onclick={() => onNewSlide(-1)}
      >
        <span class="text-3xl font-light">+</span>
        <span class="text-sm">Add first slide</span>
      </button>
    {:else}
      {@const slides = storyboard.current.slides}
      {#each slides as slide, i (slide.id)}
        <SlideCard
          {dragFromIndex}
          {dropPosition}
          index={i}
          isFirst={i === 0}
          isLast={i === slides.length - 1}
          {onDragEnd}
          {onDragOver}
          {onDragStart}
          {onDrop}
          {onNewSlide}
          {onOpenSlide}
          {slide}
          totalSlides={slides.length}
        />
      {/each}

      <!-- Add Slide card -->
      <button
        class="flex aspect-video w-48 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 self-start rounded-xl border-2 border-dashed border-neutral-700 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
        onclick={() => onNewSlide(slides.length - 1)}
      >
        <span class="text-2xl font-light">+</span>
        <span class="text-xs">Add Slide</span>
      </button>
    {/if}
  </div>
</div>
