<script>
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'

  let {
    slide,
    index,
    isFirst,
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

  const EASING_LABELS = {
    'ease-in-out': 'Ease In-Out',
    'ease-in': 'Ease In',
    'ease-out': 'Ease Out',
    linear: 'Linear',
    continuous: 'Continuous',
  }

  function getTransition(s) {
    return s.transition ?? { duration: 1, easing: 'ease-in-out' }
  }

  function handleDurationChange(raw) {
    const duration = Math.max(0.1, parseFloat(raw) || 1)
    const t = getTransition(storyboard.current.slides[index])
    storyboard.updateTransition(index, { ...t, duration })
  }

  function handleEasingChange(easing) {
    const t = getTransition(storyboard.current.slides[index])
    storyboard.updateTransition(index, { ...t, easing })
  }

  const tr = $derived(getTransition(slide))
  const isContinuous = $derived(tr.easing === 'continuous')
</script>

<div
  style="width: 256px"
  class="group relative shrink-0 overflow-visible rounded-xl border transition
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
    <div
      class="pointer-events-none absolute inset-y-0 -left-2.5 z-20 w-0.5 rounded bg-blue-500"
    ></div>
  {/if}
  <!-- Drop line: after last card -->
  {#if isLast && dropPosition === totalSlides && dragFromIndex !== totalSlides - 1}
    <div
      class="pointer-events-none absolute inset-y-0 -right-2.5 z-20 w-0.5 rounded bg-blue-500"
    ></div>
  {/if}

  <!-- Insert-before button -->
  {#if dragFromIndex === null}
    <button
      class="absolute top-1/2 -left-4 z-10 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-neutral-700 text-sm text-neutral-200 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-500"
      onclick={(e) => {
        e.stopPropagation()
        onNewSlide(index - 1)
      }}
      title="Insert slide before">+</button
    >
  {/if}

  <!-- Thumbnail -->
  <div class="aspect-video w-full overflow-hidden rounded-t-xl bg-neutral-900">
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

  <!-- Slide number badge -->
  <div
    class="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-neutral-300 backdrop-blur"
  >
    {index + 1}
  </div>

  <!-- Delete button -->
  <button
    class="absolute top-2 left-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xs text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-600/80 hover:text-white"
    onclick={(e) => {
      e.stopPropagation()
      storyboard.deleteSlide(index)
    }}
    title="Delete slide">×</button
  >

  <!-- Edit hover overlay (thumbnail area only) -->
  <div
    class="pointer-events-none absolute inset-x-0 top-0 flex aspect-video items-center justify-center rounded-t-xl bg-black/40 opacity-0 transition group-hover:opacity-100"
  >
    <span class="text-xs text-white">Edit position</span>
  </div>

  <!-- Transition footer -->
  {#if !isLast}
    <div
      class="flex items-center gap-2 rounded-b-xl border-t px-2 py-1.5 transition-colors
        {isContinuous
        ? 'border-violet-800/60 bg-violet-950/40'
        : 'border-neutral-800 bg-neutral-900'}"
    >
      <input
        class="w-14 [appearance:textfield] rounded bg-neutral-800 px-1.5 py-0.5 text-center text-xs text-neutral-300 focus:ring-1 focus:ring-neutral-600 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
      <select
        class="flex-1 rounded bg-neutral-800 px-1 py-0.5 text-xs focus:ring-1 focus:ring-neutral-600 focus:outline-none
          {isContinuous ? 'text-violet-300' : 'text-neutral-300'}"
        onchange={(e) => {
          e.stopPropagation()
          handleEasingChange(e.currentTarget.value)
        }}
        onclick={(e) => e.stopPropagation()}
        value={tr.easing}
      >
        {#each Object.entries(EASING_LABELS) as [value, label] (value)}
          <option
            disabled={isFirst && value === 'continuous'}
            selected={tr.easing === value}
            {value}>{label}</option
          >
        {/each}
      </select>
    </div>
  {:else}
    <div class="rounded-b-xl border-t border-neutral-800 bg-neutral-900 px-2 py-1.5">
      <span class="text-xs text-neutral-700">— end —</span>
    </div>
  {/if}
</div>
