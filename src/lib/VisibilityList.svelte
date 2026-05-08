<script>
  import { readVisibility } from './captureState.svelte.js'

  let { items, overrides, onToggle } = $props()
</script>

<ul class="flex flex-col gap-1">
  {#each items as item (item.id)}
    <li class="flex items-center justify-between gap-2">
      <span class="truncate" title={item.name}>{item.name}</span>
      <input
        checked={readVisibility(overrides, item)}
        onchange={(e) => onToggle(item, e.currentTarget.checked)}
        type="checkbox"
      />
    </li>
  {/each}
</ul>
