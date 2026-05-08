<script>
  import { thumbnailStore } from './thumbnails.svelte.js'
  import SlideTransition from './SlideTransition.svelte'
  import SlideDescription from './SlideDescription.svelte'

  let {
    slide,
    index,
    isLast,
    isFirst,
    totalSlides,
    dragFromIndex,
    dropPosition,
    onOpenSlide,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  } = $props()

  const isContinuous = $derived(slide.transition?.continuous ?? false)
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group/card card relative shrink-0 flex-col overflow-visible transition
    {dragFromIndex === index ? 'cursor-grabbing opacity-40' : 'cursor-pointer'}
    border-neutral-800 {dragFromIndex === null ? 'hover:border-neutral-600' : ''}"
  draggable="true"
  ondragend={onDragEnd}
  ondragover={(e) => onDragOver(e, index)}
  ondragstart={(e) => onDragStart(e, index)}
  ondrop={onDrop}
>
  <!-- Drop line: before this card -->
  {#if dropPosition === index && dragFromIndex !== index && dragFromIndex !== index - 1}
    <div class="pointer-events-none absolute inset-y-0 -left-2.5 z-20 h-55 w-px bg-brand"></div>
  {/if}
  <!-- Drop line: after last card -->
  {#if isLast && dropPosition === totalSlides && dragFromIndex !== totalSlides - 1}
    <div class="pointer-events-none absolute inset-y-0 -right-2.5 z-20 h-55 w-px bg-brand"></div>
  {/if}

  <div class="flex items-center justify-center framed-2.5 p-2.5" class:m-10={isContinuous}>
    <div
      class="aspect-auto h-50 w-50 overflow-hidden bg-neutral-900"
      class:h-30!={isContinuous}
      class:w-30!={isContinuous}
      onclick={() => onOpenSlide(index)}
      onkeydown={(e) => e.key === 'Enter' && onOpenSlide(index)}
      role="button"
      tabindex="0"
    >
      {#if thumbnailStore.thumbnails[slide.id]}
        <img
          class="h-full w-full object-cover"
          alt="Slide {index + 1}"
          draggable="false"
          src={thumbnailStore.thumbnails[slide.id]}
        />
      {:else}
        <div class="h-full w-full animate-pulse bg-neutral-800"></div>
      {/if}
    </div>

    <SlideTransition {index} {isFirst} {isLast} {slide} />
  </div>
  {#if !isContinuous}
    <SlideDescription {index} {slide} />
  {/if}
</div>
