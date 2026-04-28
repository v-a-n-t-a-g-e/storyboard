<script>
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'

  let {
    slide,
    index,
    isLast,
    totalSlides,
    dragFromIndex,
    dropPosition,
    onOpenSlide,
    onNewSlide,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  } = $props()

  function getTransition(s) {
    return s.transition ?? { duration: 1, vh: 30, continuous: false }
  }

  function handleDurationChange(raw) {
    const duration = Math.max(0.1, parseFloat(raw) || 1)
    const t = getTransition(storyboard.current.slides[index])
    storyboard.updateTransition(index, { ...t, duration })
  }

  function handleVhChange(raw) {
    const vh = Math.max(1, parseInt(raw) || 30)
    const t = getTransition(storyboard.current.slides[index])
    storyboard.updateTransition(index, { ...t, vh })
  }

  function toggleContinuous() {
    const t = getTransition(storyboard.current.slides[index])
    storyboard.updateTransition(index, { ...t, continuous: !t.continuous })
  }

  const tr = $derived(getTransition(slide))
  const isContinuous = $derived(tr.continuous)
</script>

<div
  class="group relative shrink-0 flex-col overflow-visible transition hover:bg-brand/5
    {dragFromIndex === index ? 'cursor-grabbing opacity-40' : 'cursor-pointer'}
    border-neutral-800 {dragFromIndex === null ? 'hover:border-neutral-600' : ''}"
  draggable="true"
  onclick={() => onOpenSlide(index)}
  ondragend={onDragEnd}
  ondragover={(e) => onDragOver(e, index)}
  ondragstart={(e) => onDragStart(e, index)}
  ondrop={onDrop}
  onkeydown={(e) => e.key === 'Enter' && onOpenSlide(index)}
  role="button"
  tabindex="0"
>
  <!-- Drop line: before this card -->
  {#if dropPosition === index && dragFromIndex !== index && dragFromIndex !== index - 1}
    <div class="pointer-events-none absolute inset-y-0 -left-2.5 z-20 w-px bg-brand"></div>
  {/if}
  <!-- Drop line: after last card -->
  {#if isLast && dropPosition === totalSlides && dragFromIndex !== totalSlides - 1}
    <div class="pointer-events-none absolute inset-y-0 -right-2.5 z-20 w-px bg-brand"></div>
  {/if}

  <div class="flex items-center justify-center framed-2.5 p-2.5" class:mt-12.5={isContinuous}>
    <!-- Thumbnail -->
    <div
      class="aspect-auto h-50 w-50 overflow-hidden bg-neutral-900"
      class:h-25!={isContinuous}
      class:w-25!={isContinuous}
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

    <!-- Transition -->
    <div
      class="flex h-full w-25 flex-col items-center justify-center gap-1 px-2 py-1.5 transition-colors"
    >
      {#if !isLast}
        <div class="flex items-center bg-time/10 px-2 py-1">
          <span class="w-5 text-xs text-time">s</span>
          <input
            class="w-10 [appearance:textfield] px-1 py-0.5 text-right text-xs text-black focus:bg-white focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            min="0.1"
            onchange={(e) => {
              e.stopPropagation()
              handleDurationChange(e.currentTarget.value)
            }}
            onclick={(e) => e.stopPropagation()}
            step="0.1"
            title="Duration (seconds)"
            type="number"
            value={tr.duration}
          />
        </div>
      {/if}
      <svg
        class="overflow-visible {!isLast ? 'cursor-pointer' : ''}"
        height="20"
        onclick={!isLast
          ? (e) => {
              e.stopPropagation()
              toggleContinuous()
            }
          : undefined}
        role={!isLast ? 'button' : undefined}
        title={!isLast
          ? isContinuous
            ? 'Continuous (click to use transition)'
            : 'Transition (click for continuous)'
          : undefined}
        width="100"
      >
        <path d="M0,10 L110,10" fill="none" stroke="currentColor"></path>
        {#if !isLast}
          <path d="M102.5,2.5 L110,10 L102.5,17.5" fill="none" stroke="currentColor"></path>
        {:else}
          <path d="M110,2.5 L110,17.5" fill="none" stroke="currentColor"></path>
        {/if}
      </svg>
      {#if !isLast}
        <div class="flex items-center bg-scroll/10 px-2 py-1">
          <span class="w-5 text-xs text-scroll">vh</span>
          <input
            class="w-10 [appearance:textfield] px-1 py-0.5 text-right text-xs text-black focus:bg-white focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            min="1"
            onchange={(e) => {
              e.stopPropagation()
              handleVhChange(e.currentTarget.value)
            }}
            onclick={(e) => e.stopPropagation()}
            step="1"
            title="Scroll distance (vh)"
            type="number"
            value={tr.vh ?? 30}
          />
        </div>
      {/if}
    </div>
  </div>
  <!-- <div class="-mt-px flex w-full justify-between framed-2.5 p-2.5 text-xs">
    <div></div>
    <div>
      <button
        class="hover:underline"
        onclick={(e) => {
          e.stopPropagation()
          const newId = storyboard.duplicateSlide(index)
          if (newId && thumbnailStore.thumbnails[slide.id]) {
            thumbnailStore.thumbnails[newId] = thumbnailStore.thumbnails[slide.id]
          }
        }}>Duplicate</button
      >
      |
      <button
        class="hover:text-pink-600 hover:underline"
        onclick={(e) => {
          e.stopPropagation()
          storyboard.deleteSlide(index)
        }}>Delete</button
      >
    </div>
  </div> -->
  {#if !isContinuous}
    <div class="-mt-px h-25 w-full framed-2.5 p-2.5">Description</div>
  {/if}
</div>
