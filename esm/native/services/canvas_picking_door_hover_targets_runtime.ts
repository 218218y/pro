import type { UnknownRecord } from '../../../types';
import type {
  HidePreviewArgs,
  HidePreviewFn,
  HoverThreeLike,
  ReusableQuaternionCtor,
  ReusableQuaternionLike,
  ReusableVectorCtor,
  ReusableVectorLike,
} from './canvas_picking_door_hover_targets_contracts.js';
import type { HitObjectLike } from './canvas_picking_engine.js';

export function __isObject<T extends object = UnknownRecord>(x: unknown): x is T {
  return !!x && typeof x === 'object';
}

export function __asObject<T extends object = UnknownRecord>(x: unknown): T | null {
  return __isObject<T>(x) ? x : null;
}

export function __callMaybe(fn: HidePreviewFn, args: HidePreviewArgs): void {
  if (typeof fn === 'function') fn(args);
}

function __isVectorCtor(value: unknown): value is ReusableVectorCtor {
  return typeof value === 'function';
}

function __isQuaternionCtor(value: unknown): value is ReusableQuaternionCtor {
  return typeof value === 'function';
}

export function __isReusableVectorLike(value: unknown): value is ReusableVectorLike {
  const obj = __asObject<UnknownRecord>(value);
  return !!(
    obj &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.z === 'number' &&
    typeof obj.set === 'function'
  );
}

export function __isReusableQuaternionLike(value: unknown): value is ReusableQuaternionLike {
  const obj = __asObject<UnknownRecord>(value);
  return !!(obj && typeof obj.copy === 'function');
}

export function __readHoverThree(value: unknown): HoverThreeLike | null {
  const obj = __asObject<UnknownRecord>(value);
  return obj && __isVectorCtor(obj.Vector3) && __isQuaternionCtor(obj.Quaternion)
    ? { Vector3: obj.Vector3, Quaternion: obj.Quaternion }
    : null;
}

export function __reuseValue<T>(
  owner: UnknownRecord,
  key: string,
  isValue: (value: unknown) => value is T,
  create: () => T
): T {
  const existing = owner[key];
  if (isValue(existing)) return existing;
  const created = create();
  owner[key] = created;
  return created;
}

export function __readParentHitObject(value: unknown): HitObjectLike | null {
  const rec = __asObject<UnknownRecord>(value);
  const parent = rec ? rec.parent : null;
  return __asObject<HitObjectLike>(parent);
}
