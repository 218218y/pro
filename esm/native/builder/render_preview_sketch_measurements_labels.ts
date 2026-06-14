import type { PreviewMaterialLike, PreviewMeshLike } from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import type {
  MeasurementSurfacePlane,
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

function setQuaternionFromAxisAngle(
  label: RotatablePreviewMeshLike,
  x: number,
  y: number,
  z: number,
  angle: number
): boolean {
  if (typeof label.quaternion?.set !== 'function') return false;
  const half = angle / 2;
  const s = Math.sin(half);
  label.quaternion.set(x * s, y * s, z * s, Math.cos(half));
  return true;
}

export function orientMeasurementLabelForSurface(
  label: PreviewMeshLike,
  surfacePlane: MeasurementSurfacePlane,
  faceSign: number
): void {
  if (surfacePlane === 'xy') {
    orientMeasurementLabelForFace(label, faceSign);
    return;
  }

  const rotatable = label as RotatablePreviewMeshLike;
  const sign = faceSign < 0 ? -1 : 1;
  if (surfacePlane === 'yz') {
    const yRotation = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (typeof rotatable.rotation?.set === 'function') {
      rotatable.rotation.set(0, yRotation, 0);
      return;
    }
    setQuaternionFromAxisAngle(rotatable, 0, 1, 0, yRotation);
    return;
  }

  const xRotation = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
  if (typeof rotatable.rotation?.set === 'function') {
    rotatable.rotation.set(xRotation, 0, 0);
    return;
  }
  setQuaternionFromAxisAngle(rotatable, 1, 0, 0, xRotation);
}
