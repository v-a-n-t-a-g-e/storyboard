import {
  AnimationClip,
  Object3D,
  PerspectiveCamera,
  QuaternionKeyframeTrack,
  Quaternion,
  Scene,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import {
  buildSegments,
  lerpCamera,
  prepareSplineSegment,
  splineCameraAt,
} from '$preview/cameraPath.js'
import { resolveCamera } from '$preview/sceneState.js'
import { project } from './project.svelte.js'
import { storyboard } from './storyboard.svelte.js'
import { thumbnailStore } from './thumbnails.svelte.js'

const FPS = 60
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function sampleSegment(cameras, weights) {
  const totalSec = weights.reduce((a, b) => a + b, 0)
  const frames = Math.max(1, Math.round(totalSec * FPS))
  const samples = []
  if (cameras.length === 2) {
    for (let i = 0; i <= frames; i++) {
      const raw = i / frames
      samples.push({ t: raw * totalSec, cam: lerpCamera(cameras[0], cameras[1], easeInOut(raw)) })
    }
  } else {
    const prepared = prepareSplineSegment(cameras, weights)
    for (let i = 0; i <= frames; i++) {
      const raw = i / frames
      samples.push({ t: raw * totalSec, cam: splineCameraAt(prepared, easeInOut(raw)) })
    }
  }
  return samples
}

function camerasToTracks(samples) {
  const times = new Float32Array(samples.length)
  const positions = new Float32Array(samples.length * 3)
  const quaternions = new Float32Array(samples.length * 4)

  const tmp = new Object3D()
  const target = new Vector3()
  const q = new Quaternion()

  for (let i = 0; i < samples.length; i++) {
    const { t, cam } = samples[i]
    times[i] = t
    positions[i * 3] = cam.position[0]
    positions[i * 3 + 1] = cam.position[1]
    positions[i * 3 + 2] = cam.position[2]

    tmp.position.set(cam.position[0], cam.position[1], cam.position[2])
    target.set(cam.target[0], cam.target[1], cam.target[2])
    tmp.lookAt(target)
    // glTF camera convention: -Z forward. Object3D.lookAt already orients -Z toward target.
    q.copy(tmp.quaternion)
    quaternions[i * 4] = q.x
    quaternions[i * 4 + 1] = q.y
    quaternions[i * 4 + 2] = q.z
    quaternions[i * 4 + 3] = q.w
  }
  return { times, positions, quaternions }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportCameraGlb() {
  const board = storyboard.current
  const handle = project.handle
  if (!board || !handle) throw new Error('No project / storyboard open')
  const slides = board.slides
  if (slides.length < 2) throw new Error('Need at least 2 slides to export a camera path')

  await thumbnailStore.ensureReady(handle)
  const viewer = thumbnailStore.viewer
  const manifest = thumbnailStore.manifest

  // Stitch segments back-to-back. The first sample of each segment after the first
  // duplicates the previous segment's last sample (same stop slide), so skip it.
  const segments = buildSegments(slides)
  const allSamples = []
  let timeOffset = 0
  for (let s = 0; s < segments.length; s++) {
    const group = segments[s]
    const cameras = group.map((slide) => resolveCamera(viewer, manifest, slide))
    const weights = group.slice(0, -1).map((slide) => slide.transition?.duration ?? 1)
    const segSamples = sampleSegment(cameras, weights)
    const start = s === 0 ? 0 : 1
    for (let i = start; i < segSamples.length; i++) {
      allSamples.push({ t: segSamples[i].t + timeOffset, cam: segSamples[i].cam })
    }
    timeOffset += segSamples[segSamples.length - 1].t
  }

  const { times, positions, quaternions } = camerasToTracks(allSamples)

  const camera = new PerspectiveCamera(slides[0].camera.fov, 16 / 9, 0.1, 10000)
  camera.name = 'StoryboardCamera'

  const scene = new Scene()
  scene.name = 'Storyboard'
  scene.add(camera)

  const clip = new AnimationClip('camera-path', timeOffset, [
    new VectorKeyframeTrack(`${camera.name}.position`, times, positions),
    new QuaternionKeyframeTrack(`${camera.name}.quaternion`, times, quaternions),
  ])

  const result = await new GLTFExporter().parseAsync(scene, {
    binary: true,
    animations: [clip],
  })

  const blob = new Blob([result], { type: 'model/gltf-binary' })
  triggerDownload(blob, `${board.name || 'storyboard'}-camera.glb`)
}
