// Builder/services shared types.
// Split from ./build.ts into domain-focused seams to keep the public type surface stable while reducing monolith churn.

import type { UnknownRecord } from './common';
import type { RoomArchitectureConfigLike, RoomArchitecturePlan } from './room_architecture';
import type { ThreeLike } from './three';
import type { AppContainer } from './app';
import type { BoardMaterial, DoorMountMode, DrawerRunnerType, HandleType, WardrobeType } from './domain';
import type { UiState } from './ui_state';
import type {
  CornerConfigurationLike,
  CornerCustomDataLike,
  ModuleConfigLike,
  ModuleCustomDataLike,
  ModuleSavedDimsLike,
  ModuleSpecialDimsLike,
  ModulesConfigurationLike,
} from './modules_configuration';
import type {
  GroovesMap,
  GrooveLinesCountMap,
  SplitDoorsMap,
  SplitDoorsBottomMap,
  RemovedDoorsMap,
  RoundedFrameSideShelvesMap,
  DrawerDividersMap,
  HandlesMap,
  HingeMap,
  CurtainMap,
  IndividualColorsMap,
  DoorSpecialMap,
  DoorStyleMap,
  MirrorLayoutMap,
  GrooveLayoutMap,
  DoorTrimMap,
} from './maps';
import type {
  ProjectPdfDraftLike,
  ProjectPreChestStateLike,
  ProjectSavedNotesLike,
  ProjectSchemaValidationResult,
  ProjectSettingsLike,
  ProjectTogglesLike,
} from './project';
import type {
  BuilderCreateBoardFn,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderCreateHandleMeshFn,
  BuilderDoorStateAccessorsLike,
  BuilderPartMaterialResolver,
  BuilderPartColorResolver,
  BuilderHandleTypeResolver,
  BuilderDoorRemovedResolver,
  BuilderBuildCornerWingFn,
  BuilderDimensionLineFn,
  BuilderAddHangingClothesFn,
  BuilderAddFoldedClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderRebuildDrawerMetaFn,
  BuilderDrawerRebuildSnapshot,
  BuilderCallable,
  NullableBuilderOutlineFn,
  NullableBuilderCallable,
} from './build_builder';
import type { HingedDoorOpLike, BuilderDepsResolvedLike, SavedColorLike } from './build_ops';

export interface ProjectDataLike extends UnknownRecord {
  __schema?: string;
  __version?: number;
  __createdAt?: string;
  __updatedAt?: string;

  settings?: ProjectSettingsLike;
  toggles?: ProjectTogglesLike;

  // Current persisted collections / maps.
  modulesConfiguration?: ModulesConfigurationLike;
  stackSplitLowerModulesConfiguration?: ModulesConfigurationLike;
  cornerConfiguration?: CornerConfigurationLike;

  splitDoorsMap?: SplitDoorsMap;
  splitDoorsBottomMap?: SplitDoorsBottomMap;
  handlesMap?: HandlesMap;
  hingeMap?: HingeMap;
  removedDoorsMap?: RemovedDoorsMap;
  curtainMap?: CurtainMap;
  groovesMap?: GroovesMap;
  grooveLinesCountMap?: GrooveLinesCountMap;
  grooveLayoutMap?: GrooveLayoutMap;
  individualColors?: IndividualColorsMap;
  doorSpecialMap?: DoorSpecialMap;
  doorStyleMap?: DoorStyleMap;
  mirrorLayoutMap?: MirrorLayoutMap;
  doorTrimMap?: DoorTrimMap;
  roomArchitecture?: RoomArchitectureConfigLike;
  orderPdfEditorDraft?: ProjectPdfDraftLike | null;
  orderPdfEditorZoom?: number;
  savedNotes?: ProjectSavedNotesLike;
  preChestState?: ProjectPreChestStateLike;
  grooveLinesCount?: number | null;
  __validation?: ProjectSchemaValidationResult;

  // Allow future persisted fields without churn.
  [k: string]: unknown;
}

export type ProjectLoadInputLike = ProjectDataLike | UnknownRecord | object;

export interface ProjectLoadOpts extends UnknownRecord {
  silent?: boolean;
  toast?: boolean;
  toastMessage?: string;
  queueIfBusy?: boolean;
  meta?: UnknownRecord;
}

// --- Core state shapes (minimal; evolve gradually) -------------------------

export type UiStateLike = UiState;

export interface UiSnapshotLike extends UiState {
  // Builder-only metadata; never persisted into the canonical store.ui slice.
  __activeId?: string;
  forceBuild?: boolean;
  view?: UnknownRecord;
}

export interface BuildModuleSpecialDimsSummaryLike extends UnknownRecord {
  heightCm?: number | null;
  depthCm?: number | null;
  saved?: ModuleSavedDimsLike | null;
  special?: ModuleSpecialDimsLike | null;
}

export interface BuildModuleSnapshotLike extends ModuleConfigLike {
  doors?: number;
  customData?: ModuleCustomDataLike;
  specialDims?: ModuleSpecialDimsLike;
  savedDims?: ModuleSavedDimsLike;
}

export interface BuildCornerSnapshotLike extends CornerConfigurationLike {
  customData?: CornerCustomDataLike;
  modulesConfiguration?: ModuleConfigLike[];
}

export interface WardrobeTypeProfileSnapshotLike {
  cfg: ConfigStateLike;
  ui: UiStateLike;
}

export type WardrobeTypeProfileMapLike = Partial<Record<WardrobeType, WardrobeTypeProfileSnapshotLike>>;

export interface RuntimeStateLike {
  sketchMode?: boolean;
  globalClickMode?: boolean;
  doorsOpen?: boolean;
  doorsLastToggleTime?: number;
  drawersOpenId?: string | number | null;
  restoring?: boolean;
  systemReady?: boolean;
  roomDesignActive?: boolean;
  notesPicking?: boolean;
  failFast?: boolean;
  verboseConsoleErrors?: boolean;
  verboseConsoleErrorsDedupeMs?: number;
  debug?: boolean;
  paintColor?: string | null;
  handlesType?: HandleType;
  interiorManualTool?: string | null;
  wardrobeWidthM?: number | null;
  wardrobeHeightM?: number | null;
  wardrobeDepthM?: number | null;
  wardrobeDoorsCount?: number | null;
  wardrobeTypeProfiles?: WardrobeTypeProfileMapLike | null;
}

export interface ConfigStateLike {
  // Snapshot markers used only by explicit snapshot/config owner flows.
  __snapshot?: boolean;
  __capturedAt?: number;

  modulesConfiguration?: ModulesConfigurationLike;
  stackSplitLowerModulesConfiguration?: ModulesConfigurationLike;
  savedColors?: SavedColorLike[];
  colorSwatchesOrder?: string[];
  savedNotes?: ProjectSavedNotesLike;
  individualColors?: IndividualColorsMap;
  doorSpecialMap?: DoorSpecialMap;
  doorStyleMap?: DoorStyleMap;
  mirrorLayoutMap?: MirrorLayoutMap;
  cornerConfiguration?: CornerConfigurationLike;

  isLibraryMode?: boolean;
  wardrobeType?: WardrobeType;
  globalHandleType?: HandleType;
  isMultiColorMode?: boolean;
  showDimensions?: boolean;
  MIRROR_REFLECTOR_ENABLED?: boolean;
  isManualWidth?: boolean;
  boardMaterial?: BoardMaterial | '';
  doorMountMode?: DoorMountMode | '';
  drawerRunnerType?: DrawerRunnerType;
  overlayFrameThicknessCm?: number | null;
  overlayShelfThicknessCm?: number | null;
  insetFrameThicknessCm?: number | null;
  insetShelfThicknessCm?: number | null;

  customUploadedDataURL?: string | null;
  grooveLinesCount?: number | null;
  preChestState?: ProjectPreChestStateLike | ConfigStateLike | null;

  groovesMap?: GroovesMap;
  grooveLinesCountMap?: GrooveLinesCountMap;
  grooveLayoutMap?: GrooveLayoutMap;
  splitDoorsMap?: SplitDoorsMap;
  splitDoorsBottomMap?: SplitDoorsBottomMap;
  removedDoorsMap?: RemovedDoorsMap;
  roundedFrameSideShelvesMap?: RoundedFrameSideShelvesMap;
  drawerDividersMap?: DrawerDividersMap;
  handlesMap?: HandlesMap;
  hingeMap?: HingeMap;
  curtainMap?: CurtainMap;
  doorTrimMap?: DoorTrimMap;
  roomArchitecture?: RoomArchitectureConfigLike;
}

export interface ModeStateLike extends UnknownRecord {
  primary?: string;
  opts?: UnknownRecord;
  [k: string]: unknown;
}

export interface MetaStateLike extends UnknownRecord {
  version?: number;
  updatedAt?: number;
  dirty?: boolean;
  [k: string]: unknown;
}

export interface BuildStateLike extends UnknownRecord {
  ui?: UiStateLike;
  runtime?: RuntimeStateLike;
  config?: ConfigStateLike;
  mode?: ModeStateLike;
  meta?: MetaStateLike;
  [k: string]: unknown;
}

export interface BuildStateResolvedLike extends UnknownRecord {
  state: BuildStateLike;
  ui: UiStateLike;
  runtime: RuntimeStateLike;
  globalClickMode: boolean;
  hadEditHold: boolean;
  cfgSnapshot: ConfigStateLike;
  drawerRebuildSnapshot: BuilderDrawerRebuildSnapshot;
}

export interface BuildCtxFlagsLike extends UnknownRecord {
  sketchMode?: boolean;
  globalClickMode?: boolean;
  hadEditHold?: boolean;
  isCornerMode?: boolean;

  handleControlEnabled?: boolean;
  showHangerEnabled?: boolean;
  showContentsEnabled?: boolean;

  splitDoors?: boolean;
  hasCornice?: boolean;

  isGroovesEnabled?: boolean;
  isInternalDrawersEnabled?: boolean;

  [k: string]: unknown;
}

export interface BuildCtxDimsLike extends UnknownRecord {
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  doorsCount?: number;
  chestDrawersCount?: number;

  // meters-based convenience values
  H?: number;
  totalW?: number;
  D?: number;

  woodThick?: number;
  shelfThick?: number;
  startY?: number;
  cabinetBodyHeight?: number;
  cabinetTopY?: number;

  internalDepth?: number;
  internalZ?: number;
  splitLineY?: number;

  [k: string]: unknown;
}

export interface BuildCtxStringsLike extends UnknownRecord {
  doorStyle?: string;
  baseType?: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  baseLegPlatformMode?: string;
  baseLegPlatformSideMode?: string;
  baseLegPlatformSideOverhangCm?: number;
  baseLegPlatformFrontOverhangCm?: number;
  stackSplitDecorativeSeparatorSideOverhangCm?: number;
  stackSplitDecorativeSeparatorFrontOverhangCm?: number;
  basePlinthHeightCm?: number;
  baseLegHeightCm?: number;
  baseLegWidthCm?: number;
  [k: string]: unknown;
}

export interface BuildModuleStructureItemLike extends UnknownRecord {
  doors?: number;
}

export interface BuildHingedDoorPivotEntryLike extends UnknownRecord {
  pivotX?: number;
  meshOffsetX?: number;
  isLeftHinge?: boolean;
  doorWidth?: number;
}

export interface BuildCtxLayoutLike extends UnknownRecord {
  modules?: BuildModuleStructureItemLike[];
  moduleCfgList?: ModuleConfigLike[];
  singleUnitWidth?: number;
  hingedDoorPivotMap?: Record<number, BuildHingedDoorPivotEntryLike> | null;
  moduleInternalWidths?: number[] | null;
  [k: string]: unknown;
}

export interface BuildCtxRoomLike extends UnknownRecord {
  architecturePlan?: RoomArchitecturePlan;
  [k: string]: unknown;
}

export interface BuildCtxMaterialsLike extends UnknownRecord {
  colorHex?: string;
  useTexture?: boolean;
  textureDataURL?: string;

  globalFrontMat?: unknown;
  bodyMat?: unknown;

  masoniteMat?: unknown;
  whiteMat?: unknown;
  shadowMat?: unknown;
  legMat?: unknown;
  defaultShelfMat?: unknown;
  braceShelfMat?: unknown;

  [k: string]: unknown;
}

export interface BuildCtxCreateFnsLike extends UnknownRecord {
  createBoard?: BuilderCreateBoardFn;
  createDoorVisual?: BuilderCreateDoorVisualFn;
  createInternalDrawerBox?: BuilderCreateInternalDrawerBoxFn | null;
  createHandleMesh?: BuilderCreateHandleMeshFn | null;
  [k: string]: unknown;
}

export interface BuildCtxResolversLike extends UnknownRecord {
  doorState?: BuilderDoorStateAccessorsLike;

  getPartMaterial?: BuilderPartMaterialResolver;
  getPartColorValue?: BuilderPartColorResolver;

  getHandleType?: BuilderHandleTypeResolver;
  isDoorRemoved?: BuilderDoorRemovedResolver;

  isRemoveDoorMode?: boolean;
  removeDoorsEnabled?: boolean;

  [k: string]: unknown;
}

export interface BuildCtxHingedLike extends UnknownRecord {
  useOps?: boolean;
  opsList?: HingedDoorOpLike[] | null;
  globalHandleAbsY?: number;
  [k: string]: unknown;
}

export interface BuildCtxFnsLike extends UnknownRecord {
  getMaterial?: BuilderCallable;
  addOutlines?: NullableBuilderOutlineFn;

  buildCornerWing?: BuilderBuildCornerWingFn | null;

  addDimensionLine?: BuilderDimensionLineFn | null;
  restoreNotesFromSave?: NullableBuilderCallable;

  addHangingClothes?: BuilderAddHangingClothesFn | null;
  addFoldedClothes?: BuilderAddFoldedClothesFn | null;
  addRealisticHanger?: BuilderAddRealisticHangerFn | null;

  rebuildDrawerMeta?: BuilderRebuildDrawerMetaFn | null;
  pruneCachesSafe?: NullableBuilderCallable;
  triggerRender?: NullableBuilderCallable;
  showToast?: NullableBuilderCallable;

  [k: string]: unknown;
}

export interface BuildContextLike extends UnknownRecord {
  __kind: string;

  // Root surfaces (always present in the builder flow, but kept optional for safety)
  App?: AppContainer;
  THREE?: ThreeLike;
  cfg?: ConfigStateLike;

  state?: BuildStateLike;
  ui?: UiStateLike;
  runtime?: RuntimeStateLike;
  drawerRebuildSnapshot?: BuilderDrawerRebuildSnapshot;

  deps?: BuilderDepsResolvedLike;
  label?: string;

  // Structured sections used across pipelines
  flags?: BuildCtxFlagsLike;
  dims?: BuildCtxDimsLike;
  strings?: BuildCtxStringsLike;
  layout?: BuildCtxLayoutLike;
  materials?: BuildCtxMaterialsLike;
  room?: BuildCtxRoomLike;
  create?: BuildCtxCreateFnsLike;
  resolvers?: BuildCtxResolversLike;
  hinged?: BuildCtxHingedLike;
  fns?: BuildCtxFnsLike;

  notesToPreserve?: ProjectSavedNotesLike | null;

  [k: string]: unknown;
}

// --- Builder render-op data shapes (ops) -----------------------------------
//
// These types describe the deterministic "ops" objects produced by the pure layer
// (core_pure) and consumed by the render ops layer (render_ops).
// Keep them permissive (UnknownRecord intersections) while still documenting the
// real, useful fields. This avoids "silencing" issues while enabling
// meaningful intellisense and checkJs validation.
