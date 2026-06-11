import type {
  AppContainer,
  ModelsChangeListener,
  ModelsCommandResult,
  ModelsDeleteTemporaryResult,
  ModelsLoadOptions,
  ModelsLockResult,
  ModelsMergeResult,
  ModelsMoveDirection,
  ModelsSaveResult,
  ModelsServiceLike,
  ModelsTransferPosition,
  ModelsTransferTargetList,
  ModelsNormalizer,
  SavedModelId,
  SavedModelLike,
  SavedModelName,
} from '../../../types';

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { _hydrateFromApp, getAppModels } from './models_registry.js';

export type ModelsServiceOperations = {
  setModelsNormalizer: (App: AppContainer, fn: ModelsNormalizer | null) => void;
  setModelPresets: (App: AppContainer, presetsArr: SavedModelLike[]) => void;
  ensureModelsLoaded: (App: AppContainer, opts?: ModelsLoadOptions) => SavedModelLike[];
  getAllModels: (App: AppContainer) => SavedModelLike[];
  getModelById: (App: AppContainer, id: SavedModelId) => SavedModelLike | null;
  saveCurrentModel: (App: AppContainer, name: SavedModelName) => ModelsSaveResult;
  overwriteModelFromCurrent: (App: AppContainer, id: SavedModelId) => ModelsCommandResult;
  deleteModelById: (App: AppContainer, id: SavedModelId) => ModelsCommandResult;
  setModelLocked: (App: AppContainer, id: SavedModelId, locked: boolean) => ModelsLockResult;
  deleteTemporaryUserModels: (App: AppContainer) => ModelsDeleteTemporaryResult;
  moveModel: (App: AppContainer, id: SavedModelId, direction: ModelsMoveDirection) => ModelsCommandResult;
  transferModel: (
    App: AppContainer,
    id: SavedModelId,
    targetList: ModelsTransferTargetList,
    overId: SavedModelId | null,
    pos: ModelsTransferPosition
  ) => ModelsCommandResult;
  applyModel: (App: AppContainer, id: SavedModelId) => ModelsCommandResult;
  exportUserModels: (App: AppContainer) => SavedModelLike[];
  mergeImportedModels: (App: AppContainer, list: SavedModelLike[]) => ModelsMergeResult;
  onModelsChange: (App: AppContainer, fn: ModelsChangeListener) => void;
  offModelsChange: (App: AppContainer, fn: ModelsChangeListener) => void;
};

type InstallableModelsService = ModelsServiceLike & {
  __wpModelsServiceInstalled?: boolean;
  __wpSetNormalizer?: (fn: ModelsNormalizer | null) => void;
  __wpSetPresets?: (presetsArr: SavedModelLike[]) => void;
  __wpEnsureLoaded?: (opts?: ModelsLoadOptions) => SavedModelLike[];
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
  bind: (
    context: ModelsInstallContext,
    operations: ModelsServiceOperations
  ) => NonNullable<ModelsServiceLike[K]>;
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
    bind: (context, operations) => (fn: ModelsNormalizer | null) =>
      operations.setModelsNormalizer(context.App, fn),
  },
  setPresets: {
    stableKey: '__wpSetPresets',
    bind: (context, operations) => (presetsArr: SavedModelLike[]) =>
      operations.setModelPresets(context.App, presetsArr),
  },
  ensureLoaded: {
    stableKey: '__wpEnsureLoaded',
    bind: (context, operations) => (opts?: ModelsLoadOptions) =>
      operations.ensureModelsLoaded(context.App, opts),
  },
  getAll: {
    stableKey: '__wpGetAll',
    bind: (context, operations) => () => operations.getAllModels(context.App),
  },
  getById: {
    stableKey: '__wpGetById',
    bind: (context, operations) => (id: SavedModelId) => operations.getModelById(context.App, id),
  },
  saveCurrent: {
    stableKey: '__wpSaveCurrent',
    bind: (context, operations) => (name: SavedModelName) => operations.saveCurrentModel(context.App, name),
  },
  overwriteFromCurrent: {
    stableKey: '__wpOverwriteFromCurrent',
    bind: (context, operations) => (id: SavedModelId) =>
      operations.overwriteModelFromCurrent(context.App, id),
  },
  deleteById: {
    stableKey: '__wpDeleteById',
    bind: (context, operations) => (id: SavedModelId) => operations.deleteModelById(context.App, id),
  },
  setLocked: {
    stableKey: '__wpSetLocked',
    bind: (context, operations) => (id: SavedModelId, locked: boolean) =>
      operations.setModelLocked(context.App, id, locked),
  },
  deleteTemporary: {
    stableKey: '__wpDeleteTemporary',
    bind: (context, operations) => () => operations.deleteTemporaryUserModels(context.App),
  },
  move: {
    stableKey: '__wpMove',
    bind: (context, operations) => (id: SavedModelId, dir: ModelsMoveDirection) =>
      operations.moveModel(context.App, id, dir),
  },
  transfer: {
    stableKey: '__wpTransfer',
    bind:
      (context, operations) =>
      (
        id: SavedModelId,
        targetList: ModelsTransferTargetList,
        overId: SavedModelId | null,
        pos: ModelsTransferPosition
      ) =>
        operations.transferModel(context.App, id, targetList, overId, pos),
  },
  apply: {
    stableKey: '__wpApply',
    bind: (context, operations) => (id: SavedModelId) => operations.applyModel(context.App, id),
  },
  exportUserModels: {
    stableKey: '__wpExportUserModels',
    bind: (context, operations) => () => operations.exportUserModels(context.App),
  },
  mergeImportedModels: {
    stableKey: '__wpMergeImportedModels',
    bind: (context, operations) => (list: SavedModelLike[]) =>
      operations.mergeImportedModels(context.App, list),
  },
  onChange: {
    stableKey: '__wpOnChange',
    bind: (context, operations) => (fn: ModelsChangeListener) => operations.onModelsChange(context.App, fn),
  },
  offChange: {
    stableKey: '__wpOffChange',
    bind: (context, operations) => (fn: ModelsChangeListener) => operations.offModelsChange(context.App, fn),
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
  operations: ModelsServiceOperations,
  models: InstallableModelsService,
  key: K,
  binding: ModelsSurfaceBinding<K>
): void {
  models[key] = installStableSurfaceMethod(models, key, binding.stableKey, () =>
    binding.bind(context, operations)
  );
}

function installModelsSurfaceMethods(
  App: AppContainer,
  operations: ModelsServiceOperations,
  models: InstallableModelsService
): void {
  const context = resolveModelsInstallContext(models, App);
  for (const key of MODELS_SURFACE_KEYS) {
    installModelsSurfaceMethod(context, operations, models, key, MODELS_SURFACE_BINDINGS[key]);
  }
}

function installFreshModelsSurfaceMethod<K extends ModelsSurfaceMethodKey>(
  context: ModelsInstallContext,
  operations: ModelsServiceOperations,
  models: InstallableModelsService,
  key: K,
  binding: ModelsSurfaceBinding<K>
): void {
  const installed = binding.bind(context, operations);
  models[binding.stableKey] = installed as InstallableModelsService[typeof binding.stableKey];
  models[key] = installed;
}

function installFreshModelsSurfaceMethods(
  App: AppContainer,
  operations: ModelsServiceOperations,
  models: InstallableModelsService
): void {
  const context = resolveModelsInstallContext(models, App);
  for (const key of MODELS_SURFACE_KEYS) {
    installFreshModelsSurfaceMethod(context, operations, models, key, MODELS_SURFACE_BINDINGS[key]);
  }
  models.__wpModelsServiceInstalled = true;
}

export function installModelsServiceSurface(
  App: AppContainer,
  operations: ModelsServiceOperations
): ModelsServiceLike {
  _hydrateFromApp(App);

  const models: InstallableModelsService = getAppModels(App);
  if (models.__wpModelsServiceInstalled !== true) {
    installFreshModelsSurfaceMethods(App, operations, models);
    return models;
  }
  installModelsSurfaceMethods(App, operations, models);
  return models;
}
