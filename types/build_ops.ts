// Builder/services shared types.
// Split from ./build.ts into domain-focused seams to keep the public type surface stable while reducing monolith churn.

import type { UnknownRecord } from './common';
import type { ThreeLike } from './three';
import type {
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderCalculateModuleStructureFn,
  BuilderBuildChestOnlyFn,
  BuilderBuildCornerWingFn,
  BuilderRebuildDrawerMetaFn,
  BuilderDimensionLineFn,
  BuilderAddHangingClothesFn,
  BuilderAddFoldedClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderCallable,
  BuilderGetMaterialFn,
  BuilderOutlineFn,
  NullableBuilderCallable,
  NullableBuilderOutlineFn,
} from './build_builder';

export type Vec3Like = UnknownRecord & { x: number; y: number; z: number };

// Hinged doors (front swing doors)
export type HingedDoorOpLike = UnknownRecord & {
  partId: string;
  moduleIndex?: number;
  pivotX?: number;
  y?: number;
  z?: number;
  width?: number;
  height?: number;
  meshOffsetX?: number;
  isLeftHinge?: boolean;
  isMirror?: boolean;
  hasGroove?: boolean;
  curtain?: string | null;
  style?: string | null;
  handleAbsY?: number;
  allowHandle?: boolean;
  isRemoved?: boolean;
};

export type ApplyHingedDoorsArgsLike = UnknownRecord & {
  THREE: ThreeLike;
  cfg?: UnknownRecord;
  ops: HingedDoorOpLike[];
};

// Sliding doors (rail + doors)
export type SlidingDoorRailOpLike = UnknownRecord & {
  z: number;
  depth: number;
  height: number;
  width: number;
  topY: number;
  bottomY: number;
  lineOffsetY: number;
  lineOffsetZ: number;
};

export type SlidingDoorDoorSummaryLike = UnknownRecord & {
  heightNet: number;
  bottomY: number;
  centerY: number;
};

export type SlidingDoorOpLike = UnknownRecord & {
  partId: string;
  index: number;
  total: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  isOuter?: boolean;
  minX?: number;
  maxX?: number;
};

export type SlidingDoorOpsLike = UnknownRecord & {
  rail: SlidingDoorRailOpLike;
  door?: SlidingDoorDoorSummaryLike;
  doorWidth?: number;
  overlap?: number;
  doors: SlidingDoorOpLike[];
};

export type ApplySlidingDoorsArgsLike = UnknownRecord & {
  THREE: ThreeLike;
  cfg?: UnknownRecord;
  ops: SlidingDoorOpsLike;
};

// External drawers (hinged-only)
export type ExternalDrawerOpLike = UnknownRecord & {
  kind: 'shoe' | 'regular' | string;
  partId: string;
  grooveKey?: string;
  dividerKey?: string;
  moduleIndex: number;
  visualW: number;
  visualH: number;
  visualT: number;
  boxW: number;
  boxH: number;
  boxD: number;
  boxOffsetZ: number;
  connectW: number;
  connectH: number;
  connectD: number;
  connectZ: number;
  closed: Vec3Like;
  open: Vec3Like;
};

export type ExternalDrawersOpsLike = UnknownRecord & {
  moduleIndex: number;
  drawerHeightTotal: number;
  drawers: ExternalDrawerOpLike[];
};

export type ApplyExternalDrawersArgsLike = UnknownRecord & {
  THREE: ThreeLike;
  cfg?: UnknownRecord;
  config?: UnknownRecord;
  ops: ExternalDrawersOpsLike;
};

// Internal drawers (per-slot)
export type InternalDrawerOpLike = UnknownRecord & {
  kind: 'internal_drawer' | string;
  partId: string;
  drawerIndex: number;
  moduleIndex: number;
  slotIndex: number;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
  openZ?: number;
  hasDivider?: boolean;
  dividerKey?: string;
};

export type ApplyInternalDrawersArgsLike = UnknownRecord & {
  THREE: ThreeLike;
  ops: InternalDrawerOpLike[];
};

// Interior preset/custom ops
export type StorageBarrierOpLike = UnknownRecord & { barrierH: number; zFrontOffset: number };

export type InteriorRodOpLike = UnknownRecord & {
  yFactor: number;
  enableHangingClothes: boolean;
  enableSingleHanger: boolean;
  gridIndex?: number;
  yAdd?: number;
  limitFactor?: number;
  limitAdd?: number;
};

export type InteriorPresetOpsLike = UnknownRecord & {
  shelves: number[];
  rods: InteriorRodOpLike[];
  storageBarrier?: StorageBarrierOpLike;
};

export type InteriorCustomOpsLike = UnknownRecord & {
  shelves: number[];
  rods: InteriorRodOpLike[];
  storageBarrier?: StorageBarrierOpLike;
};

// Carcass/frame ops (boards/back panel/cornice + base)
export type CarcassBasePlinthOpLike = UnknownRecord & {
  kind: 'plinth' | string;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
  partId?: string;
};

export type CarcassBaseLegsOpLike = UnknownRecord & {
  kind: 'legs' | string;
  height: number;
  geo: UnknownRecord;
  positions: Array<UnknownRecord & { x: number; z: number }>;
};

export type CarcassBoardOpLike = UnknownRecord & {
  kind: 'board' | string;
  partId?: string;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
};

export type BackPanelOpLike = UnknownRecord & {
  kind: 'back_panel' | string;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
};

export type CorniceOpLike = UnknownRecord & {
  kind: 'cornice' | string;
  height: number;
  baseSize: number;
  topRadius: number;
  bottomRadius: number;
  radialSegments: number;
  scaleX: number;
  scaleZ: number;
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  partId?: string;
};

export type CarcassOpsLike = UnknownRecord & {
  baseHeight: number;
  startY: number;
  cabinetBodyHeight: number;
  base: CarcassBasePlinthOpLike | CarcassBaseLegsOpLike | null;
  boards: CarcassBoardOpLike[];
  backPanels?: BackPanelOpLike[] | null;
  backPanel: BackPanelOpLike;
  cornice: CorniceOpLike | null;
};

// --- Builder module/contents dependency surfaces (shared) ------------------
//
// These are intentionally broad "function bags": both App.deps.builder.* and
// App.services.builder.* may expose these surfaces. Typing them here avoids
// duplication and keeps the TS migration path consistent.

export interface BuilderModulesSurfaceLike extends UnknownRecord {
  createDoorVisual?: BuilderCreateDoorVisualFn;
  createInternalDrawerBox?: BuilderCreateInternalDrawerBoxFn;
  calculateModuleStructure?: BuilderCalculateModuleStructureFn;

  buildChestOnly?: BuilderBuildChestOnlyFn;
  buildCornerWing?: BuilderBuildCornerWingFn;

  __rebuildDrawerMeta?: BuilderRebuildDrawerMetaFn;

  [k: string]: unknown;
}

export interface BuilderContentsSurfaceLike extends UnknownRecord {
  addDimensionLine?: BuilderDimensionLineFn;
  addHangingClothes?: BuilderAddHangingClothesFn;
  addFoldedClothes?: BuilderAddFoldedClothesFn;
  addRealisticHanger?: BuilderAddRealisticHangerFn;

  [k: string]: unknown;
}

export interface BuilderDepsRootLike extends UnknownRecord {
  util?: { cleanGroup?: BuilderCallable; pruneCachesSafe?: BuilderCallable; [k: string]: unknown };
  materials?: { getMaterial?: BuilderGetMaterialFn; addOutlines?: BuilderOutlineFn; [k: string]: unknown };
  modules?: BuilderModulesSurfaceLike;
  contents?: BuilderContentsSurfaceLike;
  notes?: { getNotesForSave?: BuilderCallable; restoreNotesFromSave?: BuilderCallable; [k: string]: unknown };
  render?: {
    ensureWardrobeGroup?: BuilderCallable;
    triggerRender?: BuilderCallable;
    showToast?: BuilderCallable;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface BuilderDepsResolvedLike extends UnknownRecord {
  THREE: ThreeLike;
  cleanGroup: BuilderCallable;
  pruneCachesSafe: NullableBuilderCallable;
  triggerRender: NullableBuilderCallable;
  showToast: NullableBuilderCallable;
  getMaterial: BuilderGetMaterialFn;
  addOutlines: NullableBuilderOutlineFn;
  calculateModuleStructure: BuilderCalculateModuleStructureFn | null;
  createDoorVisual: BuilderCreateDoorVisualFn;
  createInternalDrawerBox: BuilderCreateInternalDrawerBoxFn | null;
  buildChestOnly: BuilderBuildChestOnlyFn | null;
  buildCornerWing: BuilderBuildCornerWingFn | null;
  rebuildDrawerMeta: BuilderRebuildDrawerMetaFn | null;
  addDimensionLine: BuilderDimensionLineFn | null;
  addHangingClothes: BuilderAddHangingClothesFn | null;
  addFoldedClothes: BuilderAddFoldedClothesFn | null;
  addRealisticHanger: BuilderAddRealisticHangerFn | null;
  getNotesForSave: NullableBuilderCallable;
  restoreNotesFromSave: NullableBuilderCallable;
}
export interface SavedColorLike extends UnknownRecord {
  id: string;
  /** User-facing saved swatch label; preserved across project/profile normalization. */
  name?: string;
  /** 'texture' indicates value is a texture id/url; other values treated as solid color. */
  type?: string;
  value?: string;
  textureData?: unknown;
  locked?: boolean;
}
