<script>
  import { onMount } from 'svelte'
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'

  let { onOpenSlide, onNewSlide, onPreview } = $props()

  // DnD state
  let dragFromIndex = $state(null)
  let dragOverIndex = $state(null)

  const EASING_LABELS = {
    'ease-in-out': 'Ease In-Out',
    'ease-in': 'Ease In',
    'ease-out': 'Ease Out',
    linear: 'Linear',
    continuous: 'Continuous',
  }

  onMount(() => {
    thumbnailStore.generateAll(project.handle, storyboard.current.slides)
  })

  function handleBack() {
    thumbnailStore.disposeViewer()
    storyboard.close()
  }

  async function handleSave() {
    await storyboard.write(project.handle)
    await project.save()
  }

  function getTransition(slide) {
    return slide.transition ?? { duration: 1, easing: 'ease-in-out' }
  }

  function handleDurationChange(index, raw) {
    const duration = Math.max(0.1, parseFloat(raw) || 1)
    const t = getTransition(storyboard.current.slides[index])
    storyboard.updateTransition(index, { ...t, duration })
  }

  function handleEasingChange(index, easing) {
    const t = getTransition(storyboard.current.slides[index])
    storyboard.updateTransition(index, { ...t, easing })
  }

  function getTransitionType(slide) {
    return slide.transition?.easing ?? 'ease-in-out'
  }

  // DnD handlers
  function onDragStart(e, index) {
    dragFromIndex = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  function onDragOver(e, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverIndex = index
  }

  function onDrop(e, index) {
    e.preventDefault()
    if (dragFromIndex !== null && dragFromIndex !== index) {
      storyboard.reorderSlides(dragFromIndex, index)
    }
    dragFromIndex = null
    dragOverIndex = null
  }

  function onDragEnd() {
    dragFromIndex = null
    dragOverIndex = null
  }
</script>

<div class="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
  <!-- Top bar -->
  <div class="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
    <div class="flex items-center gap-3">
      <button
        class="cursor-pointer rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-700"
        onclick={handleBack}
      >
        &larr; Back
      </button>
      <span class="text-sm font-medium text-neutral-200">{storyboard.current?.name}</span>
      {#if thumbnailStore.generating}
        <span class="text-xs text-neutral-500">Generating thumbnails…</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if (storyboard.current?.slides.length ?? 0) >= 2}
        <button
          class="cursor-pointer rounded-md bg-neutral-700 px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-neutral-600"
          onclick={onPreview}
        >
          ▶ Preview
        </button>
      {/if}
      <button
        class="cursor-pointer rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-700"
        onclick={handleSave}
      >
        Save
      </button>
    </div>
  </div>

  <!-- Filmstrip -->
  <div
    class="flex flex-1 items-center gap-0 overflow-x-auto px-8 py-8"
    style="scrollbar-color: #404040 transparent;"
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
        <!-- Slide card -->
        <div
          class="group relative shrink-0 cursor-pointer overflow-visible rounded-xl border transition
						{dragFromIndex === i ? 'border-neutral-600 opacity-40' : ''}
						{dragOverIndex === i && dragFromIndex !== i
            ? 'border-blue-500 ring-2 ring-blue-500/50'
            : dragFromIndex === i
              ? ''
              : 'border-neutral-800 hover:border-neutral-600'}"
          style="width: 256px"
          draggable="true"
          role="button"
          tabindex="0"
          onclick={() => onOpenSlide(i)}
          onkeydown={(e) => e.key === 'Enter' && onOpenSlide(i)}
          ondragstart={(e) => onDragStart(e, i)}
          ondragover={(e) => onDragOver(e, i)}
          ondrop={(e) => onDrop(e, i)}
          ondragend={onDragEnd}
        >
          <!-- Insert-before button -->
          {#if dragFromIndex === null}
            <button
              class="absolute top-1/2 -left-4 z-10 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-neutral-700 text-sm text-neutral-200 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-500"
              onclick={(e) => {
                e.stopPropagation()
                onNewSlide(i - 1)
              }}
              title="Insert slide before"
            >
              +
            </button>
          {/if}

          <!-- Thumbnail -->
          <div class="aspect-video w-full overflow-hidden rounded-xl bg-neutral-900">
            {#if thumbnailStore.thumbnails[slide.id]}
              <img
                src={thumbnailStore.thumbnails[slide.id]}
                alt="Slide {i + 1}"
                class="h-full w-full object-cover"
              />
            {:else}
              <div class="h-full w-full animate-pulse bg-neutral-800"></div>
            {/if}
          </div>

          <!-- Slide number badge -->
          <div
            class="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-neutral-300 backdrop-blur"
          >
            {i + 1}
          </div>

          <!-- Edit hover overlay -->
          <div
            class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100"
          >
            <span class="text-xs text-white">Edit position</span>
          </div>
        </div>

        <!-- Transition arrow (between this slide and the next) -->
        {#if i < slides.length - 1}
          {@const tr = getTransition(slides[i])}
          {@const isContinuous = getTransitionType(slides[i]) === 'continuous'}
          {@const isEdgeArrow = i === 0}
          <div class="flex shrink-0 flex-col items-center gap-2 px-3" style="width: 128px">
            <!-- Straight or curved arrow -->
            <svg
              width="80"
              height="24"
              viewBox="0 0 80 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="{isContinuous ? 'text-violet-500' : 'text-neutral-500'} transition-colors"
            >
              {#if isContinuous}
                <!-- S-curve path for continuous transition -->
                <path
                  d="M 0,12 C 20,2 60,22 80,12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  fill="none"
                  stroke-linecap="round"
                />
                <polyline
                  points="71,7 80,12 71,17"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              {:else}
                <!-- Straight arrow for stop-to-stop -->
                <line x1="0" y1="12" x2="68" y2="12" stroke="currentColor" stroke-width="1.5" />
                <polyline
                  points="60,6 72,12 60,18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              {/if}
            </svg>

            <!-- Duration -->
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={tr.duration}
              onchange={(e) => handleDurationChange(i, e.currentTarget.value)}
              onclick={(e) => e.stopPropagation()}
              class="w-16 [appearance:textfield] rounded bg-neutral-800 px-2 py-1 text-center text-xs text-neutral-300 focus:ring-1 focus:ring-neutral-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              title="Transition duration (seconds)"
            />

            <!-- Easing -->
            <select
              value={tr.easing}
              onchange={(e) => handleEasingChange(i, e.currentTarget.value)}
              onclick={(e) => e.stopPropagation()}
              class="w-full rounded bg-neutral-800 px-1 py-1 text-center text-xs text-neutral-300 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
            >
              {#each Object.entries(EASING_LABELS) as [value, label]}
                <option
                  {value}
                  selected={tr.easing === value}
                  disabled={isEdgeArrow && value === 'continuous'}>{label}</option
                >
              {/each}
            </select>
          </div>
        {/if}
      {/each}

      <!-- Add Slide card -->
      <button
        class="ml-4 flex aspect-video w-48 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-700 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
        onclick={() => onNewSlide(slides.length - 1)}
      >
        <span class="text-2xl font-light">+</span>
        <span class="text-xs">Add Slide</span>
      </button>
    {/if}
  </div>
</div>
