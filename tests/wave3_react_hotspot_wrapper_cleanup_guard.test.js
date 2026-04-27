import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const storeActions = [
  read('esm/native/ui/react/actions/store_actions.ts'),
  read('esm/native/ui/react/actions/store_actions_state.ts'),
  ...storeConfigActionFiles.map(rel => read(rel.replace(/^\.\.\//, ''))),
  ...storeUiActionFiles.map(rel => read(rel.replace(/^\.\.\//, ''))),
  read('esm/native/ui/react/actions/store_actions_runtime.ts'),
].join('\n');
const designTab = read('esm/native/ui/react/tabs/DesignTab.view.tsx');
const designController = [
  read('esm/native/ui/react/tabs/use_design_tab_controller.ts'),
  read('esm/native/ui/react/tabs/use_design_tab_controller_state.ts'),
  read('esm/native/ui/react/tabs/use_design_tab_controller_sections.ts'),
].join('\n');
const designColorManager = [
  read('esm/native/ui/react/tabs/design_tab_color_command_flows.ts'),
  read('esm/native/ui/react/tabs/design_tab_color_command_flows_saved.ts'),
  read('esm/native/ui/react/tabs/design_tab_color_command_flows_custom.ts'),
  read('esm/native/ui/react/tabs/design_tab_color_command_flows_texture.ts'),
  read('esm/native/ui/react/tabs/design_tab_saved_colors_atomic_runtime.ts'),
  read('esm/native/ui/react/tabs/use_design_tab_color_manager.ts'),
  read('esm/native/ui/react/tabs/use_design_tab_custom_color_workflow.ts'),
  read('esm/native/ui/react/tabs/use_design_tab_saved_swatches.ts'),
].join('\n');
const structureTab = [
  read('esm/native/ui/react/tabs/StructureTab.view.tsx'),
  readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_view_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_library_helpers.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_controls.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_shared.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_saved_models_panel.tsx'], import.meta.url),
].join('\n');
const pdfOverlay = [
  read('esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx'),
  read('esm/native/ui/react/pdf/order_pdf_overlay_component_state.ts'),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_text.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_export_ops.ts'], import.meta.url),
].join('\n');

test('[wave3] React hotspots route history/colors writes through centralized wrappers', () => {
  assert.match(storeActions, /function setCfgSavedColors\(/);
  assert.match(storeActions, /function setCfgColorSwatchesOrder\(/);
  assert.match(storeActions, /function runHistoryBatch\(/);
  assert.match(storeActions, /const colorsNs = getColorsNamespace\(app\)/);
  assert.match(storeActions, /const historyNs = getHistoryNamespace\(app\)/);

  assert.match(designTab, /useDesignTabController\(/);
  assert.match(designColorManager, /function applySavedColorsAtomicMutation\(/);
  assert.match(designColorManager, /runHistoryBatch\(\s*app,\s*\(\) => \{/);
  assert.match(designColorManager, /setCfgSavedColors\(app,\s*(?:savedColors|next),\s*meta\)/);
  assert.match(
    designColorManager,
    /setCfgColorSwatchesOrder\(app,\s*(?:colorSwatchesOrder|nextOrder|nextIds),\s*meta\)/
  );
  assert.match(designColorManager, /setCfgSavedColors\(app,\s*next,\s*\{\s*source\s*\}\)/);
  assert.doesNotMatch(designController + designColorManager, /useActions\(/);
  assert.doesNotMatch(designController + designColorManager, /actions\.colors|actions\.history/);
  assert.doesNotMatch(designController + designColorManager, /colorsNs\.|historyNs\./);

  assert.match(structureTab, /runHistoryBatch\(app, fn, m\)/);
  assert.doesNotMatch(structureTab, /useActions\(/);
  assert.doesNotMatch(structureTab, /actions\.history|const history = \(actions\.history/);
  assert.doesNotMatch(structureTab, /function historyBatch\(/);

  assert.match(pdfOverlay, /runHistoryBatch\(app, \(\) => \{/);
  assert.doesNotMatch(pdfOverlay, /useActions\(/);
  assert.doesNotMatch(pdfOverlay, /const history = \(actions\.history/);
  assert.doesNotMatch(pdfOverlay, /function historyBatch\(/);
});
