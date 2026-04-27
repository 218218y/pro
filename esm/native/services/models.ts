// Native ESM implementation of Saved Models service.
//
// Goals:
// - No legacy `js/**` imports on the ESM path.
// - No IIFE / implicit globals.
// - Keep behavior identical to `js/services/pro_services_models.js`.
//
// This service persists user models via `App.services.storage` and applies models via `App.services.projectIO`.
// Canonical API surface is `App.services.models`.

import type {
  AppContainer,
  ModelsChangeListener,
  ModelsCommandResult,
  ModelsDeleteTemporaryResult,
  ModelsLoadOptions,
  ModelsLockResult,
  ModelsMergeResult,
  ModelsNormalizer,
  ModelsMoveDirection,
  ModelsSaveResult,
  ModelsServiceLike,
  ModelsTransferPosition,
  ModelsTransferTargetList,
  SavedModelId,
  SavedModelLike,
  SavedModelName,
} from '../../../types';

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import {
  type ModelsOpts,
  _normalizeModel as _normalizeModelInternal,
  _normalizeList as _normalizeListInternal,
  _hydrateFromApp,
  getAppModels,
  normalizeModelsOpts,
  setModelsNormalizerInternal,
  setModelPresetsInternal,
  ensureModelsLoadedInternal,
  getAllModelsInternal,
  getModelByIdInternal,
  exportUserModelsInternal,
  mergeImportedModelsInternal,
  onModelsChangeInternal,
  offModelsChangeInternal,
} from './models_registry.js';
import {
  saveCurrentModelInternal,
  overwriteModelFromCurrentInternal,
  deleteModelByIdInternal,
  setModelLockedInternal,
  deleteTemporaryUserModelsInternal,
  moveModelInternal,
  transferModelInternal,
  applyModelInternal,
} from './models_apply_ops.js';

type ModelsOptsLocal = ModelsLoadOptions;

function readModelsOpts(opts?: ModelsOptsLocal): ModelsOpts | undefined {
  return typeof opts === 'undefined' ? undefined : normalizeModelsOpts(opts);
}

function _normalizeModel(m: unknown): SavedModelLike | null {
  return _normalizeModelInternal(m);
}

function _normalizeList(list: unknown): SavedModelLike[] {
  return _normalizeListInternal(list);
}

export function setModelsNormalizer(App: AppContainer, fn: ModelsNormalizer | null): void {
  setModelsNormalizerInternal(App, fn);
}

export function setModelPresets(App: AppContainer, presetsArr: SavedModelLike[]): void {
  setModelPresetsInternal(App, presetsArr);
}

export function ensureModelsLoaded(App: AppContainer, opts?: ModelsOptsLocal): SavedModelLike[] {
  return ensureModelsLoadedInternal(App, readModelsOpts(opts));
}

export function getAllModels(App: AppContainer): SavedModelLike[] {
  return getAllModelsInternal(App);
}

export function getModelById(App: AppContainer, id: SavedModelId): SavedModelLike | null {
  return getModelByIdInternal(App, id);
}

export function exportUserModels(App: AppContainer): SavedModelLike[] {
  return exportUserModelsInternal(App);
}

export function mergeImportedModels(App: AppContainer, list: SavedModelLike[]): ModelsMergeResult {
  return mergeImportedModelsInternal(App, list);
}

export function saveCurrentModel(App: AppContainer, name: SavedModelName): ModelsSaveResult {
  return saveCurrentModelInternal(App, name);
}

export function overwriteModelFromCurrent(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return overwriteModelFromCurrentInternal(App, id);
}

export function deleteModelById(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return deleteModelByIdInternal(App, id);
}

function setModelLocked(App: AppContainer, id: SavedModelId, locked: boolean): ModelsLockResult {
  return setModelLockedInternal(App, id, locked);
}

function deleteTemporaryUserModels(App: AppContainer): ModelsDeleteTemporaryResult {
  return deleteTemporaryUserModelsInternal(App);
}

export function moveModel(
  App: AppContainer,
  id: SavedModelId,
  direction: ModelsMoveDirection
): ModelsCommandResult {
  return moveModelInternal(App, id, direction);
}

export function transferModel(
  App: AppContainer,
  id: SavedModelId,
  targetList: ModelsTransferTargetList,
  overId: SavedModelId | null,
  pos: ModelsTransferPosition
): ModelsCommandResult {
  return transferModelInternal(App, id, targetList, overId, pos);
}

export function applyModel(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return applyModelInternal(App, id);
}

export function onModelsChange(App: AppContainer, fn: ModelsChangeListener): void {
  return onModelsChangeInternal(App, fn);
}

export function offModelsChange(App: AppContainer, fn: ModelsChangeListener): void {
  return offModelsChangeInternal(App, fn);
}

type InstallableModelsService = ModelsServiceLike & {
  __wpModelsServiceInstalled?: boolean;
  __wpSetNormalizer?: (fn: ModelsNormalizer | null) => void;
  __wpSetPresets?: (presetsArr: SavedModelLike[]) => void;
  __wpEnsureLoaded?: (opts?: ModelsOptsLocal) => SavedModelLike[];
  __wpGetAll?: () => SavedModelLike[];
  __wpGetById?: (id: SavedModelId) => SavedModelLike | null;
  __wpSaveCurrent?: (name: SavedModelName) => ModelsSaveResult;
  __wpOverwriteFromCurrent?: (id: SavedModelId) => ModelsCommandResult;
  __wpDeleteById?: (id: SavedModelId) => ModelsCommandResult;
  __wpSetLocked?: (id: SavedModelId, locked: boolean) => ModelsLockResult;
  __wpDeleteTemporary?: () => ModelsDeleteTemporaryResult;
  __wpMove?: (id: SavedModelId, dir: ModelsMoveDirection) => ModelsCommandResult;
  __wpTransfer?: (
    id: SavedModelId,
    targetList: ModelsTransferTargetList,
    overId: SavedModelId | null,
    pos: ModelsTransferPosition
  ) => ModelsCommandResult;
  __wpApply?: (id: SavedModelId) => ModelsCommandResult;
  __wpExportUserModels?: () => SavedModelLike[];
  __wpMergeImportedModels?: (list: SavedModelLike[]) => ModelsMergeResult;
  __wpOnChange?: (fn: ModelsChangeListener) => void;
  __wpOffChange?: (fn: ModelsChangeListener) => void;
};

type ModelsSurfaceMethodKey = keyof Pick<
  ModelsServiceLike,
  | 'setNormalizer'
  | 'setPresets'
  | 'ensureLoaded'
  | 'getAll'
  | 'getById'
  | 'saveCurrent'
  | 'overwriteFromCurrent'
  | 'deleteById'
  | 'setLocked'
  | 'deleteTemporary'
  | 'move'
  | 'transfer'
  | 'apply'
  | 'exportUserModels'
  | 'mergeImportedModels'
  | 'onChange'
  | 'offChange'
>;

type ModelsStableMethodKeyBySurfaceKey = {
  setNormalizer: '__wpSetNormalizer';
  setPresets: '__wpSetPresets';
  ensureLoaded: '__wpEnsureLoaded';
  getAll: '__wpGetAll';
  getById: '__wpGetById';
  saveCurrent: '__wpSaveCurrent';
  overwriteFromCurrent: '__wpOverwriteFromCurrent';
  deleteById: '__wpDeleteById';
  setLocked: '__wpSetLocked';
  deleteTemporary: '__wpDeleteTemporary';
  move: '__wpMove';
  transfer: '__wpTransfer';
  apply: '__wpApply';
  exportUserModels: '__wpExportUserModels';
  mergeImportedModels: '__wpMergeImportedModels';
  onChange: '__wpOnChange';
  offChange: '__wpOffChange';
};

type ModelsInstallContext = {
  App: AppContainer;
};

type ModelsSurfaceBinding<K extends ModelsSurfaceMethodKey = ModelsSurfaceMethodKey> = {
  stableKey: ModelsStableMethodKeyBySurfaceKey[K];
  bind: (context: ModelsInstallContext) => NonNullable<ModelsServiceLike[K]>;
};

type ModelsSurfaceBindingMap = {
  [K in ModelsSurfaceMethodKey]: ModelsSurfaceBinding<K>;
};

const modelsInstallContexts = new WeakMap<object, ModelsInstallContext>();

function createModelsInstallContext(App: AppContainer): ModelsInstallContext {
  return { App };
}

function refreshModelsInstallContext(context: ModelsInstallContext, App: AppContainer): ModelsInstallContext {
  context.App = App;
  return context;
}

function resolveModelsInstallContext(
  models: InstallableModelsService,
  App: AppContainer
): ModelsInstallContext {
  let context = modelsInstallContexts.get(models);
  if (!context) {
    context = createModelsInstallContext(App);
    modelsInstallContexts.set(models, context);
    return context;
  }
  return refreshModelsInstallContext(context, App);
}

const MODELS_SURFACE_BINDINGS: ModelsSurfaceBindingMap = {
  setNormalizer: {
    stableKey: '__wpSetNormalizer',
    bind: context => (fn: ModelsNormalizer | null) => setModelsNormalizer(context.App, fn),
  },
  setPresets: {
    stableKey: '__wpSetPresets',
    bind: context => (presetsArr: SavedModelLike[]) => setModelPresets(context.App, presetsArr),
  },
  ensureLoaded: {
    stableKey: '__wpEnsureLoaded',
    bind: context => (opts?: ModelsOptsLocal) => ensureModelsLoaded(context.App, opts),
  },
  getAll: {
    stableKey: '__wpGetAll',
    bind: context => () => getAllModels(context.App),
  },
  getById: {
    stableKey: '__wpGetById',
    bind: context => (id: SavedModelId) => getModelById(context.App, id),
  },
  saveCurrent: {
    stableKey: '__wpSaveCurrent',
    bind: context => (name: SavedModelName) => saveCurrentModel(context.App, name),
  },
  overwriteFromCurrent: {
    stableKey: '__wpOverwriteFromCurrent',
    bind: context => (id: SavedModelId) => overwriteModelFromCurrent(context.App, id),
  },
  deleteById: {
    stableKey: '__wpDeleteById',
    bind: context => (id: SavedModelId) => deleteModelById(context.App, id),
  },
  setLocked: {
    stableKey: '__wpSetLocked',
    bind: context => (id: SavedModelId, locked: boolean) => setModelLocked(context.App, id, locked),
  },
  deleteTemporary: {
    stableKey: '__wpDeleteTemporary',
    bind: context => () => deleteTemporaryUserModels(context.App),
  },
  move: {
    stableKey: '__wpMove',
    bind: context => (id: SavedModelId, dir: ModelsMoveDirection) => moveModel(context.App, id, dir),
  },
  transfer: {
    stableKey: '__wpTransfer',
    bind:
      context =>
      (
        id: SavedModelId,
        targetList: ModelsTransferTargetList,
        overId: SavedModelId | null,
        pos: ModelsTransferPosition
      ) =>
        transferModel(context.App, id, targetList, overId, pos),
  },
  apply: {
    stableKey: '__wpApply',
    bind: context => (id: SavedModelId) => applyModel(context.App, id),
  },
  exportUserModels: {
    stableKey: '__wpExportUserModels',
    bind: context => () => exportUserModels(context.App),
  },
  mergeImportedModels: {
    stableKey: '__wpMergeImportedModels',
    bind: context => (list: SavedModelLike[]) => mergeImportedModels(context.App, list),
  },
  onChange: {
    stableKey: '__wpOnChange',
    bind: context => (fn: ModelsChangeListener) => onModelsChange(context.App, fn),
  },
  offChange: {
    stableKey: '__wpOffChange',
    bind: context => (fn: ModelsChangeListener) => offModelsChange(context.App, fn),
  },
};

const MODELS_SURFACE_KEYS = [
  'setNormalizer',
  'setPresets',
  'ensureLoaded',
  'getAll',
  'getById',
  'saveCurrent',
  'overwriteFromCurrent',
  'deleteById',
  'setLocked',
  'deleteTemporary',
  'move',
  'transfer',
  'apply',
  'exportUserModels',
  'mergeImportedModels',
  'onChange',
  'offChange',
] as const satisfies readonly ModelsSurfaceMethodKey[];

function installModelsSurfaceMethod<K extends ModelsSurfaceMethodKey>(
  context: ModelsInstallContext,
  models: InstallableModelsService,
  key: K,
  binding: ModelsSurfaceBinding<K>
): void {
  models[key] = installStableSurfaceMethod(models, key, binding.stableKey, () => binding.bind(context));
}

function installModelsSurfaceMethods(App: AppContainer, models: InstallableModelsService): void {
  const context = resolveModelsInstallContext(models, App);
  for (const key of MODELS_SURFACE_KEYS) {
    installModelsSurfaceMethod(context, models, key, MODELS_SURFACE_BINDINGS[key]);
  }
}

function installFreshModelsSurfaceMethod<K extends ModelsSurfaceMethodKey>(
  context: ModelsInstallContext,
  models: InstallableModelsService,
  key: K,
  binding: ModelsSurfaceBinding<K>
): void {
  const installed = binding.bind(context);
  models[binding.stableKey] = installed as InstallableModelsService[typeof binding.stableKey];
  models[key] = installed;
}

function installFreshModelsSurfaceMethods(App: AppContainer, models: InstallableModelsService): void {
  const context = resolveModelsInstallContext(models, App);
  for (const key of MODELS_SURFACE_KEYS) {
    installFreshModelsSurfaceMethod(context, models, key, MODELS_SURFACE_BINDINGS[key]);
  }
  models.__wpModelsServiceInstalled = true;
}

export function installModelsService(App: AppContainer): ModelsServiceLike {
  if (!App || typeof App !== 'object') throw new Error('installModelsService(App): App is required');

  _hydrateFromApp(App);

  const models: InstallableModelsService = getAppModels(App);
  if (models.__wpModelsServiceInstalled !== true) {
    installFreshModelsSurfaceMethods(App, models);
    return models;
  }
  installModelsSurfaceMethods(App, models);
  return models;
}
