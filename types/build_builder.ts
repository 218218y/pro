// Builder/services shared types.
// Split from ./build.ts into domain-focused seams to keep the public type surface stable while reducing monolith churn.

import type { UnknownRecord } from './common';
import type { Object3DLike } from './three_like';
import type { ThreeLike } from './three';
import type { AppContainer } from './app';
import type { HandleType, HingeDir, WardrobeType } from './domain';
import type { ModulesStructureItemLike } from './modules_configuration';
import type {
  GroovesMap,
  GrooveLinesCountMap,
  SplitDoorsMap,
  SplitDoorsBottomMap,
  RemovedDoorsMap,
  HandlesMap,
  HingeMap,
  CurtainMap,
  IndividualColorsMap,
  DoorSpecialMap,
  DoorStyleMap,
  MirrorLayoutList,
  MirrorLayoutMap,
  DoorTrimMap,
} from './maps';
import type { ActionMetaLike } from './kernel';
import type { BuildStateLike, UiSnapshotLike } from './build_state';
import type {
  BuilderContentsSurfaceLike,
  BuilderModulesSurfaceLike,
  CarcassOpsLike,
  ApplySlidingDoorsArgsLike,
  ApplyHingedDoorsArgsLike,
  ApplyExternalDrawersArgsLike,
  ApplyInternalDrawersArgsLike,
} from './build_ops';

export type BuilderArgs = readonly unknown[];
export type BuilderCallable<Args extends BuilderArgs = BuilderArgs, Result = unknown> = (
  ...args: Args
) => Result;
export type NullableBuilderCallable<
  Args extends BuilderArgs = BuilderArgs,
  Result = unknown,
> = BuilderCallable<Args, Result> | null;
export type BuilderObject3DFn<Args extends BuilderArgs = BuilderArgs> = (...args: Args) => Object3DLike;
export type NullableBuilderObject3DFn<Args extends BuilderArgs = BuilderArgs> =
  BuilderObject3DFn<Args> | null;
export type BuilderOutlineFn = (mesh: unknown) => unknown;
export type NullableBuilderOutlineFn = BuilderOutlineFn | null;
export type BuilderDoorVisualFrameStyle = 'flat' | 'profile' | 'tom';

export type BuilderDoorVisualOptions = {
  glassFrameStyle?: BuilderDoorVisualFrameStyle | null;
};

export type BuilderInternalDrawerBoxOptions = {
  omitFrontPanel?: boolean;
};

export type BuilderCreateDoorVisualFn = (
  w: number,
  h: number,
  thickness: number,
  mat: unknown,
  style: unknown,
  hasGrooves?: boolean,
  isMirror?: boolean,
  curtainType?: string | null,
  baseMaterial?: unknown | null,
  frontFaceSign?: number,
  forceCurtainFix?: boolean,
  mirrorLayout?: MirrorLayoutList | null,
  groovePartId?: string | null,
  options?: BuilderDoorVisualOptions | null
) => Object3DLike;
export type BuilderCreateInternalDrawerBoxFn = (
  w: number,
  h: number,
  d: number,
  mat: unknown,
  drawerMat: unknown,
  outlineFunc?: BuilderOutlineFn | null,
  hasDivider?: boolean,
  addHandle?: boolean,
  options?: BuilderInternalDrawerBoxOptions | null
) => Object3DLike;

export type BuilderPreviewScalar = number | string | null | undefined;
export type BuilderPreviewBool = boolean | null | undefined;
export interface PreviewDrawerEntryLike extends UnknownRecord {
  y?: BuilderPreviewScalar;
  h?: BuilderPreviewScalar;
}
export interface PreviewStorageBarrierEntryLike extends UnknownRecord {
  y?: BuilderPreviewScalar;
  h?: BuilderPreviewScalar;
  z?: BuilderPreviewScalar;
}
export interface BuilderPreviewMeasurementEntryLike extends UnknownRecord {
  startX?: BuilderPreviewScalar;
  startY?: BuilderPreviewScalar;
  endX?: BuilderPreviewScalar;
  endY?: BuilderPreviewScalar;
  z?: BuilderPreviewScalar;
  label?: string | null;
  labelX?: BuilderPreviewScalar;
  labelY?: BuilderPreviewScalar;
  styleKey?: string | null;
  textScale?: BuilderPreviewScalar;
  faceSign?: BuilderPreviewScalar;
  viewFaceSign?: BuilderPreviewScalar;
  labelFaceSign?: BuilderPreviewScalar;
}

export interface BuilderPreviewMarkerLike extends UnknownRecord {
  visible?: boolean;
  userData?: UnknownRecord | null;
}
export interface SketchPlacementPreviewArgsLike extends UnknownRecord {
  App?: AppContainer;
  THREE?: unknown;
  anchor?: unknown;
  anchorParent?: unknown;
  kind?: string | null;
  variant?: string | null;
  op?: 'add' | 'remove' | string | null;
  isRemove?: BuilderPreviewBool;
  x?: BuilderPreviewScalar;
  y?: BuilderPreviewScalar;
  z?: BuilderPreviewScalar;
  w?: BuilderPreviewScalar;
  h?: BuilderPreviewScalar;
  d?: BuilderPreviewScalar;
  woodThick?: BuilderPreviewScalar;
  drawerH?: BuilderPreviewScalar;
  drawerGap?: BuilderPreviewScalar;
  drawers?: PreviewDrawerEntryLike[] | null;
  highlightX?: BuilderPreviewScalar;
  snapToCenter?: BuilderPreviewBool;
  boxH?: BuilderPreviewScalar;
  fillFront?: BuilderPreviewBool;
  fillBack?: BuilderPreviewBool;
  overlayThroughScene?: BuilderPreviewBool;
  faceSign?: BuilderPreviewScalar;
  viewFaceSign?: BuilderPreviewScalar;
  labelFaceSign?: BuilderPreviewScalar;
  clearanceMeasurements?: BuilderPreviewMeasurementEntryLike[] | null;
}
export interface InteriorLayoutHoverPreviewArgsLike extends UnknownRecord {
  App?: AppContainer;
  THREE?: unknown;
  anchor?: unknown;
  anchorParent?: unknown;
  x?: BuilderPreviewScalar;
  internalZ?: BuilderPreviewScalar;
  internalDepth?: BuilderPreviewScalar;
  innerW?: BuilderPreviewScalar;
  woodThick?: BuilderPreviewScalar;
  shelfVariant?: string | null;
  op?: 'add' | 'remove' | string | null;
  isRemove?: BuilderPreviewBool;
  shelfYs?: BuilderPreviewScalar[] | null;
  rodYs?: BuilderPreviewScalar[] | null;
  storageBarrier?: PreviewStorageBarrierEntryLike | null;
}

export type BuilderSketchIdLike = string | number | null | undefined;
export type BuilderSketchScalar = BuilderPreviewScalar;
export type BuilderSketchAdornmentBaseTypeLike = 'plinth' | 'legs' | 'none' | string | null | undefined;
export type BuilderSketchCorniceTypeLike = 'classic' | 'wave' | string | null | undefined;

export interface BuilderSketchDividerLike extends UnknownRecord {
  id?: BuilderSketchIdLike;
  xNorm?: BuilderSketchScalar;
}

export interface BuilderSketchShelfLike extends UnknownRecord {
  id?: BuilderSketchIdLike;
  yNorm?: BuilderSketchScalar;
  xNorm?: BuilderSketchScalar;
  depthM?: BuilderSketchScalar;
  variant?: string | null;
}

export interface BuilderSketchStorageBarrierLike extends UnknownRecord {
  id?: BuilderSketchIdLike;
  yNorm?: BuilderSketchScalar;
  xNorm?: BuilderSketchScalar;
  heightM?: BuilderSketchScalar;
  hM?: BuilderSketchScalar;
}

export interface BuilderSketchRodLike extends UnknownRecord {
  id?: BuilderSketchIdLike;
  yNorm?: BuilderSketchScalar;
  xNorm?: BuilderSketchScalar;
}

export interface BuilderSketchDrawerLike extends UnknownRecord {
  id?: BuilderSketchIdLike;
  yNorm?: BuilderSketchScalar;
  yNormC?: BuilderSketchScalar;
  xNorm?: BuilderSketchScalar;
  drawerHeightM?: BuilderSketchScalar;
}

export interface BuilderSketchExternalDrawerLike extends BuilderSketchDrawerLike {
  count?: BuilderSketchScalar;
}

export interface BuilderSketchBoxDoorLike extends UnknownRecord {
  id?: BuilderSketchIdLike;
  enabled?: boolean | null;
  hinge?: string | null;
  open?: boolean | null;
  xNorm?: BuilderSketchScalar;
  groove?: boolean | null;
  grooveLinesCount?: BuilderSketchScalar;
}

export interface BuilderSketchBoxLike extends UnknownRecord {
  id?: BuilderSketchIdLike;
  freePlacement?: boolean | null;
  heightM?: BuilderSketchScalar;
  hM?: BuilderSketchScalar;
  widthM?: BuilderSketchScalar;
  depthM?: BuilderSketchScalar;
  absX?: BuilderSketchScalar;
  absY?: BuilderSketchScalar;
  yNorm?: BuilderSketchScalar;
  xNorm?: BuilderSketchScalar;
  hasCornice?: boolean | null;
  corniceType?: BuilderSketchCorniceTypeLike;
  baseType?: BuilderSketchAdornmentBaseTypeLike;
  baseLegStyle?: string | null;
  baseLegColor?: string | null;
  baseLegHeightCm?: BuilderSketchScalar;
  dividerXNorm?: BuilderSketchScalar;
  centerDivider?: boolean | null;
  dividers?: BuilderSketchDividerLike[] | null;
  shelves?: BuilderSketchShelfLike[] | null;
  storageBarriers?: BuilderSketchStorageBarrierLike[] | null;
  rods?: BuilderSketchRodLike[] | null;
  drawers?: BuilderSketchDrawerLike[] | null;
  extDrawers?: BuilderSketchExternalDrawerLike[] | null;
  doors?: BuilderSketchBoxDoorLike[] | null;
}

export interface BuilderSketchExtrasLike extends UnknownRecord {
  shelves?: BuilderSketchShelfLike[] | null;
  boxes?: BuilderSketchBoxLike[] | null;
  storageBarriers?: BuilderSketchStorageBarrierLike[] | null;
  rods?: BuilderSketchRodLike[] | null;
  drawers?: BuilderSketchDrawerLike[] | null;
  extDrawers?: BuilderSketchExternalDrawerLike[] | null;
}

export interface BuilderBuildChestOnlyOptsLike extends UnknownRecord {
  H?: number;
  totalW?: number;
  D?: number;
  drawersCount?: number | string;
  baseType?: unknown;
  baseLegStyle?: unknown;
  baseLegColor?: unknown;
  baseLegHeightCm?: unknown;
  colorChoice?: unknown;
  customColor?: unknown;
}
export type BuilderBuildChestOnlyFn = (opts?: BuilderBuildChestOnlyOptsLike | null) => unknown;
export interface BuilderBuildCornerWingMaterialsLike extends UnknownRecord {
  body: unknown;
  front: unknown;
}
export interface BuilderCornerBuildMetaLike extends UnknownRecord {
  stackKey?: 'top' | 'bottom';
  baseType?: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  baseLegHeightCm?: number | string;
  stackSplitEnabled?: boolean;
  stackOffsetZ?: number;
}
export interface BuilderBuildCornerWingCtxLike extends UnknownRecord {
  App?: unknown;
}
export type BuilderBuildCornerWingFn = (
  mainW: number,
  mainH: number,
  mainD: number,
  woodThick: number,
  startY: number,
  materials: BuilderBuildCornerWingMaterialsLike,
  metaOrCtx?: BuilderCornerBuildMetaLike | BuilderBuildCornerWingCtxLike | null,
  ctxMaybe?: BuilderBuildCornerWingCtxLike | null
) => unknown;
export type BuilderAddHangingClothesFn = (
  rodX: number,
  rodY: number,
  rodZ: number,
  width: number,
  parentGroup: Object3DLike,
  maxHeight: number,
  isRestrictedDepth?: boolean | number,
  showContentsOverride?: boolean,
  doorStyleOverride?: unknown
) => unknown;
export type BuilderAddFoldedClothesFn = (
  shelfX: number,
  shelfY: number,
  shelfZ: number,
  width: number,
  parentGroup: Object3DLike,
  maxHeight?: number,
  maxDepth?: number
) => unknown;
export type BuilderAddRealisticHangerFn = (
  rodX: number,
  rodY: number,
  rodZ: number,
  parentGroup: Object3DLike,
  moduleWidth?: number,
  enabledOverride?: boolean
) => unknown;
export type BuilderCalculateModuleStructureFn = (
  doorsCount: unknown,
  singlePos: unknown,
  structureSelectValue: unknown,
  wardrobeType: unknown,
  app?: unknown
) => ModulesStructureItemLike[];
export type BuilderRebuildDrawerMetaFn = () => void;
export type BuilderVec3Like = { x: number; y: number; z: number };
export type BuilderDimensionLineFn = (
  from: BuilderVec3Like,
  to: BuilderVec3Like,
  textOffset: BuilderVec3Like,
  label: string,
  scale?: number,
  labelOffset?: BuilderVec3Like
) => unknown;

export type BuilderCreateBoardFn = {
  (args: BuilderCreateBoardArgsLike): Object3DLike;
  (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: unknown,
    partId?: unknown,
    sketchMode?: boolean
  ): Object3DLike;
};
export type BuilderCreateHandleMeshFn = (
  type: string,
  w: number,
  h: number,
  isLeftHinge: boolean,
  opts?: BuilderHandleMeshOptionsLike
) => Object3DLike | null;
export type BuilderGetMirrorMaterialFn = (args?: BuilderRenderCommonArgsLike | null) => unknown;
export type BuilderDebouncedBuildFn = () => unknown;
export type BuilderDebounceFn<T extends BuilderCallable = BuilderCallable> = (fn: T, ms?: number) => T;
export type BuilderGetMaterialFn = (
  color: unknown,
  type: unknown,
  useCustomTexture?: unknown,
  customTextureDataURL?: unknown
) => unknown;
export interface BuilderRenderCommonArgsLike extends UnknownRecord {
  App?: AppContainer;
  THREE?: ThreeLike | null;
  addOutlines?: NullableBuilderOutlineFn;
}
export interface BuilderHandleMeshOptionsLike extends BuilderRenderCommonArgsLike {
  handleColor?: string | null;
  edgeHandleVariant?: string | null;
}
export interface BuilderCreateBoardArgsLike extends BuilderRenderCommonArgsLike {
  w?: number;
  h?: number;
  d?: number;
  x?: number;
  y?: number;
  z?: number;
  mat?: unknown;
  partId?: unknown;
  sketchMode?: boolean;
}
export interface BuilderCreateModuleHitBoxArgsLike extends BuilderRenderCommonArgsLike {
  modWidth?: number;
  cabinetBodyHeight?: number;
  D?: number;
  x?: number;
  y?: number;
  z?: number;
  moduleIndex?: unknown;
  __wpStack?: unknown;
}
export interface BuilderCreateDrawerShadowPlaneArgsLike extends BuilderRenderCommonArgsLike {
  externalW?: number;
  shadowH?: number;
  shadowY?: number;
  externalCenterX?: number;
  D?: number;
  frontZ?: number;
  shadowMat?: unknown;
}
export interface RoomTextureParamsLike extends UnknownRecord {
  id?: string;
  color?: string;
  color1?: string;
  color2?: string;
  lines?: string;
  size?: number;
}
export type BuilderInteriorRodCreator = (
  yPos: number,
  enableHangingClothes?: boolean,
  enableSingleHanger?: boolean,
  manualHeightLimit?: number | null
) => unknown;
export interface BuilderCreateRodConfigLike extends UnknownRecord {
  intDrawersList?: unknown;
  intDrawersSlot?: unknown;
}
export interface BuilderCreateRodWithContentsArgsLike extends BuilderRenderCommonArgsLike {
  yPos?: number;
  enableHangingClothes?: boolean;
  enableSingleHanger?: boolean;
  manualHeightLimit?: number | null;
  cfg?: unknown;
  config?: BuilderCreateRodConfigLike | null;
  effectiveBottomY?: number;
  localGridStep?: number;
  isInternalDrawersEnabled?: boolean;
  intDrawersList?: unknown;
  intDrawersSlot?: unknown;
  innerW?: number;
  internalCenterX?: number;
  internalZ?: number;
  internalDepth?: number;
  doorFrontZ?: number;
  legMat?: unknown;
  wardrobeGroup?: unknown;
  showHangerEnabled?: boolean;
  showContentsEnabled?: boolean;
  doorStyle?: unknown;
  addRealisticHanger?: BuilderContentsSurfaceLike['addRealisticHanger'];
  addHangingClothes?: BuilderContentsSurfaceLike['addHangingClothes'];
}
export interface BuilderApplyCarcassContextLike extends UnknownRecord {
  THREE?: ThreeLike | null;
  App: AppContainer | UnknownRecord;
  addOutlines?: BuilderOutlineFn | null;
  getPartMaterial?: BuilderPartMaterialResolver;
  __sketchMode?: boolean;
  legMat?: unknown;
  masoniteMat?: unknown;
  whiteMat?: unknown;
  bodyMat?: unknown;
  plinthMat?: unknown;
  corniceMat?: unknown;
}
export interface BuilderInternalDrawerSlotMetaLike extends UnknownRecord {
  slotAvailableHeight?: number;
}
export type BuilderInternalDrawerCreator = (
  slotIndex: number,
  slotMeta?: BuilderInternalDrawerSlotMetaLike
) => boolean;

export type BuilderPartMaterialResolver = (partId: string) => unknown;
export type BuilderPartColorValue = string | null | undefined;
export type BuilderPartColorResolver = (partId: string) => BuilderPartColorValue;
export type BuilderHandleTypeResolver = (partId: unknown) => unknown;
export type BuilderDoorRemovedResolver = (partId: string) => boolean;
export type BuilderHingeDirResolver = (hingeKey: string, fallback: HingeDir) => HingeDir;
export type BuilderDoorSplitResolver = (
  map: SplitDoorsMap | SplitDoorsBottomMap | unknown,
  doorIdNum: number
) => boolean;
export type BuilderCurtainResolver = (
  doorIdNumOrPartId: number | string,
  suffixOrFallback: string | BuilderPartColorValue,
  fallback?: BuilderPartColorValue
) => BuilderPartColorValue;
export type BuilderGrooveResolver = (doorIdNum: number, suffix: string, fullDefault: boolean) => boolean;

export interface BuilderDoorStateAccessorsLike extends UnknownRecord {
  getHingeDir: BuilderHingeDirResolver;
  isDoorSplit: BuilderDoorSplitResolver;
  isDoorSplitBottom: BuilderDoorSplitResolver;
  curtainVal: BuilderCurtainResolver;
  grooveVal: BuilderGrooveResolver;
}

export interface BuilderDoorMapsConfigLike extends UnknownRecord {
  wardrobeType?: WardrobeType | string | null;
  globalHandleType?: HandleType | string | null;
  hingeMap?: HingeMap | null;
  handlesMap?: HandlesMap | null;
  splitDoorsMap?: SplitDoorsMap | null;
  splitDoorsBottomMap?: SplitDoorsBottomMap | null;
  groovesMap?: GroovesMap | null;
  grooveLinesCountMap?: GrooveLinesCountMap | null;
  removedDoorsMap?: RemovedDoorsMap | null;
  curtainMap?: CurtainMap | null;
  individualColors?: IndividualColorsMap | null;
  doorSpecialMap?: DoorSpecialMap | null;
  doorStyleMap?: DoorStyleMap | null;
  mirrorLayoutMap?: MirrorLayoutMap | null;
  doorTrimMap?: DoorTrimMap | null;
  isMultiColorMode?: boolean;
}

// --- Service namespace surfaces (minimal; evolve gradually) -----------------

// --- Builder service surfaces (minimal; refine gradually) -------------------

export interface BuildPlanLike extends UnknownRecord {
  kind: string;
  createdAt: number;
  state: BuildStateLike;
  signature?: unknown;
  meta?: UnknownRecord;
}

export interface BuilderPlanServiceLike extends UnknownRecord {
  __esm_v1?: boolean;
  __deps?: UnknownRecord;
  createBuildPlan?: (input: unknown, meta?: UnknownRecord) => BuildPlanLike;
  setPlanDeps?: (deps: unknown) => UnknownRecord;
}

export interface BuildRequestOptsLike extends UnknownRecord {
  immediate?: boolean;
  force?: boolean;
  reason?: string;
}

export interface BuilderSchedulerDepsLike extends UnknownRecord {
  getBuildState?: ((uiOverride: UnknownRecord | null) => BuildStateLike) | null;
  createBuildPlan?: ((state: BuildStateLike) => BuildPlanLike) | null;
  debounce?: BuilderDebounceFn | null;
  getActiveElementId?: (() => string) | null;
}

export interface BuildReasonDebugStatLike extends UnknownRecord {
  reason: string;
  requestCount: number;
  immediateRequestCount: number;
  debouncedRequestCount: number;
  executeCount: number;
  executeImmediateCount: number;
  executeDebouncedCount: number;
  overwriteCount: number;
  debouncedScheduleCount: number;
  reusedDebouncedScheduleCount: number;
  builderWaitScheduleCount: number;
  staleDebouncedTimerFireCount: number;
  staleBuilderWaitWakeupCount: number;
  duplicatePendingSignatureCount: number;
  skippedDuplicatePendingRequestCount: number;
  skippedSatisfiedRequestCount: number;
  repeatedExecuteCount: number;
  skippedRepeatedExecuteCount: number;
  lastRequestTs?: number;
  lastExecuteTs?: number;
}

export interface BuilderDebugStatsLike extends UnknownRecord {
  requestCount: number;
  immediateRequestCount: number;
  debouncedRequestCount: number;
  executeCount: number;
  executeImmediateCount: number;
  executeDebouncedCount: number;
  pendingOverwriteCount: number;
  debouncedScheduleCount: number;
  reusedDebouncedScheduleCount: number;
  builderWaitScheduleCount: number;
  staleDebouncedTimerFireCount: number;
  staleBuilderWaitWakeupCount: number;
  duplicatePendingSignatureCount: number;
  skippedDuplicatePendingRequestCount: number;
  skippedSatisfiedRequestCount: number;
  repeatedExecuteCount: number;
  skippedRepeatedExecuteCount: number;
  lastRequestReason: string;
  lastExecuteReason: string;
  reasons: Record<string, BuildReasonDebugStatLike>;
}

export interface BuildDebugBudgetSummaryLike extends UnknownRecord {
  requestCount: number;
  executeCount: number;
  suppressedRequestCount: number;
  suppressedExecuteCount: number;
  duplicatePendingRate: number;
  noOpRequestRate: number;
  noOpExecuteRate: number;
  debouncedScheduleCount: number;
  reusedDebouncedScheduleCount: number;
  builderWaitScheduleCount: number;
  staleWakeupCount: number;
  debouncedScheduleReuseRate: number;
}

export interface BuilderSchedulerStateInternalLike extends UnknownRecord {
  deps: BuilderSchedulerDepsLike;
  pendingPlan: BuildPlanLike | { state: BuildStateLike } | null;
  pendingReason?: string;
  pendingImmediate?: boolean;
  pendingForceBuild?: boolean;
  debouncedRunScheduled?: boolean;
  debouncedRunVersion?: number;
  debouncedUsesFallbackTimer?: boolean;
  pendingScheduleVersion?: number;
  scheduleVersionSeq?: number;
  lastExecutedSignature?: unknown;
  lastTs: number;
  waitingForBuilder: boolean;
  waitingForBuilderVersion?: number;
  buildWardrobeDebounced: BuilderDebouncedBuildFn | null;
  debugStats?: BuilderDebugStatsLike;
}

export interface BuilderSchedulerStateSummaryLike extends UnknownRecord {
  pendingState: BuildStateLike | null;
  lastTs: number;
  waiting: boolean;
  debugStats?: BuilderDebugStatsLike;
}

export interface BuilderSchedulerPublicLike extends UnknownRecord {
  __esm_v1?: boolean;
  getPendingState?: () => BuildStateLike | null;
  getLastTs?: () => number;
  flush?: () => unknown;
  isBuilderReady?: () => boolean;
  getState?: () => BuilderSchedulerStateSummaryLike;
}

export interface BuilderRegistryLike extends UnknownRecord {
  __esm_v1?: boolean;
  reset?: () => unknown;
  registerPartObject?: (partId: string, obj: unknown, kind?: string) => unknown;
  registerModuleHitBox?: (moduleIndex: number | string, hitBox: unknown) => unknown;
  finalize?: () => unknown;
  get?: (partId: string) => unknown;
}

export interface RenderOpsLike extends UnknownRecord {
  __esm_v1?: boolean;

  // Common ops used across builder pipelines.
  // Most functions are implemented as `fn(args)` objects (single-arg bags),
  // except `applyCarcassOps(ops, ctx)` which follows the legacy signature.
  applyCarcassOps?: (ops: CarcassOpsLike, ctx?: BuilderApplyCarcassContextLike) => unknown;

  applyDimensions?: (args: UnknownRecord) => unknown;

  applySlidingDoorsOps?: (args: ApplySlidingDoorsArgsLike) => boolean;
  applyHingedDoorsOps?: (args: ApplyHingedDoorsArgsLike) => unknown;

  applyExternalDrawersOps?: (args: ApplyExternalDrawersArgsLike) => unknown;
  applyInternalDrawersOps?: (args: ApplyInternalDrawersArgsLike) => unknown;

  applyInteriorPresetOps?: (args: UnknownRecord) => boolean;
  applyInteriorCustomOps?: (args: UnknownRecord) => boolean;
  applyInteriorSketchExtras?: (args: UnknownRecord) => boolean;

  // Canonical shared helpers (render surface / previews)
  getCommonMats?: (args?: BuilderRenderCommonArgsLike | null) => unknown;
  getMirrorMaterial?: BuilderGetMirrorMaterialFn;
  ensureSplitHoverMarker?: (args: BuilderRenderCommonArgsLike) => BuilderPreviewMarkerLike | null;
  ensureDoorActionHoverMarker?: (args: BuilderRenderCommonArgsLike) => BuilderPreviewMarkerLike | null;
  ensureDoorCutHoverMarker?: (args: BuilderRenderCommonArgsLike) => BuilderPreviewMarkerLike | null;
  ensureSketchPlacementPreview?: (args: SketchPlacementPreviewArgsLike) => unknown;
  hideSketchPlacementPreview?: (args?: BuilderRenderCommonArgsLike | null) => unknown;
  setSketchPlacementPreview?: (args: SketchPlacementPreviewArgsLike) => unknown;
  ensureInteriorLayoutHoverPreview?: (args: InteriorLayoutHoverPreviewArgsLike) => unknown;
  hideInteriorLayoutHoverPreview?: (args?: BuilderRenderCommonArgsLike | null) => unknown;
  setInteriorLayoutHoverPreview?: (args: InteriorLayoutHoverPreviewArgsLike) => unknown;

  // Utilities frequently used by builder factories
  createHandleMesh?: BuilderCreateHandleMeshFn;
  createRodWithContents?: (args: BuilderCreateRodWithContentsArgsLike) => unknown;
  createModuleHitBox?: (args: BuilderCreateModuleHitBoxArgsLike) => unknown;
  createDrawerShadowPlane?: (args: BuilderCreateDrawerShadowPlaneArgsLike) => unknown;
  createBoard?: (args: BuilderCreateBoardArgsLike) => unknown;

  // Visual helpers
  addOutlines?: BuilderOutlineFn;
  addDimensionLine?: BuilderDimensionLineFn;
}

export interface BuilderMaterialsServiceLike extends UnknownRecord {
  __cache?: UnknownRecord;
  __esm_materials_factory_v1?: boolean;
  getDataURLTexture?: (dataUrl: unknown) => unknown;
  generateTexture?: (colorHex: unknown, type: unknown) => unknown;
  getMaterial?: {
    (color: unknown, type: unknown, useCustomTexture?: unknown, customTextureDataURL?: unknown): unknown;
    (...args: Parameters<BuilderGetMaterialFn>): ReturnType<BuilderGetMaterialFn>;
  };
}

export interface BuilderHandlesApplyOptionsLike extends UnknownRecord {
  triggerRender?: boolean;
}

export interface BuilderHandlesServiceLike extends UnknownRecord {
  createHandleMeshV7?: (
    type: unknown,
    width: number,
    height: number,
    isLeftHinge: boolean,
    isDrawer: boolean
  ) => unknown;
  applyHandles?: (opts?: BuilderHandlesApplyOptionsLike) => unknown;
  purgeHandlesForRemovedDoors?: (forceEnabled: boolean) => unknown;
}

export interface BuilderRenderAdapterServiceLike extends UnknownRecord {}

export interface BuilderCorePureServiceLike extends UnknownRecord {}

export interface BuilderServiceLike extends UnknownRecord {
  __provided_v1?: boolean;

  // Optional sub-surfaces installed by provideBuilder()
  plan?: BuilderPlanServiceLike;
  registry?: BuilderRegistryLike;
  renderOps?: RenderOpsLike;
  renderAdapter?: BuilderRenderAdapterServiceLike;
  corePure?: BuilderCorePureServiceLike;
  materials?: BuilderMaterialsServiceLike;

  // Optional high-level builder helpers (visuals/contents)
  modules?: BuilderModulesSurfaceLike;
  contents?: BuilderContentsSurfaceLike;

  // Optional sub-services
  handles?: BuilderHandlesServiceLike;

  // Snapshot of UI used during the last build (set by build flow)
  buildUi?: UiSnapshotLike | null;

  // Scheduler API (bound to an App in installBuilderScheduler)
  requestBuild?: (uiOverride?: UiSnapshotLike | null, opts?: BuildRequestOptsLike) => unknown;
  _runPendingBuild?: (reason?: string, forceBuild?: boolean) => unknown;
  buildWardrobeDebounced?: BuilderDebouncedBuildFn | null;

  // Compatibility namespace for scheduler
  __scheduler?: BuilderSchedulerPublicLike;
  __schedulerState?: BuilderSchedulerStateInternalLike;

  // Allow future builder surfaces without churn.
  [k: string]: unknown;
}

export interface RoomDesignUpdateOptionsLike extends UnknownRecord {
  force?: boolean;
  triggerRender?: boolean;
}

export interface RoomDesignServiceLike extends UnknownRecord {
  __esm_v1?: boolean;
  FLOOR_STYLES?: unknown;
  WALL_COLORS?: unknown;
  DEFAULT_WALL_COLOR?: string;
  buildRoom?: (forceDesign?: boolean) => unknown;
  resetRoomToDefault?: () => unknown;
  updateFloorTexture?: (style: unknown, opts?: RoomDesignUpdateOptionsLike) => unknown;
  updateRoomWall?: (wallColor: string, opts?: RoomDesignUpdateOptionsLike) => unknown;
  setActive?: (on: boolean, meta?: ActionMetaLike) => unknown;
  __wp_room_getFloorType?: () => unknown;
  __wp_room_getLastStyleId?: (type: string) => unknown;
  __wp_room_setLastStyleId?: (type: string, styleId: string | null) => unknown;
  __wp_room_resolveStyle?: (type: string, styleId?: string | null) => unknown;
  createProceduralFloorTexture?: (type: string, params: RoomTextureParamsLike) => unknown;
}
