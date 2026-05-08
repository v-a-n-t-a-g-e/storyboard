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

  function onAimProjection(item) {
    projectionRef = projectionRef === item.id ? null : item.id
  }
</script>

<div
  class="pointer-events-auto absolute top-5 right-5 flex max-h-[calc(100vh-5rem)] w-64 flex-col gap-5 overflow-y-auto"
>
  <div class="flex flex-col gap-5 bg-white px-5 py-5">
    {#if manifest.objects.length > 0}
      <section>
        <div class="mb-1 text-xs text-neutral-600">Objects</div>
        <VisibilityList items={manifest.objects} onToggle={onToggleObject} overrides={objectVis} />
      </section>
    {/if}

    {#if (manifest.projections ?? []).length > 0}
      <section>
        <div class="mb-1 text-xs text-neutral-600">Projections</div>
        <VisibilityList
          activeAimId={projectionRef}
          items={manifest.projections}
          onAim={onAimProjection}
          onToggle={onToggleProjection}
          overrides={projectionVis}
        />
      </section>
    {/if}
  </div>

  {#if !projectionRef}
    <section class="bg-white px-5 py-5">
      <div class="flex items-center justify-between gap-2 text-xs text-neutral-600">
        <div class="">Field of view</div>

        <!-- <input
        class="flex-1"
        disabled={!!projectionRef}
        max="120"
        min="10"
        oninput={(e) => onFovChange(Number(e.currentTarget.value))}
        step="1"
        type="range"
        value={fov}
      /> -->
        <input
          class="w-20 [appearance:textfield] framed-2.5 px-1.5 py-0.5 text-right text-base focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
  {/if}
</div>
