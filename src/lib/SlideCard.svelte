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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group card relative shrink-0 flex-col overflow-visible transition
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

  <div class="flex items-center justify-center framed-2.5 p-2.5" class:m-12.5={isContinuous}>
    <button
      class="absolute left-0 -translate-x-5 cursor-pointer text-neutral-200 hover:text-black"
      class:text-brand!={isContinuous}
      onclick={!isLast
        ? (e) => {
            e.stopPropagation()
            toggleContinuous()
          }
        : undefined}
      title={!isLast
        ? isContinuous
          ? 'Continuous (click to use transition)'
          : 'Transition (click for continuous)'
        : undefined}
    >
      <svg height="20" width="30">
        <path d="M5,2.5 L12.5,10 L5,17.5" fill="none" stroke="currentColor"></path>
        <path d="M17.5,2.5 L25,10 L17.5,17.5" fill="none" stroke="currentColor"></path>
      </svg>
    </button>
    <!-- Thumbnail -->
    <div
      class="aspect-auto h-50 w-50 overflow-hidden bg-neutral-900"
      class:h-25!={isContinuous}
      class:w-25!={isContinuous}
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
        {#if isContinuous}
          <path
            d="M102.5,2.5 L110,10 L102.5,17.5"
            fill="none"
            stroke="currentColor"
            transform="translate(-12.5)"
          ></path>
          <path
            d="M102.5,2.5 L110,10 L102.5,17.5"
            fill="none"
            stroke="currentColor"
            transform="translate(-25)"
          ></path>
          <path
            d="M102.5,2.5 L110,10 L102.5,17.5"
            fill="none"
            stroke="currentColor"
            transform="translate(-37.5)"
          ></path>
          <path
            d="M102.5,2.5 L110,10 L102.5,17.5"
            fill="none"
            stroke="currentColor"
            transform="translate(-50)"
          ></path>
          <path
            d="M102.5,2.5 L110,10 L102.5,17.5"
            fill="none"
            stroke="currentColor"
            transform="translate(-62.5)"
          ></path>
          <path
            d="M102.5,2.5 L110,10 L102.5,17.5"
            fill="none"
            stroke="currentColor"
            transform="translate(-75)"
          ></path>
          <path
            d="M102.5,2.5 L110,10 L102.5,17.5"
            fill="none"
            stroke="currentColor"
            transform="translate(-87.5)"
          ></path>
        {:else}
          <path d="M0,10 L110,10" fill="none" stroke="currentColor"></path>
        {/if}
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
