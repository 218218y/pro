import type { AppContainer, ControlsLike, ViewportRuntimeApplySketchModeOptions } from '../../../types';

import { getControls } from '../runtime/render_access.js';
import { assertApp } from '../runtime/api.js';
import { getNormalizedErrorHead } from '../runtime/error_normalization.js';
import { reportError } from '../runtime/errors.js';
import { resetCameraPreset } from './camera_presets.js';
import { setViewportCameraPose } from './render_surface_runtime.js';
import { setRuntimeSketchMode } from '../runtime/runtime_write_access.js';
import {
  initializeSceneRuntime,
  refreshSceneRuntimeLights,
  refreshSceneRuntimeMode,
  syncSceneRuntimeFromStore,
} from './scene_runtime.js';

export type ViewportRuntimeAppLike = Partial<
  Pick<AppContainer, 'actions' | 'platform' | 'render' | 'services' | 'store'>
>;

const viewportRuntimeReportSeen = new Map<string, number>();

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export function asViewportRuntimeAppContainer(App: ViewportRuntimeAppLike): AppContainer {
  return assertApp(App, 'services/viewport_runtime_support');
}

function readViewportRuntimeErrorHead(err: unknown): string {
  return getNormalizedErrorHead(err, 'unknown');
}

export function reportViewportRuntimeNonFatal(
  App: ViewportRuntimeAppLike,
  op: string,
  err: unknown,
  throttleMs = 4000
): void {
  const now = Date.now();
  const key = `${op}::${readViewportRuntimeErrorHead(err)}`;
  const prev = viewportRuntimeReportSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  viewportRuntimeReportSeen.set(key, now);
  if (viewportRuntimeReportSeen.size > 200) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [k, ts] of viewportRuntimeReportSeen) {
      if (now - ts > pruneOlderThan) viewportRuntimeReportSeen.delete(k);
    }
  }
  reportError(App, err, { where: 'native/services/viewport_runtime', op, fatal: false });
}

export function createViewportRuntimeError(op: string, message: string, cause?: unknown): Error {
  const err = new Error(message);
  try {
    Reflect.set(err, 'cause', cause);
  } catch {
    // ignore
  }
  try {
    Reflect.set(err, '__wpViewportOp', op);
  } catch {
    // ignore
  }
  return err;
}

function isControlsLike(value: unknown): value is ControlsLike {
  return isRecord(value) && isRecord(value.target) && typeof value.update === 'function';
}

export type ViewportOrbitControlsSurface = Record<string, unknown> & {
  enabled?: boolean;
};

function readViewportOrbitControlsSurface(value: unknown): ViewportOrbitControlsSurface | null {
  return isRecord(value) ? value : null;
}

export function readViewportOrbitControlsTarget(
  App: ViewportRuntimeAppLike
): ViewportOrbitControlsSurface | null {
  try {
    const controls = getControls(App);
    return isControlsLike(controls) ? controls : readViewportOrbitControlsSurface(controls);
  } catch {
    return null;
  }
}

export function applyViewportBootCameraPose(
  App: ViewportRuntimeAppLike,
  pose: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }
): boolean {
  const container = asViewportRuntimeAppContainer(App);
  if (resetCameraPreset(container)) return true;
  return !!setViewportCameraPose(container, pose.position, pose.target);
}

export function initializeViewportSceneSyncInternal(App: ViewportRuntimeAppLike): boolean {
  return initializeSceneRuntime(asViewportRuntimeAppContainer(App));
}

export function syncViewportSceneViewAfterSketchMode(
  App: ViewportRuntimeAppLike,
  opts?: ViewportRuntimeApplySketchModeOptions
): void {
  const reason =
    typeof opts?.reason === 'string' && opts.reason ? opts.reason : 'viewportRuntime:applySketchMode';
  const updateShadows = !!opts?.updateShadows;
  const forceSync = !!opts?.forceSync;
  const container = asViewportRuntimeAppContainer(App);

  if (syncSceneRuntimeFromStore(container, { force: forceSync, updateShadows, reason })) return;

  refreshSceneRuntimeMode(container);
  refreshSceneRuntimeLights(container, updateShadows);
}

export function writeViewportSketchMode(
  App: ViewportRuntimeAppLike,
  next: boolean,
  opts?: ViewportRuntimeApplySketchModeOptions
): boolean {
  try {
    setRuntimeSketchMode(asViewportRuntimeAppContainer(App), next, {
      source: typeof opts?.source === 'string' && opts.source ? opts.source : 'viewport',
    });
    return true;
  } catch (err) {
    reportViewportRuntimeNonFatal(App, 'applyViewportSketchMode.write', err);
    return false;
  }
}
