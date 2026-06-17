import { downloadZip } from 'client-zip'
import { project } from './project.svelte.js'
import { storyboard } from './storyboard.svelte.js'

/** Static files we ship verbatim from public/preview/. */
const PREVIEW_FILES = [
  'style.css',
  'cameraPath.js',
  'sceneState.js',
  'bootstrap.js',
  'slideshow.js',
  'scrolly.js',
  'vendor/three.module.js',
  'vendor/three.core.js',
  'vendor/three-addons/controls/OrbitControls.js',
  'vendor/three-addons/loaders/GLTFLoader.js',
  'vendor/three-addons/loaders/PLYLoader.js',
  'vendor/three-addons/utils/BufferGeometryUtils.js',
  'vendor/three-addons/utils/SkeletonUtils.js',
  'vendor/vantage.js',
]

/**
 * Generate the export-mode index.html. We hand-write a minimal HTML so the
 * exported folder runs without any dispatcher params and stays obvious to
 * end users who want to hand-edit it.
 */
function buildIndexHtml(mode, name) {
  const runtime = mode === 'scrolly' ? 'scrolly.js' : 'slideshow.js'
  const safeName = (name ?? 'storyboard').replace(/[<>&"]/g, '')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeName}</title>
    <link rel="stylesheet" href="./style.css" />
    <script type="importmap">
      {
        "imports": {
          "three": "./vendor/three.module.js",
          "three/addons/": "./vendor/three-addons/",
          "@krisenstab/vantage": "./vendor/vantage.js"
        }
      }
    </script>
  </head>
  <body>
    <script type="module">
      import { start } from './${runtime}'
      start({ isPreview: false })
    </script>
  </body>
</html>
`
}

/**
 * Walk every file the project handle exposes and yield `{ path, blob }`.
 *
 * For a memory-backed handle (zip/import), `handle.fs.store` is a Map.
 * For a native-directory handle, walk via the FileSystemDirectoryHandle.
 */
async function* walkAssets(handle) {
  const store = handle.fs.store
  if (store instanceof Map) {
    for (const [path, blob] of store) {
      yield { path, blob }
    }
    return
  }
  const dir = handle.directoryHandle
  if (!dir) return
  yield* walkDir(dir, '')
}

async function* walkDir(dir, prefix) {
  // FileSystemDirectoryHandle is async-iterable in Chromium.
  for await (const [name, h] of dir.entries()) {
    const path = prefix ? `${prefix}/${name}` : name
    if (h.kind === 'file') {
      const file = await h.getFile()
      yield { path, blob: file }
    } else if (h.kind === 'directory') {
      yield* walkDir(h, path)
    }
  }
}

/**
 * Fetch each preview-runtime file from the same origin (vite serves
 * `public/` verbatim in dev and copies it into `dist/` in prod).
 */
async function* previewRuntimeFiles() {
  for (const path of PREVIEW_FILES) {
    const res = await fetch(`./preview/${path}`)
    if (!res.ok) throw new Error(`Failed to fetch preview/${path}: ${res.status}`)
    yield { path, blob: await res.blob() }
  }
}

/** @param {'slideshow' | 'scrolly'} mode */
export async function exportStaticSite(mode) {
  const board = storyboard.current
  const handle = project.handle
  if (!board || !handle) throw new Error('No project / storyboard open')

  const payload = {
    mode,
    name: board.name,
    slides: board.slides.map((s) => ({
      id: s.id,
      camera: s.camera,
      transition: s.transition,
      title: s.title ?? '',
      description: s.description ?? '',
      ...(s.visibility ? { visibility: s.visibility } : {}),
      ...(s.projectionRef ? { projectionRef: s.projectionRef } : {}),
    })),
  }

  // Lazy generator — client-zip streams without buffering.
  async function* files() {
    yield {
      name: 'index.html',
      lastModified: new Date(),
      input: buildIndexHtml(mode, board.name),
    }
    for await (const { path, blob } of previewRuntimeFiles()) {
      yield { name: path, lastModified: new Date(), input: blob }
    }
    yield {
      name: 'storyboard.json',
      lastModified: new Date(),
      input: JSON.stringify(payload, null, 2),
    }
    for await (const { path, blob } of walkAssets(handle)) {
      yield { name: `assets/${path}`, lastModified: new Date(), input: blob }
    }
  }

  const blob = await downloadZip(files()).blob()
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${board.name || 'storyboard'}-${mode}.zip`,
  })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
