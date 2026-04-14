<script>
	import { project } from './project.svelte.js'
	import { storyboard } from './storyboard.svelte.js'
	import { onMount } from 'svelte'

	let newName = $state('')
	let showNewForm = $state(false)

	onMount(() => {
		storyboard.loadEntries(project.handle)
	})

	async function handleCreate() {
		const name = newName.trim()
		if (!name) return
		await storyboard.create(project.handle, name)
		newName = ''
		showNewForm = false
	}

	function handleBack() {
		storyboard.reset()
		project.close()
	}

	async function handleSave() {
		await project.save()
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
	<div class="w-full max-w-sm space-y-8 px-6">
		<div>
			<div class="flex items-center justify-between">
				<button
					class="cursor-pointer text-xs text-neutral-500 transition hover:text-neutral-300"
					onclick={handleBack}
				>
					&larr; Close Project
				</button>
				{#if !project.handle?.canSaveInPlace}
					<button
						class="cursor-pointer text-xs text-neutral-500 transition hover:text-neutral-300"
						onclick={handleSave}
					>
						Save
					</button>
				{/if}
			</div>
			<h1 class="mt-2 text-2xl font-semibold tracking-tight">{project.handle?.name}</h1>
			<p class="mt-1 text-sm text-neutral-400">Select or create a storyboard</p>
		</div>

		{#if storyboard.entries.length > 0}
			<ul class="space-y-1">
				{#each storyboard.entries as entry}
					<li>
						<button
							class="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition hover:bg-neutral-800"
							onclick={() => storyboard.open(project.handle, entry.filename)}
						>
							{entry.name}
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-neutral-600">No storyboards yet.</p>
		{/if}

		{#if showNewForm}
			<form
				class="flex gap-2"
				onsubmit={(e) => {
					e.preventDefault()
					handleCreate()
				}}
			>
				<input
					class="flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none placeholder:text-neutral-600 focus:ring-1 focus:ring-neutral-600"
					type="text"
					placeholder="Storyboard name"
					bind:value={newName}
				/>
				<button
					class="cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-600"
					type="submit"
				>
					Create
				</button>
			</form>
		{:else}
			<button
				class="w-full cursor-pointer rounded-lg bg-neutral-800 px-4 py-3 text-sm font-medium transition hover:bg-neutral-700"
				onclick={() => (showNewForm = true)}
			>
				New Storyboard
			</button>
		{/if}
	</div>
</div>
