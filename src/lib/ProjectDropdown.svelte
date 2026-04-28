<script>
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'

  let dropdownOpen = $state(false)
  let renamingId = $state(null)
  let renameValue = $state('')
  let contextMenuId = $state(null)

  function closeDropdown() {
    dropdownOpen = false
    renamingId = null
    contextMenuId = null
  }

  function handleSwitchBoard(id) {
    if (id === storyboard.currentId) {
      closeDropdown()
      return
    }
    thumbnailStore.disposeViewer()
    storyboard.openBoard(id)
    thumbnailStore.generateAll(project.handle, storyboard.current.slides)
    dropdownOpen = false
  }

  function startRename(id, name) {
    renamingId = id
    renameValue = name
    contextMenuId = null
  }

  async function commitRename() {
    if (renamingId && renameValue.trim()) {
      await storyboard.renameBoard(project.handle, renamingId, renameValue.trim())
    }
    renamingId = null
  }

  async function handleDeleteBoard(id) {
    if (storyboard.all.length <= 1) return
    contextMenuId = null
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
    contextMenuId = null
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
</script>

<svelte:window onclick={closeDropdown} />

<div class="relative">
  <button
    class="-mx-1 flex cursor-pointer items-center gap-1.5 px-1 hover:bg-brand/20"
    onclick={(e) => {
      e.stopPropagation()
      dropdownOpen = !dropdownOpen
    }}
  >
    {project.handle.name} / {storyboard.current?.name ?? ''}
    <span class="text-xs">▾</span>
  </button>

  {#if dropdownOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="absolute top-full left-0 z-50 -mx-2.5 mt-1 w-64 overflow-hidden border bg-white"
      onclick={(e) => e.stopPropagation()}
    >
      <ul>
        {#each storyboard.all as board (board.id)}
          <li
            class="relative flex items-center gap-1 px-2.5 py-1 {board.id === storyboard.currentId
              ? 'bg-brand/20'
              : ''}"
          >
            {#if renamingId === board.id}
              <input
                class="flex-1 py-1 outline-none"
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
                class="flex-1 cursor-pointer truncate py-1 text-left"
                onclick={() => handleSwitchBoard(board.id)}
              >
                {board.name}
              </button>
            {/if}
            {#if board.id === storyboard.currentId}
              <div class="relative">
                <button
                  class="shrink-0 cursor-pointer px-1 py-1 text-neutral-400 hover:text-neutral-700"
                  onclick={(e) => {
                    e.stopPropagation()
                    contextMenuId = contextMenuId === board.id ? null : board.id
                  }}>…</button
                >
                {#if contextMenuId === board.id}
                  <div class="absolute top-full right-0 z-50 w-32 border bg-white shadow-md">
                    <button
                      class="w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-brand/10"
                      onclick={() => startRename(board.id, board.name)}>Rename</button
                    >
                    <button
                      class="w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-brand/10"
                      onclick={() => handleDuplicateBoard(board.id)}>Duplicate</button
                    >
                    <button
                      class="w-full cursor-pointer px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={storyboard.all.length <= 1}
                      onclick={() => handleDeleteBoard(board.id)}>Delete</button
                    >
                  </div>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
      <div class="border-t p-2">
        <button
          class="w-full cursor-pointer px-2.5 py-1 text-left hover:bg-brand/10"
          onclick={handleCreateBoard}>+ New storyboard</button
        >
      </div>
    </div>
  {/if}
</div>
