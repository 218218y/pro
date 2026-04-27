import type { AppContainer, Deps, Deps3D, ThreeLike } from '../../types';

type BootSoftWarn = (op: string, err: unknown) => void;

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function hasThreeNamespace(value: unknown): value is ThreeLike {
  return isRecord(value);
}

export function hasThreeDeps(deps: unknown): deps is Deps3D {
  return isRecord(deps) && hasThreeNamespace(deps.THREE);
}

export function assignRecordSurface(
  target: UnknownRecord,
  payload: unknown,
  warn: BootSoftWarn,
  op: string
): boolean {
  if (!isRecord(payload)) return false;
  try {
    Object.assign(target, payload);
    return true;
  } catch (err) {
    warn(op, err);
    return false;
  }
}

export function normalizeThreeSideConstants(deps: Deps, warn: BootSoftWarn): boolean {
  try {
    const T = deps.THREE;
    if (!hasThreeNamespace(T)) return false;
    if (typeof T.FrontSide !== 'number') T.FrontSide = 0;
    if (typeof T.BackSide !== 'number') T.BackSide = 1;
    if (typeof T.DoubleSide !== 'number') T.DoubleSide = 2;
    return true;
  } catch (err) {
    warn('deps.THREE.normalizeSideConstants', err);
    return false;
  }
}

export function installAppDeps(app: AppContainer, deps: Deps, warn: BootSoftWarn): void {
  assignRecordSurface(app.deps, deps, warn, 'deps.assign');
  normalizeThreeSideConstants(deps, warn);
  assignRecordSurface(app.config, deps.config, warn, 'deps.config.assign');
  assignRecordSurface(app.flags, deps.flags, warn, 'deps.flags.assign');
}

export function requireThreeDeps(deps: unknown): asserts deps is Deps3D {
  if (!hasThreeDeps(deps)) {
    throw new Error('[WardrobePro][ESM] boot({ deps }) missing required dep: deps.THREE');
  }
}
