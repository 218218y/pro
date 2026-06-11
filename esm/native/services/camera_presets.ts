import type { AppContainer, UnknownRecord } from '../../../types';
import { getViewportCameraControls } from './render_surface_runtime.js';
import { readUiStateFromStore } from '../runtime/root_state_access.js';
import { getStoreSurfaceMaybe } from '../runtime/store_surface_access.js';

const DEFAULT_CAM = {
  pos: { x: 0, y: 2.2, z: 5.5 },
  target: { x: 0, y: 1.4, z: 0 },
};

const CORNER_CAM = {
  posY: 2.25,
  posZBase: 5.65,
  posZScale: 0.15,

  posXBase: 1.05,
  posXScale: 0.28,
  posXMax: 2.45,

  targetY: 1.4,
  targetXBase: 0.35,
  targetXScale: 0.1,
  targetXMax: 0.75,
};

type UiSnapshotLike = UnknownRecord & { raw?: UnknownRecord | null; width?: unknown };
type RenderAccessLike = { camera: unknown; controls: unknown };

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asUiSnapshot(value: unknown): UiSnapshotLike {
  if (!isRecord(value)) return {};
  const raw = isRecord(value.raw) ? value.raw : null;
  return { ...value, raw };
}

function isRenderAccessLike(value: unknown): value is RenderAccessLike {
  if (!isRecord(value)) return false;
  return !!value.camera && !!value.controls;
}

type Vec3Writable = {
  x?: unknown;
  y?: unknown;
  z?: unknown;
  set?: (x: number, y: number, z: number) => unknown;
};

type CameraWritable = {
  position?: unknown;
  updateProjectionMatrix?: () => unknown;
};

type ControlsWritable = {
  target?: unknown;
  update?: () => unknown;
};

function readVec3Writable(value: unknown): Vec3Writable | null {
  if (!isRecord(value)) return null;
  const next: Vec3Writable = { x: value.x, y: value.y, z: value.z };
  const set = value.set;
  if (typeof set === 'function') next.set = (x, y, z) => Reflect.apply(set, value, [x, y, z]);
  return next;
}

function readCameraWritable(value: unknown): CameraWritable | null {
  if (!isRecord(value)) return null;
  const next: CameraWritable = {};
  if ('position' in value) next.position = value.position;
  const updateProjectionMatrix = value.updateProjectionMatrix;
  if (typeof updateProjectionMatrix === 'function')
    next.updateProjectionMatrix = () => Reflect.apply(updateProjectionMatrix, value, []);
  return next;
}

function readControlsWritable(value: unknown): ControlsWritable | null {
  if (!isRecord(value)) return null;
  const next: ControlsWritable = {};
  if ('target' in value) next.target = value.target;
  const update = value.update;
  if (typeof update === 'function') next.update = () => Reflect.apply(update, value, []);
  return next;
}

function writeVec3(target: unknown, x: number, y: number, z: number): boolean {
  try {
    const vec = readVec3Writable(target);
    if (!vec) return false;
    if (typeof vec.set === 'function') {
      vec.set(x, y, z);
      return true;
    }
    vec.x = x;
    vec.y = y;
    vec.z = z;
    return true;
  } catch {
    return false;
  }
}

function asNum(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
}

function getUiSnapshot(App: AppContainer): UiSnapshotLike {
  try {
    const store = getStoreSurfaceMaybe(App);
    const ui = store ? readUiStateFromStore(store) : null;
    return asUiSnapshot(ui);
  } catch {
    return {};
  }
}

function getRenderAccess(App: AppContainer): RenderAccessLike | null {
  const access = getViewportCameraControls(App);
  return isRenderAccessLike(access) ? access : null;
}

function applyCamera(
  App: AppContainer,
  pos: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number }
): boolean {
  try {
    const access = getRenderAccess(App);
    if (!access) return false;
    const camera = readCameraWritable(access.camera);
    const controls = readControlsWritable(access.controls);
    if (!camera || !controls) return false;
    const posOk = writeVec3(camera.position, pos.x, pos.y, pos.z);
    const targetOk = writeVec3(controls.target, target.x, target.y, target.z);
    if (typeof camera.updateProjectionMatrix === 'function') camera.updateProjectionMatrix();
    if (typeof controls.update === 'function') controls.update();
    return !!(posOk && targetOk);
  } catch {
    return false;
  }
}

export function adjustCameraForChest(App: AppContainer): boolean {
  return applyCamera(App, { x: 0, y: 0.8, z: 2.5 }, { x: 0, y: 0.25, z: 0 });
}

export function resetCameraPreset(App: AppContainer): boolean {
  return applyCamera(App, DEFAULT_CAM.pos, DEFAULT_CAM.target);
}

export function adjustCameraForCorner(App: AppContainer, side: 'left' | 'right'): boolean {
  const ui = getUiSnapshot(App);
  const raw = ui.raw && typeof ui.raw === 'object' ? ui.raw : null;
  const wCm = asNum(raw?.width ?? ui.width);
  const wM = wCm ? wCm / 100 : null;

  const w = Math.max(1.2, Math.min(2.8, wM ?? 1.8));
  const t = w - 1.2;

  const posX = Math.min(CORNER_CAM.posXMax, CORNER_CAM.posXBase + t * CORNER_CAM.posXScale);
  const posZ = CORNER_CAM.posZBase + t * CORNER_CAM.posZScale;
  const targetX = Math.min(CORNER_CAM.targetXMax, CORNER_CAM.targetXBase + t * CORNER_CAM.targetXScale);

  const camSign = side === 'right' ? -1 : 1;
  const tgtSign = side === 'right' ? 1 : -1;

  return applyCamera(
    App,
    { x: camSign * posX, y: CORNER_CAM.posY, z: posZ },
    { x: tgtSign * targetX, y: CORNER_CAM.targetY, z: 0 }
  );
}
