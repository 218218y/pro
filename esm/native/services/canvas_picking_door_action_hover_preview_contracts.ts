import type { AppContainer, UnknownRecord } from '../../../types';

export type ReusableVectorLike = {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => unknown;
};

export type ReusableQuaternionLike = {
  copy: (next: unknown) => unknown;
};

export type TransformNodeLike = {
  userData?: UnknownRecord | null;
  getWorldPosition?: (target: ReusableVectorLike) => unknown;
  localToWorld?: (target: ReusableVectorLike) => unknown;
  worldToLocal?: (target: ReusableVectorLike) => unknown;
  getWorldQuaternion?: (target: ReusableQuaternionLike) => unknown;
};

export type MaterialColorLike = {
  set?: (value: number | string) => unknown;
  setHex?: (value: number) => unknown;
};

export type PreviewMaterialLike = UnknownRecord & {
  color?: MaterialColorLike | null;
  emissive?: MaterialColorLike | null;
  opacity?: number;
  transparent?: boolean;
  emissiveIntensity?: number;
  needsUpdate?: boolean;
};

export type MarkerUserDataLike = UnknownRecord & {
  __matAdd?: unknown;
  __matRemove?: unknown;
  __matGroove?: unknown;
  __matMirror?: unknown;
  __matCenter?: unknown;
};

export type MarkerLike = {
  visible?: boolean;
  material?: unknown;
  userData?: MarkerUserDataLike | null;
  position?: { copy?: (next: ReusableVectorLike) => unknown };
  quaternion?: { copy?: (next: ReusableQuaternionLike) => unknown };
  scale?: { set?: (x: number, y: number, z: number) => unknown };
};

export type HitObjectLike = UnknownRecord & { userData?: UnknownRecord | null; parent?: unknown };

export type DoorHoverHit = {
  hitDoorPid: string;
  hitDoorGroup: HitObjectLike;
  hitPoint: ReusableVectorLike | null;
};

export type ReadUiFn = (App: AppContainer) => UnknownRecord | null;

export type SetSketchPreviewFn = ((args: UnknownRecord) => unknown) | null | undefined;

export type DoorPreviewBaseArgs = {
  App: AppContainer;
  THREE: unknown;
  hit: DoorHoverHit;
  groupRec: TransformNodeLike | null;
  userData: UnknownRecord | null;
  wardrobeGroup: UnknownRecord;
  doorMarker: MarkerLike | null;
  markerUd: MarkerUserDataLike;
  local: ReusableVectorLike;
  localHit: ReusableVectorLike;
  wq: ReusableQuaternionLike;
  zOff: number;
};

export type DoorTrimHoverPreviewArgs = DoorPreviewBaseArgs & {
  hitDoorPid: string;
  setSketchPreview: SetSketchPreviewFn;
};

export type DoorPaintHoverPreviewArgs = DoorPreviewBaseArgs & {
  scopedHitDoorPid: string;
  canonDoorPartKeyForMaps: (id: string) => string;
  normalizedPaintSelection: string;
  setSketchPreview: SetSketchPreviewFn;
  readUi: ReadUiFn;
};

export type DoorFaceHoverPreviewArgs = DoorPreviewBaseArgs & {
  width: number;
  regionH: number;
  isHandleHoverMode: boolean;
};

export type DoorManualHandleHoverPreviewArgs = DoorPreviewBaseArgs & {
  scopedHitDoorPid: string;
  modeOpts: UnknownRecord | null;
  setSketchPreview: SetSketchPreviewFn;
};

export function __isObject<T extends object = UnknownRecord>(x: unknown): x is T {
  return !!x && typeof x === 'object';
}

export function __asObject<T extends object = UnknownRecord>(x: unknown): T | null {
  return __isObject<T>(x) ? x : null;
}
