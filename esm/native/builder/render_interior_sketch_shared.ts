import type {
  AppContainer,
  BuilderPreviewScalar,
  BuilderSketchBoxDoorLike,
  BuilderSketchBoxLike,
  BuilderSketchDividerLike,
  BuilderSketchDrawerLike,
  BuilderSketchExternalDrawerLike,
  BuilderSketchExtrasLike,
  BuilderSketchIdLike,
  BuilderSketchRodLike,
  BuilderSketchShelfLike,
  BuilderSketchStorageBarrierLike,
  UnknownCallable,
} from '../../../types';
import { asRecord as readRecord } from '../runtime/record.js';

import type {
  InteriorGeometryLike,
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorMeshLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
  InteriorValueRecord,
  InteriorVector3Like,
} from './render_interior_ops_contracts.js';

export type SketchDividerExtra = BuilderSketchDividerLike;

export type SketchShelfExtra = BuilderSketchShelfLike;

export type SketchStorageBarrierExtra = BuilderSketchStorageBarrierLike;

export type SketchRodExtra = BuilderSketchRodLike;

export type SketchBoxDoorExtra = BuilderSketchBoxDoorLike;

export type SketchDrawerExtra = BuilderSketchDrawerLike;

export type SketchExternalDrawerExtra = BuilderSketchExternalDrawerLike;

export type SketchBoxExtra = BuilderSketchBoxLike;

export type SketchExtrasConfig = BuilderSketchExtrasLike;

export type SketchInternalDrawerOp = InteriorValueRecord & {
  kind: 'internal_drawer';
  partId: string;
  drawerIndex: number;
  moduleIndex: string | number;
  slotIndex: number;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
  openZ: number;
  hasDivider: boolean;
  dividerKey: string;
};

export type ApplyInternalSketchDrawersArgs = InteriorValueRecord & {
  App: AppContainer;
  THREE: InteriorTHREESurface;
  ops: SketchInternalDrawerOp[];
  wardrobeGroup: InteriorGroupLike;
  createInternalDrawerBox?: InteriorOpsCallable;
  addOutlines?: InteriorOpsCallable;
  getPartMaterial?: InteriorOpsCallable;
  bodyMat?: unknown;
  showContentsEnabled: boolean;
  addFoldedClothes?: InteriorOpsCallable;
};

export type InteriorDimensionLineFn = (
  from: InteriorVector3Like,
  to: InteriorVector3Like,
  textOffset: InteriorVector3Like,
  label: string,
  scale?: number,
  labelShift?: InteriorVector3Like
) => unknown;

export type RenderInteriorSketchInput = InteriorValueRecord & {
  sketchExtras?: SketchExtrasConfig | null;
  cfg?: InteriorValueRecord | null;
  config?: (InteriorValueRecord & { sketchExtras?: SketchExtrasConfig | null }) | null;
  createBoard?: InteriorOpsCallable;
  createRod?: InteriorOpsCallable;
  wardrobeGroup?: InteriorGroupLike | null;
  effectiveBottomY?: BuilderPreviewScalar;
  effectiveTopY?: BuilderPreviewScalar;
  innerW?: BuilderPreviewScalar;
  woodThick?: BuilderPreviewScalar;
  internalDepth?: BuilderPreviewScalar;
  internalCenterX?: BuilderPreviewScalar;
  internalZ?: BuilderPreviewScalar;
  moduleIndex?: BuilderSketchIdLike;
  modulesLength?: BuilderPreviewScalar;
  moduleKey?: BuilderSketchIdLike;
  stackKey?: BuilderSketchIdLike;
  startY?: BuilderPreviewScalar;
  startDoorId?: BuilderSketchIdLike;
  moduleDoors?: unknown;
  hingedDoorPivotMap?: unknown;
  externalW?: BuilderPreviewScalar;
  externalCenterX?: BuilderPreviewScalar;
  currentShelfMat?: unknown;
  bodyMat?: unknown;
  getPartMaterial?: InteriorOpsCallable;
  getPartColorValue?: InteriorOpsCallable;
  createDoorVisual?: InteriorOpsCallable;
  THREE?: unknown;
  createInternalDrawerBox?: InteriorOpsCallable;
  addOutlines?: InteriorOpsCallable;
  showContentsEnabled?: boolean | null;
  addFoldedClothes?: InteriorOpsCallable;
};

export type RenderInteriorSketchOpsDeps = {
  app: (ctx: unknown) => AppContainer;
  ops: (App: AppContainer) => InteriorValueRecord;
  wardrobeGroup: (App: AppContainer) => InteriorGroupLike | null;
  doors: (App: AppContainer) => unknown[];
  markSplitHoverPickablesDirty?: (App: AppContainer) => void;
  isFn: (v: unknown) => v is UnknownCallable;
  asObject: <T extends object = InteriorValueRecord>(x: unknown) => T | null;
  matCache: (App: AppContainer) => InteriorValueRecord;
  three: (THREE: unknown) => unknown;
  renderOpsHandleCatch: (
    App: AppContainer | null | undefined,
    op: string,
    err: unknown,
    extra?: InteriorValueRecord,
    opts?: { throttleMs?: number; failFast?: boolean }
  ) => void;
  assertTHREE: (App: AppContainer, where: string) => unknown;
  applyInternalDrawersOps: (args: InteriorValueRecord) => unknown;
};

export function readObject<T extends object>(value: unknown): T | null {
  return readRecord<T>(value);
}

export function asSketchInput(value: unknown): RenderInteriorSketchInput {
  return readObject<RenderInteriorSketchInput>(value) || {};
}

export function asValueRecord(value: unknown): InteriorValueRecord | null {
  return readObject<InteriorValueRecord>(value);
}

export function asRecordArray<T extends InteriorValueRecord = InteriorValueRecord>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => !!item && typeof item === 'object') : [];
}

export function asMesh(value: unknown): InteriorMeshLike | null {
  return readObject<InteriorMeshLike>(value);
}

export function asMaterial(value: unknown): InteriorMaterialLike | null {
  return readObject<InteriorMaterialLike>(value);
}

export function asGeometry(value: unknown): InteriorGeometryLike | null {
  return readObject<InteriorGeometryLike>(value);
}

export function asDimensionLineFn(value: unknown): InteriorDimensionLineFn | null {
  if (typeof value !== 'function') return null;
  return (from, to, textOffset, label, scale, labelShift) =>
    Reflect.apply(value, null, [from, to, textOffset, label, scale, labelShift]);
}

export function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(num) ? num : null;
}

export function toPositiveNumber(value: unknown): number | null {
  const num = toFiniteNumber(value);
  return num != null && num > 0 ? num : null;
}

export function toNormalizedUnit(value: unknown, fallback = 0.5): number {
  const num = toFiniteNumber(value);
  if (num == null) return fallback;
  return Math.max(0, Math.min(1, num));
}

export function applySketchExternalDrawerFaceOverrides(
  drawers: InteriorValueRecord[],
  faceWValue: unknown,
  faceOffsetXValue: unknown,
  frontZValue: unknown
): void {
  const faceW = toFiniteNumber(faceWValue);
  const faceOffsetX = toFiniteNumber(faceOffsetXValue);
  const frontZ = toFiniteNumber(frontZValue);

  if (faceW != null && faceW > 0) {
    for (let i = 0; i < drawers.length; i++) {
      const drawer = drawers[i];
      if (!drawer) continue;
      drawer.faceW = faceW;
      if (faceOffsetX != null) drawer.faceOffsetX = faceOffsetX;
      if (frontZ != null) drawer.frontZ = frontZ;
    }
    return;
  }

  if (frontZ == null && faceOffsetX == null) return;

  for (let i = 0; i < drawers.length; i++) {
    const drawer = drawers[i];
    if (!drawer) continue;
    if (frontZ != null) drawer.frontZ = frontZ;
    if (faceOffsetX != null) drawer.faceOffsetX = faceOffsetX;
  }
}

export type SketchExternalDrawerFaceVerticalAlignment = {
  height: number;
  offsetY: number;
  minY: number;
  maxY: number;
  flushBottom: boolean;
  flushTop: boolean;
};

export function resolveSketchExternalDrawerDoorFaceTopY(effectiveTopY: number, woodThick: number): number {
  const topY = Number(effectiveTopY);
  const thick = Number(woodThick);
  if (!Number.isFinite(topY)) return 0;

  // Module hinged doors are built against `effectiveTopLimit`, which is half a board
  // above the module's inner top (`effectiveTopY`). The drawer stack itself is clamped
  // to the inner top so shelves and boxes still obey the internal cabinet envelope, but
  // the external drawer front must grow to the same outer front envelope as the adjacent
  // door. Do not subtract the 4mm render-mesh shrink here: the visual/outline contract and
  // cut metadata use the full front envelope, and subtracting it leaves a snapped-top
  // sketch drawer visibly lower than the neighboring door.
  const doorFaceTopY = Number.isFinite(thick) && thick > 0 ? topY + thick / 2 : topY;
  return Number.isFinite(doorFaceTopY) && doorFaceTopY > topY ? doorFaceTopY : topY;
}

export function resolveSketchExternalDrawerFaceVerticalAlignment(args: {
  drawerIndex: number;
  drawerCount: number;
  centerY: number;
  visualH: number;
  stackMinY: number;
  stackMaxY: number;
  containerMinY: number;
  containerMaxY: number;
  flushTargetMinY?: number;
  flushTargetMaxY?: number;
  epsilon?: number;
}): SketchExternalDrawerFaceVerticalAlignment {
  const visualH = Number.isFinite(args.visualH) && args.visualH > 0 ? args.visualH : 0;
  const centerY = Number.isFinite(args.centerY) ? args.centerY : 0;
  const epsilon =
    typeof args.epsilon === 'number' && Number.isFinite(args.epsilon) && args.epsilon >= 0
      ? args.epsilon
      : 0.003;
  const drawerIndex = Math.max(0, Math.floor(args.drawerIndex));
  const drawerCount = Math.max(1, Math.floor(args.drawerCount));
  const isBottomDrawer = drawerIndex === 0;
  const isTopDrawer = drawerIndex === drawerCount - 1;
  const stackMinY = Number(args.stackMinY);
  const stackMaxY = Number(args.stackMaxY);
  const containerMinY = Number(args.containerMinY);
  const containerMaxY = Number(args.containerMaxY);
  const flushBottom =
    isBottomDrawer &&
    Number.isFinite(stackMinY) &&
    Number.isFinite(containerMinY) &&
    Math.abs(stackMinY - containerMinY) <= epsilon;
  const flushTop =
    isTopDrawer &&
    Number.isFinite(stackMaxY) &&
    Number.isFinite(containerMaxY) &&
    Math.abs(stackMaxY - containerMaxY) <= epsilon;
  const currentMinY = centerY - visualH / 2;
  const currentMaxY = centerY + visualH / 2;
  const flushTargetMinY = Number(args.flushTargetMinY);
  const flushTargetMaxY = Number(args.flushTargetMaxY);
  const targetMinY = Number.isFinite(flushTargetMinY) ? flushTargetMinY : containerMinY;
  const targetMaxY = Number.isFinite(flushTargetMaxY) ? flushTargetMaxY : containerMaxY;
  const minY = flushBottom ? targetMinY : currentMinY;
  const maxY = flushTop ? targetMaxY : currentMaxY;
  const height = maxY - minY;
  if (!(height > 0.012)) {
    return {
      height: visualH,
      offsetY: 0,
      minY: currentMinY,
      maxY: currentMaxY,
      flushBottom: false,
      flushTop: false,
    };
  }
  return {
    height,
    offsetY: (minY + maxY) / 2 - centerY,
    minY,
    maxY,
    flushBottom,
    flushTop,
  };
}

export function readSketchBoxDoors(value: unknown): SketchBoxDoorExtra[] {
  const rec = readObject<InteriorValueRecord>(value);
  if (!rec) return [];
  const raw = Array.isArray(rec.doors) ? rec.doors : [];
  const out: SketchBoxDoorExtra[] = [];
  for (let i = 0; i < raw.length; i++) {
    const door = readObject<SketchBoxDoorExtra>(raw[i]);
    if (door && door.enabled !== false) out.push(door);
  }
  return out;
}

export function readSketchBoxDoorId(value: unknown, fallback: string): string {
  const rec = readObject<InteriorValueRecord>(value);
  const raw = rec ? rec.id : null;
  return raw != null && String(raw) ? String(raw) : fallback;
}

export function readNullableStringMap(value: unknown): Record<string, string | null | undefined> | null {
  const rec = asValueRecord(value);
  if (!rec) return null;
  const out: Record<string, string | null | undefined> = {};
  for (const [key, entry] of Object.entries(rec)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

export function readUnknownMap(value: unknown): InteriorValueRecord | null {
  return asValueRecord(value);
}

export function isCallable(value: unknown): value is UnknownCallable {
  return typeof value === 'function';
}
