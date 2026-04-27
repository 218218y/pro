import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const modelsTypes = readSource('../types/models.ts', import.meta.url);
const typesIndex = readSource('../types/index.ts', import.meta.url);
const buildTypes = readBuildTypesBundle(import.meta.url);
const modelsService = readSource('../esm/native/services/models.ts', import.meta.url);
const modelsAccess = readSource('../esm/native/runtime/models_access.ts', import.meta.url);
const modelsAccessShared = readSource('../esm/native/runtime/models_access_shared.ts', import.meta.url);
const modelsAccessContracts = readSource('../esm/native/runtime/models_access_contracts.ts', import.meta.url);
const modelsAccessAdapters = readSource('../esm/native/runtime/models_access_adapters.ts', import.meta.url);
const modelsAccessService = readSource('../esm/native/runtime/models_access_service.ts', import.meta.url);
const modelsAccessCommands = readSource('../esm/native/runtime/models_access_commands.ts', import.meta.url);
const cloudSyncTypes = readSource('../types/cloud_sync.ts', import.meta.url);

const modelsHelpers = bundleSources(
  ['../esm/native/services/models_registry.ts', '../esm/native/services/models_apply_ops.ts'],
  import.meta.url,
  { stripNoise: true }
);

const modelsNamedOnlyPaths = [
  '../esm/native/services/models.ts',
  '../esm/native/services/models_apply_list_ops.ts',
  '../esm/native/services/models_apply_load_ops.ts',
  '../esm/native/services/models_apply_ops.ts',
  '../esm/native/services/models_apply_ops_shared.ts',
  '../esm/native/services/models_apply_snapshot_ops.ts',
  '../esm/native/services/models_apply_transfer_ops.ts',
  '../esm/native/services/models_registry_storage.ts',
  '../esm/native/services/models_registry_storage_keys.ts',
  '../esm/native/services/models_registry_storage_persistence.ts',
  '../esm/native/services/models_registry_storage_state.ts',
];

const structureModelsBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/StructureTab.view.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/structure_tab_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_core.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_models.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_panel.tsx',
  ],
  import.meta.url,
  { stripNoise: true }
);

const cloudModelsBundle = bundleSources(
  [
    '../esm/native/services/cloud_sync.ts',
    '../esm/native/services/cloud_sync_support.ts',
    '../esm/native/services/cloud_sync_support_shared.ts',
    '../esm/native/services/cloud_sync_support_shared_core.ts',
    '../esm/native/services/cloud_sync_support_feedback.ts',
    '../esm/native/services/cloud_sync_support_storage.ts',
    '../esm/native/services/cloud_sync_support_capture.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const autosaveBundle = bundleSources(
  [
    '../esm/native/services/autosave.ts',
    '../esm/native/services/autosave_shared.ts',
    '../esm/native/services/autosave_snapshot.ts',
    '../esm/native/services/autosave_runtime.ts',
    '../esm/native/services/autosave_schedule.ts',
    '../esm/native/runtime/autosave_access.ts',
    '../esm/native/runtime/project_capture_access.ts',
    '../esm/native/runtime/storage_access.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const projectLoadCommandBundle = bundleSources(
  [
    '../esm/native/services/models.ts',
    '../esm/native/ui/interactions/project_drag_drop.ts',
    '../esm/native/kernel/kernel.ts',
    '../esm/native/runtime/project_io_access.ts',
    '../esm/native/runtime/project_io_access_shared.ts',
    '../esm/native/runtime/project_io_access_load.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

test('models contracts keep canonical service, helper, and typed access seams', () => {
  assertMatchesAll(
    assert,
    modelsTypes,
    [
      /export interface SavedModelLike extends (AnyRecord|UnknownRecord)/,
      /export interface ModelsServiceLike extends (AnyRecord|UnknownRecord)/,
      /export type ModelsNormalizer = \(model: SavedModelLike\) => SavedModelLike \| null;/,
      /export type ModelsCommandReason =/,
      /setNormalizer: \(fn: ModelsNormalizer \| null\) => void;/,
      /setPresets: \(presetsArr: SavedModelLike\[\]\) => void;/,
    ],
    'modelsTypes'
  );
  assertMatchesAll(assert, typesIndex, [/export \* from '\.\/models';/], 'typesIndex');
  assertMatchesAll(assert, buildTypes, [/models\?: ModelsServiceLike;/], 'buildTypes');

  assertMatchesAll(
    assert,
    modelsAccess,
    [
      /export \{ normalizeModelsCommandReason \} from '\.\/models_access_shared\.js';/,
      /export \{[\s\S]*getModelsServiceSourceMaybe,[\s\S]*getModelsServiceMaybe,[\s\S]*ensureModelsService,[\s\S]*\} from '\.\/models_access_service\.js';/,
      /export \{[\s\S]*ensureModelsLoadedViaService,[\s\S]*ensureModelsLoadedViaServiceOrThrow,[\s\S]*exportUserModelsViaService,[\s\S]*mergeImportedModelsViaService,[\s\S]*mergeImportedModelsViaServiceOrThrow,[\s\S]*setModelNormalizerViaService,[\s\S]*setPresetModelsViaService,[\s\S]*\} from '\.\/models_access_commands\.js';/,
    ],
    'modelsAccess'
  );
  assertLacksAll(assert, modelsAccess, [/export default\s+/, /import \{/], 'modelsAccess');

  assertMatchesAll(
    assert,
    modelsAccessShared,
    [/models_access_contracts\.js/, /models_access_adapters\.js/],
    'modelsAccessShared'
  );

  assertMatchesAll(
    assert,
    modelsAccessContracts,
    [
      /export function normalizeModelsCommandReason\(/,
      /export function readSavedModelList\(/,
      /export function createEmptyModelsService\(/,
      /export function cloneUnknownDetached</,
    ],
    'modelsAccessContracts'
  );

  assertMatchesAll(
    assert,
    modelsAccessAdapters,
    [
      /export function readModelsService\(/,
      /export function readOneArgUnknownFn</,
      /export function readChangeListenerFn\(/,
    ],
    'modelsAccessAdapters'
  );

  assertMatchesAll(
    assert,
    modelsAccessService,
    [
      /export function getModelsServiceSourceMaybe\(App: unknown\): \(ModelsServiceLike & UnknownRecord\) \| null/,
      /export function getModelsServiceMaybe\(App: unknown\): ModelsServiceLike \| null/,
      /export function ensureModelsService\(App: unknown\): ModelsServiceLike/,
    ],
    'modelsAccessService'
  );

  assertMatchesAll(
    assert,
    modelsAccessCommands,
    [
      /export function ensureModelsLoadedViaService\(App: unknown, opts\?: ModelsLoadOptions\): boolean/,
      /export function ensureModelsLoadedViaServiceOrThrow\(/,
      /export function exportUserModelsViaService\(App: unknown\): SavedModelLike\[\]/,
      /export function mergeImportedModelsViaService\(App: unknown, list: SavedModelLike\[\]\): ModelsMergeResult/,
      /export function mergeImportedModelsViaServiceOrThrow\(/,
      /export function setModelNormalizerViaService\(/,
      /export function setPresetModelsViaService\(/,
    ],
    'modelsAccessCommands'
  );

  assertMatchesAll(
    assert,
    modelsService,
    [
      /\.\/models_registry\.js/,
      /\.\/models_apply_ops\.js/,
      /function _normalizeModel\(m: unknown\): SavedModelLike \| null/,
      /function _normalizeList\(list: unknown\): SavedModelLike\[\]/,
      /export function installModelsService\(App: AppContainer\): ModelsServiceLike/,
      /stable_surface_methods\.js/,
      /const MODELS_SURFACE_BINDINGS: ModelsSurfaceBindingMap = \{/,
      /function installModelsSurfaceMethods\(App: AppContainer, models: InstallableModelsService\): void/,
      /stableKey: '__wpSetNormalizer'/,
      /stableKey: '__wpApply'/,
    ],
    'modelsService'
  );
  assertMatchesAll(assert, modelsService, [/normalizeModelsOpts\(/], 'modelsService');

  for (const rel of modelsNamedOnlyPaths) {
    assertLacksAll(assert, readSource(rel, import.meta.url), [/export default\s+/], rel);
  }

  assertMatchesAll(
    assert,
    modelsHelpers,
    [
      /export type \{[\s\S]*AppModelsState[\s\S]*StorageLike[\s\S]*UtilLike[\s\S]*\};/,
      /export function ensureModelsLoadedInternal\(App: AppContainer, opts\?: ModelsOpts\): SavedModelLike\[\]/,
      /export function mergeImportedModelsInternal\(App: AppContainer, list: SavedModelLike\[\]\): ModelsMergeResult/,
      /export function saveCurrentModelInternal\(/,
      /export function transferModelInternal\(/,
      /export function applyModelInternal\(App: AppContainer, id: SavedModelId\): ModelsCommandResult/,
    ],
    'modelsHelpers'
  );
});

test('models callers and sync payloads stay on canonical seams', () => {
  assertMatchesAll(
    assert,
    structureModelsBundle,
    [
      /ModelsServiceLike/,
      /SavedModelLike/,
      /SavedModelsPanel|useStructureTabSavedModelsController/,
      /getModelsService\(app\)|useStructureTabSavedModelsController/,
      /modelsApi\.apply\(|StructureTabSavedModelsView/,
    ],
    'structureModelsBundle'
  );
  assertLacksAll(
    assert,
    structureModelsBundle,
    [/type ModelsServiceLike = \{/, /const res = modelsApi\.apply\(id\) as AnyRecord \| null/],
    'structureModelsBundle'
  );

  assertMatchesAll(
    assert,
    cloudSyncTypes,
    [
      /export interface CloudSyncPayload extends UnknownRecord \{/,
      /savedModels\?:\s*SavedModelLike\[\](?:\s*\|\s*(?:null|unknown))?\s*;/,
      /savedColors\?:\s*SavedColorLike\[\](?:\s*\|\s*(?:null|unknown))?\s*;/,
    ],
    'cloudSyncTypes'
  );
  assertMatchesAll(
    assert,
    cloudModelsBundle,
    [
      /function normalizeModelList\(v: unknown\): SavedModelLike\[\]/,
      /function normalizeSavedColorsList\(v: unknown\): SavedColorLike\[\]/,
    ],
    'cloudModelsBundle'
  );
});

test('models-related autosave and project-load flows keep command-like canonical wiring', () => {
  assertMatchesAll(
    assert,
    autosaveBundle,
    [
      /installAutosaveService\(/,
      /captureAutosaveSnapshot\(/,
      /getProjectCaptureServiceMaybe\(/,
      /getStorageServiceMaybe\(/,
    ],
    'autosaveBundle'
  );
  assertLacksAll(assert, autosaveBundle, [/localStorage\./], 'autosaveBundle');

  assertMatchesAll(
    assert,
    projectLoadCommandBundle,
    [/getProjectIoServiceMaybe\(App\)/, /loadProjectDataViaService\(/, /projectIO\.loadProjectData/],
    'projectLoadCommandBundle'
  );
  const forbidden = [
    /loadProjectDataViaService\([^\n]*?!==\s*undefined/,
    /projectIO\.loadProjectData\([^\n]*?!==\s*undefined/,
    /loadProjectDataViaService\([^\n]*?===\s*undefined/,
    /projectIO\.loadProjectData\([^\n]*?===\s*undefined/,
    /const\s+loaded\s*=\s*loadProjectDataViaService\(/,
    /const\s+loaded\s*=\s*projectIO\.loadProjectData\(/,
    /return\s+loadProjectDataViaService\(/,
    /return\s+projectIO\.loadProjectData\(/,
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(
      projectLoadCommandBundle,
      pattern,
      `projectLoadCommandBundle should not match ${String(pattern)}`
    );
  }
});

test('models top-level owners stay thin and delegate command/storage policy to dedicated modules', () => {
  const modelsRegistry = readSource('../esm/native/services/models_registry.ts', import.meta.url);
  const modelsApply = readSource('../esm/native/services/models_apply_ops.ts', import.meta.url);

  assertMatchesAll(
    assert,
    modelsRegistry,
    [
      /\.\/models_registry_runtime\.js/,
      /\.\/models_registry_storage\.js/,
      /\.\/models_registry_shared\.js/,
      /export type \{[\s\S]*AppModelsState[\s\S]*StorageLike[\s\S]*UtilLike[\s\S]*\};/,
      /export function ensureModelsLoadedInternal\(App: AppContainer, opts\?: ModelsOpts\): SavedModelLike\[\]/,
      /export function mergeImportedModelsInternal\(App: AppContainer, list: SavedModelLike\[\]\): ModelsMergeResult/,
    ],
    'modelsRegistryThinOwner'
  );

  assertMatchesAll(
    assert,
    modelsApply,
    [
      /\.\/models_apply_snapshot_ops\.js/,
      /\.\/models_apply_list_ops\.js/,
      /\.\/models_apply_transfer_ops\.js/,
      /\.\/models_apply_load_ops\.js/,
      /export function saveCurrentModelInternal\(/,
      /export function transferModelInternal\(/,
      /return applyModelInternalImpl\(App, id\);/,
    ],
    'modelsApplyThinOwner'
  );
});
