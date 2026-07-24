import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const FACADE_SPECIFIER = 'wardrobe_dimension_tokens_shared';
const APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS = Object.freeze({
  value: Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'CARCASS_BASE_DIMENSIONS',
    'CARCASS_CORNICE_DIMENSIONS',
    'CARCASS_INTERIOR_DIMENSIONS',
    'CARCASS_SHELL_DIMENSIONS',
    'CHEST_MODE_DIMENSIONS',
    'CM_PER_METER',
    'CONTENT_VISUAL_DIMENSIONS',
    'CORNER_CONNECTOR_INTERIOR_DIMENSIONS',
    'CORNER_WING_DIMENSIONS',
    'DEFAULT_CHEST_DRAWERS_COUNT',
    'DEFAULT_CORNER_DOORS',
    'DEFAULT_CORNER_WIDTH',
    'DEFAULT_HEIGHT',
    'DEFAULT_HINGED_DOORS',
    'DEFAULT_SLIDING_DOORS',
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
    'DEFAULT_WIDTH',
    'DOOR_MOUNT_THICKNESS_CONFIG_KEYS',
    'DOOR_MOUNT_THICKNESS_DIMENSIONS',
    'DOOR_SYSTEM_DIMENSIONS',
    'DOOR_TRIM_DIMENSIONS',
    'DOOR_VISUAL_DIMENSIONS',
    'DRAWER_DIMENSIONS',
    'FRONT_REVEAL_FRAME_DIMENSIONS',
    'HANDLE_DIMENSIONS',
    'HINGED_DEFAULT_DEPTH',
    'HINGED_DEFAULT_PER_DOOR_WIDTH',
    'INTERIOR_FITTINGS_DIMENSIONS',
    'LIBRARY_PRESET_DIMENSIONS',
    'MATERIAL_DIMENSIONS',
    'MM_PER_METER',
    'NO_MAIN_SKETCH_DIMENSIONS',
    'SKETCH_BOX_DIMENSIONS',
    'SLIDING_DEFAULT_DEPTH',
    'SLIDING_DEFAULT_PER_DOOR_WIDTH',
    'STACK_SPLIT_LOWER_DEPTH_MAX',
    'STACK_SPLIT_LOWER_DEPTH_MIN',
    'STACK_SPLIT_LOWER_DOORS_MAX',
    'STACK_SPLIT_LOWER_DOORS_MIN',
    'STACK_SPLIT_LOWER_HEIGHT_MIN',
    'STACK_SPLIT_LOWER_WIDTH_MAX',
    'STACK_SPLIT_LOWER_WIDTH_MIN',
    'STACK_SPLIT_MIN_TOP_HEIGHT',
    'STACK_SPLIT_SEAM_GAP_M',
    'WARDROBE_CELL_DEPTH_MAX',
    'WARDROBE_CELL_DEPTH_MIN',
    'WARDROBE_CELL_DIM_MIN',
    'WARDROBE_CELL_HEIGHT_MAX',
    'WARDROBE_CELL_HEIGHT_MIN',
    'WARDROBE_CELL_WIDTH_MAX',
    'WARDROBE_CELL_WIDTH_MIN',
    'WARDROBE_CHEST_DRAWERS_MAX',
    'WARDROBE_CHEST_DRAWERS_MIN',
    'WARDROBE_CHEST_HEIGHT_MIN',
    'WARDROBE_CHEST_WIDTH_MIN',
    'WARDROBE_DEFAULTS',
    'WARDROBE_DEPTH_MAX',
    'WARDROBE_DEPTH_MIN',
    'WARDROBE_DIMENSION_GUIDE_DIMENSIONS',
    'WARDROBE_DOORS_MAX',
    'WARDROBE_DOORS_MIN',
    'WARDROBE_HEIGHT_MAX',
    'WARDROBE_HEIGHT_MIN',
    'WARDROBE_LAYOUT_DIMENSIONS',
    'WARDROBE_LIMITS',
    'WARDROBE_SLIDING_DOORS_MIN',
    'WARDROBE_WIDTH_MAX',
    'WARDROBE_WIDTH_MIN',
    'clampDimension',
    'cmToM',
    'getDefaultChestDrawersCount',
    'getDefaultDepthForWardrobeType',
    'getDefaultDoorMountThicknessCm',
    'getDefaultDoorMountThicknessM',
    'getDefaultDoorsForWardrobeType',
    'getDefaultHeightForWardrobeType',
    'getDefaultPerDoorWidthForWardrobeType',
    'getDefaultWidthForWardrobeType',
    'getDoorMountThicknessConfigKey',
    'isAutoWidthForDoors',
    'mToCm',
    'normalizeDoorMountThicknessCm',
    'normalizeWardrobeDimensionDefaultType',
    'resolveAutoWidthForDoors',
    'resolveDefaultWardrobeDimensions',
    'resolveDoorMountThicknessesFromConfig',
    'resolveExternalDrawerGeometry',
    'resolveWardrobeTypeDefaults',
  ]),
  type: Object.freeze([
    'Centimeters',
    'DoorMountConstructionMode',
    'DoorMountThicknessConfigKey',
    'DoorMountThicknessKind',
    'ExternalDrawerGeometry',
    'Meters',
    'Millimeters',
    'Pixels',
    'WardrobeDimensionDefaultType',
    'WorldUnits',
  ]),
});
const APPROVED_STACK_SPLIT_FACADE_SYMBOLS = Object.freeze([
  'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
  'STACK_SPLIT_LOWER_DEPTH_MAX',
  'STACK_SPLIT_LOWER_DEPTH_MIN',
  'STACK_SPLIT_LOWER_DOORS_MAX',
  'STACK_SPLIT_LOWER_DOORS_MIN',
  'STACK_SPLIT_LOWER_HEIGHT_MIN',
  'STACK_SPLIT_LOWER_WIDTH_MAX',
  'STACK_SPLIT_LOWER_WIDTH_MIN',
  'STACK_SPLIT_MIN_TOP_HEIGHT',
  'STACK_SPLIT_SEAM_GAP_M',
]);
const APPROVED_STACK_SPLIT_FACADE_IMPORTS = Object.freeze({
  'esm/native/builder/build_flow_plan_inputs.ts': Object.freeze(['STACK_SPLIT_SEAM_GAP_M']),
  'esm/native/data/preset_models_data.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
  'esm/native/features/library_preset/library_preset_flow_shared.ts': Object.freeze([
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
  ]),
  'esm/native/runtime/default_state.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
});
const APPROVED_STACK_SPLIT_FACADE_REEXPORTS = Object.freeze({
  'esm/native/runtime/api.ts': APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
});
const APPROVED_STACK_SPLIT_FACADE_WILDCARDS = Object.freeze([
  Object.freeze({
    file: 'esm/native/features/dimensions/index.ts',
    syntax: 'static-re-export',
  }),
]);
const CARCASS_SHELL_DIRECT_CONSUMERS = Object.freeze([
  'esm/native/builder/carcass_pipeline.ts',
  'esm/native/builder/core_carcass_shared.ts',
  'esm/native/builder/core_carcass_shell.ts',
  'esm/native/builder/corner_wing_carcass_shell_metrics.ts',
  'esm/native/builder/module_loop_pipeline_hex_cell.ts',
  'esm/native/builder/module_loop_pipeline_module_depth.ts',
  'esm/native/services/canvas_picking_split_hover_preview_line.ts',
  'esm/shared/dimensions/corner_system_policy.ts',
]);
const CARCASS_INTERIOR_DIRECT_CONSUMERS = Object.freeze([
  'esm/native/builder/build_flow_plan.ts',
  'esm/native/builder/build_stack_split_lower_setup.ts',
  'esm/native/builder/module_loop_pipeline_module_depth.ts',
]);
const APPROVED_INTERIOR_GRID_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/build_wardrobe_flow_context_carcass.ts': Object.freeze([
    'CARCASS_INTERIOR_GRID_POLICY',
  ]),
  'esm/native/builder/module_loop_pipeline_module_frame.ts': Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
  'esm/native/builder/build_stack_split_lower_setup.ts': Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
  'esm/native/services/canvas_picking_interior_hover_layout_mode.ts': Object.freeze([
    'CARCASS_INTERIOR_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'CARCASS_INTERIOR_GRID_POLICY',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
  'esm/shared/dimensions/carcass_shell_policy.ts': Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
});
const APPROVED_SHELL_GRID_FIELD_USAGE = Object.freeze({});
const APPROVED_BASE_PLINTH_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/native/features/base_plinth_support.ts': Object.freeze([
    'BASE_PLINTH_POLICY',
    'basePlinthCentimetersToMeters',
    'basePlinthMetersToCentimeters',
  ]),
  'esm/shared/dimensions/sketch_box_preview_policy.ts': Object.freeze(['BASE_PLINTH_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['BASE_PLINTH_POLICY']),
});
const APPROVED_BASE_LEG_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['BASE_LEG_LAYOUT_POLICY']),
  'esm/native/features/base_leg_support.ts': Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
    'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  ]),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze(['BASE_LEG_LAYOUT_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'BASE_LEG_LAYOUT_POLICY',
  ]),
});
const APPROVED_BASE_PLATFORM_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/builder/corner_state_normalize_layout.ts': Object.freeze(['BASE_PLATFORM_RENDER_POLICY']),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_visuals_adornments_normalize.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_content_commit_adornments.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_adornments.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/shared/dimensions/base_leg_policy.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
    'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
    'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  ]),
});
const APPROVED_BASE_SUPPORT_FACADE_IMPORTS = Object.freeze({
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/visuals_chest_mode_build.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/visuals_chest_mode_inputs.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/runtime/default_state.ts': Object.freeze(['BASE_LEG_DIMENSIONS', 'CARCASS_BASE_DIMENSIONS']),
});
const APPROVED_DIMENSION_FACADE_BROAD_DEPENDENCIES = Object.freeze([
  Object.freeze({
    file: 'esm/native/features/dimensions/index.ts',
    syntax: 'static-re-export',
  }),
]);
const APPROVED_CHEST_STRUCTURAL_OWNER_IMPORTS = Object.freeze({
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['CHEST_STRUCTURAL_DIMENSIONS']),
});
const APPROVED_MATERIAL_THICKNESS_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/core_doors_compute.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/core_layout_compute.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/core_storage_compute_external_drawers.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/render_interior_custom_ops.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/render_interior_custom_ops_shelves.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/render_interior_preset_ops.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/render_interior_sketch_ops_input.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/render_interior_sketch_support_shelves.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_interiors_shelves.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/render_preview_sketch_pipeline_shared.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/services/canvas_picking_hover_preview_modes_divider.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_content_preview_doors.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_content_preview_stack.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_content_preview_vertical.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_hover_finalize.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_hover_scan.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_divider.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_placement_remove.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_target_candidate.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_box_blockers.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/shared/dimensions/carcass_cornice_render_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/door_mount_thickness_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/door_system_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/external_drawer_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/front_reveal_frame_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/sketch_box_divider_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/sketch_box_geometry_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/sketch_box_preview_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),

  'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_content.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_layout_geometry.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_hover_context.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_tools.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_selector_internal_metrics.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/services/canvas_picking_sketch_box_door_preview.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/builder/render_preview_interior_hover_apply.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/features/sketch_internal_drawer_cassette.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/native/services/canvas_picking_manual_layout_config_ops_shelf.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
  'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts': Object.freeze([
    'MATERIAL_THICKNESS_POLICY',
  ]),
});
const APPROVED_WARDROBE_MODULE_LAYOUT_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/core_layout_compute.ts': Object.freeze(['WARDROBE_MODULE_LAYOUT_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['WARDROBE_MODULE_LAYOUT_POLICY']),
});
const APPROVED_CELL_DIMENSION_OWNER_IMPORTS = Object.freeze({
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts': Object.freeze([
    'CELL_DIMENSION_MATCH_POLICY',
    'CELL_DIMENSION_PREVIEW_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze([
    'CELL_DIMENSION_MATCH_POLICY',
    'CELL_DIMENSION_PREVIEW_POLICY',
  ]),
});
const APPROVED_WARDROBE_LAYOUT_COMPARISON_OWNER_IMPORTS = Object.freeze({
  'esm/native/services/canvas_picking_cell_dims_flow.ts': Object.freeze([
    'WARDROBE_LAYOUT_COMPARISON_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['WARDROBE_LAYOUT_COMPARISON_POLICY']),
});
const APPROVED_MATERIAL_LEGACY_IMPORTERS = Object.freeze([]);
const APPROVED_MATERIAL_LEGACY_DEPENDENCIES = Object.freeze(
  Object.fromEntries(
    APPROVED_MATERIAL_LEGACY_IMPORTERS.map(file => [file, ['MATERIAL_DIMENSIONS@static-import']])
  )
);
const APPROVED_MATERIAL_GLASS_SHELF_ONLY_IMPORTERS = new Set();
const APPROVED_MATERIAL_WOOD_AND_GLASS_IMPORTERS = new Set();
const APPROVED_MATERIAL_LEGACY_FIELD_USAGE = Object.freeze(
  Object.fromEntries(
    APPROVED_MATERIAL_LEGACY_IMPORTERS.map(file => [
      file,
      APPROVED_MATERIAL_WOOD_AND_GLASS_IMPORTERS.has(file)
        ? ['glassShelf', 'glassShelf.thicknessM', 'wood', 'wood.thicknessM']
        : APPROVED_MATERIAL_GLASS_SHELF_ONLY_IMPORTERS.has(file)
          ? ['glassShelf', 'glassShelf.thicknessM']
          : ['wood', 'wood.thicknessM'],
    ])
  )
);
const APPROVED_CARCASS_CORNICE_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/corner_connector_cornice_shared.ts': Object.freeze(['CARCASS_CORNICE_COMMON_POLICY']),
  'esm/native/builder/core_carcass_cornice.ts': Object.freeze([
    'CARCASS_CORNICE_ANGLE_POLICY',
    'CARCASS_CORNICE_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_connector_cornice_profile.ts': Object.freeze([
    'CARCASS_CORNICE_ANGLE_POLICY',
    'CARCASS_CORNICE_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_connector_cornice_wave.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['CARCASS_CORNICE_RENDER_POLICY']),
});
const APPROVED_CORNICE_THETA_CLAMP_M_USAGE = Object.freeze({
  'esm/native/builder/corner_wing_cornice_path.ts': Object.freeze(['thetaClampM']),
});
const APPROVED_CHEST_MODE_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/chest_mode_pipeline.ts': Object.freeze(['CHEST_MODE_DIMENSIONS']),
  'esm/native/builder/render_drawer_ops_internal.ts': Object.freeze(['CHEST_MODE_DRAWER_BOX_RENDER_POLICY']),
  'esm/native/builder/visuals_chest_mode_drawer_box.ts': Object.freeze(['CHEST_MODE_DIMENSIONS']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['CHEST_MODE_DIMENSIONS']),
});
const APPROVED_CHEST_MODE_LEGACY_DEPENDENCIES = Object.freeze({
  'esm/native/builder/visuals_chest_mode_build.ts': ['CHEST_MODE_DIMENSIONS@static-import'],
  'esm/native/builder/visuals_chest_mode_inputs.ts': ['CHEST_MODE_DIMENSIONS@static-import'],
  'esm/native/runtime/api.ts': ['CHEST_MODE_DIMENSIONS@static-re-export'],
  'esm/native/runtime/default_state.ts': ['CHEST_MODE_DIMENSIONS@static-import'],
  'esm/native/services/api.ts': ['CHEST_MODE_DIMENSIONS@static-re-export'],
  'esm/native/services/api_runtime_base_surface.ts': ['CHEST_MODE_DIMENSIONS@static-re-export'],
  'esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_chest.ts': [
    'CHEST_MODE_DIMENSIONS@static-import',
  ],
  'esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts': ['CHEST_MODE_DIMENSIONS@static-import'],
  'esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts': ['CHEST_MODE_DIMENSIONS@static-import'],
});
const APPROVED_CHEST_MODE_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/visuals_chest_mode_build.ts': [
    'commode',
    'commode.backPanelThicknessM',
    'commode.backPanelYOffsetM',
    'commode.minMirrorHeightCm',
    'commode.minMirrorWidthCm',
    'commode.mirrorInsetM',
    'commode.mirrorSurfaceLiftM',
    'commode.mirrorThicknessM',
    'dimensionGuideSideOffsetM',
    'dimensionGuideTextScale',
    'dimensionGuideTextScale.segment',
    'dimensionGuideTextScale.total',
    'dimensionGuideTopOffsetM',
  ],
  'esm/native/builder/visuals_chest_mode_inputs.ts': [
    'commode',
    'commode.defaultMirrorHeightCm',
    'commode.maxMirrorHeightCm',
    'commode.maxMirrorWidthCm',
    'commode.minMirrorHeightCm',
    'commode.minMirrorWidthCm',
  ],
  'esm/native/runtime/default_state.ts': [
    'activeDefaults',
    'activeDefaults.widthCm',
    'commode',
    'commode.defaultMirrorHeightCm',
  ],
  'esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_chest.ts': [
    'activeDefaults',
    'activeDefaults.baseType',
    'activeDefaults.depthCm',
    'activeDefaults.doorsCount',
    'activeDefaults.drawersCount',
    'activeDefaults.heightCm',
    'activeDefaults.widthCm',
    'commode',
    'commode.defaultMirrorHeightCm',
  ],
  'esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts': [
    'commode',
    'commode.maxMirrorHeightCm',
    'commode.maxMirrorWidthCm',
    'commode.minMirrorHeightCm',
    'commode.minMirrorWidthCm',
  ],
  'esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts': [
    'commode',
    'commode.defaultMirrorHeightCm',
  ],
});
const APPROVED_DOOR_SYSTEM_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/core_doors_compute.ts': Object.freeze([
    'HINGED_DOOR_MOUNT_POLICY',
    'SLIDING_DOOR_CONSTRUCTION_POLICY',
  ]),
  'esm/shared/dimensions/external_drawer_policy.ts': Object.freeze(['HINGED_DOOR_MOUNT_POLICY']),
  'esm/native/builder/render_interior_sketch_boxes_door_geometry.ts': Object.freeze([
    'HINGED_DOOR_MOUNT_POLICY',
  ]),
  'esm/native/builder/hinged_doors_module_ops_context.ts': Object.freeze([
    'HINGED_DOOR_MOUNT_POLICY',
    'HINGED_DOOR_RENDER_POLICY',
  ]),
  'esm/native/builder/hinged_doors_module_ops_full.ts': Object.freeze(['HINGED_DOOR_SPLIT_GEOMETRY_POLICY']),
  'esm/native/builder/hinged_doors_module_ops_segments.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/hinged_doors_module_ops_split.ts': Object.freeze(['HINGED_DOOR_SPLIT_GEOMETRY_POLICY']),
  'esm/native/builder/hinged_doors_module_ops_split_policy.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/hinged_doors_module_ops_split_routes.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_apply.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_door_ops_hinged.ts': Object.freeze(['HINGED_DOOR_RENDER_POLICY']),
  'esm/native/builder/render_door_ops_sliding.ts': Object.freeze([
    'SLIDING_DOOR_CONSTRUCTION_POLICY',
    'SLIDING_DOOR_HANDLE_RENDER_POLICY',
    'SLIDING_DOOR_MOTION_POLICY',
  ]),
  'esm/native/builder/sliding_doors_pipeline.ts': Object.freeze(['SLIDING_DOOR_CONSTRUCTION_POLICY']),
  'esm/native/platform/render_loop_motion_doors.ts': Object.freeze(['SLIDING_DOOR_CONSTRUCTION_POLICY']),
  'esm/native/runtime/sliding_door_motion.ts': Object.freeze([
    'SLIDING_DOOR_CONSTRUCTION_POLICY',
    'SLIDING_DOOR_MOTION_POLICY',
  ]),
  'esm/native/services/canvas_picking_door_split_click_custom.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_door_split_click_toggle.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_door_split_hover_feedback.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_AUTHORING_POLICY',
  ]),
  'esm/native/services/canvas_picking_door_split_hover_flow.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_AUTHORING_POLICY',
  ]),
  'esm/native/services/canvas_picking_door_split_pointer_y.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_AUTHORING_POLICY',
  ]),
  'esm/native/services/canvas_picking_door_split_remove_target.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_AUTHORING_POLICY',
  ]),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
  ]),
  'esm/native/services/doors_runtime_visuals_shared.ts': Object.freeze(['SLIDING_DOOR_CONSTRUCTION_POLICY']),
  'esm/shared/dimensions/door_mount_thickness_policy.ts': Object.freeze(['HINGED_DOOR_MOUNT_POLICY']),
  'esm/shared/dimensions/front_reveal_frame_policy.ts': Object.freeze(['SLIDING_DOOR_CONSTRUCTION_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['DOOR_SYSTEM_DIMENSIONS']),
});
const DOOR_MOUNT_THICKNESS_FACADE_SYMBOLS = Object.freeze([
  'DOOR_MOUNT_THICKNESS_CONFIG_KEYS',
  'DOOR_MOUNT_THICKNESS_DIMENSIONS',
  'DoorMountConstructionMode',
  'DoorMountThicknessConfigKey',
  'DoorMountThicknessKind',
  'getDefaultDoorMountThicknessCm',
  'getDefaultDoorMountThicknessM',
  'getDoorMountThicknessConfigKey',
  'normalizeDoorMountThicknessCm',
  'resolveDoorMountThicknessesFromConfig',
]);
const APPROVED_DOOR_MOUNT_THICKNESS_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/build_input_fingerprint.ts': Object.freeze([
    'DOOR_MOUNT_THICKNESS_CONFIG_KEYS',
    'resolveDoorMountThicknessesFromConfig',
  ]),
  'esm/native/features/project_config/project_config_persisted_snapshot.ts': Object.freeze([
    'normalizeDoorMountThicknessCm',
  ]),
  'esm/native/features/project_config/project_config_snapshot_canonical_scalar_runtime.ts': Object.freeze([
    'normalizeDoorMountThicknessCm',
  ]),
  'esm/native/io/project_io_load_helpers_config.ts': Object.freeze(['normalizeDoorMountThicknessCm']),
  'esm/native/runtime/config_selectors_shared.ts': Object.freeze(['normalizeDoorMountThicknessCm']),
  'esm/native/ui/react/selectors/config_selectors.ts': Object.freeze([
    'resolveDoorMountThicknessesFromConfig',
  ]),
  'esm/native/ui/react/tabs/structure_tab_controls.tsx': Object.freeze([
    'DOOR_MOUNT_THICKNESS_DIMENSIONS',
    'DoorMountThicknessConfigKey',
    'normalizeDoorMountThicknessCm',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': DOOR_MOUNT_THICKNESS_FACADE_SYMBOLS,
});
const APPROVED_DOOR_MOUNT_THICKNESS_LEGACY_DEPENDENCIES = Object.freeze({
  'esm/native/builder/build_flow_plan_inputs.ts': ['resolveDoorMountThicknessesFromConfig@static-import'],
  'esm/native/builder/visuals_chest_mode_build.ts': ['resolveDoorMountThicknessesFromConfig@static-import'],
  'esm/native/kernel/kernel_project_capture_payload.ts': ['normalizeDoorMountThicknessCm@static-import'],
});
const APPROVED_DOOR_MOUNT_THICKNESS_LEGACY_FIELD_USAGE = Object.freeze({});
const APPROVED_DOOR_VISUAL_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/visuals_and_contents_door_visual_accent.ts': Object.freeze([
    'DOOR_ACCENT_RENDER_POLICY',
    'DOOR_VISUAL_COMMON_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_adhesive_glass.ts': Object.freeze([
    'DOOR_GLASS_RENDER_POLICY',
    'DOOR_MIRROR_RENDER_POLICY',
    'DOOR_VISUAL_COMMON_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_double_profile.ts': Object.freeze([
    'DOOR_DOUBLE_PROFILE_RENDER_POLICY',
    'DOOR_VISUAL_COMMON_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_glass.ts': Object.freeze([
    'DOOR_DOUBLE_PROFILE_RENDER_POLICY',
    'DOOR_GLASS_RENDER_POLICY',
    'DOOR_VISUAL_COMMON_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_grooves.ts': Object.freeze([
    'DOOR_GROOVE_RENDER_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_mirror.ts': Object.freeze([
    'DOOR_MIRROR_RENDER_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_mirror_styled.ts': Object.freeze([
    'DOOR_MIRROR_RENDER_POLICY',
    'DOOR_VISUAL_COMMON_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_miter_frame.ts': Object.freeze([
    'DOOR_MITER_RENDER_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_profile.ts': Object.freeze([
    'DOOR_PROFILE_RENDER_POLICY',
  ]),
  'esm/native/builder/visuals_and_contents_door_visual_profile_frame.ts': Object.freeze([
    'DOOR_PROFILE_RENDER_POLICY',
    'DOOR_VISUAL_COMMON_POLICY',
  ]),
  'esm/shared/mirror_layout_contracts_shared.ts': Object.freeze(['DOOR_MIRROR_LAYOUT_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['DOOR_VISUAL_DIMENSIONS']),
});
const APPROVED_DOOR_VISUAL_LEGACY_DEPENDENCIES = Object.freeze({});
const APPROVED_DOOR_VISUAL_LEGACY_FIELD_USAGE = Object.freeze({});
const APPROVED_DOOR_TRIM_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/door_trim_visuals.ts': Object.freeze(['DOOR_TRIM_RENDER_POLICY']),
  'esm/native/features/door_authoring/internal/trim_placement_geometry.ts': Object.freeze([
    'DOOR_TRIM_NORMALIZATION_POLICY',
    'DOOR_TRIM_SNAP_POLICY',
  ]),
  'esm/native/features/door_authoring/internal/trim_placement_match.ts': Object.freeze([
    'DOOR_TRIM_REMOVE_TOLERANCE_POLICY',
  ]),
  'esm/native/features/door_authoring/internal/trim_placement_mirror.ts': Object.freeze([
    'DOOR_TRIM_NORMALIZATION_POLICY',
  ]),
  'esm/native/features/door_authoring/internal/trim_shared.ts': Object.freeze([
    'DOOR_TRIM_AUTHORING_DEFAULTS_POLICY',
    'DOOR_TRIM_LIMITS_POLICY',
    'DOOR_TRIM_RENDER_POLICY',
    'DOOR_TRIM_SNAP_POLICY',
  ]),
  'esm/shared/door_trim_value_contracts_shared.ts': Object.freeze([
    'DOOR_TRIM_AUTHORING_DEFAULTS_POLICY',
    'DOOR_TRIM_LIMITS_POLICY',
    'DOOR_TRIM_NORMALIZATION_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['DOOR_TRIM_DIMENSIONS']),
});
const APPROVED_DOOR_TRIM_LEGACY_DEPENDENCIES = Object.freeze({});
const APPROVED_DOOR_TRIM_LEGACY_FIELD_USAGE = Object.freeze({});
const APPROVED_EXTERNAL_DRAWER_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/build_handle_policy.ts': Object.freeze(['EXTERNAL_DRAWER_SIZE_POLICY']),
  'esm/native/builder/core_storage_compute_external_drawers.ts': Object.freeze([
    'EXTERNAL_DRAWER_BOX_POLICY',
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
    'resolveExternalDrawerGeometry',
  ]),
  'esm/native/builder/hinged_doors_module_ops_context.ts': Object.freeze([
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
  ]),
  'esm/native/builder/hinged_doors_module_ops_handle_policy.ts': Object.freeze([
    'EXTERNAL_DRAWER_SIZE_POLICY',
  ]),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
  ]),
  'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts': Object.freeze([
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
  ]),
  'esm/shared/wardrobe_construction_validation_shared.ts': Object.freeze(['EXTERNAL_DRAWER_SIZE_POLICY']),
  'esm/native/builder/external_drawer_shelf.ts': Object.freeze(['EXTERNAL_DRAWER_SEPARATOR_POLICY']),
  'esm/native/builder/render_drawer_ops_external.ts': Object.freeze([
    'EXTERNAL_DRAWER_CONTENTS_POLICY',
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_box.ts': Object.freeze([
    'EXTERNAL_DRAWER_CONTENTS_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_box.ts': Object.freeze([
    'EXTERNAL_DRAWER_CONTENTS_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_motion.ts': Object.freeze([
    'EXTERNAL_DRAWER_MOTION_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts': Object.freeze([
    'EXTERNAL_DRAWER_SIZE_POLICY',
    'resolveExternalDrawerGeometry',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_plan.ts': Object.freeze([
    'resolveExternalDrawerGeometry',
  ]),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze([
    'EXTERNAL_DRAWER_BOX_POLICY',
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
    'EXTERNAL_DRAWER_MOTION_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
  ]),
  'esm/shared/dimensions/drawer_sketch_policy.ts': Object.freeze([
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
  ]),
  'esm/shared/dimensions/front_reveal_frame_policy.ts': Object.freeze([
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
  ]),
  'esm/shared/dimensions/handle_policy.ts': Object.freeze(['EXTERNAL_DRAWER_SIZE_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze([
    'EXTERNAL_DRAWER_POLICY',
    'ExternalDrawerGeometry',
    'resolveExternalDrawerGeometry',
  ]),
});
const APPROVED_INTERNAL_DRAWER_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_drawer_ops_internal.ts': Object.freeze(['INTERNAL_DRAWER_CONTENTS_POLICY']),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze(['INTERNAL_DRAWER_LAYOUT_POLICY']),
  'esm/shared/dimensions/drawer_sketch_policy.ts': Object.freeze([
    'INTERNAL_DRAWER_LAYOUT_POLICY',
    'INTERNAL_DRAWER_MOTION_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['INTERNAL_DRAWER_POLICY']),
});
const APPROVED_INTERIOR_STORAGE_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_custom_ops.ts': Object.freeze(['INTERIOR_STORAGE_GRID_POLICY']),
  'esm/native/builder/render_interior_preset_ops.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/builder/render_interior_custom_ops_layout.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze(['INTERIOR_STORAGE_BARRIER_POLICY']),
  'esm/native/builder/render_interior_sketch_support_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_commit.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_content.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_preview_interior_hover_apply.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_commit_drawers.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/shared/dimensions/drawer_sketch_policy.ts': Object.freeze([
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/shared/dimensions/interior_fittings_policy.ts': Object.freeze(['INTERIOR_STORAGE_POLICY']),

  'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_GRID_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts': Object.freeze([
    'INTERIOR_STORAGE_GRID_POLICY',
  ]),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
});
const APPROVED_INTERIOR_FITTINGS_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_custom_ops.ts': Object.freeze(['INTERIOR_SHELF_GEOMETRY_POLICY']),
  'esm/native/builder/render_interior_custom_ops_shelves.ts': Object.freeze([
    'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_SHELF_GEOMETRY_POLICY',
    'INTERIOR_SHELF_PIN_RENDER_POLICY',
  ]),
  'esm/native/builder/render_interior_preset_ops.ts': Object.freeze(['INTERIOR_SHELF_GEOMETRY_POLICY']),
  'esm/native/builder/render_interior_sketch_ops_input.ts': Object.freeze(['INTERIOR_SHELF_GEOMETRY_POLICY']),
  'esm/native/builder/render_interior_sketch_boxes_shell_apply.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_support_shelves.ts': Object.freeze([
    'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_ops_primitives.ts': Object.freeze(['INTERIOR_SHELF_ROUNDED_RENDER_POLICY']),
  'esm/native/builder/corner_wing_cell_interiors_shelves.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
    'INTERIOR_SHELF_PIN_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_interiors_storage.ts': Object.freeze(['INTERIOR_ROD_RENDER_POLICY']),
  'esm/native/builder/render_interior_preset_ops_shelves.ts': Object.freeze([
    'INTERIOR_SHELF_PIN_RENDER_POLICY',
    'INTERIOR_SHELF_POLICY',
  ]),
  'esm/native/builder/render_interior_rod_ops.ts': Object.freeze([
    'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_ROD_DEPTH_CLEARANCE_POLICY',
    'INTERIOR_ROD_RENDER_POLICY',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze([
    'INTERIOR_PRESET_ROD_FACTORS_POLICY',
    'INTERIOR_PRESET_SHELF_ROWS_POLICY',
    'INTERIOR_ROD_PLACEMENT_POLICY',
    'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_support_materials.ts': Object.freeze([
    'INTERIOR_SHELF_PIN_RENDER_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_support_rods.ts': Object.freeze([
    'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_ROD_DEPTH_CLEARANCE_POLICY',
    'INTERIOR_ROD_RENDER_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_support_shelf_pins.ts': Object.freeze([
    'INTERIOR_SHELF_PIN_RENDER_POLICY',
  ]),
  'esm/shared/dimensions/corner_system_policy.ts': Object.freeze([
    'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts': Object.freeze([
    'INTERIOR_ROD_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts': Object.freeze([
    'INTERIOR_ROD_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts': Object.freeze([
    'INTERIOR_PRESET_ROD_FACTORS_POLICY',
    'INTERIOR_ROD_PLACEMENT_POLICY',
  ]),
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts': Object.freeze([
    'INTERIOR_ROD_PLACEMENT_POLICY',
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/shared/dimensions/sketch_box_preview_policy.ts': Object.freeze([
    'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_ROD_RENDER_POLICY',
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['INTERIOR_FITTINGS_POLICY']),

  'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts': Object.freeze([
    'INTERIOR_ROD_RENDER_POLICY',
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts': Object.freeze([
    'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
  ]),
  'esm/native/builder/render_preview_interior_hover_apply.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts': Object.freeze([
    'INTERIOR_ROD_PLACEMENT_POLICY',
    'INTERIOR_ROD_RENDER_POLICY',
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts': Object.freeze([
    'INTERIOR_ROD_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts': Object.freeze([
    'INTERIOR_ROD_RENDER_POLICY',
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts': Object.freeze([
    'INTERIOR_SHELF_GEOMETRY_POLICY',
  ]),
});
const APPROVED_SKETCH_BOX_GEOMETRY_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts': Object.freeze([
    'SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_shell_height.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_support_placement.ts': Object.freeze([
    'SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_runtime_geometry.ts': Object.freeze([
    'SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY',
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_geometry_box.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_layout_geometry.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes.ts': Object.freeze(['SKETCH_BOX_SHELL_GEOMETRY_POLICY']),
  'esm/native/builder/render_interior_sketch_boxes_contents_depth.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_shell_apply.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze([
    'SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_tools.ts': Object.freeze([
    'SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_selector_internal_metrics.ts': Object.freeze([
    'SKETCH_BOX_SELECTOR_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_click_manual_sketch_free_box.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts': Object.freeze([
    'SKETCH_BOX_SHELL_GEOMETRY_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['SKETCH_BOX_GEOMETRY_POLICY']),
});
const APPROVED_SKETCH_BOX_DIVIDER_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_sketch_layout_dividers.ts': Object.freeze([
    'SKETCH_BOX_DIVIDER_GEOMETRY_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_divider_state_match.ts': Object.freeze([
    'SKETCH_BOX_DIVIDER_GEOMETRY_POLICY',
    'SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_divider_state_placement.ts': Object.freeze([
    'SKETCH_BOX_DIVIDER_GEOMETRY_POLICY',
    'SKETCH_BOX_DIVIDER_SNAP_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_segments.ts': Object.freeze([
    'SKETCH_BOX_DIVIDER_GEOMETRY_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['SKETCH_BOX_DIVIDER_POLICY']),
});
const APPROVED_SKETCH_BOX_DIMENSION_OVERLAY_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_sketch_layout_dimensions_grouping.ts': Object.freeze([
    'SKETCH_BOX_DIMENSION_GROUPING_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_layout_dimensions_render.ts': Object.freeze([
    'SKETCH_BOX_DIMENSION_RENDER_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['SKETCH_BOX_DIMENSION_OVERLAY_POLICY']),
});
const APPROVED_SKETCH_BOX_FREE_PLACEMENT_OWNER_IMPORTS = Object.freeze({
  'esm/native/services/canvas_picking_cell_dims_free_box.ts': Object.freeze([
    'SKETCH_BOX_FREE_VERTICAL_POLICY',
    'SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_gap.ts': Object.freeze([
    'SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_geometry_vertical.ts': Object.freeze([
    'SKETCH_BOX_FREE_VERTICAL_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_geometry_zone.ts': Object.freeze([
    'SKETCH_BOX_FREE_REMOVE_POLICY',
    'SKETCH_BOX_FREE_WALL_SNAP_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_placement_attach_candidates.ts': Object.freeze([
    'SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_placement_intent.ts': Object.freeze([
    'SKETCH_BOX_FREE_ATTACH_INTENT_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_layout_geometry.ts': Object.freeze([
    'SKETCH_BOX_FREE_VERTICAL_POLICY',
  ]),
  'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts': Object.freeze([
    'SKETCH_BOX_FREE_VERTICAL_POLICY',
    'SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_box_hover_context.ts': Object.freeze([
    'SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['SKETCH_BOX_FREE_PLACEMENT_POLICY']),
});
const APPROVED_SKETCH_BOX_PREVIEW_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts': Object.freeze([
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_preview_sketch_measurements_apply.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts': Object.freeze([
    'SKETCH_BOX_BOX_PREVIEW_POLICY',
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
  ]),
  'esm/native/builder/render_preview_sketch_pipeline_linear.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
    'SKETCH_BOX_ROD_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts': Object.freeze([
    'SKETCH_BOX_BOX_PREVIEW_POLICY',
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
  ]),
  'esm/native/services/canvas_picking_hover_clearance_measurements.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_shared.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_divider_measurements.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_commit_vertical.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_box.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes.ts': Object.freeze(['SKETCH_BOX_DOOR_PREVIEW_POLICY']),
  'esm/native/builder/render_interior_sketch_boxes_contents_depth.ts': Object.freeze([
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_door_geometry.ts': Object.freeze([
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts': Object.freeze([
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
    'SKETCH_BOX_DRAWER_PREVIEW_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild.ts': Object.freeze([
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_door_preview.ts': Object.freeze([
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts': Object.freeze([
    'SKETCH_BOX_ADORNMENT_PREVIEW_POLICY',
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_context.ts': Object.freeze([
    'SKETCH_BOX_DRAWER_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_context.ts': Object.freeze([
    'SKETCH_BOX_DRAWER_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts': Object.freeze([
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts': Object.freeze([
    'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
    'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
    'SKETCH_BOX_ROD_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts': Object.freeze([
    'SKETCH_BOX_ROD_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_content.ts': Object.freeze([
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts': Object.freeze([
    'SKETCH_BOX_ROD_PREVIEW_POLICY',
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
    'SKETCH_BOX_ROD_PREVIEW_POLICY',
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
    'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts': Object.freeze([
    'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts': Object.freeze([
    'SKETCH_BOX_DOOR_PREVIEW_POLICY',
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_preview_interior_hover_apply.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
    'SKETCH_BOX_ROD_PREVIEW_POLICY',
    'SKETCH_BOX_SHELF_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts': Object.freeze([
    'SKETCH_BOX_ROD_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts': Object.freeze([
    'SKETCH_BOX_PREVIEW_CORE_POLICY',
    'SKETCH_BOX_ROD_PREVIEW_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['SKETCH_BOX_PREVIEW_POLICY']),
});
const APPROVED_INTERIOR_FITTINGS_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/core_storage_compute_custom.ts': Object.freeze(['rods', 'rods.defaultYOffsetM']),
  'esm/native/builder/corner_wing_cell_layouts.ts': Object.freeze([
    'presets',
    'presets.fullShelfRows',
    'presets.hangingRodYFactor',
    'presets.hangingShelfRows',
    'presets.mixedRodYFactor',
    'presets.splitLowerRodYFactor',
    'presets.splitShelfRows',
    'presets.splitUpperRodLimitFactor',
    'presets.splitUpperRodYFactor',
    'presets.storageRodLimitFactor',
    'presets.storageRodYFactor',
    'rods',
    'rods.defaultYOffsetM',
  ]),
  'esm/native/features/interior_layout_presets/ops.ts': Object.freeze([
    'presets',
    'presets.fullShelfRows',
    'presets.hangingRodYFactor',
    'presets.hangingShelfRows',
    'presets.mixedRodYFactor',
    'presets.splitLowerRodLimitFactor',
    'presets.splitLowerRodYFactor',
    'presets.splitShelfRows',
    'presets.splitUpperRodLimitFactor',
    'presets.splitUpperRodYFactor',
    'presets.storageRodLimitFactor',
    'presets.storageRodYFactor',
  ]),
  'esm/native/ui/react/tabs/interior_tab_local_state_shared.ts': Object.freeze([
    'shelves',
    'shelves.regularDepthM',
  ]),
});
const APPROVED_CORNER_SYSTEM_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/corner_connector_door_emit_context.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
    'CORNER_CONNECTOR_LAYOUT_POLICY',
  ]),
  'esm/native/builder/corner_connector_door_emit_full.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_connector_door_emit_split.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_connector_door_emit_state.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_connector_door_emit_visuals.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_connector_emit_shared.ts': Object.freeze([
    'CORNER_CONNECTOR_LAYOUT_POLICY',
    'CORNER_CONNECTOR_SHELL_POLICY',
  ]),
  'esm/native/builder/corner_connector_emit_shell_metrics.ts': Object.freeze([
    'CORNER_CONNECTOR_SHELL_POLICY',
  ]),
  'esm/native/builder/corner_connector_emit_shell_panels.ts': Object.freeze([
    'CORNER_CONNECTOR_SHELL_POLICY',
  ]),
  'esm/native/builder/corner_geometry_plan.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
    'CORNER_CONNECTOR_HANDLE_POLICY',
    'CORNER_WING_DRAWER_POLICY',
  ]),
  'esm/native/builder/corner_wing_carcass_selectors.ts': Object.freeze(['CORNER_WING_SELECTOR_POLICY']),
  'esm/native/builder/corner_wing_carcass_shell_ceiling.ts': Object.freeze([
    'CORNER_WING_CEILING_POLICY',
    'CORNER_WING_SELECTOR_POLICY',
  ]),
  'esm/native/builder/corner_wing_carcass_shell_dividers.ts': Object.freeze([
    'CORNER_CONNECTOR_SHELL_POLICY',
    'CORNER_WING_PANEL_POLICY',
  ]),
  'esm/native/builder/corner_wing_carcass_shell_panels.ts': Object.freeze([
    'CORNER_WING_BODY_POLICY',
    'CORNER_WING_PANEL_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_doors_context.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_doors_full.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
    'CORNER_WING_DRAWER_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_doors_rendering.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_doors_scope.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
    'CORNER_WING_CELL_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_doors_split.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
    'CORNER_CONNECTOR_HANDLE_POLICY',
    'CORNER_CONNECTOR_LAYOUT_POLICY',
    'CORNER_WING_DRAWER_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_doors_split_policy.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_doors_state.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
    'CORNER_WING_BODY_POLICY',
    'CORNER_WING_CELL_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_interiors_cell.ts': Object.freeze(['CORNER_WING_INTERIOR_POLICY']),
  'esm/native/builder/corner_wing_extension_cells_config.ts': Object.freeze(['CORNER_WING_CELL_POLICY']),
  'esm/native/builder/corner_wing_extension_cells_dimensions.ts': Object.freeze([
    'CORNER_WING_BODY_POLICY',
    'CORNER_WING_CELL_POLICY',
  ]),
  'esm/native/builder/corner_wing_extension_emit.ts': Object.freeze([
    'CORNER_WING_BASE_LEG_POLICY',
    'CORNER_WING_BODY_POLICY',
  ]),
  'esm/native/builder/corner_wing_hex_cell_geometry.ts': Object.freeze(['CORNER_WING_SELECTOR_POLICY']),
  'esm/native/builder/corner_connector_cornice_shared.ts': Object.freeze([
    'CORNER_CONNECTOR_CORNICE_HIT_POLICY',
  ]),
  'esm/native/builder/corner_state_normalize_layout.ts': Object.freeze([
    'CORNER_CONNECTOR_DOOR_RENDER_POLICY',
    'CORNER_CONNECTOR_LAYOUT_POLICY',
    'CORNER_WING_BODY_POLICY',
  ]),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze([
    'CORNER_CONNECTOR_SHELL_POLICY',
    'CORNER_WING_PANEL_POLICY',
    'CORNER_WING_SELECTOR_POLICY',
  ]),
  'esm/native/builder/corner_wing_cell_interiors_shelves.ts': Object.freeze(['CORNER_WING_INTERIOR_POLICY']),
  'esm/native/builder/corner_wing_cell_interiors_storage.ts': Object.freeze(['CORNER_WING_DRAWER_POLICY']),
  'esm/native/builder/corner_wing_extension_cells_handles.ts': Object.freeze([
    'CORNER_WING_BODY_POLICY',
    'CORNER_WING_CELL_POLICY',
  ]),
  'esm/native/builder/post_build_dimensions_corner.ts': Object.freeze([
    'CORNER_CONNECTOR_LAYOUT_POLICY',
    'CORNER_WING_BODY_POLICY',
  ]),
  'esm/native/features/modules_configuration/corner_cells_ui_defaults.ts': Object.freeze([
    'CORNER_WING_BODY_POLICY',
    'CORNER_WING_CELL_POLICY',
  ]),
  'esm/native/services/canvas_picking_cell_dims_corner_context.ts': Object.freeze([
    'CORNER_CONNECTOR_LAYOUT_POLICY',
    'CORNER_WING_BODY_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['CORNER_SYSTEM_POLICY']),
});

const APPROVED_CORNER_CONNECTOR_INTERIOR_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/corner_connector_interior_rod.ts': Object.freeze([
    'CORNER_CONNECTOR_ATTACH_ROD_POLICY',
  ]),
  'esm/native/builder/corner_connector_interior_special_apply.ts': Object.freeze([
    'CORNER_CONNECTOR_SPECIAL_POST_POLICY',
  ]),
  'esm/native/builder/corner_connector_interior_special_contents.ts': Object.freeze([
    'CORNER_CONNECTOR_FOLDED_CONTENTS_POLICY',
  ]),
  'esm/native/builder/corner_connector_interior_special_metrics.ts': Object.freeze([
    'CORNER_CONNECTOR_SPECIAL_POST_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['CORNER_CONNECTOR_INTERIOR_POLICY']),
});

const APPROVED_CORNER_SYSTEM_LEGACY_FIELD_USAGE = Object.freeze({});

const APPROVED_INTERIOR_STORAGE_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/core_storage_compute_custom.ts': Object.freeze([
    'storage',
    'storage.barrierFrontZOffsetM',
    'storage.barrierHeightM',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/builder/corner_wing_cell_layouts.ts': Object.freeze([
    'storage',
    'storage.barrierFrontZOffsetM',
    'storage.barrierHeightM',
    'storage.barrierWidthClearanceM',
    'storage.barrierWidthMinM',
  ]),
  'esm/native/features/interior_layout_presets/ops.ts': Object.freeze([
    'storage',
    'storage.barrierFrontZOffsetM',
    'storage.barrierHeightM',
  ]),
  'esm/native/features/modules_configuration/module_defaults.ts': Object.freeze([
    'storage',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/features/stack_split/module_config.ts': Object.freeze([
    'storage',
    'storage.defaultLowerShelfSlots',
    'storage.gridDivisionsDefault',
  ]),
});
const APPROVED_DRAWER_SKETCH_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/post_build_sketch_door_cuts_apply.ts': Object.freeze(['DRAWER_SKETCH_DOOR_CUT_POLICY']),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts': Object.freeze([
    'DRAWER_SKETCH_DOOR_CUT_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts': Object.freeze([
    'DRAWER_SKETCH_DOOR_CUT_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_box.ts': Object.freeze(['DRAWER_SKETCH_DOOR_CUT_POLICY']),
  'esm/native/builder/post_build_sketch_door_cuts_intervals.ts': Object.freeze([
    'DRAWER_SKETCH_DOOR_CUT_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_modules.ts': Object.freeze([
    'DRAWER_SKETCH_DOOR_CUT_POLICY',
    'DRAWER_SKETCH_SIZING_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild_visual.ts': Object.freeze([
    'DRAWER_SKETCH_DOOR_CUT_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_contents_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_internal.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_internal_drawer_cassette.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_shared_external_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_plan.ts': Object.freeze([
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_stack_collision.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
  ]),
  'esm/native/features/sketch_drawer_sizing.ts': Object.freeze(['DRAWER_SKETCH_SIZING_POLICY']),
  'esm/native/features/sketch_internal_drawer_cassette.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_config_ops_shelf.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts': Object.freeze([
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/features/sketch_box_regular_external_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_SIZING_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
  ]),
  'esm/native/services/canvas_picking_drawer_cross_family_preview.ts': Object.freeze([
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_SIZING_POLICY',
  ]),
  'esm/native/services/canvas_picking_hover_preview_modes_ext_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_SIZING_POLICY',
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_standard_drawer.ts': Object.freeze([
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_SIZING_POLICY',
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_vertical_stack.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    'DRAWER_SKETCH_SIZING_POLICY',
  ]),

  'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_context.ts': Object.freeze([
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_context.ts': Object.freeze([
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_SIZING_POLICY',
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_SIZING_POLICY',
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
  ]),
  'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_PREVIEW_RENDER_POLICY',
    'DRAWER_SKETCH_SIZING_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['DRAWER_SKETCH_POLICY']),
});
const APPROVED_FRONT_REVEAL_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/post_build_front_reveal_frames_doors.ts': Object.freeze([
    'FRONT_REVEAL_THICKNESS_POLICY',
  ]),
  'esm/native/builder/post_build_front_reveal_frames_drawers.ts': Object.freeze([
    'FRONT_REVEAL_PRESENCE_POLICY',
    'FRONT_REVEAL_THICKNESS_POLICY',
  ]),
  'esm/native/builder/post_build_front_reveal_frames_geometry.ts': Object.freeze([
    'FRONT_REVEAL_GEOMETRY_POLICY',
  ]),
  'esm/native/builder/post_build_front_reveal_frames_runtime.ts': Object.freeze([
    'FRONT_REVEAL_GEOMETRY_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['FRONT_REVEAL_FRAME_POLICY']),
});
const APPROVED_FRONT_REVEAL_LEGACY_DEPENDENCIES = Object.freeze({});
const APPROVED_FRONT_REVEAL_LEGACY_FIELD_USAGE = Object.freeze({});
const APPROVED_HANDLE_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/build_stack_split_lower_setup.ts': Object.freeze([
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]),
  'esm/native/builder/render_ops_primitives.ts': Object.freeze([
    'EDGE_HANDLE_SIZE_POLICY',
    'STANDARD_HANDLE_RENDER_POLICY',
  ]),
  'esm/native/builder/build_handle_policy.ts': Object.freeze(['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY']),
  'esm/native/builder/hinged_doors_module_ops_context.ts': Object.freeze([
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]),
  'esm/native/builder/hinged_doors_module_ops_handle_policy.ts': Object.freeze([
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts': Object.freeze([
    'EDGE_HANDLE_SIZE_POLICY',
    'STANDARD_HANDLE_RENDER_POLICY',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts': Object.freeze([
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]),
  'esm/shared/wardrobe_construction_validation_shared.ts': Object.freeze([
    'EDGE_HANDLE_SIZE_POLICY',
    'STANDARD_HANDLE_RENDER_POLICY',
  ]),
  'esm/native/builder/corner_wing_extension_cells_handles.ts': Object.freeze([
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]),
  'esm/native/builder/build_wardrobe_flow_context_hinged.ts': Object.freeze([
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]),
  'esm/native/builder/corner_connector_door_emit_policy.ts': Object.freeze([
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]),
  'esm/native/builder/edge_handle_profile.ts': Object.freeze(['EDGE_HANDLE_PROFILE_RENDER_POLICY']),
  'esm/native/builder/handles_apply_doors.ts': Object.freeze([
    'EDGE_HANDLE_SIZE_POLICY',
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
    'STANDARD_HANDLE_RENDER_POLICY',
  ]),
  'esm/native/builder/handles_apply_drawers.ts': Object.freeze(['DRAWER_HANDLE_PLACEMENT_POLICY']),
  'esm/native/builder/handles_apply_shared.ts': Object.freeze(['DRAWER_HANDLE_PLACEMENT_POLICY']),
  'esm/native/builder/handles_mesh.ts': Object.freeze([
    'EDGE_HANDLE_SIZE_POLICY',
    'STANDARD_HANDLE_RENDER_POLICY',
  ]),
  'esm/native/builder/hinged_doors_shared.ts': Object.freeze(['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY']),
  'esm/native/builder/render_interior_sketch_boxes_fronts_door_handle_policy.ts': Object.freeze([
    'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
  ]),
  'esm/native/services/canvas_picking_door_action_hover_preview_manual_handle.ts': Object.freeze([
    'EDGE_HANDLE_PROFILE_RENDER_POLICY',
    'EDGE_HANDLE_SIZE_POLICY',
    'STANDARD_HANDLE_RENDER_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['HANDLE_POLICY']),
});
const APPROVED_HANDLE_LEGACY_DEPENDENCIES = Object.freeze({});
const APPROVED_HANDLE_LEGACY_FIELD_USAGE = Object.freeze({});
const APPROVED_CONTENT_VISUAL_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/visuals_contents_folded.ts': Object.freeze([
    'BOOK_CONTENT_VISUAL_POLICY',
    'FOLDED_CLOTHES_VISUAL_POLICY',
  ]),
  'esm/native/builder/visuals_contents_hanger.ts': Object.freeze(['HANGER_VISUAL_POLICY']),
  'esm/native/builder/visuals_contents_hanging.ts': Object.freeze(['HANGING_CLOTHES_VISUAL_POLICY']),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze([
    'FOLDED_CLOTHES_VISUAL_POLICY',
    'HANGER_VISUAL_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze([
    'BOOK_CONTENT_VISUAL_POLICY',
    'FOLDED_CLOTHES_VISUAL_POLICY',
    'HANGER_VISUAL_POLICY',
    'HANGING_CLOTHES_VISUAL_POLICY',
  ]),
});
const APPROVED_SKETCH_BOX_CLASSIC_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts': Object.freeze([
    'SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY']),
});
const APPROVED_CONTENT_VISUAL_LEGACY_DEPENDENCIES = Object.freeze({});
const APPROVED_CONTENT_VISUAL_LEGACY_FIELD_USAGE = Object.freeze({});
const APPROVED_DRAWER_SKETCH_LEGACY_FIELD_USAGE = Object.freeze({});
const APPROVED_DRAWER_EXTERNAL_INTERNAL_LEGACY_FIELD_USAGE = Object.freeze({});
const APPROVED_DOOR_SYSTEM_LEGACY_DEPENDENCIES = Object.freeze({
  'esm/native/builder/visuals_chest_mode_build.ts': ['DOOR_SYSTEM_DIMENSIONS@static-import'],
});
const APPROVED_DOOR_SYSTEM_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/visuals_chest_mode_build.ts': ['hinged', 'hinged.insetRevealM'],
});
const APPROVED_CORNICE_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/corner_wing_cornice_path.ts': Object.freeze([
    'common',
    'common.epsilonM',
    'common.minSegmentLengthM',
    'common.thetaClampM',
    'profile',
    'profile.seamEpsilonM',
  ]),
  'esm/native/builder/corner_wing_cornice_profile.ts': Object.freeze([
    'common',
    'common.epsilonM',
    'common.minBoxDimensionM',
    'common.yLiftM',
    'profile',
    'profile.backStepM',
    'profile.baseBandEpsilonM',
    'profile.baseHeightM',
    'profile.baseHeightRatio',
    'profile.baseSealEpsilonM',
    'profile.capHeightRatio',
    'profile.capOutM',
    'profile.capRiseM',
    'profile.heightM',
    'profile.insetOnRoofM',
    'profile.minOverhangM',
    'profile.miterEpsilonZM',
    'profile.overhangXM',
    'profile.overhangZM',
    'profile.slopeHeightM',
    'profile.slopeHeightRatio',
    'profile.slopeOutM',
    'profile.step1OutM',
    'profile.step2OutM',
    'profile.topLipOutM',
    'profile.xMaxDefaultM',
  ]),
  'esm/native/builder/corner_wing_cornice_wave.ts': Object.freeze([
    'common',
    'common.minBoxDimensionM',
    'common.minSegmentLengthM',
    'common.yLiftM',
    'wave',
    'wave.amplitudeMaxM',
    'wave.amplitudeMinM',
    'wave.amplitudeRatio',
    'wave.cycles',
    'wave.fallbackWoodThicknessM',
    'wave.frameThicknessMaxM',
    'wave.frameThicknessMinM',
    'wave.maxHeightM',
    'wave.sampleCountMax',
    'wave.sampleCountMin',
    'wave.sampleSpacingM',
  ]),
});
const APPROVED_CHEST_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/visuals_chest_mode_build.ts': Object.freeze([
    'backInsetM',
    'backPanelHeightClearanceM',
    'backPanelWidthClearanceM',
    'backThicknessM',
    'chest',
    'connectorBackInsetM',
    'connectorDepthM',
    'connectorHeightClearanceM',
    'connectorWidthClearanceM',
    'drawerBoxDepthClearanceM',
    'drawerBoxHeightClearanceM',
    'drawerBoxWidthClearanceM',
    'drawerFrontThicknessM',
    'drawerGapM',
    'drawerWidthClearanceM',
    'openOffsetZM',
    'wheels',
    'wheels.forkDepthM',
    'wheels.forkHeightM',
    'wheels.forkWidthM',
    'wheels.plateDepthM',
    'wheels.plateHeightM',
    'wheels.plateWidthM',
    'wheels.radiusM',
    'wheels.thicknessM',
  ]),
  'esm/native/builder/visuals_chest_mode_inputs.ts': Object.freeze(['chest', 'wheels', 'wheels.heightM']),
});

function read(relativePath) {
  return fs.readFileSync(relativePath, 'utf8');
}

function walkSourceFiles(directory, visit) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(absolute, visit);
    } else if (/\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) {
      visit(absolute);
    }
  }
}

function isStackSplitFacadeSymbol(symbol) {
  return symbol.startsWith('DEFAULT_STACK_SPLIT_') || symbol.startsWith('STACK_SPLIT_');
}

function normalizedSymbolUsage(usage) {
  return Object.fromEntries(
    [...usage.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([file, symbols]) => [file, [...symbols].sort()])
  );
}

function matchesOwnerSpecifier(specifier, ownerSpecifier) {
  return specifier === ownerSpecifier || specifier.endsWith(`/${ownerSpecifier}`);
}

function collectOwnerImports(sources, ownerSpecifier) {
  const usage = new Map();
  for (const [file, source, analyzedDependencies] of sources) {
    const relativeFile = file.replaceAll('\\', '/');
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      if (!matchesOwnerSpecifier(dependency.specifier, ownerSpecifier)) continue;
      if (!usage.has(relativeFile)) usage.set(relativeFile, new Set());
      for (const symbol of dependency.importedSymbols) usage.get(relativeFile).add(symbol);
    }
  }
  return normalizedSymbolUsage(usage);
}

function collectFacadeSymbolImports(sources, approvedSymbols) {
  const usage = new Map();
  const symbols = new Set(approvedSymbols);
  for (const [file, source, analyzedDependencies] of sources) {
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      if (dependency.syntax !== 'static-import' || !dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      const matched = dependency.importedSymbols.filter(symbol => symbols.has(symbol));
      if (!matched.length) continue;
      const relativeFile = file.replaceAll('\\', '/');
      if (!usage.has(relativeFile)) usage.set(relativeFile, new Set());
      for (const symbol of matched) usage.get(relativeFile).add(symbol);
    }
  }
  return normalizedSymbolUsage(usage);
}

function readAstBindingName(node) {
  if (typeof node?.name === 'string') return node.name;
  if (typeof node?.value === 'string') return node.value;
  return null;
}

function readAstMemberPath(node) {
  const properties = [];
  let current = node;
  while (current?.type === 'MemberExpression') {
    const propertyName = readAstBindingName(current.property);
    if (!propertyName) return null;
    properties.unshift(propertyName);
    current = current.object;
  }
  const rootName = readAstBindingName(current);
  return rootName ? { rootName, properties } : null;
}

function collectVariableDeclarators(sourceFile) {
  const declarators = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator') declarators.push(node);
  });
  return declarators;
}

function readObjectPatternEntries(pattern, parentPath = []) {
  if (pattern?.type !== 'ObjectPattern') return [];
  const entries = [];
  for (const property of pattern.properties || []) {
    if (property?.type !== 'Property') continue;
    const key = readAstBindingName(property.key);
    if (!key) continue;
    const keyPath = [...parentPath, key];
    if (property.value?.type === 'ObjectPattern') {
      entries.push(...readObjectPatternEntries(property.value, keyPath));
      continue;
    }
    const localName = readAstBindingName(property.value);
    entries.push({ key: keyPath.join('.'), keyPath, localName });
  }
  return entries;
}

function collectShellGridFieldUsage(sources) {
  const usage = new Map();
  const gridFields = new Set(['drawerGridDivisions', 'drawerSplitGridLineIndex']);
  for (const [file, source, analyzedDependencies] of sources) {
    const localShellBindings = new Set();
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      for (const binding of dependency.bindings || []) {
        if (binding.importedName === 'CARCASS_SHELL_DIMENSIONS' && binding.localName) {
          localShellBindings.add(binding.localName);
        }
      }
    }
    if (!localShellBindings.size) continue;

    const sourceFile = createSourceFile(file, source, { label: 'dimension_grid_contract' });
    const declarators = collectVariableDeclarators(sourceFile);
    const shellAliases = new Set(localShellBindings);
    let changed = true;
    while (changed) {
      changed = false;
      for (const declaration of declarators) {
        const initName = readAstBindingName(declaration.init);
        const localName = readAstBindingName(declaration.id);
        if (initName && shellAliases.has(initName) && localName && !shellAliases.has(localName)) {
          shellAliases.add(localName);
          changed = true;
        }
      }
    }

    const fields = new Set();
    for (const declaration of declarators) {
      const initName = readAstBindingName(declaration.init);
      if (!initName || !shellAliases.has(initName)) continue;
      for (const { key } of readObjectPatternEntries(declaration.id)) {
        if (gridFields.has(key)) fields.add(key);
      }
    }
    walkAst(sourceFile, node => {
      if (node?.type !== 'MemberExpression') return;
      const objectName = readAstBindingName(node.object);
      if (!objectName || !shellAliases.has(objectName)) return;
      const propertyName = readAstBindingName(node.property);
      if (propertyName && gridFields.has(propertyName)) fields.add(propertyName);
    });
    if (fields.size) usage.set(file.replaceAll('\\', '/'), fields);
  }
  return normalizedSymbolUsage(usage);
}

function collectDimensionFacadeBroadDependencies(sources) {
  const dependencies = [];
  for (const [file, source, analyzedDependencies] of sources) {
    const analyzed = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of analyzed) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      if (dependency.syntax !== 'dynamic-import' && !dependency.importedSymbols.includes('*')) continue;
      dependencies.push({ file: file.replaceAll('\\', '/'), syntax: dependency.syntax });
    }
  }
  return dependencies.sort((left, right) =>
    `${left.file}:${left.syntax}`.localeCompare(`${right.file}:${right.syntax}`)
  );
}

function collectLegacyDimensionSymbolDependencies(sources, symbol, ownerSpecifier) {
  const usage = new Map();
  const approvedSymbols = new Set(Array.isArray(symbol) ? symbol : [symbol]);
  for (const [file, source, analyzedDependencies] of sources) {
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      if (matchesOwnerSpecifier(dependency.specifier, ownerSpecifier)) continue;
      const matchedSymbols = dependency.importedSymbols.filter(importedSymbol =>
        approvedSymbols.has(importedSymbol)
      );
      if (!matchedSymbols.length) continue;
      const relativeFile = file.replaceAll('\\', '/');
      if (!usage.has(relativeFile)) usage.set(relativeFile, new Set());
      for (const matchedSymbol of matchedSymbols) {
        usage.get(relativeFile).add(`${matchedSymbol}@${dependency.syntax}`);
      }
    }
  }
  return normalizedSymbolUsage(usage);
}

function readPolicyMemberPath(node) {
  const properties = [];
  let current = node;
  while (current?.type === 'MemberExpression') {
    let propertyName = readAstBindingName(current.property);
    if (current.computed && current.property?.type === 'Identifier') propertyName = '<computed>';
    if (!propertyName) propertyName = '<computed>';
    properties.unshift(propertyName);
    current = current.object;
  }
  const rootName = readAstBindingName(current);
  return rootName ? { rootName, properties } : null;
}

function collectLegacyDimensionPolicyFieldUsage(sources, symbol, ownerSpecifier) {
  const usage = new Map();

  for (const [file, source, analyzedDependencies] of sources) {
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    const rootAliases = new Set();
    const namespaceAliases = new Set();
    for (const dependency of dependencies) {
      if (matchesOwnerSpecifier(dependency.specifier, ownerSpecifier)) continue;
      for (const binding of dependency.bindings || []) {
        if (binding.importedName === symbol && binding.localName) rootAliases.add(binding.localName);
        if (
          binding.importedName === '*' &&
          binding.localName &&
          (dependency.specifier.includes(FACADE_SPECIFIER) || source.includes(symbol))
        ) {
          namespaceAliases.add(binding.localName);
        }
      }
    }
    if (!rootAliases.size && !namespaceAliases.size) continue;

    const sourceFile = createSourceFile(file, source, { label: 'legacy_dimension_policy_contract' });
    const declarators = collectVariableDeclarators(sourceFile);
    const aliasPaths = new Map([...rootAliases].map(alias => [alias, []]));

    const classifyPath = memberPath => {
      if (!memberPath) return null;
      if (aliasPaths.has(memberPath.rootName)) {
        return [...aliasPaths.get(memberPath.rootName), ...memberPath.properties];
      }
      if (namespaceAliases.has(memberPath.rootName) && memberPath.properties[0] === symbol) {
        return memberPath.properties.slice(1);
      }
      return null;
    };

    let changed = true;
    while (changed) {
      changed = false;
      for (const declaration of declarators) {
        const localName = readAstBindingName(declaration.id);
        const initName = readAstBindingName(declaration.init);
        const properties =
          classifyPath(readPolicyMemberPath(declaration.init)) ||
          (initName && aliasPaths.has(initName) ? aliasPaths.get(initName) : null);

        if (localName && properties && !aliasPaths.has(localName)) {
          aliasPaths.set(localName, properties);
          changed = true;
        }

        for (const { key, keyPath, localName: destructuredLocal } of readObjectPatternEntries(
          declaration.id
        )) {
          if (!destructuredLocal) continue;
          if (properties && !aliasPaths.has(destructuredLocal)) {
            aliasPaths.set(destructuredLocal, [...properties, ...keyPath]);
            changed = true;
          }
          if (namespaceAliases.has(initName) && key === symbol && !aliasPaths.has(destructuredLocal)) {
            aliasPaths.set(destructuredLocal, []);
            changed = true;
          }
        }
      }
    }

    const fields = new Set();
    const recordProperties = properties => {
      if (!properties?.length) return;
      for (let index = 1; index <= properties.length; index += 1) {
        fields.add(properties.slice(0, index).join('.'));
      }
    };

    for (const declaration of declarators) {
      const initName = readAstBindingName(declaration.init);
      const properties =
        classifyPath(readPolicyMemberPath(declaration.init)) ||
        (initName && aliasPaths.has(initName) ? aliasPaths.get(initName) : null);
      if (!properties) continue;
      recordProperties(properties);
      for (const { keyPath } of readObjectPatternEntries(declaration.id)) {
        recordProperties([...properties, ...keyPath]);
      }
    }
    walkAst(sourceFile, node => {
      if (node?.type === 'MemberExpression') recordProperties(classifyPath(readPolicyMemberPath(node)));
    });
    if (fields.size) usage.set(file.replaceAll('\\', '/'), fields);
  }

  return normalizedSymbolUsage(usage);
}

function collectLegacyDrawerExternalInternalFieldUsage(sources) {
  const usage = collectLegacyDimensionPolicyFieldUsage(
    sources,
    'DRAWER_DIMENSIONS',
    'dimensions/external_drawer_policy.js'
  );
  const filtered = {};
  for (const [file, fields] of Object.entries(usage)) {
    const externalInternalFields = fields.filter(
      field => field === '<computed>' || field.startsWith('external') || field.startsWith('internal')
    );
    if (externalInternalFields.length) filtered[file] = externalInternalFields;
  }
  return filtered;
}

function collectLegacyDrawerSketchFieldUsage(sources) {
  const usage = collectLegacyDimensionPolicyFieldUsage(
    sources,
    'DRAWER_DIMENSIONS',
    'dimensions/drawer_sketch_policy.js'
  );
  const filtered = {};
  for (const [file, fields] of Object.entries(usage)) {
    const sketchFields = fields.filter(field => field === '<computed>' || field.startsWith('sketch'));
    if (sketchFields.length) filtered[file] = sketchFields;
  }
  return filtered;
}

function collectLegacyInteriorStorageFieldUsage(sources) {
  const usage = collectLegacyDimensionPolicyFieldUsage(
    sources,
    'INTERIOR_FITTINGS_DIMENSIONS',
    'dimensions/interior_storage_policy.js'
  );
  const filtered = {};
  for (const [file, fields] of Object.entries(usage)) {
    const storageFields = fields.filter(field => field === '<computed>' || field.startsWith('storage'));
    if (storageFields.length) filtered[file] = storageFields;
  }
  return filtered;
}

function collectLegacyInteriorFittingsFieldUsage(sources) {
  const usage = collectLegacyDimensionPolicyFieldUsage(
    sources,
    'INTERIOR_FITTINGS_DIMENSIONS',
    'dimensions/interior_fittings_policy.js'
  );
  const filtered = {};
  for (const [file, fields] of Object.entries(usage)) {
    const fittingsFields = fields.filter(
      field =>
        field === '<computed>' ||
        field.startsWith('shelves') ||
        field.startsWith('pins') ||
        field.startsWith('rods') ||
        field.startsWith('presets')
    );
    if (fittingsFields.length) filtered[file] = fittingsFields;
  }
  return filtered;
}

function collectLegacyCornerSystemFieldUsage(sources) {
  return collectLegacyDimensionPolicyFieldUsage(
    sources,
    'CORNER_WING_DIMENSIONS',
    'dimensions/corner_system_policy.js'
  );
}

function collectOwnerDependencyStatements(sources, ownerSpecifier) {
  const statements = new Map();
  for (const [file, source, analyzedDependencies] of sources) {
    const relativeFile = file.replaceAll('\\', '/');
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      if (!matchesOwnerSpecifier(dependency.specifier, ownerSpecifier)) continue;
      if (!statements.has(relativeFile)) statements.set(relativeFile, new Set());
      statements.get(relativeFile).add(dependency.statementStart);
    }
  }
  return Object.fromEntries(
    [...statements.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([file, starts]) => [file, starts.size])
  );
}

function collectModuleReexports(sources) {
  const dependencies = [];
  for (const [file, source, analyzedDependencies] of sources) {
    const analyzed = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of analyzed) {
      if (!String(dependency.syntax).includes('re-export')) continue;
      dependencies.push({
        file: file.replaceAll('\\', '/'),
        specifier: dependency.specifier,
        syntax: dependency.syntax,
        symbols: [...dependency.importedSymbols].sort(),
      });
    }
  }
  return dependencies.sort((left, right) =>
    `${left.file}:${left.specifier}:${left.syntax}`.localeCompare(
      `${right.file}:${right.specifier}:${right.syntax}`
    )
  );
}

function collectMemberPropertyUsage(sources, propertyName) {
  const usage = new Map();
  for (const [file, source] of sources) {
    const sourceFile = createSourceFile(file, source, { label: 'dimension_member_property_contract' });
    const fields = new Set();
    walkAst(sourceFile, node => {
      if (node?.type !== 'MemberExpression') return;
      if (readAstBindingName(node.property) === propertyName) fields.add(propertyName);
    });
    if (fields.size) usage.set(file.replaceAll('\\', '/'), fields);
  }
  return normalizedSymbolUsage(usage);
}

function collectChestLegacyFieldUsage(sources) {
  const usage = new Map();

  for (const [file, source, analyzedDependencies] of sources) {
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    const baseAliases = new Set();
    const namespaceAliases = new Set();
    for (const dependency of dependencies) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      for (const binding of dependency.bindings || []) {
        if (binding.importedName === 'CARCASS_BASE_DIMENSIONS' && binding.localName) {
          baseAliases.add(binding.localName);
        }
        if (binding.importedName === '*' && binding.localName) namespaceAliases.add(binding.localName);
      }
    }
    if (!baseAliases.size && !namespaceAliases.size) continue;

    const sourceFile = createSourceFile(file, source, { label: 'chest_legacy_dimension_contract' });
    const declarators = collectVariableDeclarators(sourceFile);
    const chestAliases = new Set();
    const wheelAliases = new Set();

    const classifyPath = path => {
      if (!path) return null;
      if (baseAliases.has(path.rootName)) return { kind: 'base', properties: path.properties };
      if (namespaceAliases.has(path.rootName) && path.properties[0] === 'CARCASS_BASE_DIMENSIONS') {
        return { kind: 'base', properties: path.properties.slice(1) };
      }
      if (chestAliases.has(path.rootName)) return { kind: 'chest', properties: path.properties };
      if (wheelAliases.has(path.rootName)) return { kind: 'wheels', properties: path.properties };
      return null;
    };

    let changed = true;
    while (changed) {
      changed = false;
      for (const declaration of declarators) {
        const localName = readAstBindingName(declaration.id);
        const classified = classifyPath(readAstMemberPath(declaration.init));
        const initName = readAstBindingName(declaration.init);
        const directKind = initName
          ? baseAliases.has(initName)
            ? 'base'
            : chestAliases.has(initName)
              ? 'chest'
              : wheelAliases.has(initName)
                ? 'wheels'
                : null
          : null;
        const kind = classified?.kind || directKind;
        const properties = classified?.properties || [];

        if (localName) {
          if (kind === 'base' && properties.length === 0 && !baseAliases.has(localName)) {
            baseAliases.add(localName);
            changed = true;
          } else if (
            ((kind === 'base' && properties[0] === 'chest') ||
              (kind === 'chest' && properties.length === 0)) &&
            !chestAliases.has(localName)
          ) {
            chestAliases.add(localName);
            changed = true;
          } else if (
            ((kind === 'chest' && properties[0] === 'wheels') ||
              (kind === 'base' && properties[0] === 'chest' && properties[1] === 'wheels') ||
              (kind === 'wheels' && properties.length === 0)) &&
            !wheelAliases.has(localName)
          ) {
            wheelAliases.add(localName);
            changed = true;
          }
        }

        for (const { key, localName: destructuredLocal } of readObjectPatternEntries(declaration.id)) {
          if (kind === 'base' && properties.length === 0 && key === 'chest' && destructuredLocal) {
            if (!chestAliases.has(destructuredLocal)) {
              chestAliases.add(destructuredLocal);
              changed = true;
            }
          }
          if (kind === 'chest' && properties.length === 0 && key === 'wheels' && destructuredLocal) {
            if (!wheelAliases.has(destructuredLocal)) {
              wheelAliases.add(destructuredLocal);
              changed = true;
            }
          }
        }
      }
    }

    const fields = new Set();
    const recordClassifiedUsage = classified => {
      if (!classified) return;
      let properties = classified.properties;
      if (classified.kind === 'base') {
        if (properties[0] !== 'chest') return;
        fields.add('chest');
        properties = properties.slice(1);
      } else if (classified.kind === 'chest') {
        fields.add('chest');
      } else {
        fields.add('chest');
        fields.add('wheels');
        if (properties[0]) fields.add(`wheels.${properties[0]}`);
        return;
      }
      if (!properties[0]) return;
      fields.add(properties[0]);
      if (properties[0] === 'wheels' && properties[1]) fields.add(`wheels.${properties[1]}`);
    };

    for (const declaration of declarators) {
      const classified =
        classifyPath(readAstMemberPath(declaration.init)) ||
        (() => {
          const initName = readAstBindingName(declaration.init);
          if (initName && baseAliases.has(initName)) return { kind: 'base', properties: [] };
          if (initName && chestAliases.has(initName)) return { kind: 'chest', properties: [] };
          if (initName && wheelAliases.has(initName)) return { kind: 'wheels', properties: [] };
          return null;
        })();
      if (!classified) continue;
      for (const { key } of readObjectPatternEntries(declaration.id)) {
        if (classified.kind === 'base' && classified.properties.length === 0 && key === 'chest') {
          fields.add('chest');
        } else if (classified.kind === 'chest' && classified.properties.length === 0) {
          fields.add('chest');
          fields.add(key);
        } else if (classified.kind === 'wheels' && classified.properties.length === 0) {
          fields.add('chest');
          fields.add('wheels');
          fields.add(`wheels.${key}`);
        }
      }
    }
    walkAst(sourceFile, node => {
      if (node?.type !== 'MemberExpression') return;
      recordClassifiedUsage(classifyPath(readAstMemberPath(node)));
    });
    if (fields.size) usage.set(file.replaceAll('\\', '/'), fields);
  }

  return normalizedSymbolUsage(usage);
}

function collectCorniceLegacyFieldUsage(sources) {
  const usage = new Map();
  const sectionNames = new Set(['common', 'wave', 'profile']);

  for (const [file, source, analyzedDependencies] of sources) {
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    const rootAliases = new Set();
    const namespaceAliases = new Set();
    for (const dependency of dependencies) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      for (const binding of dependency.bindings || []) {
        if (binding.importedName === 'CARCASS_CORNICE_DIMENSIONS' && binding.localName) {
          rootAliases.add(binding.localName);
        }
        if (binding.importedName === '*' && binding.localName) namespaceAliases.add(binding.localName);
      }
    }
    if (!rootAliases.size && !namespaceAliases.size) continue;

    const sourceFile = createSourceFile(file, source, { label: 'cornice_legacy_dimension_contract' });
    const declarators = collectVariableDeclarators(sourceFile);
    const sectionAliases = new Map();

    const classifyPath = memberPath => {
      if (!memberPath) return null;
      if (rootAliases.has(memberPath.rootName)) return memberPath.properties;
      if (
        namespaceAliases.has(memberPath.rootName) &&
        memberPath.properties[0] === 'CARCASS_CORNICE_DIMENSIONS'
      ) {
        return memberPath.properties.slice(1);
      }
      const section = sectionAliases.get(memberPath.rootName);
      return section ? [section, ...memberPath.properties] : null;
    };

    let changed = true;
    while (changed) {
      changed = false;
      for (const declaration of declarators) {
        const localName = readAstBindingName(declaration.id);
        const initName = readAstBindingName(declaration.init);
        const path = classifyPath(readAstMemberPath(declaration.init));
        const directPath = initName
          ? rootAliases.has(initName)
            ? []
            : sectionAliases.has(initName)
              ? [sectionAliases.get(initName)]
              : null
          : null;
        const properties = path || directPath;

        if (localName && properties) {
          if (properties.length === 0 && !rootAliases.has(localName)) {
            rootAliases.add(localName);
            changed = true;
          } else if (
            sectionNames.has(properties[0]) &&
            properties.length === 1 &&
            sectionAliases.get(localName) !== properties[0]
          ) {
            sectionAliases.set(localName, properties[0]);
            changed = true;
          }
        }

        for (const { key, localName: destructuredLocal } of readObjectPatternEntries(declaration.id)) {
          if (!destructuredLocal) continue;
          if (properties?.length === 0 && sectionNames.has(key)) {
            if (sectionAliases.get(destructuredLocal) !== key) {
              sectionAliases.set(destructuredLocal, key);
              changed = true;
            }
          }
          if (
            namespaceAliases.has(initName) &&
            key === 'CARCASS_CORNICE_DIMENSIONS' &&
            !rootAliases.has(destructuredLocal)
          ) {
            rootAliases.add(destructuredLocal);
            changed = true;
          }
        }
      }
    }

    const fields = new Set();
    const recordProperties = properties => {
      if (!properties?.length || !sectionNames.has(properties[0])) return;
      fields.add(properties[0]);
      if (properties[1]) fields.add(`${properties[0]}.${properties[1]}`);
    };

    for (const declaration of declarators) {
      const initName = readAstBindingName(declaration.init);
      const properties =
        classifyPath(readAstMemberPath(declaration.init)) ||
        (initName && rootAliases.has(initName)
          ? []
          : initName && sectionAliases.has(initName)
            ? [sectionAliases.get(initName)]
            : null);
      if (!properties) continue;
      recordProperties(properties);
      for (const { key } of readObjectPatternEntries(declaration.id)) {
        if (properties.length === 0 && sectionNames.has(key)) fields.add(key);
        if (properties.length === 1 && sectionNames.has(properties[0])) {
          fields.add(properties[0]);
          fields.add(`${properties[0]}.${key}`);
        }
      }
    }
    walkAst(sourceFile, node => {
      if (node?.type === 'MemberExpression') recordProperties(classifyPath(readAstMemberPath(node)));
    });
    if (fields.size) usage.set(file.replaceAll('\\', '/'), fields);
  }

  return normalizedSymbolUsage(usage);
}

function collectDimensionFacadeExportSurface(source) {
  const byKind = { value: new Set(), type: new Set() };
  for (const entry of collectNamedModuleExports('esm/shared/wardrobe_dimension_tokens_shared.ts', source)) {
    byKind[entry.kind].add(entry.exportedName);
  }
  return {
    value: [...byKind.value].sort(),
    type: [...byKind.type].sort(),
  };
}

function assertApprovedPublicDimensionFacadeExports(actual) {
  const added = {};
  const removed = {};
  for (const kind of ['value', 'type']) {
    const approved = new Set(APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS[kind]);
    const observed = new Set(actual[kind]);
    added[kind] = actual[kind].filter(symbol => !approved.has(symbol));
    removed[kind] = APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS[kind].filter(symbol => !observed.has(symbol));
  }
  assert.deepEqual(
    actual,
    APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS,
    `public dimensions wildcard surface changed and requires explicit review:\n${JSON.stringify(
      {
        approved: APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS,
        actual,
        added,
        removed,
        proposal: added.value.length || added.type.length ? null : actual,
      },
      null,
      2
    )}`
  );
}

function collectStackSplitFacadeUsage(sources) {
  const imports = new Map();
  const reexports = new Map();
  const wildcardDependencies = [];

  for (const [file, source] of sources) {
    if (!source.includes(FACADE_SPECIFIER)) continue;
    const relativeFile = file.replaceAll('\\', '/');
    for (const dependency of analyzeModuleDependencies(file, source).imports) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      if (dependency.importedSymbols.includes('*')) {
        wildcardDependencies.push({ file: relativeFile, syntax: dependency.syntax });
        continue;
      }
      const stackSymbols = dependency.importedSymbols.filter(isStackSplitFacadeSymbol);
      if (!stackSymbols.length) continue;
      const target = dependency.syntax === 'static-import' ? imports : reexports;
      if (!target.has(relativeFile)) target.set(relativeFile, new Set());
      for (const symbol of stackSymbols) target.get(relativeFile).add(symbol);
    }
  }

  return {
    imports: normalizedSymbolUsage(imports),
    reexports: normalizedSymbolUsage(reexports),
    wildcardDependencies,
  };
}

function diffApprovedSymbolUsage(actual, approved) {
  const unapproved = [];
  const stale = [];
  for (const [file, symbols] of Object.entries(actual)) {
    const approvedSymbols = new Set(approved[file] || []);
    for (const symbol of symbols) {
      if (!approvedSymbols.has(symbol)) unapproved.push({ file, symbol });
    }
  }
  for (const [file, symbols] of Object.entries(approved)) {
    const actualSymbols = new Set(actual[file] || []);
    for (const symbol of symbols) {
      if (!actualSymbols.has(symbol)) stale.push({ file, symbol, action: 'remove-from-allowlist' });
    }
  }
  return { unapproved, stale };
}

function assertApprovedSymbolUsage(actual, approved, label) {
  const diff = diffApprovedSymbolUsage(actual, approved);
  const proposal = {
    contract: label,
    reviewRequired: diff.unapproved.length > 0,
    approved,
    actual,
    unapproved: diff.unapproved,
    staleAllowlistEntries: diff.stale,
    proposedAllowlist:
      diff.unapproved.length === 0 && diff.stale.length > 0 ? Object.freeze({ ...actual }) : null,
  };
  assert.deepEqual(
    actual,
    approved,
    `${label} drifted; new usage is review-blocked and stale entries must be removed:\n${JSON.stringify(proposal, null, 2)}`
  );
}

function assertApprovedDimensionFacadeBroadDependencies(actual) {
  assert.deepEqual(
    actual,
    APPROVED_DIMENSION_FACADE_BROAD_DEPENDENCIES,
    `dimension facade namespace/wildcard/dynamic dependency surface changed and requires review:\n${JSON.stringify(
      {
        approved: APPROVED_DIMENSION_FACADE_BROAD_DEPENDENCIES,
        actual,
      },
      null,
      2
    )}`
  );
}

function assertApprovedStackSplitFacadeSymbols(actual) {
  assert.deepEqual(
    actual,
    APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
    `Stack Split facade symbol surface changed and requires review:\n${JSON.stringify({
      approved: APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
      actual,
    })}`
  );
}

test('[dimension-foundation] focused owners hold units, defaults, limits, and stack-split policy', () => {
  const facade = read('esm/shared/wardrobe_dimension_tokens_shared.ts');
  const units = read('esm/shared/dimensions/units.ts');
  const defaults = read('esm/shared/dimensions/wardrobe_defaults.ts');
  const limits = read('esm/shared/dimensions/product_limits.ts');
  const stackSplitPolicy = read('esm/shared/dimensions/stack_split_policy.ts');
  const stackSplitRenderPolicy = read('esm/shared/dimensions/stack_split_render_policy.ts');
  const stackSplitFeature = read('esm/native/features/stack_split/stack_split.ts');
  const platformOverhang = read('esm/native/features/platform_overhang_support.ts');
  const decorativeSeparator = read('esm/native/builder/build_stack_split_decorative_separator.ts');
  const carcassShellPolicy = read('esm/shared/dimensions/carcass_shell_policy.ts');
  const carcassInteriorPolicy = read('esm/shared/dimensions/carcass_interior_policy.ts');
  const carcassInteriorGridPolicy = read('esm/shared/dimensions/carcass_interior_grid_policy.ts');
  const basePlinthPolicy = read('esm/shared/dimensions/base_plinth_policy.ts');
  const baseLegPolicy = read('esm/shared/dimensions/base_leg_policy.ts');
  const basePlatformRenderPolicy = read('esm/shared/dimensions/base_platform_render_policy.ts');
  const chestStructuralPolicy = read('esm/shared/dimensions/chest_structural_policy.ts');
  const materialThicknessPolicy = read('esm/shared/dimensions/material_thickness_policy.ts');
  const carcassCorniceRenderPolicy = read('esm/shared/dimensions/carcass_cornice_render_policy.ts');
  const chestModePolicy = read('esm/shared/dimensions/chest_mode_policy.ts');
  const doorSystemPolicy = read('esm/shared/dimensions/door_system_policy.ts');
  const doorMountThicknessPolicy = read('esm/shared/dimensions/door_mount_thickness_policy.ts');
  const doorVisualPolicy = read('esm/shared/dimensions/door_visual_policy.ts');
  const doorTrimPolicy = read('esm/shared/dimensions/door_trim_policy.ts');
  const externalDrawerPolicy = read('esm/shared/dimensions/external_drawer_policy.ts');
  const internalDrawerPolicy = read('esm/shared/dimensions/internal_drawer_policy.ts');
  const interiorFittingsPolicy = read('esm/shared/dimensions/interior_fittings_policy.ts');
  const interiorStoragePolicy = read('esm/shared/dimensions/interior_storage_policy.ts');
  const cornerSystemPolicy = read('esm/shared/dimensions/corner_system_policy.ts');
  const drawerSketchPolicy = read('esm/shared/dimensions/drawer_sketch_policy.ts');
  const frontRevealFramePolicy = read('esm/shared/dimensions/front_reveal_frame_policy.ts');
  const handlePolicy = read('esm/shared/dimensions/handle_policy.ts');
  const contentVisualPolicy = read('esm/shared/dimensions/content_visual_policy.ts');
  const sketchBoxClassicDoorVisualPolicy = read(
    'esm/shared/dimensions/sketch_box_classic_door_visual_policy.ts'
  );

  assert.match(facade, /from '\.\/dimensions\/units\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/wardrobe_defaults\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/product_limits\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/stack_split_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/stack_split_render_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/carcass_shell_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/carcass_interior_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/base_plinth_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/base_leg_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/chest_structural_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/material_thickness_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/carcass_cornice_render_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/chest_mode_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/door_system_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/door_mount_thickness_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/door_visual_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/door_trim_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/external_drawer_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/internal_drawer_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/interior_fittings_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/corner_system_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/drawer_sketch_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/front_reveal_frame_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/handle_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/content_visual_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/sketch_box_classic_door_visual_policy\.js'/u);
  assert.doesNotMatch(facade, /export const WARDROBE_DEFAULTS =/u);
  assert.doesNotMatch(facade, /export const WARDROBE_LIMITS =/u);

  assert.match(units, /export type Millimeters/u);
  assert.match(units, /export type WorldUnits/u);
  assert.match(units, /export function centimetersToMeters\(/u);
  assert.match(defaults, /export const WARDROBE_DEFAULTS = Object\.freeze/u);
  assert.match(limits, /export const WARDROBE_LIMITS = Object\.freeze/u);
  assert.match(stackSplitPolicy, /export const STACK_SPLIT_POLICY = Object\.freeze/u);
  assert.match(stackSplitPolicy, /lowerHeightCm: centimeters\(60\)/u);
  assert.match(stackSplitPolicy, /gapM: meters\(0\.002\)/u);
  assert.match(stackSplitRenderPolicy, /visibleHeightM: meters\(0\.039\)/u);
  assert.match(stackSplitRenderPolicy, /stackSplitCentimetersToMeters/u);
  assert.match(carcassShellPolicy, /export const CARCASS_SHELL_DIMENSIONS = Object\.freeze/u);
  assert.match(carcassInteriorPolicy, /export const CARCASS_INTERIOR_DIMENSIONS = Object\.freeze/u);
  assert.match(carcassInteriorPolicy, /CARCASS_SHELL_DIMENSIONS\.internalBackInsetM/u);
  assert.match(carcassInteriorGridPolicy, /export const CARCASS_INTERIOR_GRID_POLICY = Object\.freeze/u);
  assert.match(carcassShellPolicy, /CARCASS_INTERIOR_GRID_POLICY\.divisions/u);
  assert.match(carcassShellPolicy, /CARCASS_INTERIOR_GRID_POLICY\.drawerSplitLineIndex/u);
  assert.match(basePlinthPolicy, /export const BASE_PLINTH_POLICY = Object\.freeze/u);
  assert.match(baseLegPolicy, /export const BASE_LEG_DIMENSIONS = Object\.freeze/u);
  assert.match(baseLegPolicy, /export const BASE_LEG_LAYOUT_POLICY = Object\.freeze/u);
  assert.match(basePlatformRenderPolicy, /export const BASE_PLATFORM_RENDER_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_SHELL_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_DRAWER_GEOMETRY_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_CONNECTOR_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_MOTION_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_CASTER_RENDER_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_STRUCTURAL_DIMENSIONS = Object\.freeze/u);
  assert.match(materialThicknessPolicy, /export const MATERIAL_THICKNESS_POLICY = Object\.freeze/u);
  assert.match(materialThicknessPolicy, /const MATERIAL_THICKNESS_M = meters\(0\.018\)/u);
  assert.match(materialThicknessPolicy, /thicknessM: MATERIAL_THICKNESS_M/u);
  assert.match(carcassCorniceRenderPolicy, /export const CARCASS_CORNICE_COMMON_POLICY = Object\.freeze/u);
  assert.match(carcassCorniceRenderPolicy, /export const CARCASS_CORNICE_ANGLE_POLICY = Object\.freeze/u);
  assert.match(carcassCorniceRenderPolicy, /thetaClampRad: 0\.01/u);
  assert.match(carcassCorniceRenderPolicy, /thetaClampM: CARCASS_CORNICE_ANGLE_POLICY\.thetaClampRad/u);
  assert.match(carcassCorniceRenderPolicy, /export const CARCASS_CORNICE_WAVE_POLICY = Object\.freeze/u);
  assert.match(carcassCorniceRenderPolicy, /export const CARCASS_CORNICE_PROFILE_POLICY = Object\.freeze/u);
  assert.match(carcassCorniceRenderPolicy, /export const CARCASS_CORNICE_RENDER_POLICY = Object\.freeze/u);
  assert.match(
    carcassCorniceRenderPolicy,
    /fallbackWoodThicknessM: MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/u
  );
  assert.match(chestModePolicy, /export const CHEST_MODE_ACTIVE_DEFAULTS_POLICY = Object\.freeze/u);
  assert.match(chestModePolicy, /export const CHEST_MODE_COMMODE_CONSTRAINTS_POLICY = Object\.freeze/u);
  assert.match(chestModePolicy, /export const CHEST_MODE_COMMODE_RENDER_POLICY = Object\.freeze/u);
  assert.match(chestModePolicy, /export const CHEST_MODE_DRAWER_BOX_RENDER_POLICY = Object\.freeze/u);
  assert.match(chestModePolicy, /export const CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY = Object\.freeze/u);
  assert.match(chestModePolicy, /export const CHEST_MODE_DIMENSIONS = Object\.freeze/u);
  assert.match(chestModePolicy, /widthCm: centimeters\(50\)/u);
  assert.match(chestModePolicy, /backPanelThicknessM: meters\(0\.018\)/u);
  assert.match(doorSystemPolicy, /export const HINGED_DOOR_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorSystemPolicy, /export const HINGED_DOOR_MOUNT_POLICY = Object\.freeze/u);
  assert.match(doorSystemPolicy, /export const HINGED_DOOR_SPLIT_GEOMETRY_POLICY = Object\.freeze/u);
  assert.match(doorSystemPolicy, /export const HINGED_DOOR_SPLIT_AUTHORING_POLICY = Object\.freeze/u);
  assert.match(doorSystemPolicy, /export const HINGED_DOOR_SYSTEM_POLICY = Object\.freeze/u);
  assert.match(doorSystemPolicy, /export const SLIDING_DOOR_CONSTRUCTION_POLICY = Object\.freeze/u);
  assert.match(doorSystemPolicy, /export const SLIDING_DOOR_HANDLE_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorSystemPolicy, /export const SLIDING_DOOR_MOTION_POLICY = Object\.freeze/u);
  assert.match(doorSystemPolicy, /export const DOOR_SYSTEM_DIMENSIONS = Object\.freeze/u);
  assert.match(doorSystemPolicy, /visualThicknessM: MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/u);
  assert.match(doorSystemPolicy, /defaultDoorsCount: WARDROBE_DEFAULTS\.byType\.sliding\.doorsCount/u);
  assert.match(doorMountThicknessPolicy, /export const DOOR_MOUNT_THICKNESS_DIMENSIONS = Object\.freeze/u);
  assert.match(doorMountThicknessPolicy, /stepCm: centimeters\(0\.1\)/u);
  assert.match(doorMountThicknessPolicy, /minCm: centimeters\(0\.4\)/u);
  assert.match(doorMountThicknessPolicy, /maxCm: centimeters\(8\)/u);
  assert.match(doorMountThicknessPolicy, /HINGED_DOOR_MOUNT_POLICY\.insetFrameThicknessM/u);
  assert.match(doorMountThicknessPolicy, /MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/u);
  assert.match(doorMountThicknessPolicy, /const stepCm = Number\(DOOR_MOUNT_THICKNESS_DIMENSIONS\.stepCm\)/u);
  assert.match(doorMountThicknessPolicy, /const decimalScale = 10 \*\* decimalPlaces\(stepCm\)/u);
  assert.doesNotMatch(doorMountThicknessPolicy, /Number\.EPSILON/u);
  assert.match(doorMountThicknessPolicy, /frameThicknessM: cmToM\(frameThicknessCm\)/u);
  assert.match(doorMountThicknessPolicy, /shelfThicknessM: cmToM\(shelfThicknessCm\)/u);
  assert.match(doorVisualPolicy, /export const DOOR_VISUAL_COMMON_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_ACCENT_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_GROOVE_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_GLASS_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_PROFILE_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_MITER_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_DOUBLE_PROFILE_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_MIRROR_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_MIRROR_LAYOUT_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_MIRROR_POLICY = Object\.freeze/u);
  assert.match(doorVisualPolicy, /export const DOOR_VISUAL_DIMENSIONS = Object\.freeze/u);
  assert.match(doorVisualPolicy, /layoutSizeEpsilonCm: centimeters\(0\.001\)/u);
  assert.match(doorTrimPolicy, /export const DOOR_TRIM_RENDER_POLICY = Object\.freeze/u);
  assert.match(doorTrimPolicy, /export const DOOR_TRIM_AUTHORING_DEFAULTS_POLICY = Object\.freeze/u);
  assert.match(doorTrimPolicy, /export const DOOR_TRIM_LIMITS_POLICY = Object\.freeze/u);
  assert.match(doorTrimPolicy, /export const DOOR_TRIM_SNAP_POLICY = Object\.freeze/u);
  assert.match(doorTrimPolicy, /export const DOOR_TRIM_NORMALIZATION_POLICY = Object\.freeze/u);
  assert.match(doorTrimPolicy, /export const DOOR_TRIM_REMOVE_TOLERANCE_POLICY = Object\.freeze/u);
  assert.match(doorTrimPolicy, /export const DOOR_TRIM_DEFAULTS_POLICY = Object\.freeze/u);
  assert.match(doorTrimPolicy, /export const DOOR_TRIM_DIMENSIONS = Object\.freeze/u);
  assert.match(doorTrimPolicy, /thicknessM: meters\(0\.035\)/u);
  assert.match(doorTrimPolicy, /crossSizeCm: centimeters\(3\.5\)/u);
  assert.match(externalDrawerPolicy, /export const EXTERNAL_DRAWER_SIZE_POLICY = Object\.freeze/u);
  assert.match(externalDrawerPolicy, /export const EXTERNAL_DRAWER_MOTION_POLICY = Object\.freeze/u);
  assert.match(externalDrawerPolicy, /export const EXTERNAL_DRAWER_FRONT_RENDER_POLICY = Object\.freeze/u);
  assert.match(externalDrawerPolicy, /export const EXTERNAL_DRAWER_BOX_POLICY = Object\.freeze/u);
  assert.match(externalDrawerPolicy, /export const EXTERNAL_DRAWER_CONNECTOR_POLICY = Object\.freeze/u);
  assert.match(externalDrawerPolicy, /export const EXTERNAL_DRAWER_SEPARATOR_POLICY = Object\.freeze/u);
  assert.match(externalDrawerPolicy, /export const EXTERNAL_DRAWER_CONTENTS_POLICY = Object\.freeze/u);
  assert.match(externalDrawerPolicy, /export const EXTERNAL_DRAWER_POLICY = Object\.freeze/u);
  assert.match(externalDrawerPolicy, /doorTopGapM: STACK_SPLIT_POLICY\.seam\.gapM/u);
  assert.match(internalDrawerPolicy, /export const INTERNAL_DRAWER_LAYOUT_POLICY = Object\.freeze/u);
  assert.match(internalDrawerPolicy, /export const INTERNAL_DRAWER_MOTION_POLICY = Object\.freeze/u);
  assert.match(internalDrawerPolicy, /export const INTERNAL_DRAWER_CONTENTS_POLICY = Object\.freeze/u);
  assert.match(internalDrawerPolicy, /export const INTERNAL_DRAWER_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_SHELF_GEOMETRY_POLICY = Object\.freeze/u);
  assert.match(
    interiorFittingsPolicy,
    /export const INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY = Object\.freeze/u
  );
  assert.match(interiorFittingsPolicy, /export const INTERIOR_SHELF_ROUNDED_RENDER_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_SHELF_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_SHELF_PIN_RENDER_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_ROD_RENDER_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_ROD_PLACEMENT_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_ROD_DEPTH_CLEARANCE_POLICY = Object\.freeze/u);
  assert.match(
    interiorFittingsPolicy,
    /export const INTERIOR_ROD_CONTENT_CLEARANCE_POLICY = Object\.freeze/u
  );
  assert.match(interiorFittingsPolicy, /export const INTERIOR_ROD_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_PRESET_SHELF_ROWS_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_PRESET_ROD_FACTORS_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_PRESET_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /export const INTERIOR_FITTINGS_POLICY = Object\.freeze/u);
  assert.match(interiorFittingsPolicy, /storage: INTERIOR_STORAGE_POLICY/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_GRID_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_BARRIER_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_PREVIEW_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_CLAMP_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_LAYOUT_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_DEFAULTS_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /barrierHeightM: meters\(0\.5\)/u);
  assert.match(interiorStoragePolicy, /defaultLowerShelfSlots: DEFAULT_LOWER_SHELF_SLOTS/u);
  assert.match(cornerSystemPolicy, /export const CORNER_WING_BODY_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_CONNECTOR_LAYOUT_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_CONNECTOR_DOOR_RENDER_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_CONNECTOR_SHELL_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_CONNECTOR_CORNICE_HIT_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_CONNECTOR_HANDLE_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_CONNECTOR_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_WING_INTERIOR_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_WING_PANEL_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_WING_SELECTOR_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_WING_CEILING_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_WING_CELL_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_WING_DRAWER_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_WING_BASE_LEG_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /export const CORNER_SYSTEM_POLICY = Object\.freeze/u);
  assert.match(cornerSystemPolicy, /defaultWidthCm: WARDROBE_DEFAULTS\.corner\.widthCm/u);
  assert.match(
    cornerSystemPolicy,
    /shellBackPanelThicknessM: CARCASS_SHELL_DIMENSIONS\.backPanelThicknessM/u
  );
  assert.match(cornerSystemPolicy, /shellBackInsetXM: CARCASS_SHELL_DIMENSIONS\.sideDepthClearanceM/u);
  assert.match(cornerSystemPolicy, /shellBackInsetZM: CARCASS_SHELL_DIMENSIONS\.sideDepthClearanceM/u);
  assert.match(cornerSystemPolicy, /shellFrontInsetM: CARCASS_SHELL_DIMENSIONS\.frontInsetZM/u);
  assert.match(cornerSystemPolicy, /frontThicknessM: MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/u);
  assert.match(cornerSystemPolicy, /hitboxThicknessM: MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/u);
  assert.match(cornerSystemPolicy, /regularShelfDepthM: INTERIOR_SHELF_GEOMETRY_POLICY\.regularDepthM/u);
  assert.match(
    cornerSystemPolicy,
    /shelfContentsTopClearanceM:[\s\S]*INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY\.contentsHeightClearanceM/u
  );
  assert.match(
    cornerSystemPolicy,
    /foldedContentsWidthClearanceM:[\s\S]*INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY\.contentsWidthClearanceM/u
  );
  assert.match(cornerSystemPolicy, /shoeHeightM: EXTERNAL_DRAWER_SIZE_POLICY\.shoeHeightM/u);
  assert.match(
    cornerSystemPolicy,
    /externalFrontOffsetZM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.frontOffsetZM/u
  );
  assert.match(cornerSystemPolicy, /externalOpenOffsetZM: EXTERNAL_DRAWER_MOTION_POLICY\.openOffsetZM/u);
  assert.match(
    cornerSystemPolicy,
    /externalBoxWidthClearanceM: EXTERNAL_DRAWER_BOX_POLICY\.boxWidthClearanceM/u
  );
  assert.match(cornerSystemPolicy, /internalDefaultDepthM: INTERNAL_DRAWER_LAYOUT_POLICY\.defaultDepthM/u);
  assert.match(cornerSystemPolicy, /insetM: BASE_LEG_LAYOUT_POLICY\.cornerInsetM/u);
  assert.doesNotMatch(cornerSystemPolicy, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(cornerSystemPolicy, /export\s+(?:\*|\{[^}]*\})\s+from/u);
  assert.match(drawerSketchPolicy, /export const DRAWER_SKETCH_SIZING_POLICY = Object\.freeze/u);
  assert.match(drawerSketchPolicy, /export const DRAWER_SKETCH_PREVIEW_RENDER_POLICY = Object\.freeze/u);
  assert.match(drawerSketchPolicy, /export const DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY = Object\.freeze/u);
  assert.match(drawerSketchPolicy, /export const DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY = Object\.freeze/u);
  assert.match(drawerSketchPolicy, /export const DRAWER_SKETCH_DOOR_CUT_POLICY = Object\.freeze/u);
  assert.match(drawerSketchPolicy, /export const DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY = Object\.freeze/u);
  assert.match(drawerSketchPolicy, /export const DRAWER_SKETCH_POLICY = Object\.freeze/u);
  assert.match(
    drawerSketchPolicy,
    /externalDefaultHeightCm: metersToCentimeters\(EXTERNAL_DRAWER_SIZE_POLICY\.regularHeightM\)/u
  );
  assert.match(
    drawerSketchPolicy,
    /internalDefaultHeightCm: metersToCentimeters\([\s\S]*INTERNAL_DRAWER_LAYOUT_POLICY\.defaultSingleDrawerHeightM/u
  );
  assert.match(
    drawerSketchPolicy,
    /internalPreviewGridDivisionsDefault: INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault/u
  );
  assert.match(drawerSketchPolicy, /internalClampPadMinM: INTERIOR_STORAGE_CLAMP_POLICY\.clampPadMinM/u);
  assert.match(frontRevealFramePolicy, /export const FRONT_REVEAL_GEOMETRY_POLICY = Object\.freeze/u);
  assert.match(frontRevealFramePolicy, /export const FRONT_REVEAL_PRESENCE_POLICY = Object\.freeze/u);
  assert.match(frontRevealFramePolicy, /export const FRONT_REVEAL_THICKNESS_POLICY = Object\.freeze/u);
  assert.match(frontRevealFramePolicy, /export const FRONT_REVEAL_FRAME_POLICY = Object\.freeze/u);
  assert.match(frontRevealFramePolicy, /zNudgeM: meters\(0\.0008\)/u);
  assert.match(
    frontRevealFramePolicy,
    /slidingFrontThicknessM: SLIDING_DOOR_CONSTRUCTION_POLICY\.visualThicknessM/u
  );
  assert.match(frontRevealFramePolicy, /hingedFrontThicknessM: MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/u);
  assert.match(
    frontRevealFramePolicy,
    /drawerFrontThicknessM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualThicknessM/u
  );
  assert.doesNotMatch(frontRevealFramePolicy, /meters\(0\.(?:022|018|02)\)/u);
  assert.match(handlePolicy, /export const EDGE_HANDLE_SIZE_POLICY = Object\.freeze/u);
  assert.match(handlePolicy, /export const EDGE_HANDLE_PROFILE_RENDER_POLICY = Object\.freeze/u);
  assert.match(handlePolicy, /export const EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY = Object\.freeze/u);
  assert.match(handlePolicy, /export const STANDARD_HANDLE_RENDER_POLICY = Object\.freeze/u);
  assert.match(handlePolicy, /export const DRAWER_HANDLE_PLACEMENT_POLICY = Object\.freeze/u);
  assert.match(handlePolicy, /export const HANDLE_POLICY = Object\.freeze/u);
  assert.match(handlePolicy, /drawerDefaultHeightM: EXTERNAL_DRAWER_SIZE_POLICY\.shoeHeightM/u);
  assert.doesNotMatch(handlePolicy, /drawerDefaultHeightM: meters\(0\.2\)/u);
  assert.match(contentVisualPolicy, /export const BOOK_CONTENT_VISUAL_POLICY = Object\.freeze/u);
  assert.match(contentVisualPolicy, /export const FOLDED_CLOTHES_VISUAL_POLICY = Object\.freeze/u);
  assert.match(contentVisualPolicy, /export const HANGER_VISUAL_POLICY = Object\.freeze/u);
  assert.match(contentVisualPolicy, /export const HANGING_CLOTHES_VISUAL_POLICY = Object\.freeze/u);
  assert.match(contentVisualPolicy, /export const CONTENT_VISUAL_POLICY = Object\.freeze/u);
  assert.match(
    sketchBoxClassicDoorVisualPolicy,
    /export const SKETCH_BOX_CLASSIC_ACCENT_POLICY = Object\.freeze/u
  );
  assert.match(
    sketchBoxClassicDoorVisualPolicy,
    /export const SKETCH_BOX_CLASSIC_GROOVE_POLICY = Object\.freeze/u
  );
  assert.match(
    sketchBoxClassicDoorVisualPolicy,
    /export const SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY = Object\.freeze/u
  );
  assert.match(facade, /plinth: BASE_PLINTH_DIMENSIONS/u);
  assert.match(facade, /legs: BASE_LEG_LAYOUT_DIMENSIONS/u);
  assert.match(facade, /legacyDimensionNumberView\(BASE_PLINTH_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(BASE_LEG_LAYOUT_POLICY\)/u);
  assert.doesNotMatch(facade, /export const BASE_LEG_DIMENSIONS = Object\.freeze/u);
  assert.match(facade, /chest: CHEST_STRUCTURAL_DIMENSIONS/u);
  assert.doesNotMatch(facade, /chest: Object\.freeze/u);
  assert.doesNotMatch(facade, /export const CARCASS_(?:SHELL|INTERIOR)_DIMENSIONS =/u);
  assert.match(facade, /legacyDimensionNumberView\(MATERIAL_THICKNESS_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(CARCASS_CORNICE_RENDER_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(CHEST_MODE_DIMENSIONS_OWNER\)/u);
  assert.match(facade, /legacyDimensionNumberView\(DOOR_SYSTEM_DIMENSIONS_OWNER\)/u);
  assert.match(facade, /legacyDimensionNumberView\(\s*DOOR_MOUNT_THICKNESS_DIMENSIONS_OWNER\s*\)/u);
  assert.match(facade, /legacyDimensionNumberView\(DOOR_VISUAL_DIMENSIONS_OWNER\)/u);
  assert.match(facade, /legacyDimensionNumberView\(DOOR_TRIM_DIMENSIONS_OWNER\)/u);
  assert.match(facade, /legacyDimensionNumberView\(EXTERNAL_DRAWER_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(INTERNAL_DRAWER_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(INTERIOR_FITTINGS_POLICY\)/u);
  assert.match(facade, /CORNER_WING_DIMENSIONS = legacyDimensionNumberView\(CORNER_SYSTEM_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(DRAWER_SKETCH_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(FRONT_REVEAL_FRAME_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(HANDLE_POLICY\)/u);
  assert.match(facade, /books: BOOK_CONTENT_VISUAL_POLICY/u);
  assert.match(facade, /foldedClothes: FOLDED_CLOTHES_VISUAL_POLICY/u);
  assert.match(facade, /hanger: HANGER_VISUAL_POLICY/u);
  assert.match(facade, /hangingClothes: HANGING_CLOTHES_VISUAL_POLICY/u);
  assert.match(facade, /sketchBoxClassic: SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY/u);
  assert.doesNotMatch(facade, /export const HANDLE_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /export const INTERIOR_FITTINGS_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /export const CORNER_WING_DIMENSIONS = Object\.freeze/u);
  assert.match(facade, /sketch: DRAWER_SKETCH_DIMENSIONS/u);
  assert.match(facade, /external: EXTERNAL_DRAWER_DIMENSIONS/u);
  assert.match(facade, /internal: INTERNAL_DRAWER_DIMENSIONS/u);
  assert.doesNotMatch(facade, /export const MATERIAL_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /export const CARCASS_CORNICE_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /export const CHEST_MODE_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /export const DOOR_SYSTEM_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /export const DOOR_MOUNT_THICKNESS_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /export const DOOR_VISUAL_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /export const DOOR_TRIM_DIMENSIONS = Object\.freeze/u);
  assert.doesNotMatch(facade, /function roundDoorMountThicknessCm/u);
  assert.doesNotMatch(facade, /function normalizeDoorMountConstructionMode/u);

  assert.doesNotMatch(defaults, /stackSplit|decorativeSeparator/u);
  assert.doesNotMatch(limits, /wardrobe_defaults/u);
  assert.doesNotMatch(stackSplitFeature, /wardrobe_dimension_tokens_shared/u);
  assert.match(stackSplitFeature, /dimensions\/stack_split_policy\.js/u);
  assert.doesNotMatch(platformOverhang, /wardrobe_dimension_tokens_shared/u);
  assert.match(platformOverhang, /dimensions\/stack_split_render_policy\.js/u);
  assert.doesNotMatch(decorativeSeparator, /dimensions\/wardrobe_defaults\.js/u);
  assert.match(decorativeSeparator, /dimensions\/stack_split_render_policy\.js/u);

  assert.doesNotMatch(
    `${units}\n${defaults}\n${limits}\n${stackSplitPolicy}\n${stackSplitRenderPolicy}\n${carcassShellPolicy}\n${carcassInteriorPolicy}\n${carcassInteriorGridPolicy}\n${basePlinthPolicy}\n${baseLegPolicy}\n${basePlatformRenderPolicy}\n${chestStructuralPolicy}\n${materialThicknessPolicy}\n${carcassCorniceRenderPolicy}\n${chestModePolicy}\n${doorSystemPolicy}\n${doorMountThicknessPolicy}\n${doorVisualPolicy}\n${doorTrimPolicy}\n${interiorStoragePolicy}\n${cornerSystemPolicy}\n${drawerSketchPolicy}\n${frontRevealFramePolicy}`,
    /wardrobe_dimension_tokens_shared/u
  );
});

test('[dimension-foundation] Stack Split facade symbols stay on an exact transition allowlist', () => {
  const sources = [];
  walkSourceFiles('esm', file => sources.push([file, read(file)]));
  const usage = collectStackSplitFacadeUsage(sources);
  const facadeExports = collectNamedModuleExports(
    'esm/shared/wardrobe_dimension_tokens_shared.ts',
    read('esm/shared/wardrobe_dimension_tokens_shared.ts')
  )
    .map(entry => entry.exportedName)
    .filter(isStackSplitFacadeSymbol)
    .sort();

  assert.deepEqual(
    usage.wildcardDependencies,
    APPROVED_STACK_SPLIT_FACADE_WILDCARDS,
    `Stack Split facade wildcard/dynamic usage changed and requires explicit public-API review: ${JSON.stringify(
      {
        approved: APPROVED_STACK_SPLIT_FACADE_WILDCARDS,
        actual: usage.wildcardDependencies,
      }
    )}`
  );
  assertApprovedSymbolUsage(
    usage.imports,
    APPROVED_STACK_SPLIT_FACADE_IMPORTS,
    'Stack Split facade consumer allowlist'
  );
  assertApprovedSymbolUsage(
    usage.reexports,
    APPROVED_STACK_SPLIT_FACADE_REEXPORTS,
    'Stack Split facade public re-export allowlist'
  );
  assertApprovedStackSplitFacadeSymbols(facadeExports);
});

test('[dimension-foundation] pure Carcass Shell and Interior consumers use focused owners', () => {
  const assertDirectOwner = (file, symbol, ownerSpecifier) => {
    const dependencies = analyzeModuleDependencies(file, read(file)).imports;
    assert.equal(
      dependencies.some(
        dependency =>
          matchesOwnerSpecifier(dependency.specifier, ownerSpecifier) &&
          dependency.importedSymbols.includes(symbol)
      ),
      true,
      `${file} must import ${symbol} from ${ownerSpecifier}`
    );
    assert.equal(
      dependencies.some(
        dependency =>
          dependency.specifier.includes(FACADE_SPECIFIER) && dependency.importedSymbols.includes(symbol)
      ),
      false,
      `${file} must not route ${symbol} through the legacy facade`
    );
  };

  for (const file of CARCASS_SHELL_DIRECT_CONSUMERS) {
    assertDirectOwner(file, 'CARCASS_SHELL_DIMENSIONS', 'carcass_shell_policy.js');
  }
  for (const file of CARCASS_INTERIOR_DIRECT_CONSUMERS) {
    assertDirectOwner(file, 'CARCASS_INTERIOR_DIMENSIONS', 'dimensions/carcass_interior_policy.js');
  }
});

test('[dimension-foundation] interior grid and Base Support owner consumers stay on exact allowlists', () => {
  const sources = [];
  walkSourceFiles('esm', file => sources.push([file, read(file)]));
  const analyzedSources = sources.map(([file, source]) => [
    file,
    source,
    analyzeModuleDependencies(file, source).imports,
  ]);

  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'carcass_interior_grid_policy.js'),
    APPROVED_INTERIOR_GRID_OWNER_IMPORTS,
    'Carcass interior grid owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'base_plinth_policy.js'),
    APPROVED_BASE_PLINTH_OWNER_IMPORTS,
    'Base plinth owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'base_leg_policy.js'),
    APPROVED_BASE_LEG_OWNER_IMPORTS,
    'Base leg owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'base_platform_render_policy.js'),
    APPROVED_BASE_PLATFORM_OWNER_IMPORTS,
    'Base platform owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'chest_structural_policy.js'),
    APPROVED_CHEST_STRUCTURAL_OWNER_IMPORTS,
    'Chest Structural owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'material_thickness_policy.js'),
    APPROVED_MATERIAL_THICKNESS_OWNER_IMPORTS,
    'Material Thickness owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'wardrobe_layout_policy.js'),
    APPROVED_WARDROBE_MODULE_LAYOUT_OWNER_IMPORTS,
    'Wardrobe Module Layout owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'cell_dimension_policy.js'),
    APPROVED_CELL_DIMENSION_OWNER_IMPORTS,
    'Cell Dimension owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'wardrobe_layout_comparison_policy.js'),
    APPROVED_WARDROBE_LAYOUT_COMPARISON_OWNER_IMPORTS,
    'Wardrobe Layout Comparison owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'carcass_cornice_render_policy.js'),
    APPROVED_CARCASS_CORNICE_OWNER_IMPORTS,
    'Carcass Cornice owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'chest_mode_policy.js'),
    APPROVED_CHEST_MODE_OWNER_IMPORTS,
    'Chest Mode owner consumer allowlist'
  );
  const doorSystemOwnerImports = collectOwnerImports(analyzedSources, 'door_system_policy.js');
  assertApprovedSymbolUsage(
    doorSystemOwnerImports,
    APPROVED_DOOR_SYSTEM_OWNER_IMPORTS,
    'Door System owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(doorSystemOwnerImports)
        .filter(([, symbols]) => symbols.includes('DOOR_SYSTEM_DIMENSIONS'))
        .map(([file]) => [file, ['DOOR_SYSTEM_DIMENSIONS']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['DOOR_SYSTEM_DIMENSIONS'],
    },
    'DOOR_SYSTEM_DIMENSIONS is compatibility-only and may be imported directly only by the legacy facade'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'door_mount_thickness_policy.js'),
    APPROVED_DOOR_MOUNT_THICKNESS_OWNER_IMPORTS,
    'Door Mount Thickness owner consumer allowlist'
  );
  const doorVisualOwnerImports = collectOwnerImports(analyzedSources, 'door_visual_policy.js');
  assertApprovedSymbolUsage(
    doorVisualOwnerImports,
    APPROVED_DOOR_VISUAL_OWNER_IMPORTS,
    'Door Visual owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(doorVisualOwnerImports)
        .filter(([, symbols]) => symbols.includes('DOOR_VISUAL_DIMENSIONS'))
        .map(([file]) => [file, ['DOOR_VISUAL_DIMENSIONS']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['DOOR_VISUAL_DIMENSIONS'],
    },
    'DOOR_VISUAL_DIMENSIONS is compatibility-only and may be imported directly only by the legacy facade'
  );
  const doorTrimOwnerImports = collectOwnerImports(analyzedSources, 'door_trim_policy.js');
  assertApprovedSymbolUsage(
    doorTrimOwnerImports,
    APPROVED_DOOR_TRIM_OWNER_IMPORTS,
    'Door Trim owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(doorTrimOwnerImports)
        .filter(([, symbols]) => symbols.includes('DOOR_TRIM_DIMENSIONS'))
        .map(([file]) => [file, ['DOOR_TRIM_DIMENSIONS']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['DOOR_TRIM_DIMENSIONS'],
    },
    'DOOR_TRIM_DIMENSIONS is compatibility-only and may be imported directly only by the legacy facade'
  );
  const externalDrawerOwnerImports = collectOwnerImports(analyzedSources, 'external_drawer_policy.js');
  assertApprovedSymbolUsage(
    externalDrawerOwnerImports,
    APPROVED_EXTERNAL_DRAWER_OWNER_IMPORTS,
    'External Drawer owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(externalDrawerOwnerImports)
        .filter(([, symbols]) => symbols.includes('EXTERNAL_DRAWER_POLICY'))
        .map(([file]) => [file, ['EXTERNAL_DRAWER_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['EXTERNAL_DRAWER_POLICY'],
    },
    'EXTERNAL_DRAWER_POLICY aggregate is compatibility-only outside approved focused consumers'
  );
  const internalDrawerOwnerImports = collectOwnerImports(analyzedSources, 'internal_drawer_policy.js');
  assertApprovedSymbolUsage(
    internalDrawerOwnerImports,
    APPROVED_INTERNAL_DRAWER_OWNER_IMPORTS,
    'Internal Drawer owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(internalDrawerOwnerImports)
        .filter(([, symbols]) => symbols.includes('INTERNAL_DRAWER_POLICY'))
        .map(([file]) => [file, ['INTERNAL_DRAWER_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['INTERNAL_DRAWER_POLICY'],
    },
    'INTERNAL_DRAWER_POLICY aggregate is imported directly only by the legacy facade'
  );
  const interiorStorageOwnerImports = collectOwnerImports(analyzedSources, 'interior_storage_policy.js');
  assertApprovedSymbolUsage(
    interiorStorageOwnerImports,
    APPROVED_INTERIOR_STORAGE_OWNER_IMPORTS,
    'Interior Storage owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(interiorStorageOwnerImports)
        .filter(([, symbols]) => symbols.includes('INTERIOR_STORAGE_POLICY'))
        .map(([file]) => [file, ['INTERIOR_STORAGE_POLICY']])
    ),
    {
      'esm/shared/dimensions/interior_fittings_policy.ts': ['INTERIOR_STORAGE_POLICY'],
    },
    'INTERIOR_STORAGE_POLICY aggregate is imported directly only by the Interior Fittings owner'
  );
  const interiorFittingsOwnerImports = collectOwnerImports(analyzedSources, 'interior_fittings_policy.js');
  assertApprovedSymbolUsage(
    interiorFittingsOwnerImports,
    APPROVED_INTERIOR_FITTINGS_OWNER_IMPORTS,
    'Interior Fittings owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(interiorFittingsOwnerImports)
        .filter(([, symbols]) => symbols.includes('INTERIOR_FITTINGS_POLICY'))
        .map(([file]) => [file, ['INTERIOR_FITTINGS_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['INTERIOR_FITTINGS_POLICY'],
    },
    'INTERIOR_FITTINGS_POLICY aggregate is imported directly only by the legacy facade'
  );
  const cornerSystemOwnerImports = collectOwnerImports(analyzedSources, 'corner_system_policy.js');
  assertApprovedSymbolUsage(
    cornerSystemOwnerImports,
    APPROVED_CORNER_SYSTEM_OWNER_IMPORTS,
    'Corner System owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(cornerSystemOwnerImports)
        .filter(([, symbols]) => symbols.includes('CORNER_SYSTEM_POLICY'))
        .map(([file]) => [file, ['CORNER_SYSTEM_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['CORNER_SYSTEM_POLICY'],
    },
    'CORNER_SYSTEM_POLICY aggregate is imported directly only by the legacy facade'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(cornerSystemOwnerImports)
        .filter(([, symbols]) => symbols.includes('CORNER_CONNECTOR_POLICY'))
        .map(([file]) => [file, ['CORNER_CONNECTOR_POLICY']])
    ),
    {},
    'CORNER_CONNECTOR_POLICY compatibility aggregate has no production importers'
  );
  assert.deepEqual(
    collectOwnerDependencyStatements(analyzedSources, 'corner_system_policy.js'),
    Object.fromEntries(Object.keys(APPROVED_CORNER_SYSTEM_OWNER_IMPORTS).map(file => [file, 1])),
    'Corner System transition must retain exactly one owner import statement per approved importer'
  );

  assert.deepEqual(
    collectModuleReexports([
      [
        'esm/shared/dimensions/corner_system_policy.ts',
        read('esm/shared/dimensions/corner_system_policy.ts'),
      ],
    ]),
    [],
    'Corner System owner must not bridge or re-export foreign owners'
  );

  const cornerConnectorInteriorOwnerImports = collectOwnerImports(
    analyzedSources,
    'corner_connector_interior_policy.js'
  );
  assertApprovedSymbolUsage(
    cornerConnectorInteriorOwnerImports,
    APPROVED_CORNER_CONNECTOR_INTERIOR_OWNER_IMPORTS,
    'Corner Connector Interior owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(cornerConnectorInteriorOwnerImports)
        .filter(([, symbols]) => symbols.includes('CORNER_CONNECTOR_INTERIOR_POLICY'))
        .map(([file]) => [file, ['CORNER_CONNECTOR_INTERIOR_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['CORNER_CONNECTOR_INTERIOR_POLICY'],
    },
    'CORNER_CONNECTOR_INTERIOR_POLICY aggregate is imported directly only by the legacy facade'
  );
  assert.deepEqual(
    collectOwnerDependencyStatements(analyzedSources, 'corner_connector_interior_policy.js'),
    Object.fromEntries(Object.keys(APPROVED_CORNER_CONNECTOR_INTERIOR_OWNER_IMPORTS).map(file => [file, 1])),
    'Corner Connector Interior transition must retain exactly one owner import statement per approved importer'
  );
  assert.deepEqual(
    collectModuleReexports([
      [
        'esm/shared/dimensions/corner_connector_interior_policy.ts',
        read('esm/shared/dimensions/corner_connector_interior_policy.ts'),
      ],
    ]),
    [],
    'Corner Connector Interior owner must not bridge or re-export another owner'
  );

  const drawerSketchOwnerImports = collectOwnerImports(analyzedSources, 'drawer_sketch_policy.js');
  assertApprovedSymbolUsage(
    drawerSketchOwnerImports,
    APPROVED_DRAWER_SKETCH_OWNER_IMPORTS,
    'Drawer Sketch owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(drawerSketchOwnerImports)
        .filter(([, symbols]) => symbols.includes('DRAWER_SKETCH_POLICY'))
        .map(([file]) => [file, ['DRAWER_SKETCH_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['DRAWER_SKETCH_POLICY'],
    },
    'DRAWER_SKETCH_POLICY aggregate is imported directly only by the legacy facade'
  );
  const frontRevealOwnerImports = collectOwnerImports(analyzedSources, 'front_reveal_frame_policy.js');
  assertApprovedSymbolUsage(
    frontRevealOwnerImports,
    APPROVED_FRONT_REVEAL_OWNER_IMPORTS,
    'Front Reveal owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(frontRevealOwnerImports)
        .filter(([, symbols]) => symbols.includes('FRONT_REVEAL_FRAME_POLICY'))
        .map(([file]) => [file, ['FRONT_REVEAL_FRAME_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['FRONT_REVEAL_FRAME_POLICY'],
    },
    'FRONT_REVEAL_FRAME_POLICY aggregate is imported directly only by the legacy facade'
  );
  const handleOwnerImports = collectOwnerImports(analyzedSources, 'handle_policy.js');
  assertApprovedSymbolUsage(
    handleOwnerImports,
    APPROVED_HANDLE_OWNER_IMPORTS,
    'Handle owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(handleOwnerImports)
        .filter(([, symbols]) => symbols.includes('HANDLE_POLICY'))
        .map(([file]) => [file, ['HANDLE_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['HANDLE_POLICY'],
    },
    'HANDLE_POLICY aggregate is imported directly only by the legacy facade'
  );
  const contentVisualOwnerImports = collectOwnerImports(analyzedSources, 'content_visual_policy.js');
  assertApprovedSymbolUsage(
    contentVisualOwnerImports,
    APPROVED_CONTENT_VISUAL_OWNER_IMPORTS,
    'Content Visual owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(contentVisualOwnerImports)
        .filter(([, symbols]) => symbols.includes('CONTENT_VISUAL_POLICY'))
        .map(([file]) => [file, ['CONTENT_VISUAL_POLICY']])
    ),
    {},
    'CONTENT_VISUAL_POLICY aggregate has no production importers'
  );
  const sketchBoxClassicOwnerImports = collectOwnerImports(
    analyzedSources,
    'sketch_box_classic_door_visual_policy.js'
  );
  assertApprovedSymbolUsage(
    sketchBoxClassicOwnerImports,
    APPROVED_SKETCH_BOX_CLASSIC_OWNER_IMPORTS,
    'Sketch Box Classic owner consumer allowlist'
  );
  const sketchBoxGeometryOwnerImports = collectOwnerImports(analyzedSources, 'sketch_box_geometry_policy.js');
  assertApprovedSymbolUsage(
    sketchBoxGeometryOwnerImports,
    APPROVED_SKETCH_BOX_GEOMETRY_OWNER_IMPORTS,
    'Sketch Box Geometry owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(sketchBoxGeometryOwnerImports)
        .filter(([, symbols]) => symbols.includes('SKETCH_BOX_GEOMETRY_POLICY'))
        .map(([file]) => [file, ['SKETCH_BOX_GEOMETRY_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['SKETCH_BOX_GEOMETRY_POLICY'],
    },
    'SKETCH_BOX_GEOMETRY_POLICY aggregate is imported directly only by the legacy facade'
  );
  assert.deepEqual(
    collectOwnerDependencyStatements(analyzedSources, 'sketch_box_geometry_policy.js'),
    Object.fromEntries(Object.keys(APPROVED_SKETCH_BOX_GEOMETRY_OWNER_IMPORTS).map(file => [file, 1])),
    'Sketch Box Geometry migration must retain exactly one owner statement per approved importer'
  );

  const sketchBoxDividerOwnerImports = collectOwnerImports(analyzedSources, 'sketch_box_divider_policy.js');
  assertApprovedSymbolUsage(
    sketchBoxDividerOwnerImports,
    APPROVED_SKETCH_BOX_DIVIDER_OWNER_IMPORTS,
    'Sketch Box Divider owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(sketchBoxDividerOwnerImports)
        .filter(([, symbols]) => symbols.includes('SKETCH_BOX_DIVIDER_POLICY'))
        .map(([file]) => [file, ['SKETCH_BOX_DIVIDER_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['SKETCH_BOX_DIVIDER_POLICY'],
    },
    'SKETCH_BOX_DIVIDER_POLICY aggregate is imported directly only by the legacy facade'
  );
  assert.deepEqual(
    collectOwnerDependencyStatements(analyzedSources, 'sketch_box_divider_policy.js'),
    Object.fromEntries(Object.keys(APPROVED_SKETCH_BOX_DIVIDER_OWNER_IMPORTS).map(file => [file, 1])),
    'Sketch Box Divider migration must retain exactly one owner statement per approved importer'
  );

  const sketchBoxDimensionOverlayOwnerImports = collectOwnerImports(
    analyzedSources,
    'sketch_box_dimension_overlay_policy.js'
  );
  assertApprovedSymbolUsage(
    sketchBoxDimensionOverlayOwnerImports,
    APPROVED_SKETCH_BOX_DIMENSION_OVERLAY_OWNER_IMPORTS,
    'Sketch Box Dimension Overlay owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(sketchBoxDimensionOverlayOwnerImports)
        .filter(([, symbols]) => symbols.includes('SKETCH_BOX_DIMENSION_OVERLAY_POLICY'))
        .map(([file]) => [file, ['SKETCH_BOX_DIMENSION_OVERLAY_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['SKETCH_BOX_DIMENSION_OVERLAY_POLICY'],
    },
    'SKETCH_BOX_DIMENSION_OVERLAY_POLICY aggregate is imported directly only by the legacy facade'
  );
  assert.deepEqual(
    collectOwnerDependencyStatements(analyzedSources, 'sketch_box_dimension_overlay_policy.js'),
    Object.fromEntries(
      Object.keys(APPROVED_SKETCH_BOX_DIMENSION_OVERLAY_OWNER_IMPORTS).map(file => [file, 1])
    ),
    'Sketch Box Dimension Overlay migration must retain exactly one owner statement per approved importer'
  );

  const sketchBoxFreePlacementOwnerImports = collectOwnerImports(
    analyzedSources,
    'sketch_box_free_placement_policy.js'
  );
  assertApprovedSymbolUsage(
    sketchBoxFreePlacementOwnerImports,
    APPROVED_SKETCH_BOX_FREE_PLACEMENT_OWNER_IMPORTS,
    'Sketch Box Free Placement owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(sketchBoxFreePlacementOwnerImports)
        .filter(([, symbols]) => symbols.includes('SKETCH_BOX_FREE_PLACEMENT_POLICY'))
        .map(([file]) => [file, ['SKETCH_BOX_FREE_PLACEMENT_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['SKETCH_BOX_FREE_PLACEMENT_POLICY'],
    },
    'SKETCH_BOX_FREE_PLACEMENT_POLICY aggregate is imported directly only by the legacy facade'
  );
  assert.deepEqual(
    collectOwnerDependencyStatements(analyzedSources, 'sketch_box_free_placement_policy.js'),
    Object.fromEntries(Object.keys(APPROVED_SKETCH_BOX_FREE_PLACEMENT_OWNER_IMPORTS).map(file => [file, 1])),
    'Sketch Box Free Placement migration must retain exactly one owner statement per approved importer'
  );

  const sketchBoxPreviewOwnerImports = collectOwnerImports(analyzedSources, 'sketch_box_preview_policy.js');
  assertApprovedSymbolUsage(
    sketchBoxPreviewOwnerImports,
    APPROVED_SKETCH_BOX_PREVIEW_OWNER_IMPORTS,
    'Sketch Box Preview owner consumer allowlist'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(sketchBoxPreviewOwnerImports)
        .filter(([, symbols]) => symbols.includes('SKETCH_BOX_PREVIEW_POLICY'))
        .map(([file]) => [file, ['SKETCH_BOX_PREVIEW_POLICY']])
    ),
    {
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['SKETCH_BOX_PREVIEW_POLICY'],
    },
    'SKETCH_BOX_PREVIEW_POLICY aggregate is imported directly only by the legacy facade'
  );
  assert.deepEqual(
    collectOwnerDependencyStatements(analyzedSources, 'sketch_box_preview_policy.js'),
    Object.fromEntries(Object.keys(APPROVED_SKETCH_BOX_PREVIEW_OWNER_IMPORTS).map(file => [file, 1])),
    'Sketch Box Preview migration must retain exactly one owner statement per approved importer'
  );

  assertApprovedSymbolUsage(
    collectShellGridFieldUsage(analyzedSources),
    APPROVED_SHELL_GRID_FIELD_USAGE,
    'Carcass Shell grid-field compatibility allowlist'
  );
  assertApprovedSymbolUsage(
    collectFacadeSymbolImports(analyzedSources, ['BASE_LEG_DIMENSIONS', 'CARCASS_BASE_DIMENSIONS']),
    APPROVED_BASE_SUPPORT_FACADE_IMPORTS,
    'Base Support facade compatibility allowlist'
  );
  assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(analyzedSources));
  assertApprovedSymbolUsage(
    collectChestLegacyFieldUsage(analyzedSources),
    APPROVED_CHEST_LEGACY_FIELD_USAGE,
    'Chest Structural legacy facade field allowlist'
  );
  assertApprovedSymbolUsage(
    collectCorniceLegacyFieldUsage(analyzedSources),
    APPROVED_CORNICE_LEGACY_FIELD_USAGE,
    'Carcass Cornice legacy facade field allowlist'
  );
  assertApprovedSymbolUsage(
    collectMemberPropertyUsage(analyzedSources, 'thetaClampM'),
    APPROVED_CORNICE_THETA_CLAMP_M_USAGE,
    'Cornice thetaClampM compatibility field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'MATERIAL_DIMENSIONS',
      'dimensions/material_thickness_policy.js'
    ),
    APPROVED_MATERIAL_LEGACY_DEPENDENCIES,
    'Material legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'MATERIAL_DIMENSIONS',
      'dimensions/material_thickness_policy.js'
    ),
    APPROVED_MATERIAL_LEGACY_FIELD_USAGE,
    'Material legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'CHEST_MODE_DIMENSIONS',
      'dimensions/chest_mode_policy.js'
    ),
    APPROVED_CHEST_MODE_LEGACY_DEPENDENCIES,
    'Chest Mode legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'CHEST_MODE_DIMENSIONS',
      'dimensions/chest_mode_policy.js'
    ),
    APPROVED_CHEST_MODE_LEGACY_FIELD_USAGE,
    'Chest Mode legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'DOOR_SYSTEM_DIMENSIONS',
      'dimensions/door_system_policy.js'
    ),
    APPROVED_DOOR_SYSTEM_LEGACY_DEPENDENCIES,
    'Door System legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'DOOR_SYSTEM_DIMENSIONS',
      'dimensions/door_system_policy.js'
    ),
    APPROVED_DOOR_SYSTEM_LEGACY_FIELD_USAGE,
    'Door System legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      DOOR_MOUNT_THICKNESS_FACADE_SYMBOLS,
      'dimensions/door_mount_thickness_policy.js'
    ),
    APPROVED_DOOR_MOUNT_THICKNESS_LEGACY_DEPENDENCIES,
    'Door Mount Thickness legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'DOOR_MOUNT_THICKNESS_DIMENSIONS',
      'dimensions/door_mount_thickness_policy.js'
    ),
    APPROVED_DOOR_MOUNT_THICKNESS_LEGACY_FIELD_USAGE,
    'Door Mount Thickness legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'DOOR_VISUAL_DIMENSIONS',
      'dimensions/door_visual_policy.js'
    ),
    APPROVED_DOOR_VISUAL_LEGACY_DEPENDENCIES,
    'Door Visual legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'DOOR_VISUAL_DIMENSIONS',
      'dimensions/door_visual_policy.js'
    ),
    APPROVED_DOOR_VISUAL_LEGACY_FIELD_USAGE,
    'Door Visual legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'DOOR_TRIM_DIMENSIONS',
      'dimensions/door_trim_policy.js'
    ),
    APPROVED_DOOR_TRIM_LEGACY_DEPENDENCIES,
    'Door Trim legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'DOOR_TRIM_DIMENSIONS',
      'dimensions/door_trim_policy.js'
    ),
    APPROVED_DOOR_TRIM_LEGACY_FIELD_USAGE,
    'Door Trim legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDrawerExternalInternalFieldUsage(analyzedSources),
    APPROVED_DRAWER_EXTERNAL_INTERNAL_LEGACY_FIELD_USAGE,
    'Drawer External/Internal legacy facade field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDrawerSketchFieldUsage(analyzedSources),
    APPROVED_DRAWER_SKETCH_LEGACY_FIELD_USAGE,
    'Drawer Sketch legacy facade field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyInteriorStorageFieldUsage(analyzedSources),
    APPROVED_INTERIOR_STORAGE_LEGACY_FIELD_USAGE,
    'Interior Storage legacy facade field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyInteriorFittingsFieldUsage(analyzedSources),
    APPROVED_INTERIOR_FITTINGS_LEGACY_FIELD_USAGE,
    'Interior Fittings legacy facade field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyCornerSystemFieldUsage(analyzedSources),
    APPROVED_CORNER_SYSTEM_LEGACY_FIELD_USAGE,
    'Corner System legacy facade field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'CORNER_CONNECTOR_INTERIOR_DIMENSIONS',
      'dimensions/corner_connector_interior_policy.js'
    ),
    {},
    'Corner Connector Interior legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'CORNER_CONNECTOR_INTERIOR_DIMENSIONS',
      'dimensions/corner_connector_interior_policy.js'
    ),
    {},
    'Corner Connector Interior legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'FRONT_REVEAL_FRAME_DIMENSIONS',
      'dimensions/front_reveal_frame_policy.js'
    ),
    APPROVED_FRONT_REVEAL_LEGACY_DEPENDENCIES,
    'Front Reveal legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'FRONT_REVEAL_FRAME_DIMENSIONS',
      'dimensions/front_reveal_frame_policy.js'
    ),
    APPROVED_FRONT_REVEAL_LEGACY_FIELD_USAGE,
    'Front Reveal legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'HANDLE_DIMENSIONS',
      'dimensions/handle_policy.js'
    ),
    APPROVED_HANDLE_LEGACY_DEPENDENCIES,
    'Handle legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'HANDLE_DIMENSIONS',
      'dimensions/handle_policy.js'
    ),
    APPROVED_HANDLE_LEGACY_FIELD_USAGE,
    'Handle legacy field allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionSymbolDependencies(
      analyzedSources,
      'CONTENT_VISUAL_DIMENSIONS',
      'dimensions/content_visual_policy.js'
    ),
    APPROVED_CONTENT_VISUAL_LEGACY_DEPENDENCIES,
    'Content Visual legacy dependency allowlist'
  );
  assertApprovedSymbolUsage(
    collectLegacyDimensionPolicyFieldUsage(
      analyzedSources,
      'CONTENT_VISUAL_DIMENSIONS',
      'dimensions/content_visual_policy.js'
    ),
    APPROVED_CONTENT_VISUAL_LEGACY_FIELD_USAGE,
    'Content Visual legacy field allowlist'
  );
});

test('[dimension-foundation] Shell grid compatibility guard detects aliases, destructuring, and computed fields', () => {
  const fixtureUsage = collectShellGridFieldUsage([
    [
      'esm/native/builder/new_grid_consumer.ts',
      `
        import { CARCASS_SHELL_DIMENSIONS as shell } from '../../shared/dimensions/carcass_shell_policy.js';
        const shellAlias = shell;
        const { drawerGridDivisions } = shell;
        const { drawerSplitGridLineIndex: line } = shellAlias;
        export const divisions = shellAlias['drawerGridDivisions'];
        export { drawerGridDivisions, line };
      `,
    ],
  ]);
  assert.deepEqual(fixtureUsage, {
    'esm/native/builder/new_grid_consumer.ts': ['drawerGridDivisions', 'drawerSplitGridLineIndex'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(fixtureUsage, {}, 'Carcass Shell fixture grid-field compatibility allowlist'),
    /review-blocked/u
  );

  assert.deepEqual(
    collectShellGridFieldUsage([
      [
        'esm/native/builder/safe_shell_consumer.ts',
        `
          import { CARCASS_SHELL_DIMENSIONS as shell } from '../../shared/dimensions/carcass_shell_policy.js';
          const unrelated = { drawerGridDivisions: 9 };
          export const values = [shell.backThicknessM, unrelated.drawerGridDivisions];
        `,
      ],
    ]),
    {}
  );
});

test('[dimension-foundation] facade guards reject namespace, wildcard, and dynamic dependency swaps', () => {
  const sources = [
    [
      'esm/native/builder/namespace_dimensions.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        export const base = dimensions.CARCASS_BASE_DIMENSIONS;
      `,
    ],
    [
      'esm/native/builder/dynamic_dimensions.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
    [
      'esm/native/builder/wildcard_dimensions.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
  ];
  const broadDependencies = collectDimensionFacadeBroadDependencies(sources);
  assert.deepEqual(broadDependencies, [
    { file: 'esm/native/builder/dynamic_dimensions.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/builder/namespace_dimensions.ts', syntax: 'static-import' },
    { file: 'esm/native/builder/wildcard_dimensions.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(() => assertApprovedDimensionFacadeBroadDependencies(broadDependencies), /requires review/u);
});

test('[dimension-foundation] Chest legacy guard detects named, aliased, namespace, destructured, and computed access', () => {
  const fixtureUsage = collectChestLegacyFieldUsage([
    [
      'esm/native/builder/named_chest_consumer.ts',
      `
        import { CARCASS_BASE_DIMENSIONS as base } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const baseAlias = base;
        const { chest: structural } = baseAlias;
        const { connectorDepthM: depth } = structural;
        const wheelPolicy = structural['wheels'];
        export const values = [depth, wheelPolicy.radiusM];
      `,
    ],
    [
      'esm/native/builder/namespace_chest_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const base = dimensions.CARCASS_BASE_DIMENSIONS;
        export const gap = base.chest['drawerGapM'];
      `,
    ],
  ]);
  assert.deepEqual(fixtureUsage, {
    'esm/native/builder/named_chest_consumer.ts': ['chest', 'connectorDepthM', 'wheels', 'wheels.radiusM'],
    'esm/native/builder/namespace_chest_consumer.ts': ['chest', 'drawerGapM'],
  });
  assert.throws(
    () => assertApprovedSymbolUsage(fixtureUsage, {}, 'Chest fixture legacy facade field allowlist'),
    /review-blocked/u
  );
});

test('[dimension-foundation] Cornice legacy guard detects named, aliased, namespace, destructured, and computed access', () => {
  const fixtureUsage = collectCorniceLegacyFieldUsage([
    [
      'esm/native/builder/named_cornice_consumer.ts',
      `
        import { CARCASS_CORNICE_DIMENSIONS as cornice } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const corniceAlias = cornice;
        const { common } = corniceAlias;
        const wavePolicy = corniceAlias['wave'];
        export const values = [common['yLiftM'], wavePolicy.maxHeightM];
      `,
    ],
    [
      'esm/native/builder/namespace_cornice_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const cornice = dimensions.CARCASS_CORNICE_DIMENSIONS;
        const { profile } = cornice;
        export const height = profile['heightM'];
      `,
    ],
  ]);
  assert.deepEqual(fixtureUsage, {
    'esm/native/builder/named_cornice_consumer.ts': ['common', 'common.yLiftM', 'wave', 'wave.maxHeightM'],
    'esm/native/builder/namespace_cornice_consumer.ts': ['profile', 'profile.heightM'],
  });
  assert.throws(
    () => assertApprovedSymbolUsage(fixtureUsage, {}, 'Cornice fixture legacy facade field allowlist'),
    /review-blocked/u
  );
});

test('[dimension-foundation] Material legacy guard detects aliases, namespace access, destructuring, and dynamic fields', () => {
  const sources = [
    [
      'esm/native/builder/named_material_consumer.ts',
      `
        import { MATERIAL_DIMENSIONS as material } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const materialAlias = material;
        const { wood } = materialAlias;
        const thickness = wood['thicknessM'];
        export const dynamic = materialAlias[key];
        export { thickness };
      `,
    ],
    [
      'esm/native/builder/namespace_material_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const material = dimensions.MATERIAL_DIMENSIONS;
        export const thickness = material.glassShelf.thicknessM;
      `,
    ],
  ];
  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(
      sources,
      'MATERIAL_DIMENSIONS',
      'dimensions/material_thickness_policy.js'
    ),
    {
      'esm/native/builder/named_material_consumer.ts': ['<computed>', 'wood', 'wood.thicknessM'],
      'esm/native/builder/namespace_material_consumer.ts': ['glassShelf', 'glassShelf.thicknessM'],
    }
  );
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(
          sources,
          'MATERIAL_DIMENSIONS',
          'dimensions/material_thickness_policy.js'
        ),
        {},
        'Material fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Chest Mode guard detects aliases, namespace access, nested fields, and dynamic fields', () => {
  const sources = [
    [
      'esm/native/builder/named_chest_mode_consumer.ts',
      `
        import { CHEST_MODE_DIMENSIONS as chestMode } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const chestModeAlias = chestMode;
        const { activeDefaults } = chestModeAlias;
        const width = activeDefaults['widthCm'];
        export const dynamic = chestModeAlias[key];
        export { width };
      `,
    ],
    [
      'esm/native/builder/namespace_chest_mode_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const chestMode = dimensions.CHEST_MODE_DIMENSIONS;
        const { dimensionGuideTextScale: scale } = chestMode;
        export const totalScale = scale.total.scale;
      `,
    ],
  ];
  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(
      sources,
      'CHEST_MODE_DIMENSIONS',
      'dimensions/chest_mode_policy.js'
    ),
    {
      'esm/native/builder/named_chest_mode_consumer.ts': [
        '<computed>',
        'activeDefaults',
        'activeDefaults.widthCm',
      ],
      'esm/native/builder/namespace_chest_mode_consumer.ts': [
        'dimensionGuideTextScale',
        'dimensionGuideTextScale.total',
        'dimensionGuideTextScale.total.scale',
      ],
    }
  );
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(
          sources,
          'CHEST_MODE_DIMENSIONS',
          'dimensions/chest_mode_policy.js'
        ),
        {},
        'Chest Mode fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Door System guard detects aliases, namespace access, nested fields, and dynamic fields', () => {
  const sources = [
    [
      'esm/native/builder/named_door_system_consumer.ts',
      `
        import { DOOR_SYSTEM_DIMENSIONS as doors } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const doorAlias = doors;
        const { hinged: hingedPolicy } = doorAlias;
        const { split: splitPolicy } = hingedPolicy;
        const gap = splitPolicy['splitGapM'];
        export const dynamic = doorAlias[key];
        export { gap };
      `,
    ],
    [
      'esm/native/builder/namespace_door_system_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const doors = dimensions.DOOR_SYSTEM_DIMENSIONS;
        const { sliding } = doors;
        export const overlap = sliding['overlapM'];
      `,
    ],
  ];
  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(
      sources,
      'DOOR_SYSTEM_DIMENSIONS',
      'dimensions/door_system_policy.js'
    ),
    {
      'esm/native/builder/named_door_system_consumer.ts': [
        '<computed>',
        'hinged',
        'hinged.split',
        'hinged.split.splitGapM',
      ],
      'esm/native/builder/namespace_door_system_consumer.ts': ['sliding', 'sliding.overlapM'],
    }
  );
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(
          sources,
          'DOOR_SYSTEM_DIMENSIONS',
          'dimensions/door_system_policy.js'
        ),
        {},
        'Door System fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Door Mount guard detects value/type aliases, namespace fields, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_door_mount_consumer.ts',
      `
        import { DOOR_MOUNT_THICKNESS_DIMENSIONS as dimensions } from '../../shared/wardrobe_dimension_tokens_shared.js';
        import { normalizeDoorMountThicknessCm as normalize } from '../../shared/wardrobe_dimension_tokens_shared.js';
        import type { DoorMountThicknessConfigKey as ConfigKey } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const alias = dimensions;
        const { minCm } = alias;
        export const step = alias['stepCm'];
        export const dynamic = alias[key];
        export type { ConfigKey };
        export { minCm, normalize };
      `,
    ],
    [
      'esm/native/builder/namespace_door_mount_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const policy = dimensions.DOOR_MOUNT_THICKNESS_DIMENSIONS;
        export const max = policy.maxCm;
      `,
    ],
    [
      'esm/native/runtime/door_mount_type_reexport.ts',
      `export type { DoorMountConstructionMode as MountMode } from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/door_mount_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/door_mount_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(
    collectLegacyDimensionSymbolDependencies(
      sources,
      DOOR_MOUNT_THICKNESS_FACADE_SYMBOLS,
      'dimensions/door_mount_thickness_policy.js'
    ),
    {
      'esm/native/builder/named_door_mount_consumer.ts': [
        'DOOR_MOUNT_THICKNESS_DIMENSIONS@static-import',
        'DoorMountThicknessConfigKey@type-import',
        'normalizeDoorMountThicknessCm@static-import',
      ],
      'esm/native/runtime/door_mount_type_reexport.ts': ['DoorMountConstructionMode@type-re-export'],
    }
  );
  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(
      sources,
      'DOOR_MOUNT_THICKNESS_DIMENSIONS',
      'dimensions/door_mount_thickness_policy.js'
    ),
    {
      'esm/native/builder/named_door_mount_consumer.ts': ['<computed>', 'minCm', 'stepCm'],
      'esm/native/builder/namespace_door_mount_consumer.ts': ['maxCm'],
    }
  );
  assert.deepEqual(collectDimensionFacadeBroadDependencies(sources), [
    { file: 'esm/native/builder/namespace_door_mount_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/door_mount_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/door_mount_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionSymbolDependencies(
          sources,
          DOOR_MOUNT_THICKNESS_FACADE_SYMBOLS,
          'dimensions/door_mount_thickness_policy.js'
        ),
        {},
        'Door Mount fixture legacy dependency allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () => assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(sources)),
    /requires review/u
  );
});

test('[dimension-foundation] Door Visual guard detects aliases, nested fields, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_door_visual_consumer.ts',
      `
        import { DOOR_VISUAL_DIMENSIONS as visuals } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const visualAlias = visuals;
        const { mirror: { layoutMinSizeM: minSize } } = visualAlias;
        const { profile: profilePolicy } = visualAlias;
        export const frame = profilePolicy['outerFrameWidthM'];
        export const dynamic = visualAlias[key];
        export { minSize };
      `,
    ],
    [
      'esm/native/builder/namespace_door_visual_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const visuals = dimensions.DOOR_VISUAL_DIMENSIONS;
        const { glass } = visuals;
        export const paneDepth = glass['paneDepthM'];
      `,
    ],
    [
      'esm/native/runtime/door_visual_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/door_visual_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(
    collectLegacyDimensionSymbolDependencies(
      sources,
      'DOOR_VISUAL_DIMENSIONS',
      'dimensions/door_visual_policy.js'
    ),
    {
      'esm/native/builder/named_door_visual_consumer.ts': ['DOOR_VISUAL_DIMENSIONS@static-import'],
    }
  );
  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(
      sources,
      'DOOR_VISUAL_DIMENSIONS',
      'dimensions/door_visual_policy.js'
    ),
    {
      'esm/native/builder/named_door_visual_consumer.ts': [
        '<computed>',
        'mirror',
        'mirror.layoutMinSizeM',
        'profile',
        'profile.outerFrameWidthM',
      ],
      'esm/native/builder/namespace_door_visual_consumer.ts': ['glass', 'glass.paneDepthM'],
    }
  );
  assert.deepEqual(collectDimensionFacadeBroadDependencies(sources), [
    { file: 'esm/native/builder/namespace_door_visual_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/door_visual_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/door_visual_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(
          sources,
          'DOOR_VISUAL_DIMENSIONS',
          'dimensions/door_visual_policy.js'
        ),
        {},
        'Door Visual fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Door Trim guard detects aliases, nested fields, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_door_trim_consumer.ts',
      `
        import { DOOR_TRIM_DIMENSIONS as trims } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const trimAlias = trims;
        const { defaults: { frontZM: front } } = trimAlias;
        const { snap: snapPolicy } = trimAlias;
        export const zone = snapPolicy['mirrorZoneM'];
        export const dynamic = trimAlias[key];
        export { front };
      `,
    ],
    [
      'esm/native/builder/namespace_door_trim_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const trims = dimensions.DOOR_TRIM_DIMENSIONS;
        const { removeTolerance } = trims;
        export const max = removeTolerance['maxM'];
      `,
    ],
    [
      'esm/native/runtime/door_trim_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/door_trim_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(
    collectLegacyDimensionSymbolDependencies(
      sources,
      'DOOR_TRIM_DIMENSIONS',
      'dimensions/door_trim_policy.js'
    ),
    {
      'esm/native/builder/named_door_trim_consumer.ts': ['DOOR_TRIM_DIMENSIONS@static-import'],
    }
  );
  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(sources, 'DOOR_TRIM_DIMENSIONS', 'dimensions/door_trim_policy.js'),
    {
      'esm/native/builder/named_door_trim_consumer.ts': [
        '<computed>',
        'defaults',
        'defaults.frontZM',
        'snap',
        'snap.mirrorZoneM',
      ],
      'esm/native/builder/namespace_door_trim_consumer.ts': ['removeTolerance', 'removeTolerance.maxM'],
    }
  );
  assert.deepEqual(collectDimensionFacadeBroadDependencies(sources), [
    { file: 'esm/native/builder/namespace_door_trim_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/door_trim_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/door_trim_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(
          sources,
          'DOOR_TRIM_DIMENSIONS',
          'dimensions/door_trim_policy.js'
        ),
        {},
        'Door Trim fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Drawer External/Internal guards detect aliases, nested fields, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_drawer_consumer.ts',
      `
        import { DRAWER_DIMENSIONS as drawers } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const drawerAlias = drawers;
        const { external: { shoeHeightM } } = drawerAlias;
        const internal = drawerAlias['internal'];
        export const bottomInset = internal.contentsBottomInsetM;
        export const dynamic = drawerAlias[key];
        export { shoeHeightM };
      `,
    ],
    [
      'esm/native/builder/namespace_drawer_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { external } = dimensions.DRAWER_DIMENSIONS;
        export const clearance = external['visualWidthClearanceM'];
      `,
    ],
    [
      'esm/native/runtime/drawer_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/drawer_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(collectLegacyDrawerExternalInternalFieldUsage(sources), {
    'esm/native/builder/named_drawer_consumer.ts': [
      '<computed>',
      'external',
      'external.shoeHeightM',
      'internal',
      'internal.contentsBottomInsetM',
    ],
    'esm/native/builder/namespace_drawer_consumer.ts': ['external', 'external.visualWidthClearanceM'],
  });
  assert.deepEqual(collectDimensionFacadeBroadDependencies(sources), [
    { file: 'esm/native/builder/namespace_drawer_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/drawer_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/drawer_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDrawerExternalInternalFieldUsage(sources),
        {},
        'Drawer External/Internal fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () => assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(sources)),
    /requires review/u
  );

  const aggregateOwnerImports = collectOwnerImports(
    [
      [
        'esm/native/builder/new_external_aggregate_consumer.ts',
        `import { EXTERNAL_DRAWER_POLICY as drawers } from '../../shared/dimensions/external_drawer_policy.js';`,
      ],
    ],
    'external_drawer_policy.js'
  );
  assert.deepEqual(aggregateOwnerImports, {
    'esm/native/builder/new_external_aggregate_consumer.ts': ['EXTERNAL_DRAWER_POLICY'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        aggregateOwnerImports,
        APPROVED_EXTERNAL_DRAWER_OWNER_IMPORTS,
        'External Drawer fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Interior Storage guards detect aliases, namespace access, destructuring, computed access, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_interior_storage_consumer.ts',
      `
        import { INTERIOR_FITTINGS_DIMENSIONS as fittings } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const oneHop = fittings;
        const storage = oneHop.storage;
        const { barrierHeightM } = storage;
        export const literal = storage['barrierWidthMinM'];
        export const dynamic = storage[key];
        export { barrierHeightM };
      `,
    ],
    [
      'esm/native/builder/namespace_interior_storage_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { storage: storageAlias } = dimensions.INTERIOR_FITTINGS_DIMENSIONS;
        const defaults = storageAlias;
        const { defaultLowerShelfSlots, gridDivisionsDefault } = defaults;
        export { defaultLowerShelfSlots, gridDivisionsDefault };
      `,
    ],
    [
      'esm/native/runtime/interior_storage_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/interior_storage_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(collectLegacyInteriorStorageFieldUsage(sources), {
    'esm/native/builder/named_interior_storage_consumer.ts': [
      'storage',
      'storage.<computed>',
      'storage.barrierHeightM',
      'storage.barrierWidthMinM',
    ],
    'esm/native/builder/namespace_interior_storage_consumer.ts': [
      'storage',
      'storage.defaultLowerShelfSlots',
      'storage.gridDivisionsDefault',
    ],
  });
  assert.deepEqual(collectDimensionFacadeBroadDependencies(sources), [
    { file: 'esm/native/builder/namespace_interior_storage_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/interior_storage_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/interior_storage_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyInteriorStorageFieldUsage(sources),
        {},
        'Interior Storage fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () => assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(sources)),
    /requires review/u
  );

  const aggregateOwnerImports = collectOwnerImports(
    [
      [
        'esm/native/builder/new_interior_storage_aggregate_consumer.ts',
        `import { INTERIOR_STORAGE_POLICY as storage } from '../../shared/dimensions/interior_storage_policy.js';`,
      ],
    ],
    'interior_storage_policy.js'
  );
  assert.deepEqual(aggregateOwnerImports, {
    'esm/native/builder/new_interior_storage_aggregate_consumer.ts': ['INTERIOR_STORAGE_POLICY'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        aggregateOwnerImports,
        APPROVED_INTERIOR_STORAGE_OWNER_IMPORTS,
        'Interior Storage fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Interior Fittings guards detect aliases, namespace access, nested destructuring, computed access, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_interior_fittings_consumer.ts',
      `
        import { INTERIOR_FITTINGS_DIMENSIONS as fittings } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const oneHop = fittings;
        const rods = oneHop.rods;
        const { shelves: { regularDepthM } } = oneHop;
        export const literal = rods['radiusM'];
        export const dynamic = rods[key];
        export { regularDepthM };
      `,
    ],
    [
      'esm/native/builder/namespace_interior_fittings_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { presets: { fullShelfRows } } = dimensions.INTERIOR_FITTINGS_DIMENSIONS;
        export { fullShelfRows };
      `,
    ],
    [
      'esm/native/runtime/interior_fittings_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/interior_fittings_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(collectLegacyInteriorFittingsFieldUsage(sources), {
    'esm/native/builder/named_interior_fittings_consumer.ts': [
      'rods',
      'rods.<computed>',
      'rods.radiusM',
      'shelves',
      'shelves.regularDepthM',
    ],
    'esm/native/builder/namespace_interior_fittings_consumer.ts': ['presets', 'presets.fullShelfRows'],
  });
  assert.deepEqual(collectDimensionFacadeBroadDependencies(sources), [
    { file: 'esm/native/builder/namespace_interior_fittings_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/interior_fittings_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/interior_fittings_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyInteriorFittingsFieldUsage(sources),
        {},
        'Interior Fittings fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () => assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(sources)),
    /requires review/u
  );

  const aggregateOwnerImports = collectOwnerImports(
    [
      [
        'esm/native/builder/new_interior_fittings_aggregate_consumer.ts',
        `import { INTERIOR_FITTINGS_POLICY as fittings } from '../../shared/dimensions/interior_fittings_policy.js';`,
      ],
    ],
    'interior_fittings_policy.js'
  );
  assert.deepEqual(aggregateOwnerImports, {
    'esm/native/builder/new_interior_fittings_aggregate_consumer.ts': ['INTERIOR_FITTINGS_POLICY'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        aggregateOwnerImports,
        APPROVED_INTERIOR_FITTINGS_OWNER_IMPORTS,
        'Interior Fittings fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Corner System guards detect legacy aliases, aggregates, computed access, dynamic imports, and owner bridges', () => {
  const legacySources = [
    [
      'esm/native/builder/named_corner_consumer.ts',
      `
        import { CORNER_WING_DIMENSIONS as corner } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const oneHop = corner;
        const connector = oneHop.connector;
        const { wing: { defaultWidthCm } } = oneHop;
        export const literal = connector['minWallLengthM'];
        export const dynamic = connector[key];
        export { defaultWidthCm };
      `,
    ],
    [
      'esm/native/builder/namespace_corner_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { cells: { doorsPerCell } } = dimensions.CORNER_WING_DIMENSIONS;
        export { doorsPerCell };
      `,
    ],
    [
      'esm/native/runtime/corner_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/corner_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(collectLegacyCornerSystemFieldUsage(legacySources), {
    'esm/native/builder/named_corner_consumer.ts': [
      'connector',
      'connector.<computed>',
      'connector.minWallLengthM',
      'wing',
      'wing.defaultWidthCm',
    ],
    'esm/native/builder/namespace_corner_consumer.ts': ['cells', 'cells.doorsPerCell'],
  });
  assert.deepEqual(collectDimensionFacadeBroadDependencies(legacySources), [
    { file: 'esm/native/builder/namespace_corner_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/corner_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/corner_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyCornerSystemFieldUsage(legacySources),
        {},
        'Corner System fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () =>
      assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(legacySources)),
    /requires review/u
  );

  const ownerSources = [
    [
      'esm/native/builder/new_corner_aggregate_consumer.ts',
      `import { CORNER_SYSTEM_POLICY } from '../../shared/dimensions/corner_system_policy.js';`,
    ],
    [
      'esm/native/builder/new_corner_namespace_consumer.ts',
      `import * as corner from '../../shared/dimensions/corner_system_policy.js'; export { corner };`,
    ],
    [
      'esm/native/runtime/corner_owner_dynamic.ts',
      `export const corner = import('../../shared/dimensions/corner_system_policy.js');`,
    ],
    [
      'esm/native/runtime/corner_owner_bridge.ts',
      `export { CORNER_WING_BODY_POLICY } from '../../shared/dimensions/corner_system_policy.js';`,
    ],
  ];
  const ownerImports = collectOwnerImports(ownerSources, 'corner_system_policy.js');
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        ownerImports,
        APPROVED_CORNER_SYSTEM_OWNER_IMPORTS,
        'Corner System fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );

  const ownerBridge = [
    [
      'esm/shared/dimensions/corner_system_policy.ts',
      `export { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';`,
    ],
  ];
  assert.deepEqual(collectModuleReexports(ownerBridge), [
    {
      file: 'esm/shared/dimensions/corner_system_policy.ts',
      specifier: './material_thickness_policy.js',
      syntax: 'static-re-export',
      symbols: ['MATERIAL_THICKNESS_POLICY'],
    },
  ]);
});

test('[dimension-foundation] Corner Connector Interior guards detect aliases, aggregates, computed access, dynamic imports, and owner bridges', () => {
  const legacySources = [
    [
      'esm/native/builder/named_corner_connector_interior_consumer.ts',
      `
        import { CORNER_CONNECTOR_INTERIOR_DIMENSIONS as interior } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const oneHop = interior;
        const post = oneHop.specialPost;
        const { attachRod: { radiusDefaultMm } } = oneHop;
        export const literal = post['depthMinM'];
        export const dynamic = post[key];
        export { radiusDefaultMm };
      `,
    ],
    [
      'esm/native/builder/namespace_corner_connector_interior_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { foldedContents: { widthMinM } } = dimensions.CORNER_CONNECTOR_INTERIOR_DIMENSIONS;
        export { widthMinM };
      `,
    ],
    [
      'esm/native/runtime/corner_connector_interior_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/corner_connector_interior_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(
      legacySources,
      'CORNER_CONNECTOR_INTERIOR_DIMENSIONS',
      'dimensions/corner_connector_interior_policy.js'
    ),
    {
      'esm/native/builder/named_corner_connector_interior_consumer.ts': [
        'attachRod',
        'attachRod.radiusDefaultMm',
        'specialPost',
        'specialPost.<computed>',
        'specialPost.depthMinM',
      ],
      'esm/native/builder/namespace_corner_connector_interior_consumer.ts': [
        'foldedContents',
        'foldedContents.widthMinM',
      ],
    }
  );
  assert.deepEqual(collectDimensionFacadeBroadDependencies(legacySources), [
    {
      file: 'esm/native/builder/namespace_corner_connector_interior_consumer.ts',
      syntax: 'static-import',
    },
    {
      file: 'esm/native/runtime/corner_connector_interior_dynamic.ts',
      syntax: 'dynamic-import',
    },
    {
      file: 'esm/native/runtime/corner_connector_interior_wildcard.ts',
      syntax: 'static-re-export',
    },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(
          legacySources,
          'CORNER_CONNECTOR_INTERIOR_DIMENSIONS',
          'dimensions/corner_connector_interior_policy.js'
        ),
        {},
        'Corner Connector Interior fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () =>
      assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(legacySources)),
    /requires review/u
  );

  const ownerSources = [
    [
      'esm/native/builder/new_corner_connector_interior_aggregate_consumer.ts',
      `import { CORNER_CONNECTOR_INTERIOR_POLICY as interior } from '../../shared/dimensions/corner_connector_interior_policy.js'; export { interior };`,
    ],
    [
      'esm/native/builder/new_corner_connector_interior_namespace_consumer.ts',
      `import * as interior from '../../shared/dimensions/corner_connector_interior_policy.js'; export { interior };`,
    ],
    [
      'esm/native/runtime/corner_connector_interior_owner_dynamic.ts',
      `export const interior = import('../../shared/dimensions/corner_connector_interior_policy.js');`,
    ],
    [
      'esm/native/runtime/corner_connector_interior_owner_wildcard.ts',
      `export * from '../../shared/dimensions/corner_connector_interior_policy.js';`,
    ],
  ];
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectOwnerImports(ownerSources, 'corner_connector_interior_policy.js'),
        APPROVED_CORNER_CONNECTOR_INTERIOR_OWNER_IMPORTS,
        'Corner Connector Interior fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );

  const ownerBridge = [
    [
      'esm/shared/dimensions/corner_connector_interior_policy.ts',
      `export { INTERIOR_ROD_POLICY } from './interior_fittings_policy.js';`,
    ],
  ];
  assert.deepEqual(collectModuleReexports(ownerBridge), [
    {
      file: 'esm/shared/dimensions/corner_connector_interior_policy.ts',
      specifier: './interior_fittings_policy.js',
      syntax: 'static-re-export',
      symbols: ['INTERIOR_ROD_POLICY'],
    },
  ]);
});

test('[dimension-foundation] Drawer Sketch guards detect aliases, namespace access, nested destructuring, computed access, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_drawer_sketch_consumer.ts',
      `
        import { DRAWER_DIMENSIONS as drawers } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const oneHop = drawers;
        const sketch = oneHop.sketch;
        const { internalPreviewMinWidthM } = sketch;
        export const literal = sketch['externalPreviewMinDepthM'];
        export const dynamic = sketch[key];
        export { internalPreviewMinWidthM };
      `,
    ],
    [
      'esm/native/builder/namespace_drawer_sketch_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { sketch: { doorCutNoOpToleranceM } } = dimensions.DRAWER_DIMENSIONS;
        export { doorCutNoOpToleranceM };
      `,
    ],
    [
      'esm/native/runtime/drawer_sketch_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/drawer_sketch_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(collectLegacyDrawerSketchFieldUsage(sources), {
    'esm/native/builder/named_drawer_sketch_consumer.ts': [
      'sketch',
      'sketch.<computed>',
      'sketch.externalPreviewMinDepthM',
      'sketch.internalPreviewMinWidthM',
    ],
    'esm/native/builder/namespace_drawer_sketch_consumer.ts': ['sketch', 'sketch.doorCutNoOpToleranceM'],
  });
  assert.deepEqual(collectDimensionFacadeBroadDependencies(sources), [
    { file: 'esm/native/builder/namespace_drawer_sketch_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/drawer_sketch_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/drawer_sketch_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDrawerSketchFieldUsage(sources),
        {},
        'Drawer Sketch fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () => assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(sources)),
    /requires review/u
  );

  const aggregateOwnerImports = collectOwnerImports(
    [
      [
        'esm/native/builder/new_drawer_sketch_aggregate_consumer.ts',
        `import { DRAWER_SKETCH_POLICY as sketch } from '../../shared/dimensions/drawer_sketch_policy.js';`,
      ],
    ],
    'drawer_sketch_policy.js'
  );
  assert.deepEqual(aggregateOwnerImports, {
    'esm/native/builder/new_drawer_sketch_aggregate_consumer.ts': ['DRAWER_SKETCH_POLICY'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        aggregateOwnerImports,
        APPROVED_DRAWER_SKETCH_OWNER_IMPORTS,
        'Drawer Sketch fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Front Reveal guards detect aliases, namespace access, destructuring, computed access, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_front_reveal_consumer.ts',
      `
        import { FRONT_REVEAL_FRAME_DIMENSIONS as frame } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const oneHop = frame;
        const { zNudgeM } = oneHop;
        export const literal = oneHop['dualInnerInsetM'];
        export const dynamic = oneHop[key];
        export { zNudgeM };
      `,
    ],
    [
      'esm/native/builder/namespace_front_reveal_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { drawerFrontThicknessM } = dimensions.FRONT_REVEAL_FRAME_DIMENSIONS;
        export { drawerFrontThicknessM };
      `,
    ],
    [
      'esm/native/runtime/front_reveal_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/front_reveal_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(
      sources,
      'FRONT_REVEAL_FRAME_DIMENSIONS',
      'dimensions/front_reveal_frame_policy.js'
    ),
    {
      'esm/native/builder/named_front_reveal_consumer.ts': ['<computed>', 'dualInnerInsetM', 'zNudgeM'],
      'esm/native/builder/namespace_front_reveal_consumer.ts': ['drawerFrontThicknessM'],
    }
  );
  assert.deepEqual(collectDimensionFacadeBroadDependencies(sources), [
    { file: 'esm/native/builder/namespace_front_reveal_consumer.ts', syntax: 'static-import' },
    { file: 'esm/native/runtime/front_reveal_dynamic.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/runtime/front_reveal_wildcard.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(
          sources,
          'FRONT_REVEAL_FRAME_DIMENSIONS',
          'dimensions/front_reveal_frame_policy.js'
        ),
        APPROVED_FRONT_REVEAL_LEGACY_FIELD_USAGE,
        'Front Reveal fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () => assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(sources)),
    /requires review/u
  );

  const aggregateOwnerImports = collectOwnerImports(
    [
      [
        'esm/native/builder/new_front_reveal_aggregate_consumer.ts',
        `import { FRONT_REVEAL_FRAME_POLICY as frame } from '../../shared/dimensions/front_reveal_frame_policy.js';`,
      ],
    ],
    'front_reveal_frame_policy.js'
  );
  assert.deepEqual(aggregateOwnerImports, {
    'esm/native/builder/new_front_reveal_aggregate_consumer.ts': ['FRONT_REVEAL_FRAME_POLICY'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        aggregateOwnerImports,
        APPROVED_FRONT_REVEAL_OWNER_IMPORTS,
        'Front Reveal fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Handle guards detect aliases, namespace access, nested destructuring, computed access, and broad dependencies', () => {
  const sources = [
    [
      'esm/native/builder/named_handle_consumer.ts',
      `
        import { HANDLE_DIMENSIONS as handles } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const oneHop = handles;
        const edge = oneHop.edge;
        const { edge: { shortLengthM } } = oneHop;
        export const literal = edge['longLengthM'];
        export const dynamic = edge[key];
        export { shortLengthM };
      `,
    ],
    [
      'esm/native/builder/namespace_handle_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { standard: { doorHeightM } } = dimensions.HANDLE_DIMENSIONS;
        export { doorHeightM };
      `,
    ],
    [
      'esm/native/runtime/handle_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/handle_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(sources, 'HANDLE_DIMENSIONS', 'dimensions/handle_policy.js'),
    {
      'esm/native/builder/named_handle_consumer.ts': [
        'edge',
        'edge.<computed>',
        'edge.longLengthM',
        'edge.shortLengthM',
      ],
      'esm/native/builder/namespace_handle_consumer.ts': ['standard', 'standard.doorHeightM'],
    }
  );
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(sources, 'HANDLE_DIMENSIONS', 'dimensions/handle_policy.js'),
        APPROVED_HANDLE_LEGACY_FIELD_USAGE,
        'Handle fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () => assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(sources)),
    /requires review/u
  );

  const aggregateOwnerImports = collectOwnerImports(
    [
      [
        'esm/native/builder/new_handle_aggregate_consumer.ts',
        `import { HANDLE_POLICY as handles } from '../../shared/dimensions/handle_policy.js';`,
      ],
      [
        'esm/native/builder/new_handle_owner_dynamic.ts',
        `export const policy = import('../../shared/dimensions/handle_policy.js');`,
      ],
      [
        'esm/native/builder/new_handle_owner_wildcard.ts',
        `export * from '../../shared/dimensions/handle_policy.js';`,
      ],
    ],
    'handle_policy.js'
  );
  assert.deepEqual(aggregateOwnerImports, {
    'esm/native/builder/new_handle_aggregate_consumer.ts': ['HANDLE_POLICY'],
    'esm/native/builder/new_handle_owner_dynamic.ts': ['*'],
    'esm/native/builder/new_handle_owner_wildcard.ts': ['*'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        aggregateOwnerImports,
        APPROVED_HANDLE_OWNER_IMPORTS,
        'Handle fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] Content Visual guards detect aliases, namespace access, nested destructuring, computed access, and owner bridges', () => {
  const sources = [
    [
      'esm/native/builder/named_content_visual_consumer.ts',
      `
        import { CONTENT_VISUAL_DIMENSIONS as content } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const oneHop = content;
        const books = oneHop.books;
        const { hanger: { halfWidthM } } = oneHop;
        export const literal = books['depthMarginM'];
        export const dynamic = books[key];
        export { halfWidthM };
      `,
    ],
    [
      'esm/native/builder/namespace_content_visual_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const { foldedClothes: { itemHeightM } } = dimensions.CONTENT_VISUAL_DIMENSIONS;
        export { itemHeightM };
      `,
    ],
    [
      'esm/native/runtime/content_visual_wildcard.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
    [
      'esm/native/runtime/content_visual_dynamic.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
  ];

  assert.deepEqual(
    collectLegacyDimensionPolicyFieldUsage(
      sources,
      'CONTENT_VISUAL_DIMENSIONS',
      'dimensions/content_visual_policy.js'
    ),
    {
      'esm/native/builder/named_content_visual_consumer.ts': [
        'books',
        'books.<computed>',
        'books.depthMarginM',
        'hanger',
        'hanger.halfWidthM',
      ],
      'esm/native/builder/namespace_content_visual_consumer.ts': [
        'foldedClothes',
        'foldedClothes.itemHeightM',
      ],
    }
  );
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        collectLegacyDimensionPolicyFieldUsage(
          sources,
          'CONTENT_VISUAL_DIMENSIONS',
          'dimensions/content_visual_policy.js'
        ),
        APPROVED_CONTENT_VISUAL_LEGACY_FIELD_USAGE,
        'Content Visual fixture legacy field allowlist'
      ),
    /review-blocked/u
  );
  assert.throws(
    () => assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(sources)),
    /requires review/u
  );

  const aggregateOwnerImports = collectOwnerImports(
    [
      [
        'esm/native/builder/new_content_visual_aggregate_consumer.ts',
        `import { CONTENT_VISUAL_POLICY as content } from '../../shared/dimensions/content_visual_policy.js';`,
      ],
      [
        'esm/native/builder/new_content_visual_bridge.ts',
        `export * from '../../shared/dimensions/content_visual_policy.js';`,
      ],
      [
        'esm/native/builder/new_content_visual_dynamic.ts',
        `export const policy = import('../../shared/dimensions/content_visual_policy.js');`,
      ],
    ],
    'content_visual_policy.js'
  );
  assert.deepEqual(aggregateOwnerImports, {
    'esm/native/builder/new_content_visual_aggregate_consumer.ts': ['CONTENT_VISUAL_POLICY'],
    'esm/native/builder/new_content_visual_bridge.ts': ['*'],
    'esm/native/builder/new_content_visual_dynamic.ts': ['*'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        aggregateOwnerImports,
        APPROVED_CONTENT_VISUAL_OWNER_IMPORTS,
        'Content Visual fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );

  const sketchBoxOwnerImports = collectOwnerImports(
    [
      [
        'esm/native/builder/new_sketch_classic_policy_consumer.ts',
        `import { SKETCH_BOX_CLASSIC_ACCENT_POLICY as accent } from '../../shared/dimensions/sketch_box_classic_door_visual_policy.js';`,
      ],
      [
        'esm/native/builder/new_sketch_classic_policy_dynamic.ts',
        `export const policy = import('../../shared/dimensions/sketch_box_classic_door_visual_policy.js');`,
      ],
      [
        'esm/native/builder/new_sketch_classic_policy_bridge.ts',
        `export * from '../../shared/dimensions/sketch_box_classic_door_visual_policy.js';`,
      ],
    ],
    'sketch_box_classic_door_visual_policy.js'
  );
  assert.deepEqual(sketchBoxOwnerImports, {
    'esm/native/builder/new_sketch_classic_policy_bridge.ts': ['*'],
    'esm/native/builder/new_sketch_classic_policy_consumer.ts': ['SKETCH_BOX_CLASSIC_ACCENT_POLICY'],
    'esm/native/builder/new_sketch_classic_policy_dynamic.ts': ['*'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        sketchBoxOwnerImports,
        APPROVED_SKETCH_BOX_CLASSIC_OWNER_IMPORTS,
        'Sketch Box Classic fixture owner consumer allowlist'
      ),
    /review-blocked/u
  );
});

test('[dimension-foundation] thetaClampM is compatibility-only and new internal member access is blocked', () => {
  const fixtureUsage = collectMemberPropertyUsage(
    [['esm/native/builder/new_theta_consumer.ts', `export const theta = cornice.common['thetaClampM'];`]],
    'thetaClampM'
  );
  assert.deepEqual(fixtureUsage, {
    'esm/native/builder/new_theta_consumer.ts': ['thetaClampM'],
  });
  assert.throws(
    () => assertApprovedSymbolUsage(fixtureUsage, {}, 'Cornice theta fixture allowlist'),
    /review-blocked/u
  );
});

test('[dimension-foundation] public dimensions wildcard surface is an exact value/type snapshot', () => {
  const publicIndex = read('esm/native/features/dimensions/index.ts');
  const facade = read('esm/shared/wardrobe_dimension_tokens_shared.ts');
  const publicDependencies = analyzeModuleDependencies(
    'esm/native/features/dimensions/index.ts',
    publicIndex
  ).imports.filter(dependency => dependency.specifier.includes(FACADE_SPECIFIER));

  assert.deepEqual(
    publicDependencies.map(({ kind, syntax, importedSymbols, exportedSymbols }) => ({
      kind,
      syntax,
      importedSymbols,
      exportedSymbols,
    })),
    [
      {
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: ['*'],
        exportedSymbols: ['*'],
      },
    ]
  );

  const actual = collectDimensionFacadeExportSurface(facade);
  assertApprovedPublicDimensionFacadeExports(actual);

  assert.throws(
    () =>
      assertApprovedPublicDimensionFacadeExports({
        value: [...actual.value, 'UNREVIEWED_PUBLIC_DIMENSION'].sort(),
        type: actual.type,
      }),
    /requires explicit review/u
  );
  assert.throws(
    () =>
      assertApprovedPublicDimensionFacadeExports({
        value: actual.value,
        type: actual.type.filter(symbol => symbol !== 'Meters'),
      }),
    /requires explicit review/u
  );
});

test('[dimension-foundation] Stack Split facade guard detects new consumers, symbols, and stale exceptions', () => {
  const usage = collectStackSplitFacadeUsage([
    [
      'esm/native/builder/new_stack_consumer.ts',
      `import { STACK_SPLIT_SEAM_GAP_M } from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
  ]);
  assert.throws(
    () => assertApprovedSymbolUsage(usage.imports, {}, 'Stack Split facade fixture consumer allowlist'),
    /review-blocked/u
  );

  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        {},
        { 'esm/native/builder/retired_consumer.ts': ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'] },
        'Stack Split facade fixture stale allowlist'
      ),
    /stale entries must be removed/u
  );

  const fixtureExports = collectNamedModuleExports(
    'fixture.ts',
    `export const STACK_SPLIT_NEW_FACADE_SYMBOL = 1;`
  )
    .map(entry => entry.exportedName)
    .filter(isStackSplitFacadeSymbol);
  assert.throws(() => assertApprovedStackSplitFacadeSymbols(fixtureExports), /requires review/u);
});
