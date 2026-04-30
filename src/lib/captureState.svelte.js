import { Vector3 } from 'three'

export function setVisibilityOverride(overrides, id, defaultVisible, value) {
  const next = { ...overrides }
  if (value === defaultVisible) delete next[id]
  else next[id] = value
  return next
}

export function readVisibility(overrides, entry) {
  return overrides[entry.id] ?? entry.visible
}

export function projectionPose(projection, fov) {
  const fwd = new Vector3(0, 0, -1).applyQuaternion(projection.quaternion)
  return {
    position: [projection.position.x, projection.position.y, projection.position.z],
    target: [
      projection.position.x + fwd.x,
      projection.position.y + fwd.y,
      projection.position.z + fwd.z,
    ],
    fov,
  }
}
