<script>
	import { SceneViewer } from '@krisenstab/vantage'
	import { project } from './project.svelte.js'
	import { storyboard } from './storyboard.svelte.js'
	import { onMount } from 'svelte'

	let {
		captureMode = false,
		initialCamera = null,
		onConfirm = () => {},
		onCancel = () => {},
	} = $props()

	let canvas = $state(null)
	let viewer = null

	onMount(() => {
		viewer = new SceneViewer(canvas)
		viewer.openProject(project.handle.fs.readFile).then(() => {
			if (captureMode && initialCamera !== null) {
				viewer.setCameraState(initialCamera)
			}
		})

		return () => {
			viewer.dispose?.()
		}
	})

	function handleBack() {
		if (captureMode) {
			onCancel()
		} else {
			storyboard.close()
		}
	}

	async function handleSave() {
		await storyboard.write(project.handle)
		await project.save()
	}

	function handleCapture() {
		onConfirm(viewer.getCameraState())
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
				&larr; {captureMode ? 'Cancel' : 'Back'}
			</button>
			<span class="ml-3 text-sm text-neutral-400">{storyboard.current?.name}</span>
		</div>
		{#if captureMode}
			<button
				class="pointer-events-auto cursor-pointer rounded-md bg-blue-600/90 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-blue-500/90"
				onclick={handleCapture}
			>
				Capture Position
			</button>
		{:else}
			<button
				class="pointer-events-auto cursor-pointer rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition hover:bg-neutral-800/80"
				onclick={handleSave}
			>
				Save
			</button>
		{/if}
	</div>
</div>
