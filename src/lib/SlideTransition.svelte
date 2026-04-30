<script>
  import { storyboard } from './storyboard.svelte.js'

  let { slide, index, isLast } = $props()

  const tr = $derived(slide.transition ?? { duration: 1, vh: 30, continuous: false })
  const isContinuous = $derived(tr.continuous)

  function handleDurationChange(raw) {
    const duration = Math.max(0.1, parseFloat(raw) || 1)
    storyboard.updateTransition(index, { ...tr, duration })
  }

  function handleVhChange(raw) {
    const vh = Math.max(1, parseInt(raw) || 30)
    storyboard.updateTransition(index, { ...tr, vh })
  }

  function toggleContinuous() {
    storyboard.updateTransition(index, { ...tr, continuous: !tr.continuous })
  }

  const chevronOffsets = [-12.5, -25, -37.5, -50, -62.5, -75, -87.5]
</script>

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
      {#each chevronOffsets as offset (offset)}
        <path
          d="M102.5,2.5 L110,10 L102.5,17.5"
          fill="none"
          stroke="currentColor"
          transform="translate({offset})"
        ></path>
      {/each}
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
