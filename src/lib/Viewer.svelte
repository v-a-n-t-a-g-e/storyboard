<script>
	import { SceneViewer } from '@krisenstab/vantage'
	import { project } from './project.svelte.js'
	import { storyboard } from './storyboard.svelte.js'
	import { onMount } from 'svelte'

	let canvas = $state(null)

	onMount(() => {
		const viewer = new SceneViewer(canvas)
		viewer.openProject(project.handle.fs.readFile)

		return () => {
			viewer.dispose?.()
		}
	})

	function handleBack() {
		storyboard.close()
	}

	async function handleSave() {
		await storyboard.write(project.handle)
		await project.save()
	}
</script>

<div class="relative h-screen w-screen bg-black">
	<canvas class="h-full w-full" bind:this={canvas}></canvas>

	<div class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
		<div>
			<button
				class="pointer-events-auto cursor-pointer rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition hover:bg-neutral-800/80"
				onclick={handleBack}
			>
				&larr; Back
			</button>
			<span class="ml-3 text-sm text-neutral-400">{storyboard.current?.name}</span>
		</div>
		<button
			class="pointer-events-auto cursor-pointer rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition hover:bg-neutral-800/80"
			onclick={handleSave}
		>
			Save
		</button>
	</div>
</div>
