<script>
  let {
    boards,
    currentId,
    renamingId,
    renameValue = $bindable(''),
    onSwitch,
    onStartRename,
    onCommitRename,
    onCancelRename,
    onDuplicate,
    onDelete,
  } = $props()

  function focusSelect(node) {
    node.focus()
    node.select()
  }
</script>

<div class="flex flex-col items-start gap-1.5">
  <span class="px-1.5 text-xs text-neutral-600">Storyboards</span>
  <ul class="flex flex-wrap gap-2">
    {#each boards as board (board.id)}
      {@const selected = board.id === currentId}
      <li>
        {#if selected}
          <div class="flex flex-col gap-1 bg-brand/20 px-1.5 py-1">
            {#if renamingId === board.id}
              <input
                class="bg-brand/20 outline-none"
                onblur={onCommitRename}
                onkeydown={(e) => {
                  if (e.key === 'Enter') onCommitRename()
                  if (e.key === 'Escape') onCancelRename()
                }}
                type="text"
                bind:value={renameValue}
                use:focusSelect
              />
            {:else}
              <span class="overflow-hidden text-nowrap text-ellipsis">{board.name}</span>
            {/if}
            <div class="flex gap-1 text-xs text-brand-deep">
              <button
                class="cursor-pointer hover:text-black hover:underline"
                onclick={() => onStartRename(board.id, board.name)}>Rename</button
              >
              <span>|</span>
              <button
                class="cursor-pointer hover:text-black hover:underline"
                onclick={() => onDuplicate(board.id)}>Duplicate</button
              >
              <span>|</span>
              <button
                class="cursor-pointer hover:text-pink-600 hover:underline"
                onclick={() => onDelete(board.id)}>Delete</button
              >
            </div>
          </div>
        {:else}
          <button
            class="flex cursor-pointer flex-col gap-1 bg-neutral-100 px-1.5 py-1 text-left hover:bg-brand/20"
            onclick={() => onSwitch(board.id)}
          >
            <span class="overflow-hidden text-nowrap text-ellipsis">{board.name}</span>
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</div>
