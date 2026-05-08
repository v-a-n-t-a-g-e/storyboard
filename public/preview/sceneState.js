import { Vector3 } from 'three'

/** @typedef {{ objects: { id: string, name: string, visible: boolean }[], projections?: { id: string, name: string, visible: boolean }[] }} Manifest */

/**
 * Apply a slide's visibility overrides on top of the manifest defaults.
 * Walks `viewer.scene.children[1 + i]` for object meshes (env at index 0)
 * and `viewer.projections[i]` for projection helpers.
 */
export function applySlideState(viewer, manifest, slide) {
  if (!manifest) return
  for (let i = 0; i < manifest.objects.length; i++) {
    const entry = manifest.objects[i]
    const v = slide.visibility?.objects?.[entry.id] ?? entry.visible
    const mesh = viewer.scene?.children?.[1 + i]
    if (mesh) mesh.visible = v
  }
  const projs = manifest.projections ?? []
  for (let i = 0; i < projs.length; i++) {
    const entry = projs[i]
    const v = slide.visibility?.projections?.[entry.id] ?? entry.visible
    if (viewer.projections[i]) {
      viewer.projections[i].visible = v
      viewer.projections[i].projection.visible = v
    }
  }
}

/**
 * Resolve a slide's camera, honoring `projectionRef` when set.
 * Always returns an `up` vector: derived from the projection's quaternion
 * for projection cameras, or world-Y for free cameras.
 */
export function resolveCamera(viewer, manifest, slide) {
  if (slide.projectionRef && manifest?.projections) {
    const idx = manifest.projections.findIndex((p) => p.id === slide.projectionRef)
    if (idx >= 0 && viewer.projections[idx]) {
      const proj = viewer.projections[idx].projection
      const fwd = new Vector3(0, 0, -1).applyQuaternion(proj.quaternion)
      const up = new Vector3(0, 1, 0).applyQuaternion(proj.quaternion)
      return {
        position: [proj.position.x, proj.position.y, proj.position.z],
        target: [proj.position.x + fwd.x, proj.position.y + fwd.y, proj.position.z + fwd.z],
        fov: proj.fov,
        up: [up.x, up.y, up.z],
      }
    }
  }
  return { ...slide.camera, up: [0, 1, 0] }
}
