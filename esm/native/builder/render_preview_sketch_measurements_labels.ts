import type { PreviewMaterialLike, PreviewMeshLike } from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import type {
  MeasurementTHREESurface,
  MeasurementUserData,
  RotatablePreviewMeshLike,
} from './render_preview_sketch_measurements_types.js';

export function ensureMeasurementLabelMaterial(
  userData: MeasurementUserData,
  key: string,
  texture: unknown,
  THREE: MeasurementTHREESurface,
  shared: RenderPreviewSketchShared
): PreviewMaterialLike {
  if (!(userData.__measurementLabelMatCache instanceof Map)) {
    userData.__measurementLabelMatCache = new Map<string, PreviewMaterialLike>();
  }
  const cached = userData.__measurementLabelMatCache.get(key);
  if (cached) return cached;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  shared.markKeepMaterial(material);
  userData.__measurementLabelMatCache.set(key, material);
  return material;
}

export function orientMeasurementLabelForFace(label: PreviewMeshLike, faceSign: number): void {
  const rotatable = label as RotatablePreviewMeshLike;
  const yRotation = faceSign < 0 ? Math.PI : 0;

  if (typeof rotatable.rotation?.set === 'function') {
    rotatable.rotation.set(0, yRotation, 0);
    return;
  }

  if (typeof rotatable.quaternion?.set === 'function') {
    if (faceSign < 0) rotatable.quaternion.set(0, 1, 0, 0);
    else rotatable.quaternion.set(0, 0, 0, 1);
    return;
  }

  if (faceSign >= 0 && typeof rotatable.quaternion?.identity === 'function') {
    rotatable.quaternion.identity();
  }
}
