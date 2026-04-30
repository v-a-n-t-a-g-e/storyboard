<script>
  import VisibilityList from './VisibilityList.svelte'

  let {
    manifest,
    fov,
    projectionRef = $bindable(),
    objectVis,
    projectionVis,
    onFovChange,
    onPose,
    onToggleObject,
    onToggleProjection,
  } = $props()
</script>

<div
  class="pointer-events-auto absolute right-4 top-16 flex max-h-[calc(100vh-6rem)] w-72 flex-col gap-4 overflow-y-auto rounded-md bg-neutral-900/85 p-4 text-xs text-neutral-200 backdrop-blur"
>
  <section>
    <div class="mb-1 text-neutral-400">Field of view</div>
    <div class="flex items-center gap-2">
      <input
        class="flex-1"
        max="120"
        min="10"
        oninput={(e) => onFovChange(Number(e.currentTarget.value))}
        step="1"
        type="range"
        value={fov}
      />
      <input
        class="w-14 rounded bg-neutral-800 px-1.5 py-0.5 text-right"
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
      <div class="mb-1 text-neutral-400">Camera from projection</div>
      <div class="flex items-center gap-2">
        <select
          class="flex-1 rounded bg-neutral-800 px-1.5 py-1 text-neutral-100"
          bind:value={projectionRef}
        >
          <option value={null}>(none — manual)</option>
          {#each manifest.projections as p (p.id)}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
        <button
          class="cursor-pointer rounded bg-neutral-800 px-2 py-1 text-neutral-300 transition hover:bg-neutral-700 disabled:opacity-40"
          disabled={!projectionRef}
          onclick={onPose}
          title="Snap viewer camera to projection pose"
        >
          Pose
        </button>
      </div>
    </section>
  {/if}

  {#if manifest.objects.length > 0}
    <section>
      <div class="mb-1 text-neutral-400">Objects</div>
      <VisibilityList items={manifest.objects} onToggle={onToggleObject} overrides={objectVis} />
    </section>
  {/if}

  {#if (manifest.projections ?? []).length > 0}
    <section>
      <div class="mb-1 text-neutral-400">Projections</div>
      <VisibilityList
        items={manifest.projections}
        onToggle={onToggleProjection}
        overrides={projectionVis}
      />
    </section>
  {/if}
</div>
