import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const exportBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/ExportTab.tsx',
    '../esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx',
    '../esm/native/ui/react/pdf/order_pdf_overlay_component_state.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_component_runtime.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_controller.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_constants.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_attachment.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_interactions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_interactions_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_stage_interactions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_file_interactions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_load.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_canvas.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_toolbar.tsx',
    '../esm/native/ui/react/pdf/order_pdf_overlay_layout.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_rich_editors.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_editor_surface.tsx',
  ],
  import.meta.url,
  { stripNoise: true }
);
const projectBundle = bundleSources(
  [
    '../esm/native/ui/react/panels/ProjectPanel.tsx',
    '../esm/native/ui/interactions/project_save_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
    '../esm/native/ui/interactions/project_save_load_controller_save.ts',
    '../esm/native/ui/project_save_runtime.ts',
    '../esm/native/ui/project_save_runtime_contracts.ts',
    '../esm/native/ui/project_save_runtime_prompt.ts',
    '../esm/native/ui/project_save_runtime_results.ts',
    '../esm/native/ui/project_save_runtime_action.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const designBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/DesignTab.view.tsx',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel.tsx',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel_state.ts',
    '../esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  ],
  import.meta.url,
  { stripNoise: true }
);
const renderBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/RenderTab.view.tsx',
    '../esm/native/ui/react/tabs/use_render_tab_controller.ts',
    '../esm/native/ui/react/tabs/use_render_tab_controller_contracts.ts',
    '../esm/native/ui/react/tabs/use_render_tab_controller_state.ts',
    '../esm/native/ui/react/tabs/use_render_tab_controller_sections.ts',
    '../esm/native/ui/react/tabs/render_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/render_tab_display_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_render_tab_room_design.ts',
    '../esm/native/ui/react/tabs/render_tab_room_design_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_render_tab_lighting.ts',
    '../esm/native/ui/react/tabs/render_tab_lighting_controller_runtime.ts',
    '../esm/native/ui/react/tabs/render_tab_shared.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_contracts.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_normalize.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_lighting.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_room.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_room_fallbacks.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_interactions.ts',
    '../esm/native/ui/react/tabs/render_tab_sections.tsx',
    '../esm/native/ui/react/tabs/render_tab_sections_room.tsx',
    '../esm/native/ui/react/tabs/render_tab_sections_lighting.tsx',
    '../esm/native/ui/react/tabs/render_tab_sections_controls.tsx',
  ],
  import.meta.url,
  { stripNoise: true }
);
const structureBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/StructureTab.view.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_controllers.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_runtime.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_contracts.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts',
    '../esm/native/ui/react/tabs/structure_tab_structural_controller_writes.ts',
    '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
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
  ],
  import.meta.url,
  { stripNoise: true }
);
const interiorBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/InteriorTab.view.tsx',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_manual.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_drawers.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_handles.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_trim.ts',
    '../esm/native/ui/react/tabs/interior_tab_helpers.tsx',
  ],
  import.meta.url,
  { stripNoise: true }
);
const sidebarApp = bundleSources(
  [
    '../esm/native/ui/react/sidebar_app.tsx',
    '../esm/native/ui/react/sidebar_header.tsx',
    '../esm/native/ui/react/sidebar_header_actions.ts',
    '../esm/native/ui/react/use_sidebar_view_state.ts',
    '../esm/native/ui/react/sidebar_shared.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const hooksSrc = readSource('../esm/native/ui/react/hooks.tsx', import.meta.url);

test('React bridge family stays on App context plus canonical action/controller seams', () => {
  for (const [name, bundle] of [
    ['exportBundle', exportBundle],
    ['projectBundle', projectBundle],
    ['designBundle', designBundle],
    ['renderBundle', renderBundle],
    ['structureBundle', structureBundle],
    ['interiorBundle', interiorBundle],
  ]) {
    assertLacksAll(assert, bundle, [/\bbridge\./], name);
  }
  assert.doesNotMatch(sidebarApp, /\bbridge\./);

  assertMatchesAll(
    assert,
    exportBundle,
    [/\buseExportActions\b/, /setUiOrderPdfEditorOpen\(/],
    'exportBundle'
  );
  assertMatchesAll(
    assert,
    projectBundle,
    [
      /ensureSaveProjectAction\(/,
      /createProjectSaveLoadInteractionController\(/,
      /saveProject(Result)?ViaActions\(|exportProject(Result)?ViaService\(/,
    ],
    'projectBundle'
  );
  assertMatchesAll(
    assert,
    designBundle,
    [
      /\bcreateDesignTabMulticolorController\(/,
      /multicolorController\.toggleEnabled\(/,
      /createDesignTabMulticolorViewState\(/,
      /\bMultiColorPanelView\b/,
      /\bMultiColorPanel\b/,
    ],
    'designBundle'
  );
  assertMatchesAll(
    assert,
    renderBundle,
    [
      /createRenderTabDisplayController\(/,
      /createRenderTabRoomDesignController\(/,
      /createRenderTabLightingController\(/,
      /syncGlobalClickState\(/,
      /syncGlobalClickMode(Fn)?\(/,
      /closeInteractiveStateOnGlobalOff(Fn)?\(/,
      /RenderRoomSection/,
      /RenderLightingSection/,
      /ActionTile/,
      /handleSyntheticButtonKeyDown/,
    ],
    'renderBundle'
  );
  assertMatchesAll(
    assert,
    structureBundle,
    [
      /\bTypeSelector\b/,
      /SavedModelsPanel/,
      /createStructureTabLibraryEnv\(/,
      /\bsetRoomOpen\(/,
      /\bsetManualWidth\(/,
    ],
    'structureBundle'
  );
  assertMatchesAll(
    assert,
    interiorBundle,
    [
      /\benterLayoutMode\(/,
      /\bhandlesSetGlobalHandleType\b/,
      /\btoggleBraceShelvesMode\(/,
      /\binteriorSetGridDivisions\(/,
    ],
    'interiorBundle'
  );
  assert.match(sidebarApp, /\bsaveProject\(/);
  assert.match(sidebarApp, /\btoggleSketchMode\(/);
});

test('React App context surface stays minimal across the family', () => {
  assert.match(hooksSrc, /\bconst\s+AppCtx\s*=\s*createContext<.*AppContainer.*\|\s*null>\(null\);/);
  assert.match(hooksSrc, /\bexport\s+function\s+AppProvider\(/);
  assertLacksAll(
    assert,
    hooksSrc,
    [
      /\bbridge\b/i,
      /\bactions\s*:\s*\{/,
      /\bproject\s*:\s*\{/,
      /\broom\s*:\s*\{/,
      /\bsketch\s*:\s*\{/,
      /\bmulticolor\s*:\s*\{/,
      /\btools\s*:\s*\{/,
      /\bbuilder\s*:\s*\{/,
      /\bbrowser\s*:\s*\{/,
      /\bflags\s*:\s*\{/,
      /\binteractive\s*:\s*\{/,
      /\binterior\s*:\s*\{/,
      /\bhandles\s*:\s*\{/,
    ],
    'hooksSrc'
  );
});
