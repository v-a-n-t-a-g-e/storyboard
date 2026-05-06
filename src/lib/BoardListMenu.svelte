<script>
  import Delete from '../assets/Delete.svg'
  import Duplicate from '../assets/Duplicate.svg'
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

<div class="flex flex-col items-start gap-0.5">
  <span class="px-2.5 text-xs text-neutral-600">Storyboards</span>
  <ul class="flex flex-wrap gap-2.5">
    {#each boards as board (board.id)}
      {@const selected = board.id === currentId}
      <li>
        {#if selected}
          <div class="flex flex-col gap-1 framed-2.5 px-2.5 py-0.75 text-brand">
            {#if renamingId === board.id}
              <input
                class="text-black outline-none"
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
              <div class="flex gap-2 text-black">
                <button
                  class="overflow-hidden text-start text-nowrap text-ellipsis"
                  onclick={() => onStartRename(board.id, board.name)}>{board.name}</button
                >

                <button
                  class="cursor-pointer hover:text-brand"
                  onclick={() => onDuplicate(board.id)}><Duplicate /></button
                >

                <button
                  class="cursor-pointer hover:text-pink-600"
                  onclick={() => onDelete(board.id)}><Delete /></button
                >
              </div>
            {/if}
          </div>
        {:else}
          <button
            class="flex cursor-pointer flex-col gap-1 framed-2.5 px-2.5 py-0.75 text-left hover:text-brand"
            onclick={() => onSwitch(board.id)}
          >
            <span class="overflow-hidden text-nowrap text-ellipsis text-black">{board.name}</span>
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</div>
