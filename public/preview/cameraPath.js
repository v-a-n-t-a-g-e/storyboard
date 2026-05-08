import { CatmullRomCurve3, Vector3 } from 'three'

/** @typedef {{ position: [number,number,number], target: [number,number,number], fov: number, up?: [number,number,number] }} CameraState */

function normalizeVec3(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1
  return /** @type {[number,number,number]} */ ([v[0] / len, v[1] / len, v[2] / len])
}

function slerpVec3(a, b, t) {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  if (dot > 0.9999) return normalizeVec3([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
  // Antiparallel: pick an arbitrary perpendicular axis
  if (dot < -0.9999) {
    const perp = Math.abs(a[0]) < 0.9 ? normalizeVec3([0, -a[2], a[1]]) : normalizeVec3([-a[2], 0, a[0]])
    const half = normalizeVec3([a[0] + perp[0], a[1] + perp[1], a[2] + perp[2]])
    return slerpVec3(slerpVec3(a, half, t * 2 <= 1 ? t * 2 : 1), b, t * 2 > 1 ? (t * 2 - 1) : 0)
  }
  const theta = Math.acos(dot)
  const sinTheta = Math.sin(theta)
  const wa = Math.sin((1 - t) * theta) / sinTheta
  const wb = Math.sin(t * theta) / sinTheta
  return /** @type {[number,number,number]} */ ([wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]])
}

/** Lerp between two camera states. */
export function lerpCamera(from, to, t) {
  const fromUp = from.up ?? [0, 1, 0]
  const toUp = to.up ?? [0, 1, 0]
  const position = /** @type {[number,number,number]} */ (
    from.position.map((v, i) => v + (to.position[i] - v) * t)
  )
  const fromDir = normalizeVec3(from.target.map((v, i) => v - from.position[i]))
  const toDir = normalizeVec3(to.target.map((v, i) => v - to.position[i]))
  const fromDist = Math.sqrt(from.target.reduce((s, v, i) => s + (v - from.position[i]) ** 2, 0))
  const toDist = Math.sqrt(to.target.reduce((s, v, i) => s + (v - to.position[i]) ** 2, 0))
  const dist = fromDist + (toDist - fromDist) * t
  const dir = slerpVec3(fromDir, toDir, t)
  return {
    position,
    target: /** @type {[number,number,number]} */ (position.map((v, i) => v + dir[i] * dist)),
    fov: from.fov + (to.fov - from.fov) * t,
    up: normalizeVec3(fromUp.map((v, i) => v + (toUp[i] - v) * t)),
  }
}

/**
 * Group slides into segments delimited by stops.
 * A slide is a waypoint (not a stop) if its outgoing transition is `continuous`.
 * A segment closes when a stop is encountered at i > groupStart; that slide
 * both closes the segment and starts the next one.
 */
export function buildSegments(slides) {
  const N = slides.length
  const segments = []
  let groupStart = 0
  for (let i = 0; i < N - 1; i++) {
    if (!slides[i].transition?.continuous && i > groupStart) {
      segments.push(slides.slice(groupStart, i + 1))
      groupStart = i
    }
  }
  segments.push(slides.slice(groupStart))
  return segments
}

/**
 * Precompute Catmull-Rom spline data for a multi-camera segment.
 * `weights` is an array of per-leg values (durations or vh). Each weight[i]
 * is how much of the segment's "time" is allocated to leg cameras[i] → cameras[i+1].
 */
export function prepareSplineSegment(cameras, weights) {
  const N = cameras.length
  const posCurve = new CatmullRomCurve3(cameras.map((c) => new Vector3(...c.position)))

  const total = weights.reduce((a, b) => a + b, 0) || 1
  const timeFrac = [0]
  let cum = 0
  for (const w of weights) {
    cum += w
    timeFrac.push(cum / total)
  }

  const D = Math.max(200, N * 100)
  const lengths = posCurve.getLengths(D)
  const totalLen = lengths[lengths.length - 1] || 1
  const arcFrac = [0]
  for (let i = 1; i < N - 1; i++) {
    arcFrac.push(lengths[Math.round((i / (N - 1)) * D)] / totalLen)
  }
  arcFrac.push(1.0)

  return {
    posCurve,
    timeFrac,
    arcFrac,
    fovStart: cameras[0].fov,
    fovEnd: cameras[N - 1].fov,
    ups: cameras.map((c) => c.up ?? [0, 1, 0]),
    dirs: cameras.map((c) => normalizeVec3(c.target.map((v, i) => v - c.position[i]))),
    dists: cameras.map((c) => Math.sqrt(c.target.reduce((s, v, i) => s + (v - c.position[i]) ** 2, 0))),
  }
}

/** Sample a prepared spline segment at progress t ∈ [0,1]. */
export function splineCameraAt(prepared, t) {
  const { posCurve, timeFrac, arcFrac, fovStart, fovEnd, ups, dirs, dists } = prepared
  const last = timeFrac.length - 2
  let seg = 0
  while (seg < last && t >= timeFrac[seg + 1]) seg++
  const span = timeFrac[seg + 1] - timeFrac[seg]
  const tLocal = span > 0 ? (t - timeFrac[seg]) / span : 1
  const u = Math.max(0, Math.min(1, arcFrac[seg] + tLocal * (arcFrac[seg + 1] - arcFrac[seg])))
  const pos = posCurve.getPointAt(u)
  const dir = slerpVec3(dirs[seg], dirs[seg + 1], tLocal)
  const dist = dists[seg] + (dists[seg + 1] - dists[seg]) * tLocal
  const upA = ups[seg]
  const upB = ups[seg + 1]
  return {
    position: /** @type {[number,number,number]} */ ([pos.x, pos.y, pos.z]),
    target: /** @type {[number,number,number]} */ ([pos.x + dir[0] * dist, pos.y + dir[1] * dist, pos.z + dir[2] * dist]),
    fov: fovStart + (fovEnd - fovStart) * t,
    up: normalizeVec3(upA.map((v, i) => v + (upB[i] - v) * tLocal)),
  }
}
