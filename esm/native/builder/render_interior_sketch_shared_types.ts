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

import type {
  InteriorGroupLike,
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

export type SketchExternalDrawerFaceVerticalAlignment = {
  height: number;
  offsetY: number;
  minY: number;
  maxY: number;
  flushBottom: boolean;
  flushTop: boolean;
};
