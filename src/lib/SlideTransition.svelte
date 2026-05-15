<script>
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'
  import Delete from '../assets/Delete.svg'

  let { slide, index, isFirst, isLast } = $props()

  const tr = $derived(slide.transition ?? { duration: 1, vh: 75, continuous: false })
  const isContinuous = $derived(tr.continuous)

  function handleDurationChange(raw) {
    const duration = Math.max(0, parseFloat(raw) || 0)
    storyboard.updateTransition(index, { ...tr, duration })
  }

  function handleVhChange(raw) {
    const vh = Math.max(1, parseInt(raw) || 75)
    storyboard.updateTransition(index, { ...tr, vh })
  }

  function toggleContinuous() {
    storyboard.updateTransition(index, { ...tr, continuous: !tr.continuous })
  }
</script>

<div
  class="flex h-full w-25 flex-col justify-center gap-2.5 py-1.5 pl-2.5 transition-colors"
  data-continous={isContinuous || null}
  data-first={isFirst || null}
  data-last={isLast || null}
>
  {#if !isLast}
    <label class="flex h-7.5 w-20 items-center framed-2.5 px-2 py-1 text-time">
      <span class="w-5 text-xs">s</span>
      <input
        class="w-10 [appearance:textfield] px-1 py-0.5 text-right text-xs text-black focus:bg-white focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        min="0"
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
    </label>
  {/if}

  <button
    class="absolute top-3.5 right-3.5 flex h-5 w-5 items-center justify-center not-group-hover/card:invisible hover:text-pink-600"
    onclick={(e) => {
      e.stopPropagation()
      storyboard.deleteSlide(index)
    }}
  >
    <Delete />
  </button>
  <div class="flex h-5 w-30 in-data-continous:w-40">
    <svg
      class="group/arrow overflow-visible hover:text-brand in-data-first:pointer-events-none in-data-last:pointer-events-none {!isLast
        ? 'cursor-pointer'
        : ''} h-5 w-25 in-data-continous:w-35"
      onclick={!isLast && !isFirst
        ? (e) => {
            e.stopPropagation()
            toggleContinuous()
          }
        : undefined}
      role={!isLast && !isFirst ? 'button' : undefined}
      title={!isLast && !isFirst
        ? isContinuous
          ? 'Continuous (click to use transition)'
          : 'Transition (click for continuous)'
        : undefined}
    >
      <g fill="none" stroke="currentColor">
        <rect
          class="not-in-data-continous:invisible"
          height="20"
          pointer-events="all"
          stroke="none"
          width="50"
          x="-180"
        />
        <path
          class="not-in-data-continous:invisible group-hover/arrow:invisible"
          d="M-178,5 L-173,10 L-178,15 M-168,5 L-163,10 L-168,15 M-158,5 L-153,10 L-158,15 M-148,5 L-143,10 L-148,15 M2,5 L7,10 L2,15 M12,5 L17,10 L12,15 M22,5 L27,10 L22,15 M32,5 L37,10 L32,15 M42,5 L47,10 L42,15 M52,5 L57,10 L52,15 M62,5 L67,10 L62,15 M72,5 L77,10 L72,15 M82,5 L87,10 L82,15 M92,5 L97,10 L92,15 M102,5 L107,10 L102,15 M112,5 L117,10 L112,15 M122,5 L127,10 L122,15 M132,5 L137,10 L132,15"
        />
        <path
          class="not-group-hover/arrow:invisible not-in-data-continous:invisible"
          d="M-178,10 L-143,10 M0,10 L137,10 M132,5 L137,10 L132,15"
        />
        <path
          class="group-hover/arrow:invisible in-data-continous:invisible in-data-last:invisible"
          d="M0,10 L97,10 M92,5 L97,10 L92,15"
        />
        <path
          class="not-in-data-last:invisible group-hover/arrow:invisible in-data-continous:invisible"
          d="M0,10 L97,10 M97,5 L97,15"
        />
        <path
          class="not-group-hover/arrow:invisible in-data-continous:invisible"
          d="M2,5 L7,10 L2,15 M12,5 L17,10 L12,15 M22,5 L27,10 L22,15 M32,5 L37,10 L32,15 M42,5 L47,10 L42,15 M52,5 L57,10 L52,15 M62,5 L67,10 L62,15 M72,5 L77,10 L72,15 M82,5 L87,10 L82,15 M92,5 L97,10 L92,15"
        />
      </g>
    </svg>

    <button
      aria-label="add slide"
      onclick={(e) => {
        e.stopPropagation()
        const newId = storyboard.duplicateSlide(index)
        if (newId && thumbnailStore.thumbnails[slide.id]) {
          thumbnailStore.thumbnails[newId] = thumbnailStore.thumbnails[slide.id]
        }
      }}
    >
      <svg class="h-5 w-5 hover:text-brand" fill="none" stroke="currentColor">
        <path
          class="invisible group-hover/card:visible in-data-last:visible"
          d="M10,2.5 L10,17.5 M2.5,10 L17.5,10"
        />
      </svg>
    </button>
  </div>
  {#if !isLast}
    <label class="flex h-7.5 w-20 items-center framed-2.5 px-2 py-1 text-scroll">
      <span class="w-5 text-xs">vh</span>
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
        value={tr.vh ?? 75}
      />
    </label>
  {/if}
</div>
