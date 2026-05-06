<script>
  import { storyboard } from './storyboard.svelte.js'

  let { slide, index } = $props()
</script>

<div class="-mt-px h-25 w-full framed-2.5 p-2.5">
  <textarea
    class="h-full w-full resize-none bg-transparent text-xs outline-none placeholder:text-neutral-400"
    draggable="false"
    onchange={(e) => storyboard.updateDescription(index, e.currentTarget.value)}
    onclick={(e) => e.stopPropagation()}
    ondragstart={(e) => e.preventDefault()}
    onkeydown={(e) => e.stopPropagation()}
    onmousedown={(e) => e.stopPropagation()}
    placeholder="Text"
    value={slide.description ?? ''}
  ></textarea>
</div>
