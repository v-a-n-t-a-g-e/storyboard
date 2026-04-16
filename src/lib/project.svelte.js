import {
  openProject,
  importProject,
  onProjectDrop,
  createRecentProjects,
  createHandleFromDirectory,
  supportsNativeFS,
} from '@krisenstab/vantage'

const recents = createRecentProjects('narrator')

let handle = $state(null)
let recentList = $state([])

export const project = {
  get handle() {
    return handle
  },
  get recents() {
    return recentList
  },
  get hasNativeFS() {
    return supportsNativeFS()
  },

  async refreshRecents() {
    recentList = await recents.get()
  },

  async open() {
    const h = await openProject()
    if (h) await this.loadHandle(h)
  },

  async importFile() {
    const h = await importProject()
    if (h) await this.loadHandle(h)
  },

  async drop(event) {
    const h = await onProjectDrop(event)
    if (h) await this.loadHandle(h)
  },

  async openRecent(recent) {
    const perm = await recent.handle.requestPermission({ mode: 'readwrite' })
    if (perm !== 'granted') return
    const h = createHandleFromDirectory(recent.handle)
    await this.loadHandle(h)
  },

  async loadHandle(h) {
    handle = h
    if (h.directoryHandle) {
      await recents.add(h.directoryHandle)
      await this.refreshRecents()
    }
  },

  close() {
    handle = null
  },

  /**
   * Save the project.
   * - In-place (native directory): persisted already, no-op.
   * - In-memory + native FS supported: prompt for a directory, copy all files,
   *   then swap to an in-place handle so subsequent writes persist directly.
   * - In-memory + no native FS: fall back to ZIP download.
   */
  async save() {
    if (!handle) return
    if (handle.canSaveInPlace) return

    if (supportsNativeFS()) {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
      const target = createHandleFromDirectory(dirHandle)
      const memStore = handle.fs.store
      if (memStore) {
        for (const [path, blob] of memStore) {
          await target.fs.writeFile(path, blob)
        }
      }
      handle = target
      await recents.add(dirHandle)
      await this.refreshRecents()
      return
    }

    await handle.save()
  },
}
