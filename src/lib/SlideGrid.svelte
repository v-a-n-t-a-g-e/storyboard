<script>
	import { onMount } from 'svelte'
	import { project } from './project.svelte.js'
	import { storyboard } from './storyboard.svelte.js'
	import { thumbnailStore } from './thumbnails.svelte.js'

	let { onOpenSlide, onNewSlide, onPreview } = $props()

	// DnD state
	let dragFromIndex = $state(null)
	let dropPosition = $state(null) // 0–N insertion point

	// Storyboard dropdown state
	let dropdownOpen = $state(false)
	let renamingId = $state(null)
	let renameValue = $state('')
	let newBoardName = $state('')
	let showNewBoardInput = $state(false)

	const EASING_LABELS = {
		'ease-in-out': 'Ease In-Out',
		'ease-in': 'Ease In',
		'ease-out': 'Ease Out',
		linear: 'Linear',
		continuous: 'Continuous',
	}

	onMount(() => {
		thumbnailStore.generateAll(project.handle, storyboard.current.slides)
	})

	function handleBack() {
		if (storyboard.dirty && !confirm('You have unsaved changes. Close the project anyway?')) return
		thumbnailStore.disposeViewer()
		storyboard.reset()
		project.close()
	}

	async function handleSave() {
		await storyboard.save(project.handle)
		await project.save()
	}

	function getTransition(slide) {
		return slide.transition ?? { duration: 1, easing: 'ease-in-out' }
	}

	function handleDurationChange(index, raw) {
		const duration = Math.max(0.1, parseFloat(raw) || 1)
		const t = getTransition(storyboard.current.slides[index])
		storyboard.updateTransition(index, { ...t, duration })
	}

	function handleEasingChange(index, easing) {
		const t = getTransition(storyboard.current.slides[index])
		storyboard.updateTransition(index, { ...t, easing })
	}

	// ── DnD ──────────────────────────────────────────────────────────────────

	function onDragStart(e, index) {
		dragFromIndex = index
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/plain', String(index))
	}

	function onDragOver(e, index) {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		const rect = e.currentTarget.getBoundingClientRect()
		dropPosition = e.clientX < rect.left + rect.width / 2 ? index : index + 1
	}

	function onDrop(e) {
		e.preventDefault()
		if (
			dragFromIndex !== null &&
			dropPosition !== null &&
			dropPosition !== dragFromIndex &&
			dropPosition !== dragFromIndex + 1
		) {
			storyboard.reorderSlides(dragFromIndex, dropPosition)
		}
		dragFromIndex = null
		dropPosition = null
	}

	function onDragEnd() {
		dragFromIndex = null
		dropPosition = null
	}

	// ── Storyboard dropdown ───────────────────────────────────────────────────

	function closeDropdown() {
		dropdownOpen = false
		renamingId = null
		showNewBoardInput = false
	}

	function handleSwitchBoard(id) {
		if (id === storyboard.currentId) { closeDropdown(); return }
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

	/** Svelte action: focus + select on mount */
	function focusSelect(node) {
		node.focus()
		node.select()
	}
</script>

<svelte:window onclick={closeDropdown} />

<div class="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
	<!-- Top bar -->
	<div class="relative flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
		<div class="flex items-center gap-3">
			<button
				class="cursor-pointer rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-700"
				onclick={handleBack}
			>
				&larr; Close
			</button>

			<!-- Storyboard name / dropdown trigger -->
			<div class="relative">
				<button
					class="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
					onclick={(e) => { e.stopPropagation(); dropdownOpen = !dropdownOpen }}
				>
					{storyboard.current?.name ?? ''}
					<span class="text-xs text-neutral-500">▾</span>
				</button>

				{#if dropdownOpen}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl"
						onclick={(e) => e.stopPropagation()}
					>
						<ul class="py-1">
							{#each storyboard.all as board (board.id)}
								<li class="flex items-center gap-1 px-2 py-0.5 {board.id === storyboard.currentId ? 'bg-neutral-800' : ''}">
									{#if renamingId === board.id}
										<input
											class="flex-1 rounded bg-neutral-700 px-2 py-1 text-sm text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-500"
											type="text"
											bind:value={renameValue}
											onblur={commitRename}
											onkeydown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') renamingId = null }}
											use:focusSelect
										/>
									{:else}
										<button
											class="flex-1 cursor-pointer truncate rounded px-2 py-1 text-left text-sm transition hover:bg-neutral-700
												{board.id === storyboard.currentId ? 'text-neutral-100' : 'text-neutral-400'}"
											onclick={() => handleSwitchBoard(board.id)}
										>
											{#if board.id === storyboard.currentId}<span class="mr-1 text-blue-400">●</span>{/if}{board.name}
										</button>
									{/if}
									<button
										class="shrink-0 cursor-pointer rounded p-1 text-xs text-neutral-500 transition hover:bg-neutral-700 hover:text-neutral-200"
										onclick={() => startRename(board.id, board.name)}
										title="Rename"
									>✎</button>
									<button
										class="shrink-0 cursor-pointer rounded p-1 text-xs text-neutral-500 transition hover:bg-red-600/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
										onclick={() => handleDeleteBoard(board.id)}
										disabled={storyboard.all.length <= 1}
										title="Delete"
									>×</button>
								</li>
							{/each}
						</ul>
						<div class="border-t border-neutral-700 p-2">
							{#if showNewBoardInput}
								<form
									class="flex gap-2"
									onsubmit={(e) => { e.preventDefault(); handleCreateBoard() }}
								>
									<input
										class="flex-1 rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:ring-1 focus:ring-neutral-600"
										type="text"
										placeholder="Board name"
										bind:value={newBoardName}
										onkeydown={(e) => e.key === 'Escape' && (showNewBoardInput = false)}
									/>
									<button
										class="cursor-pointer rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-600"
										type="submit"
									>Create</button>
								</form>
							{:else}
								<button
									class="w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
									onclick={() => (showNewBoardInput = true)}
								>+ New storyboard</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			{#if thumbnailStore.generating}
				<span class="text-xs text-neutral-500">Generating thumbnails…</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if (storyboard.current?.slides.length ?? 0) >= 2}
				<button
					class="cursor-pointer rounded-md bg-neutral-700 px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-neutral-600"
					onclick={onPreview}
				>
					▶ Preview
				</button>
			{/if}
			<button
				class="cursor-pointer rounded-md px-3 py-1.5 text-xs transition
					{storyboard.dirty
					? 'bg-blue-600 text-white hover:bg-blue-500'
					: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
				onclick={handleSave}
			>
				Save{storyboard.dirty ? ' ●' : ''}
			</button>
		</div>
	</div>

	<!-- Slide grid -->
	<div
		class="flex flex-wrap content-start gap-4 overflow-y-auto p-8"
		style="scrollbar-color: #404040 transparent;"
	>
		{#if storyboard.current?.slides.length === 0}
			<button
				class="flex aspect-video w-64 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-700 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
				onclick={() => onNewSlide(-1)}
			>
				<span class="text-3xl font-light">+</span>
				<span class="text-sm">Add first slide</span>
			</button>
		{:else}
			{@const slides = storyboard.current.slides}
			{#each slides as slide, i (slide.id)}
				{@const tr = getTransition(slide)}
				{@const isContinuous = tr.easing === 'continuous'}
				{@const isLastSlide = i === slides.length - 1}
				{@const isFirstSlide = i === 0}

				<div
					class="group relative shrink-0 overflow-visible rounded-xl border transition
						{dragFromIndex === i ? 'cursor-grabbing opacity-40' : 'cursor-pointer'}
						border-neutral-800 {dragFromIndex === null ? 'hover:border-neutral-600' : ''}"
					style="width: 256px"
					draggable="true"
					role="button"
					tabindex="0"
					onclick={() => onOpenSlide(i)}
					onkeydown={(e) => e.key === 'Enter' && onOpenSlide(i)}
					ondragstart={(e) => onDragStart(e, i)}
					ondragover={(e) => onDragOver(e, i)}
					ondrop={onDrop}
					ondragend={onDragEnd}
				>
					<!-- Drop line: before this card -->
					{#if dropPosition === i && dragFromIndex !== i && dragFromIndex !== i - 1}
						<div class="pointer-events-none absolute inset-y-0 -left-2.5 z-20 w-0.5 rounded bg-blue-500"></div>
					{/if}
					<!-- Drop line: after last card -->
					{#if isLastSlide && dropPosition === slides.length && dragFromIndex !== slides.length - 1}
						<div class="pointer-events-none absolute inset-y-0 -right-2.5 z-20 w-0.5 rounded bg-blue-500"></div>
					{/if}

					<!-- Insert-before button -->
					{#if dragFromIndex === null}
						<button
							class="absolute -left-4 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-neutral-700 text-sm text-neutral-200 opacity-0 transition hover:bg-neutral-500 group-hover:opacity-100"
							onclick={(e) => { e.stopPropagation(); onNewSlide(i - 1) }}
							title="Insert slide before"
						>+</button>
					{/if}

					<!-- Thumbnail -->
					<div class="aspect-video w-full overflow-hidden rounded-t-xl bg-neutral-900">
						{#if thumbnailStore.thumbnails[slide.id]}
							<img
								src={thumbnailStore.thumbnails[slide.id]}
								alt="Slide {i + 1}"
								class="h-full w-full object-cover"
								draggable="false"
							/>
						{:else}
							<div class="h-full w-full animate-pulse bg-neutral-800"></div>
						{/if}
					</div>

					<!-- Slide number badge -->
					<div class="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-neutral-300 backdrop-blur">
						{i + 1}
					</div>

					<!-- Delete button -->
					<button
						class="absolute left-2 top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xs text-neutral-400 opacity-0 transition hover:bg-red-600/80 hover:text-white group-hover:opacity-100"
						onclick={(e) => { e.stopPropagation(); storyboard.deleteSlide(i) }}
						title="Delete slide"
					>×</button>

					<!-- Edit hover overlay (thumbnail area only) -->
					<div class="pointer-events-none absolute inset-x-0 top-0 flex aspect-video items-center justify-center rounded-t-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
						<span class="text-xs text-white">Edit position</span>
					</div>

					<!-- Transition footer -->
					{#if !isLastSlide}
						<div
							class="flex items-center gap-2 rounded-b-xl border-t px-2 py-1.5 transition-colors
								{isContinuous ? 'border-violet-800/60 bg-violet-950/40' : 'border-neutral-800 bg-neutral-900'}"
						>
							<input
								type="number"
								min="0.1"
								step="0.1"
								value={tr.duration}
								onchange={(e) => { e.stopPropagation(); handleDurationChange(i, e.currentTarget.value) }}
								onclick={(e) => e.stopPropagation()}
								class="w-14 rounded bg-neutral-800 px-1.5 py-0.5 text-center text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								title="Duration (seconds)"
							/>
							<select
								value={tr.easing}
								onchange={(e) => { e.stopPropagation(); handleEasingChange(i, e.currentTarget.value) }}
								onclick={(e) => e.stopPropagation()}
								class="flex-1 rounded bg-neutral-800 px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-600
									{isContinuous ? 'text-violet-300' : 'text-neutral-300'}"
							>
								{#each Object.entries(EASING_LABELS).filter(([v]) => !isFirstSlide || v !== 'continuous') as [value, label]}
									<option {value} selected={tr.easing === value}>{label}</option>
								{/each}
							</select>
						</div>
					{:else}
						<div class="rounded-b-xl border-t border-neutral-800 bg-neutral-900 px-2 py-1.5">
							<span class="text-xs text-neutral-700">— end —</span>
						</div>
					{/if}
				</div>
			{/each}

			<!-- Add Slide card -->
			<button
				class="flex aspect-video w-48 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 self-start rounded-xl border-2 border-dashed border-neutral-700 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
				onclick={() => onNewSlide(slides.length - 1)}
			>
				<span class="text-2xl font-light">+</span>
				<span class="text-xs">Add Slide</span>
			</button>
		{/if}
	</div>
</div>
