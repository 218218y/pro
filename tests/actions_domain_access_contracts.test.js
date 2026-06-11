import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { readServicesApiPublicSurface } from './_services_api_bundle.js';

const actionsAccessEntry = readSource('../esm/native/runtime/actions_access.ts', import.meta.url);
const actionsAccessBundle = bundleSources(
  [
    '../esm/native/runtime/actions_access_core.ts',
    '../esm/native/runtime/actions_access_domains.ts',
    '../esm/native/runtime/actions_access_mutations.ts',
  ],
  import.meta.url
);
const servicesApi = readServicesApiPublicSurface(import.meta.url);
const notesAccess = bundleSources(
  [
    '../esm/native/runtime/notes_access.ts',
    '../esm/native/runtime/notes_access_shared.ts',
    '../esm/native/runtime/notes_access_services.ts',
    '../esm/native/runtime/notes_access_actions.ts',
  ],
  import.meta.url
);
const cameraAccess = readSource('../esm/native/services/camera_access.ts', import.meta.url);
const camera = bundleSources(
  [
    '../esm/native/services/camera.ts',
    '../esm/native/services/camera_shared.ts',
    '../esm/native/services/camera_motion.ts',
    '../esm/native/services/camera_runtime.ts',
  ],
  import.meta.url
);
const smokeBundlePaths = [
  '../esm/native/platform/smoke_checks.ts',
  '../esm/native/platform/smoke_checks_core.ts',
  '../esm/native/platform/smoke_checks_scenario.ts',
  '../esm/native/platform/smoke_checks_shared.ts',
];
const smokeChecks = bundleSources(smokeBundlePaths, import.meta.url);
const appHelpers = readSource('../esm/native/runtime/app_helpers.ts', import.meta.url);
const doorEditFlow = bundleSources(
  [
    '../esm/native/services/canvas_picking_door_edit_flow.ts',
    '../esm/native/services/canvas_picking_door_split_click.ts',
    '../esm/native/services/canvas_picking_door_remove_click.ts',
    '../esm/native/services/canvas_picking_door_hinge_groove_click.ts',
  ],
  import.meta.url
);
const canvasBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_hover_flow.ts',
    '../esm/native/services/canvas_picking_drawer_mode_flow.ts',
    '../esm/native/services/canvas_picking_door_edit_flow.ts',
    '../esm/native/services/canvas_picking_door_hinge_groove_click.ts',
    '../esm/native/services/canvas_picking_drawer_mode_flow_divider.ts',
    '../esm/native/services/canvas_picking_local_helpers.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const projectIoBundle = bundleSources(
  [
    '../esm/native/io/project_io.ts',
    '../esm/native/io/project_io_orchestrator.ts',
    '../esm/native/io/project_io_orchestrator_load_ops.ts',
    '../esm/native/io/project_io_orchestrator_export_ops.ts',
    '../esm/native/io/project_io_orchestrator_project_load.ts',
    '../esm/native/io/project_io_load_helpers.ts',
    '../esm/native/io/project_io_save_helpers.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const actionsBootBundle = bundleSources(
  [
    '../esm/native/ui/interactions/project_save_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
    '../esm/native/ui/react/actions/project_actions.ts',
    '../esm/native/platform/dirty_flag.ts',
    '../esm/native/ui/react/hooks.tsx',
    '../esm/native/platform/boot_main.ts',
    '../esm/native/runtime/platform_access.ts',
    '../esm/native/ui/settings_backup.ts',
    '../esm/native/ui/settings_backup_import_support.ts',
    '../esm/native/ui/multicolor_service.ts',
    '../esm/native/services/canvas_picking_config_actions.ts',
    '../esm/native/runtime/app_helpers.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

test('[actions-domain] namespace, domain, save, and meta helpers stay centralized', () => {
  assertMatchesAll(
    assert,
    actionsAccessEntry,
    [
      /export \* from '\.\/actions_access_core\.js';/,
      /export \* from '\.\/actions_access_domains\.js';/,
      /export \* from '\.\/actions_access_mutations\.js';/,
      /export \{[\s\S]*ensureActionsRoot,[\s\S]*\} from '\.\/actions_access_core\.js';/,
      /export \{[\s\S]*getMetaActions,[\s\S]*\} from '\.\/actions_access_domains\.js';/,
      /export \{[\s\S]*commitUiSnapshotViaActions,[\s\S]*commitUiSnapshotViaActionsOrThrow,[\s\S]*applyProjectConfigSnapshotViaActionsOrThrow,[\s\S]*\} from '\.\/actions_access_mutations\.js';/,
    ],
    'actionsAccessEntry'
  );

  assertMatchesAll(
    assert,
    actionsAccessBundle,
    [
      /function getValueAtPath\(/,
      /return actions \? getValueAtPath\(actions, path\) : undefined;/,
      /export function getActionNamespace\(App: (?:AppContainer|unknown), path: string\): ActionNode \| null \{/,
      /export function listActionFns\(/,
      /export function requireActionNamespace/,
      /export function getNamespacedActionFn/,
      /export function callNamespacedAction/,
      /export function getDoorsActions\(/,
      /export function callDoorsAction/,
      /export function getModulesActions\(/,
      /export function getModulesActionFn/,
      /export function callModulesAction/,
      /export function listModulesActionFns/,
      /export function commitUiSnapshotViaActions\(/,
      /export function commitUiSnapshotViaActionsOrThrow\(/,
      /export function setDirtyViaActions\(/,
      /export function setDirtyViaActionsOrThrow\(/,
      /export function applyProjectConfigSnapshotViaActionsOrThrow\(/,
      /export function ensureActionsRoot\(/,
      /export function ensureActionNamespace\(/,
      /export function getMetaActions\(/,
      /export function ensureMetaActions\(/,
      /export function getSaveProjectAction\(/,
      /export function setSaveProjectAction\(/,
      /export function saveProjectViaActions\(/,
      /export function runHistoryBatchViaActions/,
      /export function patchViaActions/,
      /export function renderModelUiViaActions/,
      /export function renderModelUiViaActionsOrThrow/,
      /export function setMultiModeViaActions/,
      /export function applyPaintViaActions/,
      /export function toggleDividerViaActions/,
      /export function toggleGrooveViaActions/,
    ],
    'actionsAccessBundle'
  );

  assertMatchesAll(
    assert,
    servicesApi,
    [
      /commitUiSnapshotViaActions/,
      /commitUiSnapshotViaActionsOrThrow/,
      /setDirtyViaActions/,
      /setDirtyViaActionsOrThrow/,
      /applyProjectConfigSnapshotViaActionsOrThrow/,
      /getDoorsActions/,
      /getModulesActions/,
      /listModulesActionFns/,
      /getSaveProjectAction/,
      /setSaveProjectAction/,
      /saveProjectViaActions/,
    ],
    'servicesApi'
  );
});

test('[actions-domain] project IO, notes persistence, and boot paths use canonical helpers only', () => {
  assertMatchesAll(
    assert,
    projectIoBundle,
    [
      /applyProjectConfigSnapshotViaActionsOrThrow\(/,
      /commitUiSnapshotViaActionsOrThrow\(/,
      /setDirtyViaActionsOrThrow\(/,
      /resetHistoryBaselineRequiredOrThrow\(/,
    ],
    'projectIoBundle'
  );
  assertLacksAll(assert, projectIoBundle, [/App\.actions\.ui/, /App\.actions\.meta/], 'projectIoBundle');

  assertMatchesAll(
    assert,
    notesAccess,
    [
      /export function getNotesForSaveFn\(/,
      /export function captureSavedNotesViaService\(/,
      /export function getRestoreNotesFromSaveFn\(/,
      /export function restoreNotesFromSaveViaService\(/,
    ],
    'notesAccess'
  );
  assertMatchesAll(
    assert,
    bundleSources(
      [
        '../esm/native/builder/bootstrap.ts',
        '../esm/native/builder/bootstrap_bindings.ts',
        '../esm/native/io/project_io_orchestrator.ts',
        '../esm/native/io/project_io_orchestrator_load_ops.ts',
        '../esm/native/io/project_io_orchestrator_project_load.ts',
        '../esm/native/kernel/kernel.ts',
      ],
      import.meta.url
    ),
    [
      /getNotesForSaveFn\((?:App|context\.App)\)/,
      /getRestoreNotesFromSaveFn\((?:App|context\.App)\)/,
      /restoreNotesFromSaveViaService\(App,\s*[A-Za-z_$][\w$]*\)/,
      /captureSavedNotesViaService\(App\)/,
    ],
    'notesPersistenceBundle'
  );

  assertMatchesAll(
    assert,
    actionsBootBundle,
    [
      /(?:saveProjectResultViaActions\((?:App|app)\)|saveProjectViaActions|actions\.saveProjectViaActions\((?:App|app)\))/,
      /setSaveProjectAction/,
      /getSaveProjectAction/,
      /renderModelUiViaActionsOrThrow\(/,
      /setMultiModeViaActions\(App(?: as any)?, !!next, m(?: as any)?\)/,
      /applyPaintViaActions\([\s\S]*App,[\s\S]*individualColors,[\s\S]*curtainMap,[\s\S]*meta,[\s\S]*doorSpecialMap,[\s\S]*mirrorLayoutMap,[\s\S]*doorStyleMap \?\? undefined[\s\S]*\)/,
      /runHistoryBatchViaActions\(App, meta, fn\)/,
    ],
    'actionsBootBundle'
  );
  assertLacksAll(
    assert,
    actionsBootBundle,
    [/actions\.(?:meta|project)\s*=\s*/, /App\.actions\.meta/, /App\.actions\.project/],
    'actionsBootBundle'
  );
  assert.match(appHelpers, /callMetaAction<\(meta\?: ActionMetaLike\) => unknown>\(App, 'touch', meta\)/);
  assert.doesNotMatch(appHelpers, /patchViaActions\(App, \{\}, meta\)/);
});

test('[actions-domain] smoke checks, camera, and canvas flows stay on canonical domain surfaces', () => {
  assertMatchesAll(
    assert,
    smokeChecks,
    [
      /const doorsActions = getDoorsActions\(asAppContainer\(App\)\)/,
      /const modulesActions = getModulesActions\(asAppContainer\(App\)\)/,
      /return listModulesActionFns\(asAppContainer\(App\)\)/,
    ],
    'smokeChecks'
  );
  assertLacksAll(assert, smokeChecks, [/App\.actions\.doors/, /App\.actions\.modules/], 'smokeChecks');

  assertMatchesAll(assert, cameraAccess, [/export function moveCameraViaService\(/], 'cameraAccess');
  assertMatchesAll(assert, camera, [/export function moveCamera\(/], 'cameraService');
  assertLacksAll(assert, cameraAccess, [/actions\.moveCamera/, /App\.actions\.moveCamera/], 'cameraAccess');

  assertMatchesAll(assert, canvasBundle, [/toggleDividerViaActions\(\s*App,\s*dividerKey/], 'canvasBundle');
  assert.match(doorEditFlow, /toggleGrooveViaActions\(\s*App,\s*grooveKey/);
  assert.match(doorEditFlow, /canvas_picking_door_split_click_shared\.js/);
  assert.match(doorEditFlow, /handleCanvasDoorSplitClick\(\{/);
  assert.match(doorEditFlow, /callDoorsAction\(App, 'setRemoved'/);
  assert.match(doorEditFlow, /callDoorsAction\(App, 'setHinge'/);
  assertLacksAll(
    assert,
    canvasBundle,
    [
      /actions\.modules/,
      /hasAction\(App, 'dividers\./,
      /callAction\(App, 'dividers\./,
      /hasAction\(App, 'grooves\./,
      /callAction\(App, 'grooves\./,
      /hasAction\(App, 'colors\./,
      /callAction\(App, 'colors\./,
    ],
    'canvasBundle'
  );
});
