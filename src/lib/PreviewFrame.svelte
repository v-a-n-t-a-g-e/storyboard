<script>
  import { onMount } from 'svelte'
  import { project } from './project.svelte.js'
  import { storyboard } from './storyboard.svelte.js'

  /**
   * @typedef {{
   *   mode: 'time' | 'scroll',
   *   onCancel?: () => void,
   * }} Props
   */

  /** @type {Props} */
  let { mode, onCancel = () => {} } = $props()

  let iframe = $state(/** @type {HTMLIFrameElement|null} */ (null))

  // Map narrator's preview kind to the runtime's mode param.
  const previewMode = mode === 'scroll' ? 'scrolly' : 'slideshow'
  const src = `preview/index.html?mode=${previewMode}&preview=1`

  /** Snapshot of the slides to send to the iframe. */
  function snapshot() {
    return JSON.parse(JSON.stringify(storyboard.current?.slides ?? []))
  }

  let ready = false

  function postToFrame(msg, transfer) {
    iframe?.contentWindow?.postMessage(msg, '*', transfer)
  }

  async function handleFsRead(id, path) {
    try {
      const file = await project.handle.fs.readFile(path)
      const buffer = await file.arrayBuffer()
      postToFrame(
        { source: 'narrator', type: 'narrator-fs-read-result', id, ok: true, path, buffer },
        [buffer]
      )
    } catch (e) {
      postToFrame({
        source: 'narrator',
        type: 'narrator-fs-read-result',
        id,
        ok: false,
        path,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  function onMessage(e) {
    if (e.source !== iframe?.contentWindow) return
    const m = e.data
    if (!m || m.source !== 'narrator') return
    if (m.type === 'narrator-ready') {
      ready = true
      postToFrame({
        source: 'narrator',
        type: 'narrator-init',
        mode: previewMode,
        slides: snapshot(),
      })
    } else if (m.type === 'narrator-fs-read') {
      handleFsRead(m.id, m.path)
    } else if (m.type === 'narrator-cancel') {
      onCancel()
    }
  }

  // Live updates: re-post slides whenever they change.
  // Track current() reactively, debounce via rAF.
  let pendingFrame = null
  $effect(() => {
    // Subscribe to slides reactively.
    const slides = storyboard.current?.slides
    if (!ready || !slides) return
    if (pendingFrame !== null) return
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null
      postToFrame({ source: 'narrator', type: 'narrator-update', slides: snapshot() })
    })
  })

  onMount(() => {
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame)
      // Tell the iframe to dispose its viewer cleanly.
      postToFrame({ source: 'narrator', type: 'narrator-stop' })
    }
  })

  function onKey(e) {
    if (e.key === 'Escape') onCancel()
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="fixed inset-0 z-50 bg-white">
  <iframe bind:this={iframe} class="h-full w-full border-0" {src} title="Preview"></iframe>
  <header
    class="absolute inset-x-0 top-0 flex items-center px-5 py-2.5 {previewMode !== 'scrolly' &&
      'lg:w-[calc(100vw-390px)]'}"
  >
    <div class="h-px w-5 bg-black"></div>
    <div class="hover:bg-white">
      <button
        class="flex cursor-pointer items-center gap-1.5 px-2.5 py-0.75 hover:framed-2.5"
        onclick={onCancel}
      >
        Exit preview
      </button>
    </div>
    <div class="h-px flex-1 bg-black"></div>
  </header>
</div>
