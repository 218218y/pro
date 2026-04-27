import type { CameraLike, ControlsLike, Object3DLike, RendererLike } from '../../../types';

import {
  type Object3DCompatible,
  readCameraWritable,
  readControlsWritable,
  readObject3DWritable,
  readRendererWritable,
  readVec3Writable,
} from './render_surface_runtime_support_shared.js';

function isVec3LikeValue(value: unknown): value is Object3DLike['position'] {
  const vec = readVec3Writable(value);
  return (
    !!vec &&
    typeof vec.x === 'number' &&
    Number.isFinite(vec.x) &&
    typeof vec.y === 'number' &&
    Number.isFinite(vec.y) &&
    typeof vec.z === 'number' &&
    Number.isFinite(vec.z) &&
    typeof vec.set === 'function' &&
    typeof vec.copy === 'function' &&
    typeof vec.clone === 'function' &&
    typeof vec.sub === 'function' &&
    typeof vec.add === 'function' &&
    typeof vec.multiplyScalar === 'function' &&
    typeof vec.addVectors === 'function' &&
    typeof vec.lerp === 'function'
  );
}

function isCameraLikeValue(value: unknown): value is CameraLike {
  const rec = readCameraWritable(value);
  return (
    !!rec &&
    isVec3LikeValue(rec.position) &&
    typeof rec.fov === 'number' &&
    Number.isFinite(rec.fov) &&
    typeof rec.updateProjectionMatrix === 'function'
  );
}

function isControlsLikeValue(value: unknown): value is ControlsLike {
  const rec = readControlsWritable(value);
  return (
    !!rec &&
    isVec3LikeValue(rec.target) &&
    typeof rec.update === 'function' &&
    typeof rec.addEventListener === 'function' &&
    typeof rec.removeEventListener === 'function' &&
    typeof rec.dispatchEvent === 'function'
  );
}

function isRendererLikeValue(value: unknown): value is RendererLike {
  const rec = readRendererWritable(value);
  return (
    !!rec &&
    typeof rec.setClearColor === 'function' &&
    typeof rec.setSize === 'function' &&
    typeof rec.setPixelRatio === 'function' &&
    typeof rec.render === 'function' &&
    'domElement' in rec
  );
}

function isObject3DCompatible(value: unknown): value is Object3DCompatible {
  const rec = readObject3DWritable(value);
  return (
    !!rec &&
    Array.isArray(rec.children) &&
    isVec3LikeValue(rec.position) &&
    isVec3LikeValue(rec.scale) &&
    typeof rec.rotation === 'object' &&
    rec.rotation !== null &&
    typeof rec.userData === 'object' &&
    rec.userData !== null &&
    typeof rec.add === 'function' &&
    typeof rec.remove === 'function' &&
    (rec.parent === null || readObject3DLike(rec.parent) !== null)
  );
}

export function readCameraLike(value: unknown): CameraLike | null {
  return isCameraLikeValue(value) ? value : null;
}

export function readRendererLike(value: unknown): RendererLike | null {
  return isRendererLikeValue(value) ? value : null;
}

export function readControlsLike(value: unknown): ControlsLike | null {
  return isControlsLikeValue(value) ? value : null;
}

export function readObject3DLike(value: unknown): Object3DLike | null {
  return isObject3DCompatible(value) ? value : null;
}

export function readCameraPosition(camera: unknown): unknown {
  return readCameraWritable(camera)?.position ?? null;
}

export function readControlsTarget(controls: unknown): unknown {
  return readControlsWritable(controls)?.target ?? null;
}
