import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { readServicesApiPublicSurface } from './_services_api_bundle.js';

const projectIoAccessOwner = readSource('../esm/native/runtime/project_io_access.ts', import.meta.url);
const projectIoAccess = bundleSources(
  [
    '../esm/native/runtime/project_io_access.ts',
    '../esm/native/runtime/project_io_access_shared.ts',
    '../esm/native/runtime/project_io_access_load.ts',
    '../esm/native/runtime/project_io_access_restore.ts',
  ],
  import.meta.url
);
const servicesApi = readServicesApiPublicSurface(import.meta.url);
const projectIoOwner = readSource('../esm/native/io/project_io.ts', import.meta.url);
const stackRouter = bundleSources(
  [
    '../esm/native/kernel/state_api_stack_router.ts',
    '../esm/native/kernel/state_api_stack_router_shared.ts',
    '../esm/native/kernel/state_api_stack_router_ensure.ts',
    '../esm/native/kernel/state_api_stack_router_patch.ts',
  ],
  import.meta.url
);

const smokeBundlePaths = [
  '../esm/native/platform/smoke_checks.ts',
  '../esm/native/platform/smoke_checks_core.ts',
  '../esm/native/platform/smoke_checks_scenario.ts',
  '../esm/native/platform/smoke_checks_shared.ts',
];

const projectIoBundle = bundleSources(
  [
    '../esm/native/io/project_io.ts',
    '../esm/native/io/project_io_orchestrator.ts',
    '../esm/native/io/project_io_orchestrator_load_ops.ts',
    '../esm/native/io/project_io_orchestrator_load_file.ts',
    '../esm/native/io/project_io_orchestrator_project_load.ts',
    '../esm/native/io/project_io_orchestrator_restore.ts',
    '../esm/native/io/project_io_orchestrator_export_ops.ts',
    '../esm/native/io/project_io_load_helpers.ts',
    '../esm/native/io/project_io_load_helpers_shared.ts',
    '../esm/native/io/project_io_load_helpers_maps.ts',
    '../esm/native/io/project_io_load_helpers_config.ts',
    '../esm/native/ui/react/actions/project_actions.ts',
    '../esm/native/ui/project_action_feedback.ts',
    '../esm/native/ui/project_action_feedback_shared.ts',
    '../esm/native/ui/project_action_feedback_load_restore.ts',
    '../esm/native/ui/project_action_feedback_save_reset.ts',
    '../esm/native/ui/project_action_feedback_shared.ts',
    '../esm/native/ui/project_action_feedback_load_restore.ts',
    '../esm/native/ui/project_action_feedback_save_reset.ts',
    '../esm/native/ui/project_session_commands.ts',
    '../esm/native/ui/project_session_commands_shared.ts',
    '../esm/native/ui/project_session_commands_restore.ts',
    '../esm/native/ui/project_session_commands_reset.ts',
    '../esm/native/ui/react/project_ui_action_controller_runtime.ts',
    '../esm/native/ui/react/project_ui_action_controller_shared.ts',
    '../esm/native/ui/react/project_ui_action_controller_load.ts',
    '../esm/native/ui/react/project_ui_action_controller_recovery.ts',
    '../esm/native/ui/react/project_ui_action_controller_save.ts',
    '../esm/native/ui/react/sidebar_app.tsx',
    '../esm/native/ui/react/sidebar_header.tsx',
    '../esm/native/ui/react/sidebar_header_actions.ts',
    '../esm/native/ui/react/sidebar_shared.ts',
    '../esm/native/ui/react/panels/project_panel_actions.ts',
    '../esm/native/services/project_reset_default.ts',
    '../esm/native/services/project_reset_default_payload.ts',
    '../esm/native/services/project_reset_default_action.ts',
    '../esm/native/ui/interactions/project_save_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
    '../esm/native/ui/interactions/project_save_load_controller_shared.ts',
    '../esm/native/ui/interactions/project_save_load_controller_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_save.ts',
    '../esm/native/ui/interactions/project_drag_drop.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_runtime.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_shared.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_visual.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_drop.ts',
    '../esm/native/ui/project_load_runtime.ts',
    '../esm/native/ui/project_load_runtime_shared.ts',
    '../esm/native/ui/project_load_runtime_action.ts',
    '../esm/native/ui/project_save_runtime.ts',
    '../esm/native/ui/project_save_runtime_contracts.ts',
    '../esm/native/ui/project_save_runtime_prompt.ts',
    '../esm/native/ui/project_save_runtime_results.ts',
    '../esm/native/ui/project_save_runtime_action.ts',
    '../esm/native/ui/project_recovery_runtime.ts',
    '../esm/native/ui/project_recovery_runtime_shared.ts',
    '../esm/native/ui/project_recovery_runtime_restore.ts',
    '../esm/native/ui/project_recovery_runtime_reset.ts',
    '../esm/native/ui/project_load_runtime.ts',
    '../esm/native/ui/project_save_runtime.ts',
    '../esm/native/ui/project_save_runtime_contracts.ts',
    '../esm/native/ui/project_save_runtime_prompt.ts',
    '../esm/native/ui/project_save_runtime_results.ts',
    '../esm/native/ui/project_save_runtime_action.ts',
    '../esm/native/ui/project_recovery_runtime.ts',
    '../esm/native/kernel/kernel.ts',
    '../esm/native/services/models.ts',
    ...smokeBundlePaths,
  ],
  import.meta.url
);

const projectIoCallerBundle = bundleSources(
  [
    '../esm/native/ui/react/actions/project_actions.ts',
    '../esm/native/ui/project_action_feedback.ts',
    '../esm/native/ui/project_action_feedback_shared.ts',
    '../esm/native/ui/project_action_feedback_load_restore.ts',
    '../esm/native/ui/project_action_feedback_save_reset.ts',
    '../esm/native/ui/project_action_feedback_shared.ts',
    '../esm/native/ui/project_action_feedback_load_restore.ts',
    '../esm/native/ui/project_action_feedback_save_reset.ts',
    '../esm/native/ui/project_session_commands.ts',
    '../esm/native/ui/project_session_commands_shared.ts',
    '../esm/native/ui/project_session_commands_restore.ts',
    '../esm/native/ui/project_session_commands_reset.ts',
    '../esm/native/ui/react/project_ui_action_controller_runtime.ts',
    '../esm/native/ui/react/project_ui_action_controller_shared.ts',
    '../esm/native/ui/react/project_ui_action_controller_load.ts',
    '../esm/native/ui/react/project_ui_action_controller_recovery.ts',
    '../esm/native/ui/react/project_ui_action_controller_save.ts',
    '../esm/native/ui/react/sidebar_app.tsx',
    '../esm/native/ui/react/sidebar_header.tsx',
    '../esm/native/ui/react/sidebar_header_actions.ts',
    '../esm/native/ui/react/sidebar_shared.ts',
    '../esm/native/ui/react/panels/project_panel_actions.ts',
    '../esm/native/services/project_reset_default.ts',
    '../esm/native/services/project_reset_default_payload.ts',
    '../esm/native/services/project_reset_default_action.ts',
    '../esm/native/ui/interactions/project_save_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
    '../esm/native/ui/interactions/project_drag_drop.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_runtime.ts',
    '../esm/native/kernel/kernel.ts',
    '../esm/native/services/models.ts',
    ...smokeBundlePaths,
  ],
  import.meta.url,
  { stripNoise: true }
);

const projectLoadBundle = bundleSources(
  [
    '../esm/native/io/project_io_load_helpers.ts',
    '../esm/native/io/project_io_load_helpers_shared.ts',
    '../esm/native/io/project_io_load_helpers_maps.ts',
    '../esm/native/io/project_io_load_helpers_config.ts',
    '../esm/native/io/project_schema.ts',
    '../esm/native/io/project_io_orchestrator.ts',
  ],
  import.meta.url
);

const projectNamedSurfaceBundle = bundleSources(
  [
    '../esm/native/io/project_file_ingress_command.ts',
    '../esm/native/io/project_io_feedback_bridge.ts',
    '../esm/native/io/project_io_load_helpers_config.ts',
    '../esm/native/io/project_io_load_helpers_maps.ts',
    '../esm/native/io/project_io_load_helpers_shared.ts',
    '../esm/native/io/project_io_orchestrator.ts',
    '../esm/native/io/project_io_orchestrator_load_file.ts',
    '../esm/native/io/project_io_orchestrator_project_load.ts',
    '../esm/native/io/project_io_orchestrator_restore.ts',
    '../esm/native/io/project_payload_canonical.ts',
    '../esm/native/ui/project_action_execution.ts',
    '../esm/native/ui/project_action_family_shared.ts',
    '../esm/native/ui/project_action_feedback.ts',
    '../esm/native/ui/project_action_feedback_load_restore.ts',
    '../esm/native/ui/project_action_feedback_save_reset.ts',
    '../esm/native/ui/project_action_feedback_shared.ts',
    '../esm/native/ui/project_load_action_singleflight.ts',
    '../esm/native/ui/project_load_input_shared.ts',
    '../esm/native/ui/project_load_runtime.ts',
    '../esm/native/ui/project_recovery_runtime.ts',
    '../esm/native/ui/project_save_runtime.ts',
    '../esm/native/ui/project_save_runtime_action.ts',
    '../esm/native/ui/project_save_runtime_prompt.ts',
    '../esm/native/ui/project_save_runtime_results.ts',
    '../esm/native/ui/project_session_commands.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_runtime.ts',
    '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const projectSaveLoadBundle = bundleSources(
  [
    '../esm/native/ui/interactions/project_save_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
    '../esm/native/ui/project_action_feedback.ts',
    '../esm/native/ui/project_action_feedback_shared.ts',
    '../esm/native/ui/project_action_feedback_load_restore.ts',
    '../esm/native/ui/project_action_feedback_save_reset.ts',
    '../esm/native/ui/project_action_feedback_shared.ts',
    '../esm/native/ui/project_action_feedback_load_restore.ts',
    '../esm/native/ui/project_action_feedback_save_reset.ts',
    '../esm/native/ui/project_session_commands.ts',
    '../esm/native/ui/project_load_runtime.ts',
    '../esm/native/ui/project_save_runtime.ts',
    '../esm/native/ui/project_save_runtime_contracts.ts',
    '../esm/native/ui/project_save_runtime_prompt.ts',
    '../esm/native/ui/project_save_runtime_results.ts',
    '../esm/native/ui/project_save_runtime_action.ts',
    '../esm/native/ui/project_recovery_runtime.ts',
    '../esm/native/ui/react/project_ui_action_controller_runtime.ts',
    '../esm/native/services/api.ts',
    '../esm/native/runtime/project_io_access.ts',
    '../esm/native/runtime/project_io_access_shared.ts',
    '../esm/native/runtime/project_io_access_load.ts',
    '../esm/native/runtime/project_io_access_restore.ts',
    '../esm/native/runtime/actions_access.ts',
    '../esm/native/ui/browser_file_download.ts',
  ],
  import.meta.url
);

test('project-io access, restore-generation, and callers stay on canonical service seams', () => {
  assertMatchesAll(
    assert,
    projectIoAccessOwner,
    [
      /\.\/project_io_access_shared\.js/,
      /\.\/project_io_access_load\.js/,
      /\.\/project_io_access_restore\.js/,
      /export \{/,
    ],
    'projectIoAccessOwner'
  );
  assertMatchesAll(
    assert,
    projectIoAccess,
    [
      /export function getProjectIoServiceMaybe\(/,
      /export function ensureProjectIoService\(/,
      /export function getProjectIoRuntime\(/,
      /export function ensureProjectIoRuntime\(/,
      /export function nextProjectIoRestoreGeneration\(/,
      /export function getProjectIoRestoreGeneration\(/,
      /export function isProjectIoRestoreGenerationCurrent\(/,
      /export function normalizeProjectIoLoadResult\(/,
      /export function exportProjectViaService\(\s*App: unknown,\s*meta\?: UnknownRecord \| null\s*\): ProjectExportResultLike \| null \| undefined/s,
      /export function exportProjectResultViaService\(/,
      /export function handleProjectFileLoadViaService\(/,
      /export function loadProjectDataViaService\(\s*App: unknown,\s*data: ProjectLoadInputLike,/s,
      /export function restoreProjectSessionViaService\(/,
      /export function buildDefaultProjectDataViaService\(/,
      /getServiceSlotMaybe\(App, 'projectIO'\)/,
      /readAutosavePayloadFromStorageResult\(App\)/,
    ],
    'projectIoAccess'
  );
  assertMatchesAll(
    assert,
    servicesApi,
    [
      /buildDefaultProjectDataViaService/,
      /buildResetDefaultProjectData/,
      /readResetDefaultProjectPayload/,
      /resetProjectToDefaultActionResult/,
      /resetProjectToDefault/,
      /loadProjectDataViaService/,
      /handleProjectFileLoadViaService/,
      /nextProjectIoRestoreGeneration/,
      /isProjectIoRestoreGenerationCurrent/,
    ],
    'servicesApi'
  );

  assertMatchesAll(
    assert,
    projectIoOwner,
    [
      /ensureProjectIoService\(App\)/,
      /export function exportCurrentProject\(App: AppContainer, meta\?: UnknownRecord \| null\): ProjectExportResultLike \| null \| undefined/,
      /export function loadProjectData\(\s*App: AppContainer,\s*data: ProjectLoadInputLike,/s,
    ],
    'projectIoOwner'
  );

  assertMatchesAll(
    assert,
    projectIoBundle,
    [
      /nextProjectIoRestoreGeneration\(App\)/,
      /isProjectIoRestoreGenerationCurrent\(App,\s*[A-Za-z_$][\w$]*\)/,
      /setProjectIoRestoring\(\s*true,\s*(?:[A-Za-z_$][\w$]*\([^)]*\)|[A-Za-z_$][\w$]*)\s*\)/,
      /setProjectIoRestoring\(\s*false,\s*(?:[A-Za-z_$][\w$]*\([^)]*\)|[A-Za-z_$][\w$]*)\s*\)/,
      /handleProjectFileLoadViaService\(app, evt\)/,
      /restoreProjectSessionWithConfirm\(app\)/,
      /resetProjectToDefaultWithConfirm\(app\)/,
      /buildResetDefaultProjectData\(/,
      /project_session_commands_restore\.js|project_session_commands_reset\.js/,
      /createProjectUiActionController\(/,
      /projectUiController\.saveProject\(\);/,
      /await projectUiController\.handleLoadInputChange\(e\);/,
      /void projectUiController\.restoreLastSession\(\);/,
      /void projectUiController\.resetToDefault\(\);/,
      /reportProjectLoadResult\(fb, result\)|reportProjectLoadResult\(\{ toast \}, result\)|reportProjectLoadResult\(\{ toast: toast \}, result\)|runProjectLoadAction\(|runProjectLoadActionResult\(/,
      /reportProjectRestoreResult\(fb, result\)|runProjectRestoreAction\(/,
      /reportProjectSaveResult\(fb, result\)|reportProjectSaveResult\(\{ toast \}, result\)|reportProjectSaveResult\(\{ toast: toast \}, result\)/,
      /exportProjectResultViaService\(\s*App,\s*\{\s*source:\s*'ui:saveProject'\s*\}/,
      /handleProjectSaveLoadInputChange\(App, toast, evt\)|runProjectLoadAction\(App, \{ toast \}, asProjectFileLoadEvent\(evt\) \?\? evt/,
      /handleProjectFileLoadViaService\(App, file\)|runProjectLoadAction\(App, \{ toast \}, file/,
      /exportProjectResultViaService\(App, \{ source: 'smoke' \}/,
    ],
    'projectIoBundle'
  );
  assertLacksAll(
    assert,
    projectIoBundle,
    [/setRuntimeScalar\(App(?: as any)?, 'restoring',/, /ensureProjectIoRuntime\(App\)/, /pioRt\.restoreGen/],
    'projectIoBundle'
  );
  assertLacksAll(assert, projectIoCallerBundle, [/services\.projectIO/], 'projectIoCallerBundle');
});

test('project load/save helpers preserve semantic load flags, UI ephemera, and browser download seams', () => {
  assertMatchesAll(
    assert,
    projectLoadBundle,
    [
      /export function captureProjectPrevUiMode\(/,
      /export function captureProjectLoadSourceFlags\(/,
      /export function preserveUiEphemeral\(/,
      /preserveIfMissing\('activeTab'\)/,
      /preserveIfMissing\('selectedModelId'\)/,
      /preserveIfMissing\('site2TabsGateOpen'\)/,
      /preserveIfMissing\('site2TabsGateUntil'\)/,
      /preserveIfMissing\('site2TabsGateBy'\)/,
      /export function buildProjectPdfUiPatch\(/,
      /export function normalizeProjectData\(/,
      /prevCornerSide: sideVal === 'left' \? 'left' : 'right'/,
      /isHistoryApply: source\.indexOf\('history\.'/,
      /const hasDraft = typeof rec\.orderPdfEditorDraft !== 'undefined';/,
      /orderPdfEditorDraft:/,
      /cloneProjectJson\(rec\.orderPdfEditorDraft\)/,
      /orderPdfEditorZoom: Number\.isFinite\(zoom\) && zoom > 0 \? zoom : 1/,
    ],
    'projectLoadBundle'
  );

  assertMatchesAll(
    assert,
    projectSaveLoadBundle,
    [
      /export function ensureSaveProjectAction\(/,
      /actions\.setSaveProjectAction\(App, saveProject\)|setSaveProjectAction\(App, saveProject\)|return function saveProject\(/,
      /ensureProjectSaveLoadAction\(App, deps, actions\)|ensureSaveProjectAction\(\) \{/,
      /saveProjectResultViaActions, saveProjectViaActions|performProjectSaveLoadSave\(App, toast, actions\)/,
      /exportProjectResultViaService\(\s*App,\s*\{ source: 'ui:saveProject' \}/,
      /handleProjectSaveLoadInputChange\(App, toast, evt\)|runProjectLoadAction\(App, \{ toast \}, asProjectFileLoadEvent\(evt\) \?\? evt/,
      /normalizeProjectIoLoadResult\(/,
      /createProjectUiActionController\(/,
      /handleProjectSaveLoadInputChange\(App, toast, evt\)|openProjectSaveLoadInput\(input\)|runProjectUiLoadInputChange\(args, evt\)/,
      /reportProjectSaveResult\(\{ toast \}, result\)|reportProjectSaveResult\(fb, result\)/,
      /setDirtyViaActions\(App, false, meta\)/,
      /normalizeDownloadFilename\(|createProjectSavePromptFallback\(/,
      /downloadJsonTextViaBrowser\(/,
    ],
    'projectSaveLoadBundle'
  );
  assertLacksAll(
    assert,
    projectSaveLoadBundle,
    [/stateKernel\./, /services\.projectIO\./, /localStorage\./],
    'projectSaveLoadBundle'
  );

  assertMatchesAll(
    assert,
    stackRouter,
    [
      /type ModuleConfigPatchFn = \(draft: ModuleConfigLike, base: ModuleConfigLike\) => unknown;/,
      /type ModulePatchLike = ModuleConfigPatchLike \| ModuleConfigPatchFn;/,
      /type PatchAtFn = \(idx: number, patch: ModulePatchLike, meta: ActionMetaLike\) => unknown;/,
      /function asModulePatchLike\(value: unknown\): ModulePatchLike \{/,
      /function asCornerPatchLike\(value: unknown\): CornerPatchLike \{/,
    ],
    'stackRouter'
  );
});

test('project io + project action helper seams stay named-only after delete-pass cleanup', () => {
  assertLacksAll(assert, projectNamedSurfaceBundle, [/export default\s*\{/], 'project named surfaces');
  assertMatchesAll(
    assert,
    projectNamedSurfaceBundle,
    [
      /export function createProjectIoOrchestrator\(/,
      /export function buildProjectActionErrorResult\(/,
      /export function reportProjectLoadResult\(/,
      /export function createProjectFileLoadHandler\(/,
      /export function createProjectSaveLoadInteractionController\(/,
    ],
    'project named surfaces'
  );
});
