<script>
  import { project } from './lib/project.svelte.js'
  import { storyboard } from './lib/storyboard.svelte.js'
  import SplashScreen from './lib/SplashScreen.svelte'
  import StoryboardPicker from './lib/StoryboardPicker.svelte'
  import Viewer from './lib/Viewer.svelte'

  let dragCount = $state(0)

  function handleDragEnter() {
    dragCount++
  }

  function handleDragLeave() {
    dragCount--
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  async function handleDrop(e) {
    e.preventDefault()
    dragCount = 0
    await project.drop(e)
  }
</script>

<svelte:window
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
/>

{#if !project.handle}
  <SplashScreen />
{:else if !storyboard.current}
  <StoryboardPicker />
{:else}
  <Viewer />
{/if}

{#if dragCount > 0}
  <div
    class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm"
  >
    <div class="rounded-xl border-2 border-dashed border-neutral-500 px-12 py-8 text-neutral-300">
      Drop project here
    </div>
  </div>
{/if}
