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
import { reportServiceNonFatal } from './service_error_observability.js';

export type AppLike = AppContainer | (UnknownRecord & { services?: unknown }) | null | undefined;
export type AppStateWithGetLike = { get?: () => unknown };
export type TimeoutHandle = ReturnType<typeof setTimeout>;
export type RafLike = (cb: (t?: number) => void) => TimeoutHandle;
export type CameraClock = () => number;
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
export type CameraVectorInterpolator = (a: VectorLike, b: VectorLike, alpha: number) => boolean;

export function reportCameraNonFatal(
  App: AppLike,
  where: string,
  op: string,
  error: unknown,
  consoleOutput = false
): void {
  reportServiceNonFatal(App as AppContainer | null | undefined, error, { where, op }, { consoleOutput });
}

export function createCameraClock(App: AppLike): CameraClock {
  let now: (() => number) | null = null;
  try {
    const timers = getBrowserTimers(App);
    now = typeof timers.now === 'function' ? timers.now : null;
  } catch (error) {
    reportCameraNonFatal(App, 'native/services/camera_shared', 'clock.resolve', error);
  }

  let rejected = false;
  return () => {
    if (now) {
      try {
        const value = now();
        if (Number.isFinite(value)) return value;
        throw new Error('camera clock returned a non-finite timestamp');
      } catch (error) {
        if (!rejected) {
          reportCameraNonFatal(App, 'native/services/camera_shared', 'clock.read', error);
          rejected = true;
        }
        now = null;
      }
    }
    return Date.now();
  };
}

export const CAMERA_MOVE_RENDERING_UNTIL_SLOT = '__wpCameraMoveRenderingUntilMs';

export function markCameraMoveRenderingActive(App: AppLike, untilMs: number): boolean {
  const next = Number.isFinite(untilMs) && untilMs > 0 ? untilMs : 0;
  try {
    const stored = setRenderSlot(App, CAMERA_MOVE_RENDERING_UNTIL_SLOT, next);
    const storedMatches = next === 0 ? stored == null : stored === next;
    if (storedMatches) return true;
    reportCameraNonFatal(
      App,
      'native/services/camera_shared',
      'renderActivity.writeRejected',
      new Error('camera render-activity slot rejected the requested value')
    );
  } catch (error) {
    reportCameraNonFatal(App, 'native/services/camera_shared', 'renderActivity.write', error);
  }
  return false;
}

export function clearCameraMoveRenderingActive(App: AppLike): boolean {
  return markCameraMoveRenderingActive(App, 0);
}

export function wakeCameraRenderLoop(App: AppLike): boolean {
  if (triggerRenderViaPlatform(App, false)) return true;
  return ensureRenderLoopViaPlatform(App);
}

export function getRAF(App: AppLike): RafLike {
  let raf: ((cb: FrameRequestCallback) => number) | null = null;
  let timerScheduler: ((cb: () => void, ms?: number) => TimeoutHandle) | null = null;

  try {
    const timers = getBrowserTimers(App);
    raf = typeof timers.requestAnimationFrame === 'function' ? timers.requestAnimationFrame : null;
    timerScheduler =
      typeof timers.setTimeout === 'function'
        ? (cb: () => void, ms?: number) => timers.setTimeout(cb, ms) as TimeoutHandle
        : null;
  } catch (error) {
    reportCameraNonFatal(App, 'native/services/camera_shared', 'frameScheduler.resolve', error);
  }

  let rafRejected = false;
  let timeoutRejected = false;
  return (cb: (t?: number) => void): TimeoutHandle => {
    if (raf) {
      try {
        return raf(ts => cb(ts)) as TimeoutHandle;
      } catch (error) {
        if (!rafRejected) {
          reportCameraNonFatal(App, 'native/services/camera_shared', 'frameScheduler.raf', error);
          rafRejected = true;
        }
        raf = null;
      }
    }

    if (timerScheduler) {
      try {
        return timerScheduler(() => cb(), 16);
      } catch (error) {
        if (!timeoutRejected) {
          reportCameraNonFatal(App, 'native/services/camera_shared', 'frameScheduler.timeout', error);
          timeoutRejected = true;
        }
        timerScheduler = null;
      }
    }

    return 0 as TimeoutHandle;
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
  const platformDims = readDimsLike(getDimsMFromPlatform(App));
  if (platformDims) return platformDims;

  try {
    const stateWithGetter = getStateWithGetter(App);
    const stateValue = (stateWithGetter ? stateWithGetter.get?.() : null) || readRootState(App) || {};
    const stateRec = readDimsState(stateValue);
    const dims = readDimsLike(stateRec?.dims?.m) || readDimsLike(stateRec?.dims);
    if (dims) return dims;
  } catch (error) {
    reportCameraNonFatal(App, 'native/services/camera_shared', 'dimensions.readState', error);
  }

  return { w: 2, h: 2 };
}

export function safeCloneVec(App: AppLike, THREE: ThreeLike, value: unknown, op: string): Vector3Like {
  if (isCloneableVector(value)) {
    try {
      return value.clone();
    } catch (error) {
      reportCameraNonFatal(App, 'native/services/camera_shared', `${op}.clone`, error);
    }
  }

  if (hasVectorShape(value)) {
    try {
      return new THREE.Vector3(value.x, value.y, value.z);
    } catch (error) {
      reportCameraNonFatal(App, 'native/services/camera_shared', `${op}.copy`, error);
    }
  }

  return new THREE.Vector3(0, 0, 0);
}

export function createCameraVectorInterpolator(
  App: AppLike,
  out: Vector3Like,
  op: string
): CameraVectorInterpolator {
  let useNativeLerp = isLerpVectorsLike(out);
  let nativeFailureReported = false;
  let manualFailureReported = false;

  return (a: VectorLike, b: VectorLike, alpha: number): boolean => {
    if (useNativeLerp && isLerpVectorsLike(out)) {
      try {
        Reflect.apply(out.lerpVectors, out, [a, b, alpha]);
        return true;
      } catch (error) {
        if (!nativeFailureReported) {
          reportCameraNonFatal(App, 'native/services/camera_shared', `${op}.nativeLerp`, error);
          nativeFailureReported = true;
        }
        useNativeLerp = false;
      }
    }

    try {
      out.x = a.x + (b.x - a.x) * alpha;
      out.y = a.y + (b.y - a.y) * alpha;
      out.z = a.z + (b.z - a.z) * alpha;
      return true;
    } catch (error) {
      if (!manualFailureReported) {
        reportCameraNonFatal(App, 'native/services/camera_shared', `${op}.manualLerp`, error);
        manualFailureReported = true;
      }
      return false;
    }
  };
}
