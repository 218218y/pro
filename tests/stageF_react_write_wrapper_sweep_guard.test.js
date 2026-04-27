import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

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
const storeActions = bundleSources(
  ['../esm/native/ui/react/actions/store_actions.ts', ...storeConfigActionFiles, ...storeUiActionFiles],
  import.meta.url
);
const structureBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/StructureTab.view.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_controllers.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_effects.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_render.tsx',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_writes.ts',
    '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dim_field.tsx',
    '../esm/native/ui/react/tabs/structure_tab_optional_dim_field.tsx',
    '../esm/native/ui/react/tabs/structure_tab_dimension_field_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_dimension_field_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_panel.tsx',
    '../esm/native/ui/react/tabs/structure_tab_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_library_helpers.ts',
    '../esm/native/ui/react/tabs/structure_tab_core.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_models.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_numbers.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_recompute.ts',
    '../esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_mutations.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_mutations_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts',
    '../esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_actions.ts',
    '../esm/native/ui/react/tabs/structure_tab_actions_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_actions_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_hinge_actions_controller.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_corner.ts',
    '../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_chest.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_commands.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_commands_contracts.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_commands_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_commands_controller.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_controller.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_saved_models_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_view.tsx',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_view_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_view_sections.tsx',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_list.tsx',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_list_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_library.ts',
    '../esm/native/ui/react/tabs/structure_tab_workflows_controller_cell_dims.ts',
  ],
  import.meta.url
);
const handlesActions = readSource('../esm/native/ui/react/actions/handles_actions.ts', import.meta.url);
const sketchActions = readSource('../esm/native/ui/react/actions/sketch_actions.ts', import.meta.url);
const projectPanel = readSource('../esm/native/ui/react/panels/ProjectPanel.tsx', import.meta.url);
const exportTab = readSource('../esm/native/ui/react/tabs/ExportTab.tsx', import.meta.url);
const sidebarApp = bundleSources(
  [
    '../esm/native/ui/react/sidebar_app.tsx',
    '../esm/native/ui/react/sidebar_header.tsx',
    '../esm/native/ui/react/sidebar_header_actions.ts',
    '../esm/native/ui/react/use_sidebar_view_state.ts',
    '../esm/native/ui/react/sidebar_shared.ts',
  ],
  import.meta.url
);
const pdfBundle = bundleSources(
  [
    '../esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx',
    '../esm/native/ui/react/pdf/order_pdf_overlay_component_state.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_attachment.ts',
  ],
  import.meta.url
);
const renderTab = readSource('../esm/native/ui/react/tabs/RenderTab.view.tsx', import.meta.url);

test('[stageF] React write hotspots use canonical wrapper sweep for common ui/config writes', () => {
  assertMatchesAll(
    assert,
    storeActions,
    [
      /function setCfgBoardMaterial\(/,
      /function setCfgGlobalHandleType\(/,
      /function applyUiRawScalarPatch\(/,
      /function applyUiSoftScalarPatch\(/,
      /function setUiSelectedModelId\(/,
      /function setUiProjectName\(/,
      /function setUiOrderPdfEditorOpen\(/,
      /function setUiOrderPdfEditorDraft\(/,
      /function setUiOrderPdfEditorZoom\(/,
      /function setUiSketchModeMirror\(/,
      /function setUiChestMode\(/,
      /function setUiCornerSide\(/,
      /function setUiCellDimsWidth\(/,
      /function setUiStackSplitLowerDoorsManual\(/,
    ],
    'storeActions'
  );

  assertMatchesAll(
    assert,
    structureBundle,
    [
      /applyImmediateStructuralConfigMutation\(app, 'react:boardMaterial', \{ boardMaterial: option\.id \},/,
      /setCfgBoardMaterial\(app, option\.id, \{ source: 'react:boardMaterial', immediate: true, noBuild: true,? \}\)/,
      /setUiSelectedModelId\(app, nextSelectedId, meta\.uiOnlyImmediate\('react:models:selection:clear'\)\)/,
      /applyUiRawScalarPatch\(app, (?:rawPatch|readRawPatch\(uiPatch\)), m\)/,
      /applyUiSoftScalarPatch\((?:args\.)?app, softPatch, actionMeta\)/,
      /createStructureTabWorkflowController\(\{/,
      /createStructureWorkflowOps\(/,
      /createStructureTabWorkflowCellDimsApi\(/,
      /clearCellDim: key => \{/,
      /setUiCellDimsWidth\(app, null, actionMeta\)/,
      /setUiStackSplitLowerDoorsManual\(app, true, m\)/,
      /setUiChestMode\((?:args\.)?app,\s*true,\s*metaOn\)/,
      /const actionMeta:\s*ActionMetaLike\s*=\s*\{\s*source:\s*'react:structure:cornerSide',\s*immediate:\s*true(?:,\s*noBuild:\s*true,?)?\s*\}/,
      /setUiCornerSide\((?:args\.)?app,\s*next,\s*actionMeta\)/,
    ],
    'structureBundle'
  );
  assertLacksAll(
    assert,
    structureBundle,
    [
      /setUiScalarSoft\(app, ''selectedModelId''/,
      /setUiRawScalar\(\s*app,\s*''cellDimsWidth''/,
      /setUiScalarSoft\(app, ''cornerSide''/,
      /setUiRawScalar\(app, ''stackSplitLowerDoorsManual''/,
    ],
    'structureBundle'
  );

  assert.match(handlesActions, /setCfgGlobalHandleType\(app, type,/);
  assert.doesNotMatch(handlesActions, /actions\.setCfgScalar\('globalHandleType'/);

  assert.match(
    sketchActions,
    /setUiSketchModeMirror\(app,\s*!!next,\s*(?:uiMeta|getUiOnlyImmediateMeta\(app, 'react:sketch:syncUi'\))\)/
  );
  assert.doesNotMatch(sketchActions, /setUiScalarSoft\(app, 'sketchMode'/);

  assert.match(projectPanel, /setUiProjectName\(app, next, m\)/);
  assert.doesNotMatch(projectPanel, /setUiScalarSoft\(app, 'projectName'/);

  assert.match(exportTab, /setUiOrderPdfEditorOpen\(app, true, exportMeta\)/);
  assert.match(
    sidebarApp,
    /setUiOrderPdfEditorOpen\(app, true, meta\.uiOnly\(undefined, 'react:header:pdf'\)\)/
  );
  assertMatchesAll(
    assert,
    pdfBundle,
    [
      /setUiOrderPdfEditorDraft\(app, next, pdfUiOnlyMeta\(meta\)\)/,
      /setUiOrderPdfEditorZoom\(app, 1, pdfUiOnlyMeta\(meta\)\)/,
    ],
    'pdfBundle'
  );
  assertLacksAll(
    assert,
    pdfBundle,
    [/setUiScalarSoft\(app, ''orderPdfEditor\(Open\|Draft\|Zoom\)''/],
    'pdfBundle'
  );

  assert.doesNotMatch(renderTab, /function setCfgScalar\(app: AppContainer/);
});
