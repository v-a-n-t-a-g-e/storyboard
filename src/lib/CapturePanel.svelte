<script>
  import VisibilityList from './VisibilityList.svelte'

  let {
    manifest,
    fov,
    projectionRef = $bindable(),
    objectVis,
    projectionVis,
    onFovChange,
    onToggleObject,
    onToggleProjection,
  } = $props()
</script>

<div
  class="pointer-events-auto absolute top-4 right-5 flex max-h-[calc(100vh-5rem)] w-64 flex-col gap-5 overflow-y-auto bg-white px-5 py-2.5 text-xs"
>
  <section>
    <div class="mb-1 text-neutral-600">Field of view</div>
    <div class="flex items-center gap-2 disabled:opacity-40" class:opacity-40={projectionRef}>
      <input
        class="flex-1"
        disabled={!!projectionRef}
        max="120"
        min="10"
        oninput={(e) => onFovChange(Number(e.currentTarget.value))}
        step="1"
        type="range"
        value={fov}
      />
      <input
        class="w-14 framed-2.5 px-1.5 py-0.5 text-right focus:outline-none"
        disabled={!!projectionRef}
        max="120"
        min="10"
        oninput={(e) => onFovChange(Number(e.currentTarget.value))}
        step="1"
        type="number"
        value={fov}
      />
    </div>
  </section>

  {#if (manifest.projections ?? []).length > 0}
    <section>
      <div class="mb-1 text-neutral-600">Camera</div>
      <select class="w-full px-1.5 py-1 focus:outline-none" bind:value={projectionRef}>
        <option value={null}>Free camera</option>
        {#each manifest.projections as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    </section>
  {/if}

  {#if manifest.objects.length > 0}
    <section>
      <div class="mb-1 text-neutral-600">Objects</div>
      <VisibilityList items={manifest.objects} onToggle={onToggleObject} overrides={objectVis} />
    </section>
  {/if}

  {#if (manifest.projections ?? []).length > 0}
    <section>
      <div class="mb-1 text-neutral-600">Projections</div>
      <VisibilityList
        items={manifest.projections}
        onToggle={onToggleProjection}
        overrides={projectionVis}
      />
    </section>
  {/if}
</div>
