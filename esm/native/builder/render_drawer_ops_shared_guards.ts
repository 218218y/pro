import type { Object3DLike, ThreeLike, UnknownRecord } from '../../../types';
import type { FnLike } from './render_drawer_ops_shared_types.js';

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isFunction(value: unknown): value is FnLike {
  return typeof value === 'function';
}

export function readFinite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isObject3DLike(value: unknown): value is Object3DLike {
  return isRecord(value) && typeof value.add === 'function';
}

export function readObject3D(value: unknown): Object3DLike | null {
  return isObject3DLike(value) ? value : null;
}

function isThreeLike(value: unknown): value is ThreeLike {
  if (!isRecord(value)) return false;
  return (
    typeof value.Group === 'function' &&
    typeof value.Mesh === 'function' &&
    typeof value.Vector3 === 'function' &&
    typeof value.BoxGeometry === 'function'
  );
}

export function readThreeLike(value: unknown): ThreeLike | null {
  return isThreeLike(value) ? value : null;
}

export function readFinitePositive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
