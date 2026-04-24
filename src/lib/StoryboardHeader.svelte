<script>
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'

  let { onPreview } = $props()

  let dropdownOpen = $state(true)
  let renamingId = $state(null)
  let renameValue = $state('')

  function handleSwitchBoard(id) {
    if (id === storyboard.currentId) return
    thumbnailStore.disposeViewer()
    storyboard.openBoard(id)
    thumbnailStore.generateAll(project.handle, storyboard.current.slides)
  }

  function startRename(id, name) {
    renamingId = id
    renameValue = name
  }

  async function commitRename() {
    if (renamingId && renameValue.trim()) {
      await storyboard.renameBoard(project.handle, renamingId, renameValue.trim())
    }
    renamingId = null
  }

  async function handleDeleteBoard(id) {
    if (storyboard.all.length <= 1) return
    await storyboard.deleteBoard(project.handle, id)
    if (!storyboard.current) {
      const next = storyboard.latestId()
      if (next) {
        storyboard.openBoard(next)
        thumbnailStore.generateAll(project.handle, storyboard.current.slides)
      }
    }
  }

  async function handleDuplicateBoard(id) {
    thumbnailStore.disposeViewer()
    await storyboard.duplicateBoard(project.handle, id)
    thumbnailStore.generateAll(project.handle, storyboard.current.slides)
  }

  async function handleCreateBoard() {
    thumbnailStore.disposeViewer()
    await storyboard.createBoard(project.handle, 'Untitled')
    renamingId = storyboard.currentId
    renameValue = 'Untitled'
    thumbnailStore.generateAll(project.handle, storyboard.current.slides)
  }

  function focusSelect(node) {
    node.focus()
    node.select()
  }

  async function handleSave() {
    await storyboard.save(project.handle)
    await project.save()
  }

  function handleBack() {
    if (storyboard.dirty && !confirm('You have unsaved changes. Close the project anyway?')) return
    thumbnailStore.disposeViewer()
    storyboard.reset()
    project.close()
  }
</script>

<header class="flex flex-col px-5">
  <div class="flex items-center gap-1 py-2.5">
    <div class="h-px w-5 bg-black"></div>
    <button
      class="flex cursor-pointer items-center gap-1.5 px-1.5 hover:bg-brand/20"
      onclick={(e) => {
        e.stopPropagation()
        dropdownOpen = !dropdownOpen
      }}
    >
      {project.handle.name} <span class="h-px w-2.5 bg-black"></span>
      {storyboard.current?.name ?? ''}
    </button>
    <div class="h-px flex-1 bg-black"></div>
    <button
      class="flex cursor-pointer items-center gap-1.5 px-1 hover:bg-brand/20 disabled:pointer-events-none disabled:text-neutral-300"
      disabled={(storyboard.current?.slides.length ?? 0) < 2}
      onclick={onPreview}
    >
      <span class="text-xs">▶</span> Preview
    </button>
    <div class="h-px w-5 bg-black"></div>
  </div>
  {#if dropdownOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <section class="flex gap-5 px-6" onclick={(e) => e.stopPropagation()}>
      <div class="flex min-w-48 flex-col items-start gap-1.5">
        <span class="px-1.5 text-xs text-neutral-600">Project</span>
        <button class="cursor-pointer px-1.5 hover:bg-brand/20" onclick={handleCreateBoard}>
          New storyboard
        </button>
        <button class="cursor-pointer px-1.5 hover:bg-brand/20" onclick={handleSave}>
          Save
          {#if storyboard.dirty}
            <span class="text-brand">●</span>
          {/if}
        </button>
        <button class="cursor-pointer px-1.5 hover:bg-brand/20" onclick={handleBack}>
          Close
        </button>
      </div>

      <div class="flex flex-col items-start gap-1.5">
        <span class="px-1.5 text-xs text-neutral-600">Storyboards</span>
        <ul class="flex flex-wrap gap-2">
          {#each storyboard.all as board (board.id)}
            {@const selected = board.id === storyboard.currentId}
            <li>
              {#if selected}
                <div class="flex flex-col gap-1 bg-brand/20 px-1.5 py-1">
                  {#if renamingId === board.id}
                    <input
                      class="bg-brand/20 outline-none"
                      onblur={commitRename}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') renamingId = null
                      }}
                      type="text"
                      bind:value={renameValue}
                      use:focusSelect
                    />
                  {:else}
                    <span class="overflow-hidden text-nowrap text-ellipsis">{board.name}</span>
                  {/if}
                  <div
                    class="flex gap-1 text-xs text-[color-mix(in_srgb,var(--color-brand)_40%,black)]"
                  >
                    <button
                      class="cursor-pointer hover:text-black hover:underline"
                      onclick={() => startRename(board.id, board.name)}>Rename</button
                    >
                    <span>|</span>
                    <button
                      class="cursor-pointer hover:text-black hover:underline"
                      onclick={() => handleDuplicateBoard(board.id)}>Duplicate</button
                    >
                    <span>|</span>
                    <button
                      class="cursor-pointer hover:text-pink-600 hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={storyboard.all.length <= 1}
                      onclick={() => handleDeleteBoard(board.id)}>Delete</button
                    >
                  </div>
                </div>
              {:else}
                <button
                  class="flex cursor-pointer flex-col gap-1 bg-neutral-100 px-1.5 py-1 text-left hover:bg-brand/20"
                  onclick={() => handleSwitchBoard(board.id)}
                >
                  <span class="overflow-hidden text-nowrap text-ellipsis">{board.name}</span>
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}
</header>
