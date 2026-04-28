import { CatmullRomCurve3, Vector3 } from 'three'

/** @typedef {{ position: [number,number,number], target: [number,number,number], fov: number }} CameraState */

/** Lerp between two camera states. */
export function lerpCamera(from, to, t) {
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
  const tgtCurve = new CatmullRomCurve3(cameras.map((c) => new Vector3(...c.target)))

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
    tgtCurve,
    timeFrac,
    arcFrac,
    fovStart: cameras[0].fov,
    fovEnd: cameras[N - 1].fov,
  }
}

/** Sample a prepared spline segment at progress t ∈ [0,1]. */
export function splineCameraAt(prepared, t) {
  const { posCurve, tgtCurve, timeFrac, arcFrac, fovStart, fovEnd } = prepared
  const last = timeFrac.length - 2
  let seg = 0
  while (seg < last && t >= timeFrac[seg + 1]) seg++
  const span = timeFrac[seg + 1] - timeFrac[seg]
  const tLocal = span > 0 ? (t - timeFrac[seg]) / span : 1
  const u = Math.max(0, Math.min(1, arcFrac[seg] + tLocal * (arcFrac[seg + 1] - arcFrac[seg])))
  const pos = posCurve.getPointAt(u)
  const tgt = tgtCurve.getPointAt(u)
  return {
    position: /** @type {[number,number,number]} */ ([pos.x, pos.y, pos.z]),
    target: /** @type {[number,number,number]} */ ([tgt.x, tgt.y, tgt.z]),
    fov: fovStart + (fovEnd - fovStart) * t,
  }
}
