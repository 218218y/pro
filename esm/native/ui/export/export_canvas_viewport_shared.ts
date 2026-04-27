import type { AppContainer } from '../../../../types/app.js';
import {
  getThreeMaybe,
  getViewportRenderCore,
  getViewportCamera,
  getViewportCameraControls,
} from '../../services/api.js';
import { asObject, asRecord, getNumberProp, getProp, _toNumber } from './export_canvas_core_shared.js';
import { _exportReportThrottled } from './export_canvas_core_feedback.js';
import type { RefTargetLike } from './export_canvas_core_canvas.js';

export type ThreeVector3Like = {
  x: number;
  y: number;
  clone: () => ThreeVector3Like;
  add: (v: ThreeVector3Like) => ThreeVector3Like;
  project: (camera: unknown) => ThreeVector3Like;
};

export type ThreeVector3CtorLike = new (x: number, y: number, z: number) => ThreeVector3Like;

export type RenderCore = NonNullable<AppContainer['render']>;
export type RenderCamera = NonNullable<RenderCore['camera']>;
export type RenderControls = NonNullable<RenderCore['controls']>;
export type RenderCoreView = {
  renderer: NonNullable<AppContainer['render']['renderer']>;
  scene: NonNullable<AppContainer['render']['scene']>;
};

export type Box3Like = {
  min?: unknown;
  max?: unknown;
  copy?: (b: unknown) => unknown;
  union?: (b: unknown) => unknown;
  applyMatrix4?: (m: unknown) => unknown;
};

export type Box3CtorLike = new () => Box3Like;

export type Matrix4Like = {
  elements?: unknown;
  multiplyMatrices: (a: unknown, b: unknown) => unknown;
  clone: () => Matrix4Like;
  invert?: () => unknown;
  getInverse?: (m: unknown) => unknown;
};

export type Matrix4CtorLike = new () => Matrix4Like;

function isRenderCamera(value: unknown): value is RenderCamera {
  return !!value && typeof value === 'object';
}

function isRenderControls(value: unknown): value is RenderControls {
  return !!value && typeof value === 'object';
}

export function resolveThree(App: AppContainer): unknown {
  try {
    return getThreeMaybe(App);
  } catch (e) {
    _exportReportThrottled(App, 'resolveThree', e, { throttleMs: 2000 });
    return null;
  }
}

function isRenderCoreView(value: unknown): value is RenderCoreView {
  const rec = asRecord(value);
  const renderer = rec?.renderer;
  const scene = rec?.scene;
  return !!(renderer && scene && typeof renderer === 'object' && typeof scene === 'object');
}

export function getRenderCoreOrNull(App: AppContainer): RenderCoreView | null {
  try {
    const core = getViewportRenderCore(App);
    return isRenderCoreView(core) ? core : null;
  } catch (e) {
    _exportReportThrottled(App, 'getRenderCore', e, { throttleMs: 2000 });
    return null;
  }
}

export function getCameraOrNull(App: AppContainer): RenderCamera | null {
  try {
    const camera = getViewportCamera(App);
    return isRenderCamera(camera) ? camera : null;
  } catch (e) {
    _exportReportThrottled(App, 'getCameraOrNull', e, { throttleMs: 2000 });
    return null;
  }
}

export function getCameraControlsOrNull(
  App: AppContainer
): { camera: RenderCamera; controls: RenderControls } | null {
  try {
    const pair = asRecord(getViewportCameraControls(App));
    const camera = pair?.camera;
    const controls = pair?.controls;
    return isRenderCamera(camera) && isRenderControls(controls) ? { camera, controls } : null;
  } catch (e) {
    _exportReportThrottled(App, 'getCameraControlsOrNull', e, { throttleMs: 2000 });
    return null;
  }
}

export function cloneRefTargetLike(t: unknown): RefTargetLike {
  const tt = asObject(t);
  return {
    x: _toNumber(tt['x'], 0),
    y: _toNumber(tt['y'], 0),
    z: _toNumber(tt['z'], 0),
  };
}

export function planePointFromRefTarget(
  refTarget: RefTargetLike,
  z: number
): { x: number; y: number; z: number } {
  return { x: _toNumber(refTarget.x, 0), y: _toNumber(refTarget.y, 0), z };
}

export function getCameraZ(camera: unknown): number {
  try {
    const cam = asObject(camera);
    const pos = getProp(cam, 'position');
    const z = getNumberProp(pos, 'z', 0);
    return Number.isFinite(z) ? z : 0;
  } catch {
    return 0;
  }
}

export function getTargetZ(refTarget: RefTargetLike | null | undefined): number {
  const z = refTarget && typeof refTarget.z === 'number' ? Number(refTarget.z) : 0;
  return Number.isFinite(z) ? z : 0;
}
