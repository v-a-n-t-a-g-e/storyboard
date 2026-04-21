<script>
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'

  let dropdownOpen = $state(false)
  let renamingId = $state(null)
  let renameValue = $state('')
  let newBoardName = $state('')
  let showNewBoardInput = $state(false)

  function closeDropdown() {
    dropdownOpen = false
    renamingId = null
    showNewBoardInput = false
  }

  function handleSwitchBoard(id) {
    if (id === storyboard.currentId) {
      closeDropdown()
      return
    }
    if (storyboard.dirty && !confirm('You have unsaved changes. Switch storyboard anyway?')) return
    thumbnailStore.disposeViewer()
    storyboard.openBoard(id)
    thumbnailStore.generateAll(project.handle, storyboard.current.slides)
    dropdownOpen = false
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

  async function handleCreateBoard() {
    const name = newBoardName.trim() || 'Untitled'
    thumbnailStore.disposeViewer()
    await storyboard.createBoard(project.handle, name)
    newBoardName = ''
    showNewBoardInput = false
    dropdownOpen = false
    thumbnailStore.generateAll(project.handle, storyboard.current.slides)
  }

  function focusSelect(node) {
    node.focus()
    node.select()
  }
</script>

<svelte:window onclick={closeDropdown} />

<div class="relative">
  <button
    class="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
    onclick={(e) => {
      e.stopPropagation()
      dropdownOpen = !dropdownOpen
    }}
  >
    {storyboard.current?.name ?? ''}
    <span class="text-xs text-neutral-500">▾</span>
  </button>

  {#if dropdownOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="absolute top-full left-0 z-50 mt-1 w-64 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl"
      onclick={(e) => e.stopPropagation()}
    >
      <ul class="py-1">
        {#each storyboard.all as board (board.id)}
          <li
            class="flex items-center gap-1 px-2 py-0.5 {board.id === storyboard.currentId
              ? 'bg-neutral-800'
              : ''}"
          >
            {#if renamingId === board.id}
              <input
                class="flex-1 rounded bg-neutral-700 px-2 py-1 text-sm text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-500"
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
              <button
                class="flex-1 cursor-pointer truncate rounded px-2 py-1 text-left text-sm transition hover:bg-neutral-700
                  {board.id === storyboard.currentId ? 'text-neutral-100' : 'text-neutral-400'}"
                onclick={() => handleSwitchBoard(board.id)}
              >
                {#if board.id === storyboard.currentId}<span class="mr-1 text-blue-400">●</span
                  >{/if}{board.name}
              </button>
            {/if}
            <button
              class="shrink-0 cursor-pointer rounded p-1 text-xs text-neutral-500 transition hover:bg-neutral-700 hover:text-neutral-200"
              onclick={() => startRename(board.id, board.name)}
              title="Rename">✎</button
            >
            <button
              class="shrink-0 cursor-pointer rounded p-1 text-xs text-neutral-500 transition hover:bg-red-600/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              disabled={storyboard.all.length <= 1}
              onclick={() => handleDeleteBoard(board.id)}
              title="Delete">×</button
            >
          </li>
        {/each}
      </ul>
      <div class="border-t border-neutral-700 p-2">
        {#if showNewBoardInput}
          <form
            class="flex gap-2"
            onsubmit={(e) => {
              e.preventDefault()
              handleCreateBoard()
            }}
          >
            <input
              class="flex-1 rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:ring-1 focus:ring-neutral-600"
              onkeydown={(e) => e.key === 'Escape' && (showNewBoardInput = false)}
              placeholder="Board name"
              type="text"
              bind:value={newBoardName}
            />
            <button
              class="cursor-pointer rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-600"
              type="submit">Create</button
            >
          </form>
        {:else}
          <button
            class="w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
            onclick={() => (showNewBoardInput = true)}>+ New storyboard</button
          >
        {/if}
      </div>
    </div>
  {/if}
</div>
