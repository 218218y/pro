import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const FACADE_SPECIFIER = 'wardrobe_dimension_tokens_shared';
const APPROVED_FACADE_RATCHET = Object.freeze({
  'static-import': Object.freeze({ importers: 205, statements: 205 }),
  'static-re-export': Object.freeze({ importers: 2, statements: 2 }),
  'dynamic-import': Object.freeze({ importers: 0, statements: 0 }),
  'type-import': Object.freeze({ importers: 0, statements: 0 }),
  'type-re-export': Object.freeze({ importers: 1, statements: 1 }),
  total: Object.freeze({ importers: 207, statements: 208 }),
});
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
  'esm/native/builder/build_stack_split_lower_setup.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
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
  'esm/native/builder/core_carcass_shell.ts',
  'esm/native/builder/corner_wing_carcass_shell_metrics.ts',
  'esm/native/builder/module_loop_pipeline_hex_cell.ts',
]);
const CARCASS_INTERIOR_DIRECT_CONSUMERS = Object.freeze(['esm/native/builder/build_flow_plan.ts']);
const APPROVED_INTERIOR_GRID_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/build_wardrobe_flow_context_carcass.ts': Object.freeze([
    'CARCASS_INTERIOR_GRID_POLICY',
  ]),
  'esm/native/builder/module_loop_pipeline_module_frame.ts': Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
  'esm/native/services/canvas_picking_interior_hover_layout_mode.ts': Object.freeze([
    'CARCASS_INTERIOR_GRID_POLICY',
  ]),
  'esm/shared/dimensions/carcass_shell_policy.ts': Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
});
const APPROVED_SHELL_GRID_FIELD_USAGE = Object.freeze({
  'esm/native/builder/build_stack_split_lower_setup.ts': Object.freeze([
    'drawerGridDivisions',
    'drawerSplitGridLineIndex',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze(['drawerGridDivisions']),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'drawerGridDivisions',
    'drawerSplitGridLineIndex',
  ]),
});
const APPROVED_BASE_PLINTH_OWNER_IMPORTS = Object.freeze({
  'esm/native/features/base_plinth_support.ts': Object.freeze([
    'BASE_PLINTH_POLICY',
    'basePlinthCentimetersToMeters',
    'basePlinthMetersToCentimeters',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['BASE_PLINTH_POLICY']),
});
const APPROVED_BASE_LEG_OWNER_IMPORTS = Object.freeze({
  'esm/native/features/base_leg_support.ts': Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
    'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'BASE_LEG_LAYOUT_POLICY',
  ]),
});
const APPROVED_BASE_PLATFORM_OWNER_IMPORTS = Object.freeze({
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
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/corner_state_normalize_layout.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/visuals_chest_mode_build.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/visuals_chest_mode_inputs.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/runtime/default_state.ts': Object.freeze(['BASE_LEG_DIMENSIONS', 'CARCASS_BASE_DIMENSIONS']),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'CARCASS_BASE_DIMENSIONS',
  ]),
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
  'esm/shared/dimensions/carcass_cornice_render_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/door_mount_thickness_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/dimensions/door_system_policy.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['MATERIAL_THICKNESS_POLICY']),
});
const APPROVED_MATERIAL_LEGACY_IMPORTERS = Object.freeze([
  'esm/native/builder/core_carcass_shared.ts',
  'esm/native/builder/core_doors_compute.ts',
  'esm/native/builder/core_layout_compute.ts',
  'esm/native/builder/core_storage_compute_external_drawers.ts',
  'esm/native/builder/corner_wing_cell_interiors_shelves.ts',
  'esm/native/builder/post_build_sketch_door_cuts_rebuild.ts',
  'esm/native/builder/render_interior_custom_ops.ts',
  'esm/native/builder/render_interior_custom_ops_shelves.ts',
  'esm/native/builder/render_interior_preset_ops.ts',
  'esm/native/builder/render_interior_rod_clearance.ts',
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
  'esm/native/builder/render_interior_sketch_layout_geometry.ts',
  'esm/native/builder/render_interior_sketch_ops_input.ts',
  'esm/native/builder/render_interior_sketch_support_shelves.ts',
  'esm/native/builder/render_preview_interior_hover_apply.ts',
  'esm/native/builder/render_preview_sketch_pipeline_shared.ts',
  'esm/native/features/sketch_internal_drawer_cassette.ts',
  'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts',
  'esm/native/services/canvas_picking_hover_preview_modes_divider.ts',
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
  'esm/native/services/canvas_picking_manual_layout_config_ops_shelf.ts',
  'esm/native/services/canvas_picking_manual_layout_free_box_content.ts',
  'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts',
  'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts',
  'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts',
  'esm/native/services/canvas_picking_manual_layout_sketch_tools.ts',
  'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts',
  'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts',
  'esm/native/services/canvas_picking_selector_internal_metrics.ts',
  'esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts',
  'esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts',
  'esm/native/services/canvas_picking_sketch_box_door_preview.ts',
  'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts',
  'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
  'esm/native/services/canvas_picking_sketch_free_box_content_preview_doors.ts',
  'esm/native/services/canvas_picking_sketch_free_box_content_preview_stack.ts',
  'esm/native/services/canvas_picking_sketch_free_box_content_preview_vertical.ts',
  'esm/native/services/canvas_picking_sketch_free_box_hover_context.ts',
  'esm/native/services/canvas_picking_sketch_free_box_hover_finalize.ts',
  'esm/native/services/canvas_picking_sketch_free_box_hover_scan.ts',
  'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
  'esm/native/services/canvas_picking_sketch_free_surface_preview_divider.ts',
  'esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts',
  'esm/native/services/canvas_picking_sketch_free_surface_preview_placement_remove.ts',
  'esm/native/services/canvas_picking_sketch_free_surface_preview_target_candidate.ts',
  'esm/native/services/canvas_picking_sketch_module_box_blockers.ts',
  'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts',
  'esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts',
  'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts',
  'esm/native/services/canvas_picking_split_hover_preview_line.ts',
]);
const APPROVED_MATERIAL_LEGACY_DEPENDENCIES = Object.freeze(
  Object.fromEntries(
    APPROVED_MATERIAL_LEGACY_IMPORTERS.map(file => [file, ['MATERIAL_DIMENSIONS@static-import']])
  )
);
const APPROVED_MATERIAL_GLASS_SHELF_ONLY_IMPORTERS = new Set([
  'esm/native/builder/corner_wing_cell_interiors_shelves.ts',
  'esm/native/builder/render_interior_custom_ops_shelves.ts',
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
  'esm/native/builder/render_interior_sketch_support_shelves.ts',
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
  'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts',
  'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts',
  'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
  'esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts',
  'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts',
]);
const APPROVED_MATERIAL_WOOD_AND_GLASS_IMPORTERS = new Set([
  'esm/native/builder/render_preview_interior_hover_apply.ts',
  'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts',
  'esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts',
  'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts',
]);
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
  'esm/native/builder/visuals_chest_mode_drawer_box.ts': Object.freeze(['CHEST_MODE_DIMENSIONS']),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['CHEST_MODE_DIMENSIONS']),
});
const APPROVED_CHEST_MODE_LEGACY_DEPENDENCIES = Object.freeze({
  'esm/native/builder/render_drawer_ops_internal.ts': ['CHEST_MODE_DIMENSIONS@static-import'],
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
  'esm/native/builder/render_drawer_ops_internal.ts': [
    'drawerBox',
    'drawerBox.accentStripDepthM',
    'drawerBox.accentZOffsetM',
  ],
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
  'esm/native/builder/render_door_ops_hinged.ts': Object.freeze(['HINGED_DOOR_RENDER_POLICY']),
  'esm/native/builder/render_door_ops_sliding.ts': Object.freeze([
    'SLIDING_DOOR_CONSTRUCTION_POLICY',
    'SLIDING_DOOR_HANDLE_RENDER_POLICY',
    'SLIDING_DOOR_MOTION_POLICY',
  ]),
  'esm/native/builder/sliding_doors_pipeline.ts': Object.freeze(['SLIDING_DOOR_CONSTRUCTION_POLICY']),
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
  'esm/native/services/doors_runtime_visuals_shared.ts': Object.freeze(['SLIDING_DOOR_CONSTRUCTION_POLICY']),
  'esm/shared/dimensions/door_mount_thickness_policy.ts': Object.freeze(['HINGED_DOOR_MOUNT_POLICY']),
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
  'esm/shared/dimensions/drawer_sketch_policy.ts': Object.freeze([
    'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
    'EXTERNAL_DRAWER_SIZE_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['EXTERNAL_DRAWER_POLICY']),
});
const APPROVED_INTERNAL_DRAWER_OWNER_IMPORTS = Object.freeze({
  'esm/shared/dimensions/drawer_sketch_policy.ts': Object.freeze([
    'INTERNAL_DRAWER_LAYOUT_POLICY',
    'INTERNAL_DRAWER_MOTION_POLICY',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['INTERNAL_DRAWER_POLICY']),
});
const APPROVED_INTERIOR_STORAGE_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_custom_ops_layout.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_support_storage.ts': Object.freeze([
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_commit.ts': Object.freeze([
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
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['INTERIOR_STORAGE_POLICY']),
});
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
  'esm/native/builder/render_interior_custom_ops.ts': Object.freeze([
    'storage',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/builder/render_interior_preset_ops.ts': Object.freeze([
    'storage',
    'storage.barrierFrontZOffsetM',
    'storage.barrierWidthClearanceM',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze(['storage', 'storage.barrierHeightM']),
  'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts': Object.freeze([
    'storage',
    'storage.barrierWidthClearanceM',
    'storage.barrierWidthMinM',
    'storage.minHeightExtraM',
    'storage.minHeightWoodMultiplier',
    'storage.previewThicknessMinM',
  ]),
  'esm/native/builder/render_preview_interior_hover_apply.ts': Object.freeze([
    'storage',
    'storage.barrierWidthClearanceM',
    'storage.barrierWidthMinM',
    'storage.previewThicknessMinM',
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
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts': Object.freeze([
    'storage',
    'storage.barrierFrontZOffsetM',
    'storage.barrierHeightM',
    'storage.barrierWidthClearanceM',
    'storage.barrierWidthMinM',
    'storage.gridDivisionsDefault',
    'storage.previewThicknessMinM',
  ]),
  'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts': Object.freeze([
    'storage',
    'storage.barrierHeightM',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_content.ts': Object.freeze([
    'storage',
    'storage.barrierHeightM',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts': Object.freeze([
    'storage',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts': Object.freeze([
    'storage',
    'storage.barrierFrontZOffsetM',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts': Object.freeze([
    'storage',
    'storage.barrierHeightM',
    'storage.barrierHeightMinM',
    'storage.clampPadMaxM',
    'storage.clampPadMinM',
    'storage.clampPadWoodRatio',
  ]),
  'esm/native/services/canvas_picking_manual_layout_vertical_blockers.ts': Object.freeze([
    'storage',
    'storage.barrierHeightM',
    'storage.clampPadMaxM',
    'storage.clampPadMinM',
    'storage.clampPadWoodRatio',
    'storage.gridDivisionsDefault',
    'storage.minHeightExtraM',
    'storage.minHeightWoodMultiplier',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts': Object.freeze([
    'storage',
    'storage.barrierHeightM',
    'storage.minHeightExtraM',
    'storage.minHeightWoodMultiplier',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts': Object.freeze([
    'storage',
    'storage.barrierWidthClearanceM',
    'storage.previewThicknessMinM',
  ]),
  'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts': Object.freeze([
    'storage',
    'storage.barrierHeightM',
    'storage.barrierWidthClearanceM',
    'storage.previewThicknessMinM',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts': Object.freeze([
    'storage',
    'storage.barrierHeightM',
    'storage.barrierHeightMaxM',
    'storage.barrierHeightMinM',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts': Object.freeze([
    'storage',
    'storage.barrierFrontZOffsetM',
    'storage.barrierWidthClearanceM',
    'storage.barrierWidthMinM',
    'storage.previewThicknessMinM',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts': Object.freeze([
    'storage',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts': Object.freeze([
    'storage',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/services/canvas_picking_sketch_neighbor_measurements.ts': Object.freeze([
    'storage',
    'storage.gridDivisionsDefault',
  ]),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'storage',
    'storage.barrierHeightM',
  ]),
});
const APPROVED_DRAWER_SKETCH_OWNER_IMPORTS = Object.freeze({
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
  'esm/native/builder/render_interior_sketch_shared_external_drawers.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
  ]),
  'esm/native/builder/render_interior_sketch_stack_collision.ts': Object.freeze([
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
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
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['DRAWER_SKETCH_POLICY']),
});
const APPROVED_DRAWER_SKETCH_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/post_build_sketch_door_cuts_apply.ts': Object.freeze([
    'sketch',
    'sketch.doorCutHorizontalOverlapMinM',
    'sketch.doorCutNoOpToleranceM',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts': Object.freeze([
    'sketch',
    'sketch.rebuiltSegmentHandleMinHeightM',
  ]),
  'esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts': Object.freeze([
    'sketch',
    'sketch.rebuiltSegmentDefaultHandlePaddingM',
    'sketch.rebuiltSegmentRestoreTargetMinDimensionM',
    'sketch.rebuiltSegmentRestoreTargetMinThicknessM',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze([
    'sketch',
    'sketch.internalClampPadMaxM',
    'sketch.internalClampPadMinM',
    'sketch.internalClampPadWoodRatio',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_context.ts': Object.freeze([
    'sketch',
    'sketch.externalPreviewMinDepthM',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts': Object.freeze([
    'sketch',
    'sketch.externalPreviewBoxMinDimensionM',
    'sketch.externalPreviewMinWidthM',
    'sketch.externalPreviewVisualMinDepthM',
    'sketch.externalPreviewVisualMinHeightM',
    'sketch.externalPreviewVisualMinWidthM',
    'sketch.faceVerticalAlignmentEpsilonM',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_context.ts': Object.freeze([
    'sketch',
    'sketch.externalPreviewDepthClearanceM',
    'sketch.externalPreviewMinDepthM',
    'sketch.externalPreviewMinWidthM',
  ]),
  'esm/native/builder/render_interior_sketch_drawers_external_plan.ts': Object.freeze([
    'sketch',
    'sketch.externalPreviewBoxMinDimensionM',
    'sketch.externalPreviewVisualMinDepthM',
    'sketch.externalPreviewVisualMinHeightM',
    'sketch.externalPreviewVisualMinWidthM',
  ]),
  'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts': Object.freeze([
    'sketch',
    'sketch.internalGapM',
    'sketch.internalStackCount',
    'sketch.previewDividerDepthExtraM',
    'sketch.previewDividerMaxM',
    'sketch.previewDividerMinM',
    'sketch.previewDividerWidthRatio',
    'sketch.previewDrawerBottomLiftM',
    'sketch.previewExternalDefaultHeightM',
    'sketch.previewOverlayThicknessMaxM',
    'sketch.previewOverlayThicknessMinM',
    'sketch.previewStackExtraHeightM',
  ]),
  'esm/native/features/sketch_drawer_sizing.ts': Object.freeze([
    'sketch',
    'sketch.externalCountMax',
    'sketch.externalCountMin',
    'sketch.externalDefaultHeightCm',
    'sketch.heightMaxCm',
    'sketch.heightMinCm',
    'sketch.heightTokenEpsilonCm',
    'sketch.internalDefaultHeightCm',
    'sketch.internalGapM',
    'sketch.internalStackCount',
    'sketch.minRenderHeightM',
  ]),
  'esm/native/features/sketch_internal_drawer_cassette.ts': Object.freeze([
    'sketch',
    'sketch.internalSideFillerWidthM',
    'sketch.internalWidthClearanceM',
    'sketch.internalWidthMinM',
  ]),
  'esm/native/services/canvas_picking_interior_hover_manual_mode.ts': Object.freeze([
    'sketch',
    'sketch.internalClampPadMaxM',
    'sketch.internalClampPadMinM',
    'sketch.internalClampPadWoodRatio',
  ]),
  'esm/native/services/canvas_picking_manual_layout_config_ops_shelf.ts': Object.freeze([
    'sketch',
    'sketch.internalClampPadMaxM',
    'sketch.internalClampPadMinM',
    'sketch.internalClampPadWoodRatio',
  ]),
  'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts': Object.freeze([
    'sketch',
    'sketch.externalPreviewVisualMinHeightM',
    'sketch.externalPreviewVisualMinWidthM',
  ]),
  'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts': Object.freeze([
    'sketch',
    'sketch.internalPreviewDepthClearanceM',
    'sketch.internalPreviewMeasurementZOffsetDepthRatio',
    'sketch.internalPreviewMeasurementZOffsetMinM',
    'sketch.internalPreviewMinDepthM',
    'sketch.internalPreviewMinWidthM',
    'sketch.internalPreviewWidthClearanceM',
  ]),
  'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts': Object.freeze([
    'sketch',
    'sketch.externalPreviewDefaultCount',
    'sketch.externalPreviewMeasurementZOffsetMinM',
    'sketch.externalPreviewMeasurementZOffsetThicknessRatio',
    'sketch.externalPreviewVisualMinHeightM',
    'sketch.externalPreviewVisualMinWidthM',
    'sketch.verticalStackCollisionGapM',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts': Object.freeze([
    'sketch',
    'sketch.internalPreviewDepthClearanceM',
    'sketch.internalPreviewMeasurementZOffsetDepthRatio',
    'sketch.internalPreviewMeasurementZOffsetMinM',
    'sketch.internalPreviewMinDepthM',
    'sketch.internalPreviewMinWidthM',
    'sketch.internalPreviewWidthClearanceM',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts': Object.freeze([
    'sketch',
    'sketch.externalPreviewCenterZInsetM',
    'sketch.externalPreviewDefaultCount',
    'sketch.externalPreviewDepthClearanceM',
    'sketch.externalPreviewFrontZOffsetM',
    'sketch.externalPreviewMeasurementZOffsetMinM',
    'sketch.externalPreviewMeasurementZOffsetThicknessRatio',
    'sketch.externalPreviewMinDepthM',
    'sketch.externalPreviewMinWidthM',
    'sketch.externalPreviewVisualMinHeightM',
    'sketch.externalPreviewVisualMinWidthM',
    'sketch.verticalStackCollisionGapM',
  ]),
  'esm/native/services/canvas_picking_sketch_module_vertical_content_collision.ts': Object.freeze([
    'sketch',
    'sketch.verticalStackCollisionGapM',
  ]),
});
const APPROVED_DRAWER_EXTERNAL_INTERNAL_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/build_handle_policy.ts': Object.freeze([
    'external',
    'external.regularHeightM',
    'external.shoeHeightM',
  ]),
  'esm/native/builder/core_storage_compute_external_drawers.ts': Object.freeze([
    'external',
    'external.boxHeightClearanceM',
    'external.regularHeightM',
    'external.shoeHeightM',
    'external.visualHeightClearanceM',
  ]),
  'esm/native/builder/hinged_doors_module_ops_context.ts': Object.freeze([
    'external',
    'external.doorTopGapM',
  ]),
  'esm/native/builder/hinged_doors_module_ops_handle_policy.ts': Object.freeze([
    'external',
    'external.regularHeightM',
    'external.shoeHeightM',
  ]),
  'esm/native/builder/render_drawer_ops_internal.ts': Object.freeze([
    'internal',
    'internal.contentsBottomInsetM',
    'internal.contentsHeightClearanceM',
    'internal.contentsWidthClearanceM',
  ]),
  'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts': Object.freeze([
    'external',
    'external.shoeHeightM',
  ]),
  'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts': Object.freeze([
    'external',
    'external.frontOffsetZM',
    'external.regularHeightM',
    'external.shoeHeightM',
    'external.visualHeightClearanceM',
    'external.visualThicknessM',
    'external.visualWidthClearanceM',
  ]),
  'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts': Object.freeze([
    'external',
    'external.frontOffsetZM',
    'external.visualHeightClearanceM',
    'external.visualThicknessM',
    'external.visualWidthClearanceM',
  ]),
  'esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts': Object.freeze([
    'external',
    'external.visualHeightClearanceM',
    'external.visualThicknessM',
    'external.visualWidthClearanceM',
  ]),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'external',
    'external.doorTopGapM',
    'external.regularHeightM',
    'external.shoeHeightM',
  ]),
  'esm/shared/wardrobe_construction_validation_shared.ts': Object.freeze([
    'external',
    'external.regularHeightM',
    'external.shoeHeightM',
  ]),
});
const APPROVED_DOOR_SYSTEM_LEGACY_DEPENDENCIES = Object.freeze({
  'esm/native/builder/core_doors_compute.ts': ['DOOR_SYSTEM_DIMENSIONS@static-import'],
  'esm/native/builder/hinged_doors_module_ops_context.ts': ['DOOR_SYSTEM_DIMENSIONS@static-import'],
  'esm/native/builder/post_build_sketch_door_cuts_apply.ts': ['DOOR_SYSTEM_DIMENSIONS@static-import'],
  'esm/native/builder/render_interior_sketch_boxes_door_geometry.ts': [
    'DOOR_SYSTEM_DIMENSIONS@static-import',
  ],
  'esm/native/builder/visuals_chest_mode_build.ts': ['DOOR_SYSTEM_DIMENSIONS@static-import'],
  'esm/native/platform/render_loop_motion_doors.ts': ['DOOR_SYSTEM_DIMENSIONS@static-import'],
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': ['DOOR_SYSTEM_DIMENSIONS@static-import'],
});
const APPROVED_DOOR_SYSTEM_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/core_doors_compute.ts': [
    'hinged',
    'hinged.insetRevealM',
    'hinged.sameModuleLeafGapMaxM',
    'hinged.sameModuleLeafGapSpanRatioMax',
    'hinged.sameModuleLeafGapWoodDivisor',
    'sliding',
    'sliding.defaultDoorsCount',
    'sliding.doorHeightMinM',
    'sliding.doorTopOverlapMaxM',
    'sliding.doorTopOverlapRailInsetM',
    'sliding.overlapM',
    'sliding.railBackInsetM',
    'sliding.railDepthM',
    'sliding.railHeightM',
    'sliding.railLineOffsetYExtraM',
    'sliding.railTrackLaneDivisor',
    'sliding.shellClearanceMaxM',
    'sliding.shellClearanceMinM',
    'sliding.shellClearanceWoodDivisor',
  ],
  'esm/native/builder/hinged_doors_module_ops_context.ts': [
    'hinged',
    'hinged.insetRevealM',
    'hinged.opFrontZOffsetM',
    'hinged.visualThicknessM',
  ],
  'esm/native/builder/post_build_sketch_door_cuts_apply.ts': [
    'hinged',
    'hinged.split',
    'hinged.split.bottomClampOffsetM',
    'hinged.split.duplicateCutToleranceHeightRatio',
    'hinged.split.duplicateCutToleranceMaxM',
    'hinged.split.duplicateCutToleranceMinM',
    'hinged.split.minHeightForSplitM',
    'hinged.split.minSegmentHeightM',
    'hinged.split.splitGapM',
    'hinged.split.topClampOffsetM',
  ],
  'esm/native/builder/render_interior_sketch_boxes_door_geometry.ts': ['hinged', 'hinged.insetRevealM'],
  'esm/native/builder/visuals_chest_mode_build.ts': ['hinged', 'hinged.insetRevealM'],
  'esm/native/platform/render_loop_motion_doors.ts': [
    'sliding',
    'sliding.defaultDoorsCount',
    'sliding.overlapM',
  ],
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': [
    'hinged',
    'hinged.split',
    'hinged.split.bottomClampOffsetM',
    'hinged.split.minHeightForSplitM',
    'hinged.split.splitGapM',
    'hinged.split.storageLiftM',
    'hinged.split.topClampOffsetM',
  ],
});
const APPROVED_CORNICE_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/corner_connector_cornice_shared.ts': Object.freeze(['common', 'common.epsilonM']),
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

function collectOwnerImports(sources, ownerSpecifier) {
  const usage = new Map();
  for (const [file, source, analyzedDependencies] of sources) {
    const relativeFile = file.replaceAll('\\', '/');
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      if (!dependency.specifier.endsWith(ownerSpecifier)) continue;
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
      if (dependency.specifier.endsWith(ownerSpecifier)) continue;
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
      if (dependency.specifier.endsWith(ownerSpecifier)) continue;
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
  const interiorStoragePolicy = read('esm/shared/dimensions/interior_storage_policy.ts');
  const drawerSketchPolicy = read('esm/shared/dimensions/drawer_sketch_policy.ts');

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
  assert.match(facade, /from '\.\/dimensions\/interior_storage_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/drawer_sketch_policy\.js'/u);
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
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_GRID_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_BARRIER_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_PREVIEW_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_CLAMP_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_LAYOUT_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_DEFAULTS_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /export const INTERIOR_STORAGE_POLICY = Object\.freeze/u);
  assert.match(interiorStoragePolicy, /barrierHeightM: meters\(0\.5\)/u);
  assert.match(interiorStoragePolicy, /defaultLowerShelfSlots: DEFAULT_LOWER_SHELF_SLOTS/u);
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
  assert.match(facade, /legacyDimensionNumberView\(INTERIOR_STORAGE_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(DRAWER_SKETCH_POLICY\)/u);
  assert.match(facade, /storage: INTERIOR_STORAGE_DIMENSIONS/u);
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
    `${units}\n${defaults}\n${limits}\n${stackSplitPolicy}\n${stackSplitRenderPolicy}\n${carcassShellPolicy}\n${carcassInteriorPolicy}\n${carcassInteriorGridPolicy}\n${basePlinthPolicy}\n${baseLegPolicy}\n${basePlatformRenderPolicy}\n${chestStructuralPolicy}\n${materialThicknessPolicy}\n${carcassCorniceRenderPolicy}\n${chestModePolicy}\n${doorSystemPolicy}\n${doorMountThicknessPolicy}\n${doorVisualPolicy}\n${doorTrimPolicy}\n${interiorStoragePolicy}\n${drawerSketchPolicy}`,
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
          dependency.specifier.endsWith(ownerSpecifier) && dependency.importedSymbols.includes(symbol)
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
    assertDirectOwner(file, 'CARCASS_SHELL_DIMENSIONS', 'dimensions/carcass_shell_policy.js');
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
      'esm/shared/wardrobe_dimension_tokens_shared.ts': ['INTERIOR_STORAGE_POLICY'],
    },
    'INTERIOR_STORAGE_POLICY aggregate is imported directly only by the legacy facade'
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
  assert.equal(actual.value.length, 89);
  assert.equal(actual.type.length, 10);
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

test('[dimension-foundation] legacy facade importer budget is decrease-only', () => {
  const buckets = Object.fromEntries(
    Object.keys(APPROVED_FACADE_RATCHET)
      .filter(key => key !== 'total')
      .map(key => [key, { importers: new Set(), statements: new Set() }])
  );
  const totalImporters = new Set();
  const totalStatements = new Set();

  walkSourceFiles('esm', file => {
    const source = read(file);
    if (!source.includes(FACADE_SPECIFIER)) return;
    const relativeFile = file.replaceAll('\\', '/');
    for (const dependency of analyzeModuleDependencies(file, source).imports) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      const bucket = buckets[dependency.syntax];
      assert.ok(bucket, `unclassified facade dependency syntax: ${String(dependency.syntax)}`);
      const statementKey = `${relativeFile}:${dependency.statementStart}`;
      bucket.importers.add(relativeFile);
      bucket.statements.add(statementKey);
      totalImporters.add(relativeFile);
      totalStatements.add(statementKey);
    }
  });

  const actual = Object.fromEntries(
    Object.entries(buckets).map(([key, bucket]) => [
      key,
      { importers: bucket.importers.size, statements: bucket.statements.size },
    ])
  );
  actual.total = { importers: totalImporters.size, statements: totalStatements.size };

  const growth = [];
  const reductions = [];
  for (const [category, approved] of Object.entries(APPROVED_FACADE_RATCHET)) {
    for (const metric of ['importers', 'statements']) {
      if (actual[category][metric] > approved[metric]) {
        growth.push({ category, metric, approved: approved[metric], actual: actual[category][metric] });
      } else if (actual[category][metric] < approved[metric]) {
        reductions.push({ category, metric, approved: approved[metric], actual: actual[category][metric] });
      }
    }
  }

  const proposal = {
    ratchet: 'decrease-only',
    reviewRequired: growth.length > 0,
    approved: APPROVED_FACADE_RATCHET,
    actual,
    growth,
    reductions,
    proposedRatchet: reductions.length > 0 && growth.length === 0 ? actual : null,
  };
  assert.deepEqual(
    actual,
    APPROVED_FACADE_RATCHET,
    `legacy dimension facade ratchet drifted; growth is review-blocked and reductions must ratchet the approved baseline:\n${JSON.stringify(proposal, null, 2)}`
  );
});
