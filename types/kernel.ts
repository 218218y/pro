// Kernel-adjacent shared types (cross-layer action/meta + map helpers).
//
// These are intentionally *integration* types: permissive but explicit.
// Tighten at high-value boundaries first (payload/meta at layer edges),
// avoid chasing every internal escape hatch.

import type { UnknownRecord } from './common';
import type { PatchPayload, RuntimeSlicePatch, UiSlicePatch } from './patch_payload';
import type { HandleType, HingeDir, WardrobeType } from './domain';
import type { HandlesMap, HingeMap, KnownMapName, MapsByName } from './maps';
import type { ConfigScalarKey, ConfigScalarValueMap } from './config_scalar';
import type { RuntimeScalarKey, RuntimeScalarValueMap } from './runtime_scalar';
import type { SavedColorLike } from './build';
import type { ProjectPreChestStateLike, ProjectSavedNotesLike } from './project';
import type { UiRawScalarKey, UiRawScalarValueMap } from './ui_raw';
import type {
  CornerConfigurationLike,
  CornerConfigurationPatchLike,
  ModuleConfigLike,
  ModuleConfigPatchLike,
  ModulesConfigurationLike,
} from './modules_configuration';

export interface ActionMetaLike extends UnknownRecord {
  source?: string;
  silent?: boolean;
  noBuild?: boolean;
  noAutosave?: boolean;
  noPersist?: boolean;
  noHistory?: boolean;
  noCapture?: boolean;

  // History coalescing (optional).
  coalesceKey?: string;
  coalesceMs?: number;

  // Debug/perf traces (optional).
  traceStorePatch?: boolean;
  debugName?: string;

  [k: string]: unknown;
}

export interface MetaActionsNamespaceLike extends UnknownRecord {
  // Meta profiles (installed by kernel/state_api.ts).
  uiOnly: (meta?: ActionMetaLike, source?: string) => ActionMetaLike;
  restore: (meta?: ActionMetaLike, source?: string) => ActionMetaLike;
  interactive: (meta?: ActionMetaLike, source?: string) => ActionMetaLike;
  transient: (meta?: ActionMetaLike, source?: string) => ActionMetaLike;
  merge: (meta?: ActionMetaLike, defaults?: ActionMetaLike, sourceFallback?: string) => ActionMetaLike;

  // Lightweight profile shorthands (also installed by kernel/state_api.ts).
  noBuild: (meta?: ActionMetaLike, source?: string) => ActionMetaLike;
  noHistory: (meta?: ActionMetaLike, source?: string) => ActionMetaLike;

  // Convenience shorthands heavily used by the React UI (installed by kernel/state_api.ts).
  uiOnlyImmediate: (source?: string) => ActionMetaLike;
  interactiveImmediate: (source?: string) => ActionMetaLike;
  noBuildImmediate: (source?: string) => ActionMetaLike;
  noHistoryImmediate: (source?: string) => ActionMetaLike;
  noHistoryForceBuildImmediate: (source?: string) => ActionMetaLike;
  src: (source: string) => ActionMetaLike;
  srcImmediate: (source: string) => ActionMetaLike;

  setDirty: (isDirty: boolean, meta?: ActionMetaLike) => unknown;
  touch: (meta?: ActionMetaLike) => unknown;
  persist: (meta?: ActionMetaLike) => unknown;
}

export interface RuntimeActionsNamespaceLike extends UnknownRecord {
  patch?: (rtPartial: RuntimeSlicePatch, meta?: ActionMetaLike) => unknown;

  setScalar?: {
    <K extends RuntimeScalarKey>(key: K, value: RuntimeScalarValueMap[K], meta?: ActionMetaLike): unknown;
    (key: string, value: unknown, meta?: ActionMetaLike): unknown;
  };

  setSketchMode?: (v: boolean, meta?: ActionMetaLike) => unknown;
  setGlobalClickMode?: (v: boolean, meta?: ActionMetaLike) => unknown;
  setDoorsOpen?: (
    open: boolean,
    optsOrMeta?: UnknownRecord | ActionMetaLike,
    metaMaybe?: ActionMetaLike
  ) => unknown;
  setRestoring?: (v: boolean, meta?: ActionMetaLike) => unknown;
  setSystemReady?: (v: boolean, meta?: ActionMetaLike) => unknown;
}

export type UiGridCellIdLike = string | number | null;

export interface UiActionsNamespaceLike extends UnknownRecord {
  patch?: (uiPartial: UiSlicePatch, meta?: ActionMetaLike) => unknown;
  patchSoft?: (uiPartial: UiSlicePatch, meta?: ActionMetaLike) => unknown;
  setScalar?: (key: string, value: unknown, meta?: ActionMetaLike) => unknown;
  setScalarSoft?: (key: string, value: unknown, meta?: ActionMetaLike) => unknown;

  setRawScalar?: {
    <K extends UiRawScalarKey>(key: K, value: UiRawScalarValueMap[K], meta?: ActionMetaLike): unknown;
    (key: string, value: unknown, meta?: ActionMetaLike): unknown;
  };

  setActiveTab?: (next: string, meta?: ActionMetaLike) => unknown;
  setDoorStyle?: (style: string, meta?: ActionMetaLike) => unknown;
  setCorniceType?: (value: string, meta?: ActionMetaLike) => unknown;
  setColorChoice?: (value: string, meta?: ActionMetaLike) => unknown;
  setFlag?: (key: string, on: boolean, meta?: ActionMetaLike) => unknown;
  setNotesEnabled?: (on: boolean, meta?: ActionMetaLike) => unknown;
  setGlobalClickUi?: (on: boolean, meta?: ActionMetaLike) => unknown;
  setShowContents?: (on: boolean, meta?: ActionMetaLike) => unknown;
  setShowHanger?: (on: boolean, meta?: ActionMetaLike) => unknown;
  setCurrentFloorType?: (value: string, meta?: ActionMetaLike) => unknown;
  setCurrentLayoutType?: (value: string, meta?: ActionMetaLike) => unknown;
  setGridDivisionsState?: (
    divisions: number | null,
    perCellGridMap: UnknownRecord | null,
    activeGridCellId: UiGridCellIdLike,
    meta?: ActionMetaLike
  ) => unknown;
  setGridShelfVariantState?: (variant: string | null, meta?: ActionMetaLike) => unknown;
  setExtDrawerSelection?: (drawerType: string | null, count: number | null, meta?: ActionMetaLike) => unknown;
  setBaseType?: (value: string, meta?: ActionMetaLike) => unknown;
  setHingeDirection?: (on: boolean, meta?: ActionMetaLike) => unknown;
  setStructureSelect?: (value: string, meta?: ActionMetaLike) => unknown;
  setSingleDoorPos?: (value: string, meta?: ActionMetaLike) => unknown;

  commitFromSnapshot?: (uiSnapshot: UnknownRecord, meta?: ActionMetaLike) => unknown;
}

export type ConfigSnapshotLike = UnknownRecord & Partial<ConfigScalarValueMap> & Partial<MapsByName>;
export type ConfigScalarUpdater<K extends ConfigScalarKey = ConfigScalarKey> = (
  prev: ConfigScalarValueMap[K] | undefined,
  cfg?: ConfigSnapshotLike
) => ConfigScalarValueMap[K];
export type ConfigMapUpdater<K extends KnownMapName = KnownMapName> = (
  nextDraft: MapsByName[K],
  curVal: MapsByName[K]
) => unknown;

export interface ModulesGeometrySnapshotLike extends UnknownRecord {
  modulesConfiguration: ModulesConfigurationLike;
  isManualWidth?: boolean;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
}

export interface ConfigActionsNamespaceLike extends UnknownRecord {
  captureSnapshot?: () => ConfigSnapshotLike;
  get?: () => ConfigSnapshotLike;
  map?: {
    <K extends KnownMapName>(mapName: K): MapsByName[K];
    (mapName: string): UnknownRecord;
  };
  patch?: (cfg: ConfigSnapshotLike, meta?: ActionMetaLike) => unknown;
  setScalar?: {
    <K extends ConfigScalarKey>(
      key: K,
      valueOrFn: ConfigScalarValueMap[K] | ConfigScalarUpdater<K>,
      meta?: ActionMetaLike
    ): unknown;
    (key: string, valueOrFn: unknown, meta?: ActionMetaLike): unknown;
  };
  setMap?: {
    <K extends KnownMapName>(mapName: K, nextMap: MapsByName[K], meta?: ActionMetaLike): unknown;
    (mapName: string, nextMap: UnknownRecord, meta?: ActionMetaLike): unknown;
  };
  patchMap?: {
    <K extends KnownMapName>(
      mapName: K,
      patchOrFn: Partial<MapsByName[K]> | ConfigMapUpdater<K>,
      meta?: ActionMetaLike
    ): unknown;
    (
      mapName: string,
      patchOrFn: UnknownRecord | ((nextDraft: UnknownRecord, curVal: UnknownRecord) => unknown),
      meta?: ActionMetaLike
    ): unknown;
  };
  setCustomUploadedDataURL?: (dataUrl: string | null, meta?: ActionMetaLike) => unknown;
  setModulesConfiguration?: (next: ModulesConfigurationLike, meta?: ActionMetaLike) => unknown;
  setLowerModulesConfiguration?: (next: ModulesConfigurationLike, meta?: ActionMetaLike) => unknown;
  setCornerConfiguration?: (next: CornerConfigurationLike, meta?: ActionMetaLike) => unknown;
  setPreChestState?: (next: ProjectPreChestStateLike, meta?: ActionMetaLike) => unknown;
  setSavedNotes?: (next: ProjectSavedNotesLike | null, meta?: ActionMetaLike) => unknown;
  applyProjectSnapshot?: (snapshot: UnknownRecord, meta?: ActionMetaLike) => unknown;
  applyModulesGeometrySnapshot?: (snapshot: ModulesGeometrySnapshotLike, meta?: ActionMetaLike) => unknown;
  applyPaintSnapshot?: (
    colors: unknown,
    curtains: unknown,
    meta?: ActionMetaLike,
    doorSpecialMap?: unknown,
    mirrorLayoutMap?: unknown
  ) => unknown;
  setHingeMap?: (next: HingeMap, meta?: ActionMetaLike) => unknown;
  setHandlesMap?: (next: HandlesMap, meta?: ActionMetaLike) => unknown;
}

export interface ModeActionOptsLike extends UnknownRecord {
  handleType?: string | null;
  edgeHandleVariant?: 'short' | 'long' | string | null;
  handleColor?: string | null;
  layoutType?: string | null;
  manualTool?: string | null;
  extDrawerType?: string | null;
  extDrawerCount?: number | null;
}

export interface ModeTransitionOptsLike extends ModeActionOptsLike {
  preserveDoors?: boolean;
  openDoors?: boolean;
  closeDoors?: boolean;
  hardCloseDoors?: boolean;
  hardClose?: boolean;
  cursor?: string;
  toast?: string | null;
  modeOpts?: ModeActionOptsLike;
}

export interface ModulesRecomputeFromUiOptionsLike extends UnknownRecord {
  structureChanged?: boolean;
  preserveTemplate?: boolean;
  anchorSide?: 'left' | 'right' | string;
  forceRebuild?: boolean;
  skipBuild?: boolean;
}

export interface ModeActionsNamespaceLike extends UnknownRecord {
  patch?: (modePartial: PatchPayload['mode'], meta?: ActionMetaLike) => unknown;
  set?: (primary: unknown, opts?: ModeActionOptsLike, meta?: ActionMetaLike) => unknown;
}

export interface StoreActionsNamespaceLike extends UnknownRecord {
  installReactivity?: () => unknown;
  hasReactivityInstalled?: () => boolean;
}

export interface HistoryPushRequestLike extends ActionMetaLike {
  noPush?: boolean;
  keepRedo?: boolean;
}

export interface HistoryStatusLike extends UnknownRecord {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  isPaused: boolean;
}

export type HistoryStatusListener = (status: HistoryStatusLike, meta?: ActionMetaLike) => void;

export interface HistoryActionsNamespaceLike extends UnknownRecord {
  getSystem?: () => UnknownRecord | null;
  setSystem?: (system: UnknownRecord) => unknown;
  batch?: (fn: () => unknown, meta?: ActionMetaLike) => unknown;
  schedulePush?: (meta?: ActionMetaLike) => unknown;
  flushPendingPush?: (opts?: HistoryPushRequestLike) => unknown;
  pushState?: (opts?: HistoryPushRequestLike) => unknown;
  flushOrPush?: (opts?: HistoryPushRequestLike) => unknown;
}

export interface BuilderActionsNamespaceLike extends UnknownRecord {
  getBuildState?: (override?: unknown) => UnknownRecord;
}

export interface ViewActionsLike extends UnknownRecord {
  setSketchMode?: (v: boolean, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export type SaveProjectAction = () => unknown;

export interface ActionsNamespaceLike extends UnknownRecord {
  patch?: (partial: PatchPayload, meta?: ActionMetaLike) => unknown;
  commitUiSnapshot?: (uiSnapshot: UnknownRecord, meta?: ActionMetaLike) => unknown;
  applyConfig?: (cfg: UnknownRecord, meta?: ActionMetaLike) => unknown;
  setCfgScalar?: {
    <K extends ConfigScalarKey>(key: K, valueOrFn: ConfigScalarValueMap[K], meta?: ActionMetaLike): unknown;
    (key: string, valueOrFn: unknown, meta?: ActionMetaLike): unknown;
  };

  // UI raw scalar helper (typed hot keys) - convenience over uiPatch({ raw: { ... } }).
  setUiRawScalar?: {
    <K extends UiRawScalarKey>(key: K, value: UiRawScalarValueMap[K], meta?: ActionMetaLike): unknown;
    (key: string, value: unknown, meta?: ActionMetaLike): unknown;
  };

  // Runtime scalar helper (typed hot keys) - convenience over actions.runtime.patch({ ... }).
  setRuntimeScalar?: {
    <K extends RuntimeScalarKey>(key: K, value: RuntimeScalarValueMap[K], meta?: ActionMetaLike): unknown;
    (key: string, value: unknown, meta?: ActionMetaLike): unknown;
  };

  // Sub-namespaces used by some layers (optional during migration).
  meta?: MetaActionsNamespaceLike;
  runtime?: RuntimeActionsNamespaceLike;
  ui?: UiActionsNamespaceLike;
  config?: ConfigActionsNamespaceLike;
  builder?: BuilderActionsNamespaceLike;
  mode?: ModeActionsNamespaceLike;
  store?: StoreActionsNamespaceLike;
  history?: HistoryActionsNamespaceLike;

  saveProject?: SaveProjectAction;

  // Common domain-ish namespaces called from UI/services.
  doors?: DoorsActionsLike;
  modules?: ModulesActionsLike;
  map?: MapsNamespaceLike;
  view?: ViewActionsLike;
  flags?: FlagsActionsLike;
  corner?: CornerActionsLike;
  colors?: ColorsActionsLike;
  textures?: TexturesActionsLike;
  room?: RoomActionsLike;
  drawers?: DrawersActionsLike;
  dividers?: DividersActionsLike;
  grooves?: GroovesActionsLike;
  curtains?: CurtainsActionsLike;
  models?: ModelsActionsLike;
  settings?: SettingsActionsLike;

  [k: string]: unknown;
}

export interface MapsNamespaceLike extends UnknownRecord {
  /** Typed map getter for known map names (falls back to UnknownRecord for unknown names). */
  getMap?: {
    <K extends KnownMapName>(mapName: K): MapsByName[K];
    (mapName: string): UnknownRecord;
  };

  /** Typed setter for known map names (falls back to unknown for unknown names). */
  setKey?: {
    <K extends KnownMapName>(
      mapName: K,
      key: string,
      val: MapsByName[K][string],
      meta?: ActionMetaLike
    ): unknown;
    (mapName: string, key: string, val: unknown, meta?: ActionMetaLike): unknown;
  };
  toggleKey?: (mapName: string, key: string, meta?: ActionMetaLike) => unknown;

  toggleDivider?: (dividerKey: string, meta?: ActionMetaLike) => unknown;
  toggleGrooveKey?: (grooveKey: string, meta?: ActionMetaLike) => unknown;
  getGroove?: (partId: string) => boolean;

  getCurtain?: (partId: string) => string | null;
  setSplit?: (doorId: string, isSplit: boolean, meta?: ActionMetaLike) => unknown;
  setSplitBottom?: (doorId: string, isOn: boolean, meta?: ActionMetaLike) => unknown;
  setHinge?: (
    hingeKey: string,
    hingeDir: HingeDir | UnknownRecord | string,
    meta?: ActionMetaLike
  ) => unknown;
  setRemoved?: (partId: string, isRemoved: boolean, meta?: ActionMetaLike) => unknown;

  getSavedColors?: () => Array<SavedColorLike | string>;
  setSavedColors?: (arr: Array<SavedColorLike | string>, meta?: ActionMetaLike) => unknown;
  setColorSwatchesOrder?: (arr: Array<string | null | undefined>, meta?: ActionMetaLike) => unknown;

  getHandle?: (partId: string) => unknown;
  setHandle?: (partId: string, handleType: HandleType | string | null, meta?: ActionMetaLike) => unknown;

  [k: string]: unknown;
}

export interface KernelNamespaceLike extends UnknownRecord {
  CFG_META_DEFAULTS?: ActionMetaLike;
  cfgMeta?: (meta?: ActionMetaLike | UnknownRecord) => ActionMetaLike;

  // Profile helpers (preferred): apply defaults only when fields are not specified by the caller.
  cfgMetaMerge?: (
    meta?: ActionMetaLike | UnknownRecord,
    defaults?: ActionMetaLike,
    sourceFallback?: string
  ) => ActionMetaLike;
  cfgMetaInteractive?: (meta?: ActionMetaLike | UnknownRecord, source?: string) => ActionMetaLike;
  cfgMetaUiOnly?: (meta?: ActionMetaLike | UnknownRecord, source?: string) => ActionMetaLike;
  cfgMetaRestore?: (meta?: ActionMetaLike | UnknownRecord, source?: string) => ActionMetaLike;
  cfgMetaNoHistory?: (meta?: ActionMetaLike | UnknownRecord, source?: string) => ActionMetaLike;
  cfgMetaNoBuild?: (meta?: ActionMetaLike | UnknownRecord, source?: string) => ActionMetaLike;

  [k: string]: unknown;
}

export interface UtilNamespaceLike extends UnknownRecord {
  normalizeSplitDoorsMap?: (map: UnknownRecord) => UnknownRecord;
  normalizeSplitDoorsMapWithDoors?: (map: UnknownRecord, doorsCount?: number) => UnknownRecord;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// High-value domain action surfaces (optional, gradually tightened).
//
// These are intentionally small and only cover the “hot paths” that are called
// across layers (services/ui/platform). The goal is to reduce casts at call
// sites, without forcing a full domain-model typing rewrite.
// ---------------------------------------------------------------------------

export type ModuleStackName = 'top' | 'bottom';
export type ModuleStackPatchKey = number | string;

export interface ModuleStackPatchDescriptor {
  stack: ModuleStackName;
  moduleKey: ModuleStackPatchKey;
  patch: ModuleConfigPatchLike;
}

export interface ModulePatchCompatInput extends UnknownRecord {
  stack?: ModuleStackName | 'lower' | 'bottom' | 'top' | string;
  side?: string;
  layer?: string;
  lower?: boolean;
  bottom?: boolean;
  index?: number;
  moduleKey?: ModuleStackPatchKey;
  module?: ModuleStackPatchKey;
  key?: ModuleStackPatchKey;
  patch?: unknown;
  list?: ModulesConfigurationLike;
}

export interface ModulesPatchCompatFn {
  (index: number, patch: ModuleConfigPatchLike, meta?: ActionMetaLike): unknown;
  (descriptor: ModulePatchCompatInput, meta?: ActionMetaLike): unknown;
  (list: ModulesConfigurationLike, meta?: ActionMetaLike): unknown;
}

export interface DoorsActionsLike extends UnknownRecord {
  setOpen?: (open: boolean, meta?: ActionMetaLike) => unknown;
  toggle?: (meta?: ActionMetaLike) => unknown;
  setRemoved?: (doorId: string, isRemoved: boolean, meta?: ActionMetaLike) => unknown;
  setSplit?: (doorId: string, isSplit: boolean, meta?: ActionMetaLike) => unknown;
  setSplitBottom?: (doorId: string, isOn: boolean, meta?: ActionMetaLike) => unknown;
  setHinge?: (doorId: string, hinge: HingeDir | UnknownRecord | string, meta?: ActionMetaLike) => unknown;
  setHandle?: (doorId: string, handleType: HandleType | string | null, meta?: ActionMetaLike) => unknown;
  setGlobalHandleType?: (handleType: HandleType | string | null, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface ModulesActionsLike extends UnknownRecord {
  recomputeFromUi?: (
    uiOverride: unknown,
    meta?: ActionMetaLike,
    opts?: ModulesRecomputeFromUiOptionsLike
  ) => unknown;
  patchForStack?: (
    stack: ModuleStackName | string,
    moduleKey: ModuleStackPatchKey,
    patchOrPatchFn: unknown,
    meta?: ActionMetaLike
  ) => unknown;
  ensureForStack?: (
    stack: ModuleStackName | string,
    moduleKey: ModuleStackPatchKey
  ) => ModuleConfigLike | null;
  ensureCornerCellAt?: (cellIndex: number) => ModuleConfigLike | null;
  ensureAt?: (index: number | string) => ModuleConfigLike | null;
  ensureLowerAt?: (index: number | string) => ModuleConfigLike | null;
  replaceAll?: (list: ModulesConfigurationLike, meta?: ActionMetaLike) => unknown;
  setAll?: (list: ModulesConfigurationLike, meta?: ActionMetaLike) => unknown;
  patchAt?: (index: number | string, patch: ModuleConfigPatchLike, meta?: ActionMetaLike) => unknown;
  patchLowerAt?: (index: number | string, patch: ModuleConfigPatchLike, meta?: ActionMetaLike) => unknown;
  patch?: ModulesPatchCompatFn;
  [k: string]: unknown;
}

export interface CornerActionsLike extends UnknownRecord {
  ensureConfig?: () => CornerConfigurationLike | null;
  ensureLowerConfig?: () => CornerConfigurationLike | null;
  ensureCellAt?: (index: number | string) => ModuleConfigLike | null;
  ensureLowerCellAt?: (index: number | string) => ModuleConfigLike | null;
  setConfig?: (cfg: CornerConfigurationLike, meta?: ActionMetaLike) => unknown;
  patch?: (patch: CornerConfigurationPatchLike, meta?: ActionMetaLike) => unknown;
  patchLower?: (patch: CornerConfigurationPatchLike, meta?: ActionMetaLike) => unknown;
  patchCellAt?: (index: number | string, patch: ModuleConfigPatchLike, meta?: ActionMetaLike) => unknown;
  patchLowerCellAt?: (index: number | string, patch: ModuleConfigPatchLike, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface FlagsActionsLike extends UnknownRecord {
  setGlobalClickMode?: (isOn: boolean, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface DrawersActionsLike extends UnknownRecord {
  setOpenId?: (id: unknown, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface CurtainsActionsLike extends UnknownRecord {
  set?: (partId: string, curtain: string | null, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface ColorsActionsLike extends UnknownRecord {
  setSavedColors?: (arr: Array<SavedColorLike | string>, meta?: ActionMetaLike) => unknown;
  setColorSwatchesOrder?: (arr: Array<string | null | undefined>, meta?: ActionMetaLike) => unknown;
  /**
   * Apply painted colors/curtains maps.
   *
   * `doorSpecialMap` is optional (newer flows attach special door types such as
   * glass/mirror). Older callers only pass the first 2-3 args.
   */
  applyPaint?: (
    colors: unknown,
    curtains: unknown,
    meta?: ActionMetaLike,
    doorSpecialMap?: unknown,
    mirrorLayoutMap?: unknown
  ) => unknown;
  setMultiMode?: (isOn: boolean, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface TexturesActionsLike extends UnknownRecord {
  setCustomUploadedDataURL?: (dataUrl: string | null, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface RoomActionsLike extends UnknownRecord {
  setFloorType?: (floorType: string, meta?: ActionMetaLike) => unknown;
  setManualWidth?: (isManual: boolean, meta?: ActionMetaLike) => unknown;
  setWardrobeType?: (wardrobeType: WardrobeType, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface DividersActionsLike extends UnknownRecord {
  toggle?: (dividerKey: string, meta?: ActionMetaLike) => unknown;
  set?: (dividerKey: string, isOn: boolean, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface GroovesActionsLike extends UnknownRecord {
  toggle?: (grooveKey: string, meta?: ActionMetaLike) => unknown;
  set?: (grooveKey: string, isOn: boolean, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface ModelsActionsLike extends UnknownRecord {
  saveCurrentAsModel?: (meta?: ActionMetaLike) => unknown;
  deleteCurrentModel?: (meta?: ActionMetaLike) => unknown;
  moveModel?: (direction: number, meta?: ActionMetaLike) => unknown;
  applySelectedModel?: (meta?: ActionMetaLike) => unknown;
  renderModelUI?: () => unknown;
  [k: string]: unknown;
}

export interface SettingsActionsLike extends UnknownRecord {
  exportSystemSettings?: (meta?: ActionMetaLike) => unknown;
  importSystemSettings?: (evt: unknown, meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

export interface ActionsDomainsLike extends UnknownRecord {
  doors?: DoorsActionsLike;
  modules?: ModulesActionsLike;
  corner?: CornerActionsLike;
  flags?: FlagsActionsLike;
  colors?: ColorsActionsLike;
  textures?: TexturesActionsLike;
  room?: RoomActionsLike;
  drawers?: DrawersActionsLike;
  dividers?: DividersActionsLike;
  grooves?: GroovesActionsLike;
  curtains?: CurtainsActionsLike;
  models?: ModelsActionsLike;
  settings?: SettingsActionsLike;
  [k: string]: unknown;
}
