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
		previewMode = false,
		slides = [],
		onPreviewDone = () => {},
	} = $props()

	let canvas = $state(null)
	let viewer = null
	let previewRunning = $state(false)
	let stopRequested = false

	// ── Easing functions ────────────────────────────────────────────────────────
	const EASINGS = {
		'ease-in-out': (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
		'ease-in': (t) => t * t * t,
		'ease-out': (t) => 1 - (1 - t) ** 3,
		linear: (t) => t,
	}

	function lerpCamera(from, to, t) {
		return {
			position: /** @type {[number,number,number]} */ (
				from.position.map((v, i) => v + (to.position[i] - v) * t)
			),
			target: /** @type {[number,number,number]} */ (
				from.target.map((v, i) => v + (to.target[i] - v) * t)
			),
			fov: from.fov + (to.fov - from.fov) * t,
		}
	}

	function animateCamera(from, to, durationMs, easeFn) {
		return new Promise((resolve) => {
			const start = performance.now()
			function frame() {
				if (stopRequested) {
					resolve()
					return
				}
				const elapsed = performance.now() - start
				const raw = Math.min(elapsed / durationMs, 1)
				viewer.setCameraState(lerpCamera(from, to, easeFn(raw)))
				if (raw < 1) requestAnimationFrame(frame)
				else resolve()
			}
			requestAnimationFrame(frame)
		})
	}

	async function startPreview() {
		previewRunning = true
		stopRequested = false
		viewer.beginPlayback?.()
		viewer.setCameraState(slides[0].camera)
		await new Promise((r) => requestAnimationFrame(r)) // let first frame paint

		for (let i = 1; i < slides.length; i++) {
			if (stopRequested) break
			const from = slides[i - 1].camera
			const to = slides[i].camera
			const { duration, easing } = slides[i].transition ?? { duration: 1, easing: 'ease-in-out' }
			const easeFn = EASINGS[easing] ?? EASINGS['ease-in-out']
			await animateCamera(from, to, duration * 1000, easeFn)
		}

		viewer.endPlayback?.()
		previewRunning = false
		if (!stopRequested) onPreviewDone()
	}

	onMount(() => {
		viewer = new SceneViewer(canvas)
		viewer.openProject(project.handle.fs.readFile).then(() => {
			if (captureMode && initialCamera !== null) {
				viewer.setCameraState(initialCamera)
			}
			if (previewMode && slides.length > 0) {
				startPreview()
			}
		})

		return () => {
			viewer.dispose?.()
		}
	})

	function handleBack() {
		if (captureMode || previewMode) {
			stopRequested = true
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
				{#if previewMode}
					✕ Stop
				{:else}
					&larr; {captureMode ? 'Cancel' : 'Back'}
				{/if}
			</button>
			{#if !previewMode}
				<span class="ml-3 text-sm text-neutral-400">{storyboard.current?.name}</span>
			{/if}
		</div>

		{#if captureMode}
			<button
				class="pointer-events-auto cursor-pointer rounded-md bg-blue-600/90 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-blue-500/90"
				onclick={handleCapture}
			>
				Capture Position
			</button>
		{:else if previewMode}
			<div class="pointer-events-none text-xs text-neutral-400">
				{previewRunning ? 'Playing…' : 'Done'}
			</div>
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
