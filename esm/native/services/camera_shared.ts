import type {
  AppContainer,
  CameraLike,
  CameraServiceLike,
  ControlsLike,
  UnknownRecord,
} from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';

import { assertApp, assertTHREE, getBrowserTimers } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';
import {
  ensureRenderLoopViaPlatform,
  getDimsMFromPlatform,
  triggerRenderViaPlatform,
} from '../runtime/platform_access.js';
import { getCamera, getControls, setRenderSlot } from '../runtime/render_access.js';
import { readRootState } from '../runtime/root_state_access.js';

export type AppLike = AppContainer | (UnknownRecord & { services?: unknown }) | null | undefined;
export type AppStateWithGetLike = { get?: () => unknown };
export type TimeoutFallbackHandle = ReturnType<typeof setTimeout> | number;
export type RafLike = (cb: (t?: number) => void) => number | TimeoutFallbackHandle;
export type VectorLike = Pick<Vector3Like, 'x' | 'y' | 'z'>;
export type VectorCtorLike = new (x?: number, y?: number, z?: number) => Vector3Like;
export type ThreeLike = { Vector3: VectorCtorLike };
export type CameraMoveCameraLike = Pick<CameraLike, 'position'>;
export type CameraMoveControlsLike = Pick<ControlsLike, 'target' | 'update'>;
export type RenderCameraAccess = { camera: CameraMoveCameraLike; controls: CameraMoveControlsLike };
export type DimsLike = { w: number; h: number };
export type DimsStateLike = { dims?: { m?: { w?: unknown; h?: unknown }; w?: unknown; h?: unknown } };
export type CloneableVectorLike = VectorLike & { clone: () => Vector3Like };
export type LerpVectorsLike = { lerpVectors: (a: VectorLike, b: VectorLike, alpha: number) => void };

export function nowMs(App: AppLike): number {
  try {
    const t = getBrowserTimers(App);
    return typeof t.now === 'function' ? t.now() : Date.now();
  } catch {
    return Date.now();
  }
}

export const CAMERA_MOVE_RENDERING_UNTIL_SLOT = '__wpCameraMoveRenderingUntilMs';

export function markCameraMoveRenderingActive(App: AppLike, untilMs: number): void {
  try {
    const next = Number.isFinite(untilMs) && untilMs > 0 ? untilMs : 0;
    setRenderSlot(App, CAMERA_MOVE_RENDERING_UNTIL_SLOT, next);
  } catch (_) {}
}

export function clearCameraMoveRenderingActive(App: AppLike): void {
  markCameraMoveRenderingActive(App, 0);
}

export function wakeCameraRenderLoop(App: AppLike): void {
  try {
    if (triggerRenderViaPlatform(App, false)) return;
  } catch (_) {}

  try {
    ensureRenderLoopViaPlatform(App);
  } catch (_) {}
}

export function getRAF(App: AppLike): RafLike {
  try {
    const t = getBrowserTimers(App);
    const raf = t && typeof t.requestAnimationFrame === 'function' ? t.requestAnimationFrame : null;
    if (raf) return (cb: (t?: number) => void) => raf(ts => cb(ts));
  } catch (_) {}
  return (cb: (t?: number) => void) => {
    try {
      return setTimeout(() => cb(), 16);
    } catch (_) {
      return 0;
    }
  };
}

export function isThreeLike(value: unknown): value is ThreeLike {
  const rec = asRecord(value);
  return !!rec && typeof rec.Vector3 === 'function';
}

export function hasVectorShape(v: unknown): v is VectorLike {
  const rec = asRecord(v);
  return !!rec && typeof rec.x === 'number' && typeof rec.y === 'number' && typeof rec.z === 'number';
}

export function isCloneableVector(v: unknown): v is CloneableVectorLike {
  return hasVectorShape(v) && typeof asRecord(v)?.clone === 'function';
}

export function isLerpVectorsLike(v: unknown): v is LerpVectorsLike {
  return !!asRecord(v) && typeof asRecord(v)?.lerpVectors === 'function';
}

export function isCameraMoveCameraLike(value: unknown): value is CameraMoveCameraLike {
  const rec = asRecord(value);
  return !!rec && hasVectorShape(rec.position);
}

export function isCameraMoveControlsLike(value: unknown): value is CameraMoveControlsLike {
  const rec = asRecord(value);
  return !!rec && hasVectorShape(rec.target) && typeof rec.update === 'function';
}

export function isStateWithGetLike(value: unknown): value is AppStateWithGetLike {
  return !!asRecord(value) && typeof asRecord(value)?.get === 'function';
}

export function isDimsStateLike(value: unknown): value is DimsStateLike {
  return !!asRecord(value);
}

export function readDimsState(value: unknown): DimsStateLike | null {
  return isDimsStateLike(value) ? value : null;
}

export function readFiniteDimension(value: unknown, defaultValue: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

export function readDimsLike(value: unknown): DimsLike | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const w = readFiniteDimension(rec.w, 0);
  const h = readFiniteDimension(rec.h, 0);
  return w > 0 && h > 0 ? { w, h } : null;
}

export function getTHREE(App: AppLike): ThreeLike {
  const three = assertTHREE(assertApp(App, 'native/services/camera.THREE'), 'native/services/camera.THREE');
  if (!isThreeLike(three)) {
    throw new Error('[WardrobePro][camera] THREE.Vector3 is missing');
  }
  return three;
}

export function getRenderCameraAccess(app: AppContainer): RenderCameraAccess | null {
  const camera = getCamera(app);
  const controls = getControls(app);
  return isCameraMoveCameraLike(camera) && isCameraMoveControlsLike(controls) ? { camera, controls } : null;
}

export function getStateWithGetter(App: AppLike): AppStateWithGetLike | null {
  const rec = asRecord(App);
  const stateRec = asRecord(rec?.state);
  return isStateWithGetLike(stateRec) ? stateRec : null;
}

export function isCameraServiceLike(value: unknown): value is CameraServiceLike {
  const rec = asRecord(value);
  return !!rec && (typeof rec.moveTo === 'function' || typeof rec.moveTo === 'undefined');
}

export function readCameraService(value: unknown): CameraServiceLike | null {
  return isCameraServiceLike(value) ? value : null;
}

export function getDimsSafe(App: AppLike): DimsLike {
  try {
    const dims = readDimsLike(getDimsMFromPlatform(App));
    if (dims) return dims;
  } catch (_) {}

  try {
    const stateWithGetter = getStateWithGetter(App);
    const stateValue = (stateWithGetter ? stateWithGetter.get?.() : null) || readRootState(App) || {};
    const stateRec = readDimsState(stateValue);
    const dims = readDimsLike(stateRec?.dims?.m) || readDimsLike(stateRec?.dims);
    if (dims) return dims;
  } catch (_) {}

  return { w: 2, h: 2 };
}

export function safeCloneVec(THREE: ThreeLike, v: unknown): Vector3Like {
  try {
    if (isCloneableVector(v)) return v.clone();
    if (hasVectorShape(v)) return new THREE.Vector3(v.x, v.y, v.z);
  } catch (_) {}
  return new THREE.Vector3(0, 0, 0);
}

export function lerpVectorsSafe(out: Vector3Like, a: VectorLike, b: VectorLike, t: number): void {
  try {
    if (isLerpVectorsLike(out)) {
      Reflect.apply(out.lerpVectors, out, [a, b, t]);
      return;
    }
  } catch (_) {}

  try {
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    out.z = a.z + (b.z - a.z) * t;
  } catch (_) {}
}
