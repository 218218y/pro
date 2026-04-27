// Saved models / presets typing (high-value boundary)
//
// Goal:
// - Give the saved-models service a shared typed surface used by runtime access,
//   React consumers, storage/cloud sync, and service implementation.
// - Replace broad loose model bags with a useful canonical shape.
// - Keep index signatures permissive so migration can remain incremental.

import type { UnknownRecord } from './common';
import type {
  ProjectPdfDraftLike,
  ProjectPreChestStateLike,
  ProjectSavedNotesLike,
  ProjectSettingsLike,
  ProjectTogglesLike,
} from './project';
import type { ModulesConfigurationLike, CornerConfigurationLike } from './modules_configuration';
import type {
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  DrawerDividersMap,
  GroovesMap,
  GrooveLinesCountMap,
  HandlesMap,
  HingeMap,
  IndividualColorsMap,
  MirrorLayoutMap,
  DoorTrimMap,
  RemovedDoorsMap,
  SplitDoorsBottomMap,
  SplitDoorsMap,
} from './maps';

export interface SavedModelLike extends UnknownRecord {
  id: string;
  name: string;

  isPreset?: boolean;
  isUserPreset?: boolean;
  isCorePreset?: boolean;
  fromCorePreset?: boolean;
  locked?: boolean;

  settings?: ProjectSettingsLike;
  toggles?: ProjectTogglesLike;
  chestSettings?: unknown;

  modulesConfiguration?: ModulesConfigurationLike;
  stackSplitLowerModulesConfiguration?: ModulesConfigurationLike;
  cornerConfiguration?: CornerConfigurationLike;

  groovesMap?: GroovesMap;
  grooveLinesCountMap?: GrooveLinesCountMap;
  splitDoorsMap?: SplitDoorsMap;
  splitDoorsBottomMap?: SplitDoorsBottomMap;
  removedDoorsMap?: RemovedDoorsMap;
  drawerDividersMap?: DrawerDividersMap;
  individualColors?: IndividualColorsMap;
  doorSpecialMap?: DoorSpecialMap;
  doorStyleMap?: DoorStyleMap;
  handlesMap?: HandlesMap;
  hingeMap?: HingeMap;
  curtainMap?: CurtainMap;
  mirrorLayoutMap?: MirrorLayoutMap;
  doorTrimMap?: DoorTrimMap;
  isLibraryMode?: boolean;
  preChestState?: ProjectPreChestStateLike;
  grooveLinesCount?: number | null;

  savedNotes?: ProjectSavedNotesLike;
  orderPdfEditorDraft?: ProjectPdfDraftLike | null;
  orderPdfEditorZoom?: number;
}

export interface ModelsLoadOptions extends UnknownRecord {
  forceRebuild?: boolean;
  silent?: boolean;
}

export type SavedModelId = string;
export type SavedModelName = string;
export type ModelsMoveDirection = 'up' | 'down';
export type ModelsTransferTargetList = 'preset' | 'saved';
export type ModelsTransferPosition = 'before' | 'after' | 'end';

export type ModelsCommandReason =
  | 'capture'
  | 'copy'
  | 'core'
  | 'direction'
  | 'edge'
  | 'error'
  | 'id'
  | 'invalid'
  | 'load'
  | 'locked'
  | 'missing'
  | 'name'
  | 'normalize'
  | 'not-installed'
  | 'overPreset'
  | 'preset'
  | 'superseded';

export interface ModelsCommandResult {
  ok: boolean;
  reason?: ModelsCommandReason;
  message?: string;
}

export interface ModelsSaveResult extends ModelsCommandResult {
  id?: SavedModelId;
}

export interface ModelsLockResult extends ModelsCommandResult {
  locked?: boolean;
}

export interface ModelsMergeResult {
  added: number;
  updated: number;
}

export interface ModelsDeleteTemporaryResult extends ModelsCommandResult {
  removed: number;
}

export type ModelsChangeListener = (models: SavedModelLike[]) => void;
export type ModelsNormalizer = (model: SavedModelLike) => SavedModelLike | null;

export interface ModelsServiceLike extends UnknownRecord {
  setNormalizer: (fn: ModelsNormalizer | null) => void;
  setPresets: (presetsArr: SavedModelLike[]) => void;
  ensureLoaded: (opts?: ModelsLoadOptions) => SavedModelLike[];
  getAll: () => SavedModelLike[];
  getById: (id: SavedModelId) => SavedModelLike | null;
  saveCurrent: (name: SavedModelName) => ModelsSaveResult;
  overwriteFromCurrent: (id: SavedModelId) => ModelsCommandResult;
  deleteById: (id: SavedModelId) => ModelsCommandResult;
  setLocked: (id: SavedModelId, locked: boolean) => ModelsLockResult;
  deleteTemporary: () => ModelsDeleteTemporaryResult;
  move: (id: SavedModelId, dir: ModelsMoveDirection) => ModelsCommandResult;
  transfer: (
    id: SavedModelId,
    targetList: ModelsTransferTargetList,
    overId: SavedModelId | null,
    pos: ModelsTransferPosition
  ) => ModelsCommandResult;
  apply: (id: SavedModelId) => ModelsCommandResult;
  exportUserModels: () => SavedModelLike[];
  mergeImportedModels: (list: SavedModelLike[]) => ModelsMergeResult;
  onChange: (fn: ModelsChangeListener) => void | (() => void);
  offChange?: (fn: ModelsChangeListener) => void;
}
