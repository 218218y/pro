// Builder/services shared types.
// Split from ./build.ts into domain-focused seams to keep the public type surface stable while reducing monolith churn.

import type { UnknownRecord } from './common';
import type { ThreeLike } from './three';
import type { AppContainer } from './app';
import type { BoardMaterial, HandleType, WardrobeType } from './domain';
import type { UiRawInputsLike } from './ui_raw';
import type { UiState } from './ui_state';
import type {
  CornerConfigurationLike,
  CornerCustomDataLike,
  ModuleConfigLike,
  ModuleCustomDataLike,
  ModuleInternalDrawerSlotLike,
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
  DrawerDividersMap,
  HandlesMap,
  HingeMap,
  CurtainMap,
  IndividualColorsMap,
  DoorSpecialMap,
  DoorStyleMap,
  MirrorLayoutMap,
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
  BuilderCallable,
  NullableBuilderOutlineFn,
  NullableBuilderCallable,
} from './build_builder';
import type { HingedDoorOpLike, BuilderDepsResolvedLike, SavedColorLike } from './build_ops';

export interface ProjectDataLike extends UnknownRecord {
  __schema?: string;
  __version?: number;
  __migratedFrom?: number;
  __createdAt?: string;
  __updatedAt?: string;

  settings?: ProjectSettingsLike;
  toggles?: ProjectTogglesLike;

  // Common persisted collections / maps (legacy + v2)
  modulesConfiguration?: ModulesConfigurationLike;
  stackSplitLowerModulesConfiguration?: ModulesConfigurationLike;
  cornerConfiguration?: CornerConfigurationLike;

  splitDoorsMap?: SplitDoorsMap;
  splitDoorsBottomMap?: SplitDoorsBottomMap;
  handlesMap?: HandlesMap;
  hingeMap?: HingeMap;
  hingeDoorsMap?: HingeMap;
  removedDoorsMap?: RemovedDoorsMap;
  curtainMap?: CurtainMap;
  grooveMap?: GroovesMap;
  groovesMap?: GroovesMap;
  grooveLinesCountMap?: GrooveLinesCountMap;
  individualColors?: IndividualColorsMap;
  doorSpecialMap?: DoorSpecialMap;
  doorStyleMap?: DoorStyleMap;
  mirrorLayoutMap?: MirrorLayoutMap;
  doorTrimMap?: DoorTrimMap;
  orderPdfEditorDraft?: ProjectPdfDraftLike | null;
  orderPdfEditorZoom?: number;
  savedNotes?: ProjectSavedNotesLike;
  notes?: ProjectSavedNotesLike;
  preChestState?: ProjectPreChestStateLike;
  grooveLinesCount?: number | null;
  __validation?: ProjectSchemaValidationResult;

  // Allow future persisted fields without churn.
  [k: string]: unknown;
}

export interface ProjectDataEnvelopeLike extends UnknownRecord {
  payload?: ProjectDataLike;
  project?: ProjectDataLike;
  schema?: string;
  schemaVersion?: number;
  __schema?: string;
  __version?: number;
}

export interface ProjectLoadOpts extends UnknownRecord {
  silent?: boolean;
  toast?: boolean;
  toastMessage?: string;
  meta?: UnknownRecord;
}

// --- Core state shapes (minimal; evolve gradually) -------------------------

export interface UiStateLike extends UiState {
  // Core structural inputs (often under ui.raw)
  raw?: UiRawInputsLike | null;

  // Sidebar/navigation
  activeTab?: UiState['activeTab'];

  // Builder UI values
  projectName?: string;
  doorStyle?: string;
  singleDoorPos?: string;
  structureSelect?: string;
  baseType?: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  baseLegHeightCm?: number | string;
  slidingTracksColor?: 'black' | 'nickel' | string;
  corniceType?: string;
  color?: string;
  doors?: number;
  width?: number;
  height?: number;
  depth?: number;

  // Corner wardrobe inputs
  cornerWidth?: number;
  cornerDoors?: number;
  cornerHeight?: number;
  cornerDepth?: number;

  // Corner wardrobe orientation (some flows keep these on ui or ui.raw)
  cornerSide?: 'left' | 'right' | string;
  cornerDirection?: 'left' | 'right' | string;
  cornerDoorCount?: number;
  cornerDoorsCount?: number;
  cornerWidthCm?: number;
  cornerWingWidthCm?: number;

  // Feature toggles
  groovesEnabled?: boolean;
  splitDoors?: boolean;
  internalDrawersEnabled?: boolean;
  hasCornice?: boolean;
  stackSplitEnabled?: boolean;

  // View toggles
  showHanger?: boolean;
  showContents?: boolean;
  showDimensions?: boolean;
  globalClickMode?: boolean;
  sketchMode?: boolean;
  lightingControl?: boolean;

  // Mode toggles
  notesEnabled?: boolean;
  multiColorEnabled?: boolean;
  handleControl?: boolean;
  hingeDirection?: boolean;
  removeDoorsEnabled?: boolean;
  cornerMode?: boolean;
  isChestMode?: boolean;

  // Color / UI state
  colorChoice?: string;
  customColor?: string;

  // Ephemeral UI-only selections
  currentLayoutType?: string;
  currentGridDivisions?: number;
  currentExtDrawerType?: string;
  currentExtDrawerCount?: number;
  perCellGridMap?: UnknownRecord;
  activeGridCellId?: string | number | null;
  currentCurtainChoice?: string;
  currentFloorType?: string;
  lastSelectedWallColor?: string;
  lastSelectedFloorStyleId?: string | number | null;
  lastSelectedFloorStyleIdByType?: UnknownRecord;
  lastLightPreset?: string;

  [k: string]: unknown;
}

export interface UiSnapshotLike extends UnknownRecord {
  // Common UI flags used across wiring + builder.
  cornerMode?: boolean;
  handleControl?: boolean;
  showHanger?: boolean;
  showContents?: boolean;

  // Sketch/lighting controls used by 3D runtime.
  sketchMode?: boolean;
  lightingControl?: boolean;
  lightAmb?: number | string;
  lightDir?: number | string;
  lightX?: number | string;
  lightY?: number | string;
  lightZ?: number | string;

  // Frequently-present legacy nesting.
  raw?: UiRawInputsLike | null;
  view?: UnknownRecord;

  [k: string]: unknown;
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
  intDrawersList?: ModuleInternalDrawerSlotLike[];
  specialDims?: ModuleSpecialDimsLike;
  savedDims?: ModuleSavedDimsLike;
}

export interface BuildCornerSnapshotLike extends CornerConfigurationLike {
  customData?: CornerCustomDataLike;
  modulesConfiguration?: ModuleConfigLike[];
}

export interface RuntimeStateLike extends UnknownRecord {
  // Mode/state flags
  sketchMode?: boolean;
  globalClickMode?: boolean;

  // Doors/drawers runtime
  doorsOpen?: boolean;
  doorsLastToggleTime?: number;
  drawersOpenId?: string | number | null;

  // Boot/session flags
  restoring?: boolean;
  systemReady?: boolean;

  // UX/runtime toggles
  roomDesignActive?: boolean;
  notesPicking?: boolean;

  // Transient selections
  paintColor?: string | null;
  handlesType?: HandleType;
  interiorManualTool?: string | null;

  // Derived dimensions (meters)
  wardrobeWidthM?: number | null;
  wardrobeHeightM?: number | null;
  wardrobeDepthM?: number | null;
  wardrobeDoorsCount?: number | null;

  [k: string]: unknown;
}

export interface ConfigStateLike extends UnknownRecord {
  // Snapshot markers used by builder consumers.
  __snapshot?: boolean;
  __capturedAt?: number;

  // Containers normalized in builder/build_state_resolver.
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

  // Domain config flags
  isLibraryMode?: boolean;
  wardrobeType?: WardrobeType;
  globalHandleType?: HandleType;
  isMultiColorMode?: boolean;
  showDimensions?: boolean;
  isManualWidth?: boolean;
  boardMaterial?: BoardMaterial | '';

  // Uploaded assets
  customUploadedDataURL?: string | null;
  grooveLinesCount?: number | null;

  // Legacy/pre-mode capture
  preChestState?: ProjectPreChestStateLike | ConfigStateLike;

  // Various maps
  groovesMap?: GroovesMap;
  grooveLinesCountMap?: GrooveLinesCountMap;
  splitDoorsMap?: SplitDoorsMap;
  splitDoorsBottomMap?: SplitDoorsBottomMap;
  removedDoorsMap?: RemovedDoorsMap;
  drawerDividersMap?: DrawerDividersMap;
  handlesMap?: HandlesMap;
  hingeMap?: HingeMap;
  curtainMap?: CurtainMap;
  doorTrimMap?: DoorTrimMap;

  [k: string]: unknown;
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
  baseLegHeightCm?: number | string;
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

  deps?: BuilderDepsResolvedLike;
  label?: string;

  // Structured sections used across pipelines
  flags?: BuildCtxFlagsLike;
  dims?: BuildCtxDimsLike;
  strings?: BuildCtxStringsLike;
  layout?: BuildCtxLayoutLike;
  materials?: BuildCtxMaterialsLike;
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
