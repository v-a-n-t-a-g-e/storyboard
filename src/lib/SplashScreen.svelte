<script>
  import { project } from './project.svelte.js'
  import { onMount } from 'svelte'

  onMount(() => {
    project.refreshRecents()
  })

  let dragCount = $state(0)

  function isFileDrag(e) {
    return e.dataTransfer?.types?.includes('Files') ?? false
  }

  function handleDragEnter(e) {
    if (isFileDrag(e)) dragCount++
  }

  function handleDragLeave(e) {
    if (isFileDrag(e)) dragCount--
  }

  function handleDragOver(e) {
    if (isFileDrag(e)) e.preventDefault()
  }

  async function handleDrop(e) {
    if (!isFileDrag(e)) return
    e.preventDefault()
    dragCount = 0
    await project.drop(e)
  }

  function friendlyError(msg) {
    if (msg.startsWith('Unsupported file type'))
      return 'Unsupported file type. Only .zip, .glb, and .gltf files are supported.'
    if (msg.startsWith('Not a valid Vantage project')) return 'Not a valid Vantage project.'
    return 'Failed to open file.'
  }
</script>

<svelte:window
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
/>

<header class="flex items-center gap-2.5 px-5 py-2.5">
  <div class="h-px w-5 bg-black"></div>
  <h1 class="py-0.75 text-nowrap">Vantage Storyboard</h1>
  <div class="h-px flex-1 bg-black"></div>
</header>
<div class="m-5 mt-20 flex flex-col justify-center sm:flex-row">
  <div
    class="flex min-h-50 w-full max-w-75 flex-col space-y-10 border p-10 {dragCount > 0
      ? 'bg-brand/20'
      : ''}"
  >
    {#if project.loading}
      <p class="text-neutral-600">Opening…</p>
    {:else if project.error}
      <div>
        <p class="text-balance text-pink-600">{friendlyError(project.error)}</p>
        <button class="cursor-pointer hover:bg-brand/20" onclick={() => project.clearError()}>
          Try again
        </button>
      </div>
    {:else if dragCount === 0}
      <p class="text-balance">Drop a Vantage project folder, ZIP, or GLB/GLTF file</p>

      <div class=" text-xs text-neutral-600">
        or pick a
        <button class="cursor-pointer underline hover:bg-brand/20" onclick={() => project.open()}>
          folder
        </button>
        /
        <button
          class="cursor-pointer underline hover:bg-brand/20"
          onclick={() => project.importFile()}
        >
          file
        </button>
        to open
      </div>
    {:else}
      <p class="text-balance">Drop anywhere</p>
    {/if}
  </div>
  {#if project.recents.length > 0}
    <div class=" flex w-full max-w-100 flex-col items-start space-y-2.5 bg-black p-10 text-white">
      <h2 class="text-xs">Recent Projects</h2>
      <div class="flex flex-wrap gap-x-2">
        {#each project.recents as recent, index (index)}
          <button
            class="-mx-1 max-w-82 min-w-0 cursor-pointer overflow-hidden px-1 text-nowrap text-ellipsis after:content-[','] last-of-type:after:content-none hover:bg-brand-bright hover:text-black"
            onclick={() => project.openRecent(recent)}
          >
            {recent.name}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
