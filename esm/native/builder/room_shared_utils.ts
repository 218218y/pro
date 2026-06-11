import type { ActionMetaLike, AppContainer, ThreeLike } from '../../../types/index.js';

import { assertApp, reportError, shouldFailFast } from '../runtime/api.js';
import { ensureRoomDesignService } from '../runtime/room_design_access.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';

import type {
  AnyObj,
  FloorType,
  MeshLikeWithSet,
  RoomCanvasLike,
  RoomDesignServiceState,
  RoomTextureParams,
  RoomUpdateOpts,
} from './room_shared_types.js';

// Some build profiles ban `globalThis` (eslint no-restricted-globals).
// Using `typeof ...` is safe even when the globals don't exist.
declare const HTMLCanvasElement: undefined | (new (w?: number, h?: number) => unknown);
declare const OffscreenCanvas: undefined | (new (w: number, h: number) => unknown);

export function __ensureRoomDesignService(A: AppContainer): RoomDesignServiceState {
  return ensureRoomDesignService(A);
}

function __isMeshLikeWithSet(value: unknown): value is MeshLikeWithSet {
  const rec = _asObject<AnyObj>(value);
  const pos = rec ? _asObject<AnyObj>(rec.position) : null;
  return !!(rec && pos && typeof pos.set === 'function');
}

export function __asMeshLikeWithSet(v: unknown): MeshLikeWithSet | null {
  return __isMeshLikeWithSet(v) ? v : null;
}

export function __ensureApp(passed: unknown): AppContainer {
  const A = assertApp(passed, 'native/builder/room.app');
  __ensureRoomDesignService(A);
  return A;
}

export function __ensureTHREE(passedApp: unknown): ThreeLike {
  const A = __ensureApp(passedApp);
  return assertThreeViaDeps(A, 'native/builder/room.THREE');
}

export function _isObject<T extends AnyObj = AnyObj>(x: unknown): x is T {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

export function _asObject<T extends AnyObj = AnyObj>(x: unknown): T | null {
  return _isObject<T>(x) ? x : null;
}

export function _asRecord(x: unknown): AnyObj {
  return _asObject(x) || {};
}

export function _asActionMeta(meta: unknown, fallbackSource: string): ActionMetaLike {
  return _asObject<ActionMetaLike>(meta) || { source: fallbackSource };
}

export function _asUpdateOpts(opts: unknown): RoomUpdateOpts {
  return _asObject<RoomUpdateOpts>(opts) || {};
}

export function _asTextureParams(params: unknown): RoomTextureParams {
  return _asObject<RoomTextureParams>(params) || {};
}

function _isRoomCanvasLike(canvas: unknown): canvas is RoomCanvasLike {
  const rec = _asObject<AnyObj>(canvas);
  return (
    !!rec &&
    typeof rec.width === 'number' &&
    typeof rec.height === 'number' &&
    typeof rec.getContext === 'function'
  );
}

export function _asCanvasLike(canvas: unknown): RoomCanvasLike | null {
  if (
    typeof HTMLCanvasElement !== 'undefined' &&
    canvas instanceof HTMLCanvasElement &&
    _isRoomCanvasLike(canvas)
  )
    return canvas;
  if (
    typeof OffscreenCanvas !== 'undefined' &&
    canvas instanceof OffscreenCanvas &&
    _isRoomCanvasLike(canvas)
  )
    return canvas;
  if (_isRoomCanvasLike(canvas)) return canvas;
  return null;
}

export function _isCtor<TArgs extends unknown[], TInstance>(
  value: unknown
): value is new (...args: TArgs) => TInstance {
  return typeof value === 'function';
}

export function _readCtor<TArgs extends unknown[], TInstance>(
  obj: AnyObj,
  key: string
): (new (...args: TArgs) => TInstance) | undefined {
  const value = obj[key];
  return _isCtor<TArgs, TInstance>(value) ? value : undefined;
}

export function _readBoolish(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

export function _normalizeFloorType(type: unknown): FloorType {
  return type === 'parquet' || type === 'tiles' || type === 'none' ? type : 'parquet';
}

const __roomErrorLastAt = new Map<string, number>();

export function __roomReportError(
  A: AppContainer | null | undefined,
  op: string,
  err: unknown,
  extra?: AnyObj,
  throttleMs = 8000
) {
  const key = `room:${op}`;
  const now = Date.now();
  const prev = __roomErrorLastAt.get(key) || 0;
  if (now - prev < throttleMs) return;
  __roomErrorLastAt.set(key, now);
  reportError(A || null, err, { where: 'builder/room', op, ...(extra || {}) });
  try {
    console.warn('[WardrobePro][room]', op, err);
  } catch {
    // ignore console failures while reporting room soft errors
  }
}

export function __roomHandleCatch(
  A: AppContainer | null | undefined,
  op: string,
  err: unknown,
  extra?: AnyObj,
  opts?: { throttleMs?: number; failFast?: boolean }
): void {
  __roomReportError(A, op, err, extra, opts?.throttleMs ?? 8000);
  if (opts?.failFast !== false && shouldFailFast(A || null)) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}
