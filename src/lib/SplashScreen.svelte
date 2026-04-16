<script>
  import { project } from './project.svelte.js'
  import { onMount } from 'svelte'

  onMount(() => {
    project.refreshRecents()
  })
</script>

<div class="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
  <div class="w-full max-w-sm space-y-8 px-6">
    <div class="text-center">
      <h1 class="text-3xl font-semibold tracking-tight">Narrator</h1>
      <p class="mt-2 text-sm text-neutral-400">Storyboard tool for Vantage</p>
    </div>

    <div class="space-y-3">
      {#if project.hasNativeFS}
        <button
          class="w-full cursor-pointer rounded-lg bg-neutral-800 px-4 py-3 text-sm font-medium transition hover:bg-neutral-700"
          onclick={() => project.open()}
        >
          Open Folder
        </button>
      {/if}

      <button
        class="w-full cursor-pointer rounded-lg bg-neutral-800 px-4 py-3 text-sm font-medium transition hover:bg-neutral-700"
        onclick={() => project.importFile()}
      >
        Import File
      </button>
    </div>

    {#if project.recents.length > 0}
      <div>
        <h2 class="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Recent Projects
        </h2>
        <ul class="space-y-1">
          {#each project.recents as recent, index (index)}
            <li>
              <button
                class="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition hover:bg-neutral-800"
                onclick={() => project.openRecent(recent)}
              >
                {recent.name}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <p class="text-center text-xs text-neutral-600">
      or drag and drop a project folder, ZIP, or GLB file
    </p>
  </div>
</div>
