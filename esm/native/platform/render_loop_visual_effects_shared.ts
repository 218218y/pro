import type { AppContainer, UnknownRecord } from '../../../types';
import type { RuntimeScalarKey, RuntimeScalarValueMap } from '../../../types/runtime_scalar';

import {
  readFiniteNumberOrNull,
  readMethod,
  readMotionComponent,
  readRecord,
} from '../runtime/render_runtime_primitives.js';

export type ReportFn = (app: AppContainer, op: string, err: unknown, opts?: UnknownRecord) => void;
export type RecordFn = (v: unknown, fallback?: UnknownRecord) => UnknownRecord;
export type OverlayStateFn = (app: AppContainer) => UnknownRecord;
export type TraversableLike = UnknownRecord & {
  visible?: boolean;
  userData?: UnknownRecord;
};
export type ApplyOpacityFn = (app: AppContainer, node: TraversableLike | null, alpha: number) => void;
export type TraversableRoot = { traverse: (cb: (obj: unknown) => void) => void };
export type CollectNodesFn = (wg: TraversableRoot) => TraversableLike[];
export type TaggedMirrorFn = (obj: UnknownRecord) => boolean;
export type HideMirrorFn = (
  obj: UnknownRecord | null,
  tex: unknown,
  mirrorsToHide: UnknownRecord[]
) => boolean;
export type MotionComponent = { x?: number; y?: number; z?: number; w?: number };
export type CameraWithMotion = {
  position?: MotionComponent;
  quaternion?: MotionComponent;
  getWorldPosition?: (v: unknown) => unknown;
  updateMatrixWorld?: (force?: boolean) => unknown;
};
export type ControlsWithTarget = { target?: MotionComponent; handleResize?: () => void };
export type RenderSlotReader = <T = unknown>(app: AppContainer, key: string) => T | null;
export type SceneNodeLookup = { getObjectByName: (name: string) => unknown };
export type FloorLike = {
  visible?: boolean;
  userData?: UnknownRecord;
  getWorldPosition: (v: unknown) => unknown;
  updateMatrixWorld?: (force?: boolean) => unknown;
};
export type Vec3Obj = { y: number };
export type Vec3Ctor = new () => Vec3Obj;
export type WardrobeGroupWithTraverse = { traverse: (cb: (obj: unknown) => void) => void; uuid?: string };
export type DoorGroupLike = { rotation?: { y?: number }; position?: { x?: number; z?: number } };
export type DoorVisualLike = {
  group?: DoorGroupLike | null;
  isOpen?: boolean;
  type?: string;
  originalX?: number;
  originalZ?: number;
};

export type VisualDeps = {
  report: ReportFn;
  now: () => number;
  asRecord: RecordFn;
  frontOverlayState: OverlayStateFn;
  applyOpacityScale: ApplyOpacityFn;
  collectFrontOverlayNodes: CollectNodesFn;
  isTaggedMirrorSurface: TaggedMirrorFn;
  tryHideMirrorSurface: HideMirrorFn;
  getCamera: (app: AppContainer) => unknown;
  getControls: (app: AppContainer) => unknown;
  getRenderSlot: RenderSlotReader;
  setRenderSlot: (app: AppContainer, key: string, value: unknown) => void;
  getRoomGroup: (app: AppContainer) => unknown;
  getScene: (app: AppContainer) => unknown;
  readAutoHideFloorCache: (app: AppContainer) => UnknownRecord;
  writeAutoHideFloorCache: (app: AppContainer, floor: unknown, roomGroup: unknown, scene: unknown) => void;
  getWardrobeGroup: (app: AppContainer) => unknown;
  getDoorsArray: (app: AppContainer) => UnknownRecord[];
  readRuntimeScalarOrDefaultFromApp: <K extends RuntimeScalarKey>(
    app: AppContainer,
    key: K,
    fallback: RuntimeScalarValueMap[K]
  ) => RuntimeScalarValueMap[K];
};

export type FrontOverlayCache = {
  wgUuid: string;
  list: TraversableLike[];
  lastAlpha: number | null;
  lastScanFrame: number;
};

export type MirrorMotionSnap = {
  px?: number;
  py?: number;
  pz?: number;
  qx?: number;
  qy?: number;
  qz?: number;
  qw?: number;
  tx?: number;
  ty?: number;
  tz?: number;
};

export function hasFiniteMirrorMotionSample(value: MirrorMotionSnap | null | undefined): boolean {
  if (!value) return false;
  return (
    readFiniteNumberOrNull(value.px) !== null ||
    readFiniteNumberOrNull(value.py) !== null ||
    readFiniteNumberOrNull(value.pz) !== null ||
    readFiniteNumberOrNull(value.qx) !== null ||
    readFiniteNumberOrNull(value.qy) !== null ||
    readFiniteNumberOrNull(value.qz) !== null ||
    readFiniteNumberOrNull(value.qw) !== null ||
    readFiniteNumberOrNull(value.tx) !== null ||
    readFiniteNumberOrNull(value.ty) !== null ||
    readFiniteNumberOrNull(value.tz) !== null
  );
}

export function assignFiniteMirrorMotionPart(
  snap: MirrorMotionSnap,
  key: keyof MirrorMotionSnap,
  value: number
): void {
  if (readFiniteNumberOrNull(value) !== null) snap[key] = value;
}

export function hasMovedMirrorMotionPart(prev: number | undefined, next: number, eps: number): boolean {
  const nextFinite = readFiniteNumberOrNull(next);
  if (nextFinite === null) return false;
  const prevFinite = readFiniteNumberOrNull(prev);
  if (prevFinite === null) return true;
  return Math.abs(prevFinite - nextFinite) > eps;
}

export function readDoorGroup(value: unknown): DoorGroupLike | null {
  const rec = readRecord(value);
  return rec ? rec : null;
}

export function readDoorVisual(value: unknown): DoorVisualLike | null {
  const rec = readRecord(value);
  return rec ? rec : null;
}

export function readAnyRecord(value: unknown): UnknownRecord | null {
  return readRecord(value);
}

export function readFrontOverlayCache(value: unknown): FrontOverlayCache | null {
  if (!value || typeof value !== 'object') return null;
  const rec = readRecord(value);
  if (!rec) return null;
  if (typeof rec.wgUuid !== 'string') return null;
  const list = Array.isArray(rec.list)
    ? rec.list.filter((item): item is TraversableLike => !!item && typeof item === 'object')
    : [];
  const lastAlpha = readFiniteNumberOrNull(rec.lastAlpha);
  const lastScanFrame = readFiniteNumberOrNull(rec.lastScanFrame) ?? 0;
  return { wgUuid: rec.wgUuid, list, lastAlpha, lastScanFrame };
}

export function readNodeLookup(value: unknown): SceneNodeLookup | null {
  const getObjectByName = readMethod<[string]>(value, 'getObjectByName');
  return getObjectByName ? { getObjectByName: (name: string) => getObjectByName(name) } : null;
}

export function readFloor(value: unknown): FloorLike | null {
  const rec = readRecord(value);
  const getWorldPosition = readMethod<[unknown]>(value, 'getWorldPosition');
  if (!rec || !getWorldPosition) return null;
  const updateMatrixWorld = readMethod<[boolean?]>(value, 'updateMatrixWorld') ?? undefined;
  return {
    visible: typeof rec.visible === 'boolean' ? rec.visible : undefined,
    userData: readRecord(rec.userData) ?? undefined,
    getWorldPosition: (v: unknown) => getWorldPosition(v),
    updateMatrixWorld: updateMatrixWorld ? (force?: boolean) => updateMatrixWorld(force) : undefined,
  };
}

export function readFiniteMotionComponent(value: unknown): MotionComponent | undefined {
  const component = readMotionComponent(value);
  if (!component) return undefined;
  const next: MotionComponent = {};
  const x = readFiniteNumberOrNull(component.x);
  const y = readFiniteNumberOrNull(component.y);
  const z = readFiniteNumberOrNull(component.z);
  const w = readFiniteNumberOrNull(component.w);
  if (x !== null) next.x = x;
  if (y !== null) next.y = y;
  if (z !== null) next.z = z;
  if (w !== null) next.w = w;
  return Object.keys(next).length > 0 ? next : undefined;
}

export function readWardrobeGroup(value: unknown): WardrobeGroupWithTraverse | null {
  const rec = readRecord(value);
  const traverse = readMethod<[(obj: unknown) => void]>(value, 'traverse');
  if (!rec || !traverse) return null;
  return {
    traverse: (cb: (obj: unknown) => void) => traverse(cb),
    uuid: typeof rec.uuid === 'string' ? rec.uuid : undefined,
  };
}

export function readCameraWithMotion(value: unknown): CameraWithMotion | null {
  const rec = readRecord(value);
  if (!rec) return null;
  const getWorldPosition = readMethod<[unknown]>(value, 'getWorldPosition') ?? undefined;
  const updateMatrixWorld = readMethod<[boolean?]>(value, 'updateMatrixWorld') ?? undefined;
  return {
    position: readFiniteMotionComponent(rec.position),
    quaternion: readFiniteMotionComponent(rec.quaternion),
    getWorldPosition: getWorldPosition ? (v: unknown) => getWorldPosition(v) : undefined,
    updateMatrixWorld: updateMatrixWorld ? (force?: boolean) => updateMatrixWorld(force) : undefined,
  };
}

export function readControlsWithTarget(value: unknown): ControlsWithTarget | null {
  const rec = readRecord(value);
  if (!rec) return null;
  const handleResize = readMethod<[]>(value, 'handleResize') ?? undefined;
  return {
    target: readFiniteMotionComponent(rec.target),
    handleResize: handleResize ? () => handleResize() : undefined,
  };
}

function isVec3Ctor(value: unknown): value is Vec3Ctor {
  return typeof value === 'function';
}

export function readVec3Ctor(value: unknown): Vec3Ctor | null {
  return isVec3Ctor(value) ? value : null;
}

export function markRenderLoopMirrorDirty(App: AppContainer, deps: Pick<VisualDeps, 'setRenderSlot'>): void {
  deps.setRenderSlot(App, '__mirrorDirty', true);
  deps.setRenderSlot(App, '__mirrorPresenceKnown', false);
}
