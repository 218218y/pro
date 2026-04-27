import type { HitObjectLike, RaycastHitLike } from './canvas_picking_engine.js';

export type { HitObjectLike, RaycastHitLike } from './canvas_picking_engine.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type RecordLike = Record<string, unknown>;

export type ModuleSelectorHit = {
  moduleKey: ModuleKey;
  object: HitObjectLike;
  stack: 'top' | 'bottom';
  hitY: number | null;
  hit: RaycastHitLike;
};

export type ModuleHitCandidate = {
  moduleKey: ModuleKey;
  hitY: number | null;
  stackHint: 'top' | 'bottom' | null;
  object: HitObjectLike;
};

export type ToModuleKeyFn = (value: unknown) => ModuleKey | null;

export type ReadModuleHitCandidateArgs = {
  hit: unknown;
  toModuleKey: ToModuleKeyFn;
  stopAt?: ((node: unknown) => boolean) | null;
  includeSketchModuleKey?: boolean;
};

export type FindModuleSelectorHitArgs = {
  intersects: unknown[];
  moduleKey: ModuleKey;
  stackKey: 'top' | 'bottom';
  toModuleKey: ToModuleKeyFn;
};

export type FindPreferredSelectorHitArgs = {
  intersects: unknown[];
  toModuleKey: ToModuleKeyFn;
};

export type FindModuleCandidateForStackArgs = {
  intersects: unknown[];
  desiredStack: 'top' | 'bottom';
  boundaryY: number | null;
  toModuleKey: ToModuleKeyFn;
  stopAt?: ((node: unknown) => boolean) | null;
  includeSketchModuleKey?: boolean;
};

export type FindPreferredCornerCellCandidateArgs = FindModuleCandidateForStackArgs;

export type FindModuleSelectorObjectArgs = {
  root: unknown;
  moduleKey: ModuleKey;
  stackKey: 'top' | 'bottom';
  toModuleKey: ToModuleKeyFn;
};

export function isRecordLike(value: unknown): value is RecordLike {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): RecordLike | null {
  return isRecordLike(value) ? value : null;
}

export function asHitObject(value: unknown): HitObjectLike | null {
  const rec = asRecord(value);
  return rec ? rec : null;
}

export function asRaycastHitLike(value: unknown): RaycastHitLike | null {
  const rec = asRecord(value);
  const object = asHitObject(rec?.object);
  if (!object) return null;

  const pointRec = asRecord(rec?.point);
  const point = pointRec
    ? {
        x: typeof pointRec.x === 'number' ? pointRec.x : undefined,
        y: typeof pointRec.y === 'number' ? pointRec.y : undefined,
        z: typeof pointRec.z === 'number' ? pointRec.z : undefined,
      }
    : undefined;

  return point ? { object, point } : { object };
}

export function readUserData(value: unknown): RecordLike | null {
  return asRecord(asRecord(value)?.userData);
}

export function isRaycastDecorativeObject(value: unknown): boolean {
  const obj = asHitObject(value);
  return !!obj && (obj.type === 'LineSegments' || obj.type === 'Line' || obj.type === 'Sprite');
}

export function readStackKey(value: unknown): 'top' | 'bottom' | null {
  return value === 'bottom' || value === 'top' ? value : null;
}

export function readHitY(value: unknown): number | null {
  const point = asRecord(asRecord(value)?.point);
  return typeof point?.y === 'number' ? point.y : null;
}

export function isSpecificCornerCellKey(
  moduleKey: ModuleKey | null | undefined
): moduleKey is `corner:${number}` {
  return typeof moduleKey === 'string' && moduleKey.startsWith('corner:');
}

export function inferModuleStackFromHint(
  stackHint: 'top' | 'bottom' | null,
  boundaryY: number | null,
  hitY: number | null
): 'top' | 'bottom' | null {
  if (stackHint === 'top' || stackHint === 'bottom') return stackHint;
  if (
    typeof boundaryY === 'number' &&
    Number.isFinite(boundaryY) &&
    typeof hitY === 'number' &&
    Number.isFinite(hitY)
  ) {
    return hitY <= boundaryY + 1e-6 ? 'bottom' : 'top';
  }
  return null;
}
