import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll } from './_source_bundle.js';

const interiorBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/InteriorTab.view.tsx',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state.ts',
    '../esm/native/ui/react/tabs/interior_tab_local_state_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_local_state_runtime.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_manual.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_drawers.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_handles.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_trim.ts',
    '../esm/native/ui/react/tabs/interior_tab_helpers.tsx',
    '../esm/native/ui/react/tabs/interior_tab_helpers_core.ts',
    '../esm/native/ui/react/tabs/interior_tab_helpers_buttons.tsx',
    '../esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts',
    '../esm/native/ui/react/tabs/interior_tab_helpers_types.ts',
    '../esm/native/ui/react/tabs/interior_tab_sections.tsx',
    '../esm/native/ui/react/tabs/interior_layout_manual_controls.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_controls.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_sections.tsx',
    '../esm/native/ui/react/tabs/interior_layout_door_trim_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_types.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_sync.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_dimensions.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_panels.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_base.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_cornice.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_state.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_options.ts',
    '../esm/native/ui/react/tabs/interior_layout_sketch_drawers_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_section_types.ts',
    '../esm/native/ui/react/tabs/interior_tab_sections_shared.ts',
  ],
  import.meta.url
);
const pickingBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_hover_flow.ts',
    '../esm/native/services/canvas_picking_local_helpers.ts',
    '../esm/native/services/canvas_picking_projection_runtime.ts',
    '../esm/native/services/canvas_picking_projection_runtime_shared.ts',
    '../esm/native/services/canvas_picking_projection_runtime_box.ts',
    '../esm/native/services/canvas_picking_projection_runtime_plane.ts',
    '../esm/native/services/canvas_picking_sketch_box_runtime.ts',
    '../esm/native/services/canvas_picking_sketch_box_runtime_shared.ts',
    '../esm/native/services/canvas_picking_sketch_box_runtime_spec.ts',
    '../esm/native/services/canvas_picking_sketch_box_runtime_geometry.ts',
    '../esm/native/services/canvas_picking_sketch_box_runtime_hit.ts',
    '../esm/native/services/canvas_picking_sketch_box_runtime_commit.ts',
    '../esm/native/services/canvas_picking_sketch_free_boxes.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_workflow.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_shared.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_geometry.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_geometry_vertical.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_placement.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_hover.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_hover_context.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_hover_scan.ts',
    '../esm/native/services/canvas_picking_sketch_free_box_hover_finalize.ts',
    '../esm/native/services/canvas_picking_sketch_box_dividers.ts',
    '../esm/native/services/canvas_picking_sketch_box_dividers_shared.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_tools.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_tools.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_free_flow.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_free_box.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_flow.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_config.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_flow.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_divider_flow.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_shared.ts',
    '../esm/native/services/canvas_picking_click_manual_sketch_free_flow.ts',
    '../esm/native/services/canvas_picking_click_manual_sketch_free_box.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_click_mode_flow.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_shared.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_contracts.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_records.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_adornments.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_target.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_content.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_divider.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
    '../esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts',
    '../esm/native/services/canvas_picking_sketch_free_commit.ts',
    '../esm/native/services/canvas_picking_sketch_module_surface_commit.ts',
    '../esm/native/services/canvas_picking_sketch_module_surface_commit_flow.ts',
    '../esm/native/services/canvas_picking_sketch_module_surface_commit_box.ts',
    '../esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
  ],
  import.meta.url
);
const sketchRender = bundleSources(
  [
    '../esm/native/builder/render_interior_sketch_ops.ts',
    '../esm/native/builder/render_interior_sketch_boxes.ts',
    '../esm/native/builder/render_interior_sketch_boxes_shell.ts',
    '../esm/native/builder/render_interior_sketch_boxes_shell_apply.ts',
    '../esm/native/builder/render_interior_sketch_boxes_shell_frame.ts',
    '../esm/native/builder/render_interior_sketch_boxes_contents.ts',
    '../esm/native/builder/render_interior_sketch_boxes_contents_parts.ts',
    '../esm/native/builder/render_interior_sketch_boxes_contents_parts_dividers.ts',
    '../esm/native/builder/render_interior_sketch_boxes_contents_drawers.ts',
    '../esm/native/builder/render_interior_sketch_boxes_fronts.ts',
  ],
  import.meta.url
);
const previewRender = bundleSources(
  [
    '../esm/native/builder/render_preview_ops.ts',
    '../esm/native/builder/render_preview_sketch_ops.ts',
    '../esm/native/builder/render_preview_sketch_ops_factory.ts',
    '../esm/native/builder/render_preview_sketch_ops_context.ts',
    '../esm/native/builder/render_preview_sketch_ops_state.ts',
    '../esm/native/builder/render_preview_sketch_ops_materials.ts',
    '../esm/native/builder/render_preview_sketch_ops_meshes.ts',
    '../esm/native/builder/render_preview_sketch_ops_apply.ts',
    '../esm/native/builder/render_preview_sketch_shared.ts',
    '../esm/native/builder/render_preview_sketch_pipeline.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_shared.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_box_content.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_linear.ts',
  ],
  import.meta.url
);

test('[sketch-box] UI bundle preserves optional width/depth overrides and tool serialization invariants', () => {
  assertMatchesAll(
    assert,
    interiorBundle,
    [
      /export type SketchBoxToolSpec = \{/,
      /export function parseSketchBoxTool\(tool: string\): SketchBoxToolSpec \| null/,
      /export function mkSketchBoxTool\(heightCm: number, widthCm: number \| null, depthCm: number \| null\): string/,
      /export const SKETCH_BOX_HEIGHT_MAX_CM = 300;/,
      /export function createInteriorTabLocalStateDefaults\(\)/,
      /sketchBoxWidthDraft: ''/,
      /sketchBoxDepthDraft: ''/,
      /useInteriorTabLocalState\(/,
      /syncSketchBoxTool\(/,
      /props\.enterSketchBoxTool\(heightCm, widthCm, depthCm\)/,
    ],
    'interior bundle'
  );
});

test('[sketch-box] picking bundle preserves width/depth overrides, rear-panel preview, and free-placement reuse invariants', () => {
  assertMatchesAll(
    assert,
    pickingBundle,
    [
      /export function __wp_parseSketchBoxToolSpec\(tool: string\): __wpSketchBoxToolSpec \| null/,
      /export function __wp_resolveSketchBoxGeometry\(args: \{/,
      /widthM: args\.widthOverrideM,/,
      /depthM: args\.depthOverrideM,/,
      /widthM: boxTool\.boxWM,/,
      /depthM: boxTool\.boxDM,/,
      /snapToCenter:\s*hoverPlacement\.snapToCenter,/,
      /fillBack: true,/,
      /freePlacement: true,/,
      /absX: centerX,/,
      /absY: centerY,/,
      /if \(tool === 'sketch_box_divider'\) return 'divider';/,
      /kind: 'box_content',/,
      /contentKind: 'divider',/,
      /if \(__wp_tryCommitSketchFreePlacementFromHover\(App, manualTool\)\)\s*return(?: true)?;/,
      /export function clampSketchFreeBoxCenterY\(args: \{/,
      /const hoverPlacement = __wp_resolveSketchFreeBoxHoverPlacement\(/,
    ],
    'picking bundle'
  );
});

test('[sketch-box] builder previews keep 3D sketch content + box preview support', () => {
  assertMatchesAll(
    assert,
    sketchRender,
    [/sketch_box_free_/, /dividerXNorm/, /freePlacement === true/],
    'sketch render'
  );
  assertMatchesAll(
    assert,
    previewRender,
    [
      /createBuilderRenderPreviewOps\(/,
      /createBuilderRenderSketchPlacementPreviewOps\(/,
      /const fillFront = ctx\.input\.fillFront === true;/,
      /const fillBack = ctx\.input\.fillBack === true;/,
      /const overlayThroughScene = ctx\.input\.overlayThroughScene === true;/,
    ],
    'preview render bundle'
  );
});
