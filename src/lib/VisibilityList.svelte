<script>
  import { readVisibility } from './captureState.svelte.js'
  import Hide from '../assets/Hide.svg'
  import Show from '../assets/Show.svg'
  import Attach from '../assets/Attach.svg'

  let { items, overrides, onToggle, onAim = null, activeAimId = null } = $props()
</script>

<ul class="flex flex-col gap-1">
  {#each items as item (item.id)}
    {@const visible = readVisibility(overrides, item)}
    {@const active = activeAimId === item.id || null}
    <li class="flex items-center justify-between gap-2">
      <span class="truncate {!visible && 'text-black/30'}" title={item.name}>{item.name}</span>
      <div class="flex shrink-0 items-center gap-2">
        {#if onAim}
          <button
            class="group cursor-pointer text-black/30 transition hover:text-brand-dark"
            class:text-brand-dark!={active}
            onclick={() => onAim(item)}
            title={active ? 'Detach camera' : 'Attach camera'}
          >
            <Attach />
          </button>
        {/if}
        <button
          class="group cursor-pointer text-black/30 transition hover:text-brand-dark"
          class:text-black!={visible}
          onclick={() => onToggle(item, !visible)}
          title={visible ? 'Hide' : 'Show'}
        >
          {#if visible}
            <Show />
          {:else}
            <Hide />
          {/if}
        </button>
      </div>
    </li>
  {/each}
</ul>
