<script>
	import { onMount } from 'svelte'
	import { project } from './project.svelte.js'
	import { storyboard } from './storyboard.svelte.js'
	import { thumbnailStore } from './thumbnails.svelte.js'

	let { onOpenSlide, onNewSlide } = $props()

	// DnD state
	let dragFromIndex = $state(null)
	let dragOverIndex = $state(null)

	onMount(() => {
		thumbnailStore.generateAll(project.handle, storyboard.current.slides)
	})

	function handleBack() {
		thumbnailStore.disposeViewer()
		storyboard.close()
	}

	async function handleSave() {
		await storyboard.write(project.handle)
		await project.save()
	}

	// DnD handlers
	function onDragStart(e, index) {
		dragFromIndex = index
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/plain', String(index))
	}

	function onDragOver(e, index) {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		dragOverIndex = index
	}

	function onDrop(e, index) {
		e.preventDefault()
		if (dragFromIndex !== null && dragFromIndex !== index) {
			storyboard.reorderSlides(dragFromIndex, index)
		}
		dragFromIndex = null
		dragOverIndex = null
	}

	function onDragEnd() {
		dragFromIndex = null
		dragOverIndex = null
	}
</script>

<div class="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
	<!-- Top bar -->
	<div class="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
		<div class="flex items-center gap-3">
			<button
				class="cursor-pointer rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-700"
				onclick={handleBack}
			>
				&larr; Back
			</button>
			<span class="text-sm font-medium text-neutral-200">{storyboard.current?.name}</span>
			{#if thumbnailStore.generating}
				<span class="text-xs text-neutral-500">Generating thumbnails…</span>
			{/if}
		</div>
		<button
			class="cursor-pointer rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-700"
			onclick={handleSave}
		>
			Save
		</button>
	</div>

	<!-- Slide grid -->
	<div class="flex-1 overflow-y-auto p-6">
		{#if storyboard.current?.slides.length === 0}
			<!-- Empty state -->
			<div class="flex h-full items-center justify-center">
				<button
					class="flex aspect-video w-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-700 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
					onclick={() => onNewSlide(-1)}
				>
					<span class="text-3xl font-light">+</span>
					<span class="text-sm">Add first slide</span>
				</button>
			</div>
		{:else}
			<div
				class="grid gap-x-8 gap-y-6"
				style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))"
			>
				{#each storyboard.current.slides as slide, i (slide.id)}
					<div
						class="group relative cursor-pointer overflow-visible rounded-xl border transition
							{dragFromIndex === i ? 'border-neutral-600 opacity-40' : ''}
							{dragOverIndex === i && dragFromIndex !== i
							? 'border-blue-500 ring-2 ring-blue-500/50'
							: dragFromIndex === i ? '' : 'border-neutral-800 hover:border-neutral-600'}"
						draggable="true"
						role="button"
						tabindex="0"
						onclick={() => onOpenSlide(i)}
						onkeydown={(e) => e.key === 'Enter' && onOpenSlide(i)}
						ondragstart={(e) => onDragStart(e, i)}
						ondragover={(e) => onDragOver(e, i)}
						ondrop={(e) => onDrop(e, i)}
						ondragend={onDragEnd}
					>
						<!-- Insert-before button (appears in the left gap on hover) -->
						{#if dragFromIndex === null}
							<button
								class="absolute -left-4 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-neutral-700 text-sm text-neutral-200 opacity-0 transition hover:bg-neutral-500 group-hover:opacity-100"
								onclick={(e) => {
									e.stopPropagation()
									onNewSlide(i - 1)
								}}
								title="Insert slide before"
							>
								+
							</button>
						{/if}

						<!-- Thumbnail area -->
						<div class="aspect-video w-full overflow-hidden rounded-xl bg-neutral-900">
							{#if thumbnailStore.thumbnails[slide.id]}
								<img
									src={thumbnailStore.thumbnails[slide.id]}
									alt="Slide {i + 1}"
									class="h-full w-full object-cover"
								/>
							{:else}
								<div class="h-full w-full animate-pulse bg-neutral-800"></div>
							{/if}
						</div>

						<!-- Slide number badge -->
						<div
							class="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-neutral-300 backdrop-blur"
						>
							{i + 1}
						</div>

						<!-- Edit overlay on hover -->
						<div
							class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100"
						>
							<span class="text-xs text-white">Edit position</span>
						</div>
					</div>
				{/each}

				<!-- Add Slide card -->
				<button
					class="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-700 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
					onclick={() => onNewSlide(storyboard.current.slides.length - 1)}
				>
					<span class="text-2xl font-light">+</span>
					<span class="text-xs">Add Slide</span>
				</button>
			</div>
		{/if}
	</div>
</div>
