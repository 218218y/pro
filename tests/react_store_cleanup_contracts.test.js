import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirstExisting } from './_read_src.js';

const storeUiActionFiles = [
  '../esm/native/ui/react/actions/store_actions_ui.ts',
  '../esm/native/ui/react/actions/store_actions_ui_writes.ts',
  '../esm/native/ui/react/actions/store_actions_ui_project.ts',
  '../esm/native/ui/react/actions/store_actions_ui_structure.ts',
  '../esm/native/ui/react/actions/store_actions_ui_render.ts',
];

const storeConfigActionFiles = [
  '../esm/native/ui/react/actions/store_actions_config.ts',
  '../esm/native/ui/react/actions/store_actions_config_contracts.ts',
  '../esm/native/ui/react/actions/store_actions_config_project.ts',
  '../esm/native/ui/react/actions/store_actions_config_maps.ts',
  '../esm/native/ui/react/actions/store_actions_config_modes.ts',
];
const reactHooks = readFirstExisting(['../esm/native/ui/react/hooks.tsx'], import.meta.url);
const storeActions = [
  readFirstExisting(['../esm/native/ui/react/actions/store_actions.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/actions/store_actions_state.ts'], import.meta.url),
  ...storeConfigActionFiles.map(rel => readFirstExisting([rel], import.meta.url)),
  storeUiActionFiles.map(rel => readFirstExisting([rel], import.meta.url)).join('\n'),
].join('\n');
const structureTab = [
  readFirstExisting(['../esm/native/ui/react/tabs/StructureTab.view.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_view_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_library_helpers.ts'], import.meta.url),
].join('\n');
const projectSaveLoad = [
  readFirstExisting(['../esm/native/ui/interactions/project_save_load.ts'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/interactions/project_save_load_controller_runtime.ts'],
    import.meta.url
  ),
  readFirstExisting(['../esm/native/ui/project_save_runtime.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/project_save_runtime_contracts.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/project_save_runtime_prompt.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/project_save_runtime_results.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/project_save_runtime_action.ts'], import.meta.url),
].join('\n');
const designTab = readFirstExisting(['../esm/native/ui/react/tabs/DesignTab.view.tsx'], import.meta.url);
const designController = [
  readFirstExisting(['../esm/native/ui/react/tabs/use_design_tab_controller.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_design_tab_controller_state.ts'], import.meta.url),
].join('\n');
const designColorManager = readFirstExisting(
  ['../esm/native/ui/react/tabs/use_design_tab_color_manager.ts'],
  import.meta.url
);
const designCustomColorWorkflow = readFirstExisting(
  ['../esm/native/ui/react/tabs/use_design_tab_custom_color_workflow.ts'],
  import.meta.url
);
const designCustomColorWorkflowRuntime = readFirstExisting(
  ['../esm/native/ui/react/tabs/design_tab_custom_color_workflow_controller_runtime.ts'],
  import.meta.url
);
const designColorCommandFlows = readFirstExisting(
  ['../esm/native/ui/react/tabs/design_tab_color_command_flows.ts'],
  import.meta.url
);
const designColorBundle = [
  designColorManager,
  designCustomColorWorkflow,
  designCustomColorWorkflowRuntime,
  designColorCommandFlows,
].join('\n');
const orderPdfOverlay = [
  readFirstExisting(['../esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_component_runtime.ts'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_component_runtime_apis.ts'],
    import.meta.url
  ),
].join('\n');
const orderPdfRuntime = readFirstExisting(
  ['../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts'],
  import.meta.url
);
const bundleTool = readFirstExisting(['../tools/wp_bundle.js'], import.meta.url);
const workerShim = readFirstExisting(['../types/pdfjs_worker_url_shim.d.ts'], import.meta.url);
const canvasPicking = readFirstExisting(['../esm/native/services/canvas_picking_core.ts'], import.meta.url);

test('[react-cleanup] React config writers and dirty-reset flows stay on canonical actions surfaces', () => {
  assert.match(reactHooks, /\bexport\s+function\s+AppProvider\(/);
  assert.doesNotMatch(storeActions, /services\/runtime\/cfg_access\.js/);
  assert.doesNotMatch(storeActions, /applyConfigPatch\(/);
  assert.doesNotMatch(storeActions, /config\.patch\b/);
  assert.ok(
    /actions\.config/.test(storeActions) || /getConfigActions\(/.test(storeActions),
    'Expected React store/config writers to stay on the canonical config-actions surface.'
  );
  assert.match(designColorBundle, /setCfgCustomUploadedDataURL\(/);
  assert.ok(
    /setCfgModulesConfiguration\(/.test(structureTab) || /commitModulesConfiguration/.test(structureTab)
  );

  assert.match(projectSaveLoad, /services\/api\.js/);
  assert.match(projectSaveLoad, /setDirtyViaActions\(App, false, meta\)/);
  assert.doesNotMatch(projectSaveLoad, /stateKernel\.setDirty\(false, meta\)/);
  assert.doesNotMatch(projectSaveLoad, /actions\.setCfgScalar\('dirty', false, meta\)/);
  assert.doesNotMatch(
    storeActions,
    /stateKernel\s*&&\s*App\.actions\s*&&\s*typeof App\.actions\.(setCfgScalar|applyConfig)/
  );
  assert.doesNotMatch(
    canvasPicking,
    /stateKernel\s*&&\s*App\.actions\s*&&\s*typeof App\.actions\.applyConfig/
  );
});

test('[react-cleanup] DesignTab mode selection stays slice-scoped and never regresses to broad root reads', () => {
  const usesPrimitiveSelector =
    /const primaryMode = useModeSelector\(mode => \{/.test(designController) ||
    /const primaryMode = useModeSelector\(mode => String\(mode\.primary \|\| 'none'\)\);/.test(
      designController
    );
  const usesGroupedShallowSelector =
    /const \{ primaryMode, splitVariant \} =\s*useModeSelectorShallow\(mode => /.test(designController) ||
    /const modeState = useModeSelectorShallow\(mode => /.test(designController);

  assert.ok(
    usesPrimitiveSelector || usesGroupedShallowSelector,
    'Expected DesignTab to read primaryMode from the mode slice via either a primitive selector or a grouped shallow selector.'
  );
  assert.match(designTab, /useDesignTabController\(/);
  assert.doesNotMatch(designController, /const primaryMode = useStoreSelector\(st => \{/);
  assert.doesNotMatch(designController, /const mode = useModeSelector\(/);
  assert.doesNotMatch(designController, /const mode = useModeSelectorShallow\(/);
});

test('[react-cleanup] PDF overlay keeps the new runtime worker path and no longer depends on copied silent workers', () => {
  assert.match(orderPdfRuntime, /Create a small module worker that silences chatty logs/);
  assert.match(orderPdfOverlay, /order_pdf_overlay_pdf_render\.js/);
  assert.match(orderPdfOverlay, /order_pdf_overlay_runtime\.js/);
  assert.doesNotMatch(bundleTool, /pdf_worker_silent\.mjs/);
  assert.doesNotMatch(workerShim, /pdf_worker_silent\.mjs\?url/);
});
