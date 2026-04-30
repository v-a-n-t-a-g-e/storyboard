<script>
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'
  import { thumbnailStore } from './thumbnails.svelte.js'
  import { exportStaticSite } from './exportStaticSite.js'
  import BoardListMenu from './BoardListMenu.svelte'

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
    await storyboard.deleteBoard(project.handle, id)
    if (!storyboard.current) {
      const next = storyboard.latestId()
      if (next) {
        storyboard.openBoard(next)
        thumbnailStore.generateAll(project.handle, storyboard.current.slides)
      } else {
        await storyboard.createBoard(project.handle, 'Untitled')
        renamingId = storyboard.currentId
        renameValue = 'Untitled'
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
      class="flex cursor-pointer items-center gap-1.5 px-1 text-time hover:bg-time/20 disabled:pointer-events-none disabled:text-neutral-300"
      disabled={(storyboard.current?.slides.length ?? 0) < 2}
      onclick={() => onPreview('time')}
    >
      <span class="text-xs">▶</span> Preview
    </button>
    <div class="h-px w-5 bg-black"></div>
    <button
      class="flex cursor-pointer items-center gap-1.5 px-1 text-scroll hover:bg-scroll/20 disabled:pointer-events-none disabled:text-neutral-300"
      disabled={(storyboard.current?.slides.length ?? 0) < 2}
      onclick={() => onPreview('scroll')}
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

      <div class="flex min-w-48 flex-col items-start gap-1.5">
        <span class="px-1.5 text-xs text-neutral-600">Export</span>
        <button
          class="cursor-pointer px-1.5 text-time hover:bg-time/20 disabled:pointer-events-none disabled:opacity-40"
          disabled={(storyboard.current?.slides.length ?? 0) < 2}
          onclick={() => exportStaticSite('slideshow')}
        >
          Slideshow
        </button>
        <button
          class="cursor-pointer px-1.5 text-scroll hover:bg-scroll/20 disabled:pointer-events-none disabled:opacity-40"
          disabled={(storyboard.current?.slides.length ?? 0) < 2}
          onclick={() => exportStaticSite('scrolly')}
        >
          Scrollytelling
        </button>
        <button
          class="cursor-pointer px-1.5 opacity-40 hover:bg-brand/20"
          disabled
          title="Coming soon"
        >
          Camera
        </button>
      </div>

      <BoardListMenu
        boards={storyboard.all}
        currentId={storyboard.currentId}
        onCancelRename={() => (renamingId = null)}
        onCommitRename={commitRename}
        onDelete={handleDeleteBoard}
        onDuplicate={handleDuplicateBoard}
        onStartRename={startRename}
        onSwitch={handleSwitchBoard}
        {renamingId}
        bind:renameValue
      />
    </section>
  {/if}
</header>
