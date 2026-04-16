/** @typedef {{ id: string, camera: { position: [number, number, number], target: [number, number, number], fov: number }, title: string, description: string }} Slide */
/** @typedef {{ name: string, slides: Slide[] }} Storyboard */
/** @typedef {{ filename: string, name: string }} StoryboardEntry */

const INDEX_PATH = 'storyboards/_index.json'

let current = $state(null)
let currentFilename = $state(null)
let entries = $state([])

export const storyboard = {
	get current() {
		return current
	},
	get currentFilename() {
		return currentFilename
	},
	get entries() {
		return entries
	},

	/** Read the storyboard index from the project. */
	async loadEntries(handle) {
		try {
			const file = await handle.fs.readFile(INDEX_PATH)
			entries = JSON.parse(await file.text())
		} catch {
			entries = []
		}
	},

	/** Write the index to the project filesystem. */
	async writeIndex(handle) {
		await handle.fs.mkdir('storyboards')
		await handle.fs.writeFile(INDEX_PATH, JSON.stringify(entries, null, 2))
	},

	/** Create a new storyboard and open it. */
	async create(handle, name) {
		const filename = nameToFilename(name)
		/** @type {Storyboard} */
		const data = { name, slides: [] }

		await handle.fs.mkdir('storyboards')
		await handle.fs.writeFile(`storyboards/${filename}`, JSON.stringify(data, null, 2))

		entries = [...entries, { filename, name }]
		await this.writeIndex(handle)

		current = data
		currentFilename = filename
	},

	/** Open an existing storyboard by filename. */
	async open(handle, filename) {
		const file = await handle.fs.readFile(`storyboards/${filename}`)
		current = JSON.parse(await file.text())
		currentFilename = filename
	},

	/** Insert a new slide after `afterIndex` (-1 to prepend). Returns the new slide. */
	insertSlide(afterIndex, camera) {
		const slide = { id: crypto.randomUUID(), camera, title: '', description: '' }
		const slides = [...current.slides]
		slides.splice(afterIndex + 1, 0, slide)
		current = { ...current, slides }
		return slide
	},

	/** Update the camera of the slide at `index`. */
	updateSlide(index, camera) {
		const slides = current.slides.map((s, i) => (i === index ? { ...s, camera } : s))
		current = { ...current, slides }
	},

	/** Move the slide at `fromIndex` to `toIndex`. */
	reorderSlides(fromIndex, toIndex) {
		const slides = [...current.slides]
		const [removed] = slides.splice(fromIndex, 1)
		const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex
		slides.splice(insertAt, 0, removed)
		current = { ...current, slides }
	},

	/** Write the current storyboard to the project filesystem. */
	async write(handle) {
		if (!current || !currentFilename) return
		await handle.fs.writeFile(`storyboards/${currentFilename}`, JSON.stringify(current, null, 2))
	},

	/** Close the current storyboard (back to picker). */
	close() {
		current = null
		currentFilename = null
	},

	/** Reset all state (when closing a project). */
	reset() {
		current = null
		currentFilename = null
		entries = []
	},
}

function nameToFilename(name) {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') + '.json'
	)
}
