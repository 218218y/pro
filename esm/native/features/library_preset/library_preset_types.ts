import type {
  ActionMetaLike,
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  IndividualColorsMap,
  ModulesConfigurationLike,
  UiRawInputsLike,
  UnknownRecord,
} from '../../../../types';

export type LibraryPresetUiRawState = Partial<
  Pick<
    UiRawInputsLike,
    | 'width'
    | 'height'
    | 'depth'
    | 'doors'
    | 'chestDrawersCount'
    | 'stackSplitLowerHeight'
    | 'stackSplitLowerDepth'
    | 'stackSplitLowerWidth'
    | 'stackSplitLowerDoors'
    | 'stackSplitLowerDepthManual'
    | 'stackSplitLowerWidthManual'
    | 'stackSplitLowerDoorsManual'
  >
>;

export type LibraryPresetUiSnapshot = UnknownRecord & {
  structureSelect?: unknown;
  singleDoorPos?: unknown;
  stackSplitEnabled?: boolean;
  raw?: LibraryPresetUiRawState | null;
};

export type LibraryPresetConfigSnapshot = UnknownRecord & {
  modulesConfiguration?: ModulesConfigurationLike;
  stackSplitLowerModulesConfiguration?: ModulesConfigurationLike;
  isMultiColorMode?: boolean;
  individualColors?: IndividualColorsMap;
  curtainMap?: CurtainMap;
  doorSpecialMap?: DoorSpecialMap;
  doorStyleMap?: DoorStyleMap;
};

export type LibraryPresetUiOverride = Omit<Partial<LibraryPresetUiSnapshot>, 'raw'> & {
  raw?: LibraryPresetUiRawState;
};

export type LibraryPresetPreState = {
  ui: {
    stackSplitEnabled: boolean;
    raw: LibraryPresetUiRawState;
  };
  cfg: {
    modulesConfiguration: ModulesConfigurationLike | null;
    stackSplitLowerModulesConfiguration: ModulesConfigurationLike | null;
    isMultiColorMode: boolean;
    individualColors: IndividualColorsMap;
    curtainMap: CurtainMap;
    doorSpecialMap: DoorSpecialMap;
    doorStyleMap: DoorStyleMap;
  };
};

type LibraryPresetMetaSurface = {
  merge: (meta?: ActionMetaLike, defaults?: ActionMetaLike, src?: string) => ActionMetaLike;
  noBuild: (meta?: ActionMetaLike, src?: string) => ActionMetaLike;
  noHistory: (meta?: ActionMetaLike, src?: string) => ActionMetaLike;
};

type LibraryPresetHistorySurface = {
  batch: (fn: () => void, meta?: ActionMetaLike) => unknown;
};

type LibraryPresetConfigSurface = {
  get: () => LibraryPresetConfigSnapshot;
  setModulesConfiguration: (next: ModulesConfigurationLike | null, meta?: ActionMetaLike) => unknown;
  setLowerModulesConfiguration: (next: ModulesConfigurationLike | null, meta?: ActionMetaLike) => unknown;
  setLibraryMode: (on: boolean, meta?: ActionMetaLike) => unknown;
  setMultiColorMode: (on: boolean, meta?: ActionMetaLike) => unknown;
  setIndividualColors: (next: IndividualColorsMap, meta?: ActionMetaLike) => unknown;
  setCurtainMap: (next: CurtainMap, meta?: ActionMetaLike) => unknown;
  setDoorSpecialMap: (next: DoorSpecialMap, meta?: ActionMetaLike) => unknown;
  applyProjectSnapshot: (snapshot: UnknownRecord, meta?: ActionMetaLike) => unknown;
};

type LibraryPresetUiSurface = {
  get: () => LibraryPresetUiSnapshot;
  setStackSplitEnabled: (on: boolean, meta?: ActionMetaLike) => unknown;
  setStackSplitLowerHeight: (
    value: UiRawInputsLike['stackSplitLowerHeight'],
    meta?: ActionMetaLike
  ) => unknown;
  setStackSplitLowerDepth: (value: UiRawInputsLike['stackSplitLowerDepth'], meta?: ActionMetaLike) => unknown;
  setStackSplitLowerWidth: (value: UiRawInputsLike['stackSplitLowerWidth'], meta?: ActionMetaLike) => unknown;
  setStackSplitLowerDoors: (value: UiRawInputsLike['stackSplitLowerDoors'], meta?: ActionMetaLike) => unknown;
  setStackSplitLowerDepthManual: (on: boolean, meta?: ActionMetaLike) => unknown;
  setStackSplitLowerWidthManual: (on: boolean, meta?: ActionMetaLike) => unknown;
  setStackSplitLowerDoorsManual: (on: boolean, meta?: ActionMetaLike) => unknown;
};

export type LibraryPresetToggleArgs = {
  isLibraryMode: boolean;
  wardrobeType: 'hinged' | 'sliding';
  width: number;
  height: number;
  depth: number;
  doors: number;
  stackSplitEnabled: boolean;
  stackSplitLowerHeight: number;
  stackSplitLowerDepth: number;
  stackSplitLowerWidth: number;
  stackSplitLowerDoors: number;
  stackSplitLowerDepthManual: boolean;
  stackSplitLowerWidthManual: boolean;
  stackSplitLowerDoorsManual: boolean;
  modulesCount: number;
};

export type LibraryPresetEnsureArgs = {
  isLibraryMode: boolean;
  wardrobeType: 'hinged' | 'sliding';
  doors: number;
  stackSplitLowerDoors: number;
  modulesCount: number;
  /**
   * Number of upper library doors whose default policy has already been materialized.
   * Invariants use this to seed glass only for newly-added upper doors while preserving
   * existing user overrides.
   */
  seededTopDoorsCount?: number;
  /**
   * Number of lower library doors whose default policy has already been materialized.
   * Invariants use this to clean only newly-added lower doors while preserving existing
   * user overrides.
   */
  seededBottomDoorsCount?: number;
};

export type LibraryPresetController = {
  toggleLibraryMode: (
    env: LibraryPresetEnv,
    args: LibraryPresetToggleArgs,
    helpers: { mergeUiOverride: MergeUiOverrideFn }
  ) => void;
  ensureInvariants: (env: LibraryPresetEnv, args: LibraryPresetEnsureArgs) => void;
  resetPreState: () => void;
};

export type LibraryPresetEnv = {
  history: LibraryPresetHistorySurface;
  meta: LibraryPresetMetaSurface;
  config: LibraryPresetConfigSurface;
  ui: LibraryPresetUiSurface;
  runStructuralRecompute: (uiOverride: LibraryPresetUiOverride, src: string) => unknown;
  multicolor?: {
    setEnabled?: (on: boolean, meta?: ActionMetaLike) => unknown;
    exitPaintMode?: () => unknown;
  };
};

export type MergeUiOverrideFn = (
  baseUi: LibraryPresetUiSnapshot,
  patch: LibraryPresetUiOverride
) => LibraryPresetUiOverride;
