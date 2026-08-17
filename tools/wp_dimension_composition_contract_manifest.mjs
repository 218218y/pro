// Declarative contract data for identity-only dimension composition owners.
// Paths and symbols are semantic facts; import specifiers are derived by the engine.

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export const DIMENSION_COMPOSITION_CONTRACT_LANES = deepFreeze({
  primary: [
    {
      id: 'split-hover-preview-line-dimension-consolidation',
      consumer: 'esm/native/services/canvas_picking_split_hover_preview_line.ts',
      owner: 'esm/shared/dimensions/split_hover_preview_line_dimension_policy.ts',
      symbols: [
        'BASE_PLINTH_POLICY',
        'CARCASS_INTERIOR_GRID_POLICY',
        'CARCASS_SHELL_DIMENSIONS',
        'EXTERNAL_DRAWER_FRONT_RENDER_POLICY',
        'EXTERNAL_DRAWER_SIZE_POLICY',
        'HINGED_DOOR_SPLIT_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'MATERIAL_THICKNESS_POLICY',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/base_plinth_policy.ts',
          symbols: ['BASE_PLINTH_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/carcass_interior_grid_policy.ts',
          symbols: ['CARCASS_INTERIOR_GRID_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/carcass_shell_policy.ts',
          symbols: ['CARCASS_SHELL_DIMENSIONS'],
        },
        {
          file: 'esm/shared/dimensions/door_system_policy.ts',
          symbols: ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/external_drawer_policy.ts',
          symbols: ['EXTERNAL_DRAWER_FRONT_RENDER_POLICY', 'EXTERNAL_DRAWER_SIZE_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/interior_storage_policy.ts',
          symbols: ['INTERIOR_STORAGE_BARRIER_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/material_thickness_policy.ts',
          symbols: ['MATERIAL_THICKNESS_POLICY'],
        },
      ],
    },
    {
      id: 'interior-rod-clearance-dimension-consolidation',
      consumer: 'esm/native/builder/render_interior_rod_clearance.ts',
      owner: 'esm/shared/dimensions/interior_rod_clearance_dimension_policy.ts',
      symbols: [
        'CARCASS_INTERIOR_GRID_POLICY',
        'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
        'FOLDED_CLOTHES_VISUAL_POLICY',
        'HANGER_VISUAL_POLICY',
        'INTERIOR_PRESET_ROD_FACTORS_POLICY',
        'INTERIOR_PRESET_SHELF_ROWS_POLICY',
        'INTERIOR_ROD_PLACEMENT_POLICY',
        'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/carcass_interior_grid_policy.ts',
          symbols: ['CARCASS_INTERIOR_GRID_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/content_visual_policy.ts',
          symbols: ['FOLDED_CLOTHES_VISUAL_POLICY', 'HANGER_VISUAL_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/drawer_sketch_policy.ts',
          symbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/interior_fittings_policy.ts',
          symbols: [
            'INTERIOR_PRESET_ROD_FACTORS_POLICY',
            'INTERIOR_PRESET_SHELF_ROWS_POLICY',
            'INTERIOR_ROD_PLACEMENT_POLICY',
            'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
          ],
        },
        {
          file: 'esm/shared/dimensions/interior_storage_policy.ts',
          symbols: ['INTERIOR_STORAGE_BARRIER_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/material_thickness_policy.ts',
          symbols: ['MATERIAL_THICKNESS_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/sketch_box_geometry_policy.ts',
          symbols: ['SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY'],
        },
      ],
    },
    {
      id: 'chest-mode-build-dimension-consolidation',
      consumer: 'esm/native/builder/visuals_chest_mode_build.ts',
      owner: 'esm/shared/dimensions/chest_mode_build_dimension_policy.ts',
      symbols: [
        'BASE_LEG_LAYOUT_POLICY',
        'BASE_PLATFORM_RENDER_POLICY',
        'BASE_PLINTH_POLICY',
        'CHEST_CASTER_RENDER_POLICY',
        'CHEST_CONNECTOR_POLICY',
        'CHEST_DRAWER_GEOMETRY_POLICY',
        'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
        'CHEST_MODE_COMMODE_RENDER_POLICY',
        'CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY',
        'CHEST_MOTION_POLICY',
        'CHEST_SHELL_POLICY',
        'HINGED_DOOR_MOUNT_POLICY',
        'resolveDoorMountThicknessesFromConfig',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/base_leg_policy.ts',
          symbols: ['BASE_LEG_LAYOUT_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/base_platform_render_policy.ts',
          symbols: ['BASE_PLATFORM_RENDER_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/base_plinth_policy.ts',
          symbols: ['BASE_PLINTH_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/chest_mode_policy.ts',
          symbols: [
            'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
            'CHEST_MODE_COMMODE_RENDER_POLICY',
            'CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY',
          ],
        },
        {
          file: 'esm/shared/dimensions/chest_structural_policy.ts',
          symbols: [
            'CHEST_CASTER_RENDER_POLICY',
            'CHEST_CONNECTOR_POLICY',
            'CHEST_DRAWER_GEOMETRY_POLICY',
            'CHEST_MOTION_POLICY',
            'CHEST_SHELL_POLICY',
          ],
        },
        {
          file: 'esm/shared/dimensions/door_mount_thickness_policy.ts',
          symbols: ['resolveDoorMountThicknessesFromConfig'],
        },
        {
          file: 'esm/shared/dimensions/door_system_policy.ts',
          symbols: ['HINGED_DOOR_MOUNT_POLICY'],
        },
      ],
    },
  ],
  secondary: [
    {
      id: 'interior-hover-manual-mode-dimension-consolidation',
      consumer: 'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
      owner: 'esm/shared/dimensions/interior_hover_manual_mode_dimension_policy.ts',
      symbols: [
        'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
        'INTERIOR_ROD_PLACEMENT_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'INTERIOR_STORAGE_PREVIEW_POLICY',
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_ROD_PREVIEW_POLICY',
        'SKETCH_BOX_SHELF_PREVIEW_POLICY',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/drawer_sketch_policy.ts',
          symbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/interior_fittings_policy.ts',
          symbols: ['INTERIOR_ROD_PLACEMENT_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/interior_storage_policy.ts',
          symbols: [
            'INTERIOR_STORAGE_BARRIER_POLICY',
            'INTERIOR_STORAGE_GRID_POLICY',
            'INTERIOR_STORAGE_PREVIEW_POLICY',
          ],
        },
        {
          file: 'esm/shared/dimensions/material_thickness_policy.ts',
          symbols: ['MATERIAL_THICKNESS_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
          symbols: ['SKETCH_BOX_ROD_PREVIEW_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
        },
      ],
    },
    {
      id: 'core-carcass-dimension-consolidation',
      consumer: 'esm/native/builder/core_carcass_shared.ts',
      owner: 'esm/shared/dimensions/core_carcass_dimension_policy.ts',
      symbols: [
        'BASE_LEG_LAYOUT_POLICY',
        'BASE_PLATFORM_RENDER_POLICY',
        'BASE_PLINTH_POLICY',
        'CARCASS_SHELL_DIMENSIONS',
        'MATERIAL_THICKNESS_POLICY',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/base_leg_policy.ts',
          symbols: ['BASE_LEG_LAYOUT_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/base_platform_render_policy.ts',
          symbols: ['BASE_PLATFORM_RENDER_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/base_plinth_policy.ts',
          symbols: ['BASE_PLINTH_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/carcass_shell_policy.ts',
          symbols: ['CARCASS_SHELL_DIMENSIONS'],
        },
        {
          file: 'esm/shared/dimensions/material_thickness_policy.ts',
          symbols: ['MATERIAL_THICKNESS_POLICY'],
        },
      ],
    },
  ],
  remaining: [
    {
      id: 'stack-split-lower-setup-dimension-consolidation',
      consumer: 'esm/native/builder/build_stack_split_lower_setup.ts',
      owner: 'esm/shared/dimensions/stack_split_lower_setup_dimension_policy.ts',
      symbols: [
        'CARCASS_INTERIOR_DIMENSIONS',
        'CARCASS_INTERIOR_GRID_POLICY',
        'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
        'EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/carcass_interior_grid_policy.ts',
          symbols: ['CARCASS_INTERIOR_GRID_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/carcass_interior_policy.ts',
          symbols: ['CARCASS_INTERIOR_DIMENSIONS'],
        },
        {
          file: 'esm/shared/dimensions/handle_policy.ts',
          symbols: ['EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/stack_split_policy.ts',
          symbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
        },
      ],
    },
    {
      id: 'manual-layout-free-box-plans-dimension-consolidation',
      consumer: 'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts',
      owner: 'esm/shared/dimensions/manual_layout_free_box_plans_dimension_policy.ts',
      symbols: [
        'INTERIOR_ROD_RENDER_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_PREVIEW_CORE_POLICY',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/interior_fittings_policy.ts',
          symbols: ['INTERIOR_ROD_RENDER_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/interior_storage_policy.ts',
          symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/material_thickness_policy.ts',
          symbols: ['MATERIAL_THICKNESS_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
          symbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
        },
      ],
    },
    {
      id: 'sketch-box-vertical-content-occupancy-dimension-consolidation',
      consumer: 'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
      owner: 'esm/shared/dimensions/sketch_box_vertical_content_occupancy_dimension_policy.ts',
      symbols: [
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_PREVIEW_POLICY',
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_PREVIEW_CORE_POLICY',
        'SKETCH_BOX_ROD_PREVIEW_POLICY',
        'SKETCH_BOX_SHELF_PREVIEW_POLICY',
        'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/interior_fittings_policy.ts',
          symbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/interior_storage_policy.ts',
          symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/material_thickness_policy.ts',
          symbols: ['MATERIAL_THICKNESS_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
          symbols: [
            'SKETCH_BOX_PREVIEW_CORE_POLICY',
            'SKETCH_BOX_ROD_PREVIEW_POLICY',
            'SKETCH_BOX_SHELF_PREVIEW_POLICY',
            'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
          ],
        },
      ],
    },
    {
      id: 'preview-interior-hover-apply-dimension-consolidation',
      consumer: 'esm/native/builder/render_preview_interior_hover_apply.ts',
      owner: 'esm/shared/dimensions/preview_interior_hover_apply_dimension_policy.ts',
      symbols: [
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_PREVIEW_POLICY',
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_PREVIEW_CORE_POLICY',
        'SKETCH_BOX_ROD_PREVIEW_POLICY',
        'SKETCH_BOX_SHELF_PREVIEW_POLICY',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/interior_fittings_policy.ts',
          symbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/interior_storage_policy.ts',
          symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/material_thickness_policy.ts',
          symbols: ['MATERIAL_THICKNESS_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
          symbols: [
            'SKETCH_BOX_PREVIEW_CORE_POLICY',
            'SKETCH_BOX_ROD_PREVIEW_POLICY',
            'SKETCH_BOX_SHELF_PREVIEW_POLICY',
          ],
        },
      ],
    },
    {
      id: 'chest-mode-inputs-dimension-consolidation',
      consumer: 'esm/native/builder/visuals_chest_mode_inputs.ts',
      owner: 'esm/shared/dimensions/chest_mode_inputs_dimension_policy.ts',
      symbols: [
        'BASE_PLATFORM_RENDER_POLICY',
        'CHEST_CASTER_RENDER_POLICY',
        'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
        'clampDimension',
        'cmToM',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/base_platform_render_policy.ts',
          symbols: ['BASE_PLATFORM_RENDER_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/chest_mode_policy.ts',
          symbols: ['CHEST_MODE_COMMODE_CONSTRAINTS_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/chest_structural_policy.ts',
          symbols: ['CHEST_CASTER_RENDER_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/units.ts',
          symbols: ['clampDimension', 'cmToM'],
        },
      ],
    },
    {
      id: 'render-loop-door-motion-dimension-consolidation',
      consumer: 'esm/native/platform/render_loop_motion_doors.ts',
      owner: 'esm/shared/dimensions/render_loop_door_motion_dimension_policy.ts',
      symbols: ['SLIDING_DOOR_CONSTRUCTION_POLICY', 'WARDROBE_DEFAULTS', 'cmToM'],
      sources: [
        {
          file: 'esm/shared/dimensions/door_system_policy.ts',
          symbols: ['SLIDING_DOOR_CONSTRUCTION_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/units.ts',
          symbols: ['cmToM'],
        },
        {
          file: 'esm/shared/dimensions/wardrobe_defaults.ts',
          symbols: ['WARDROBE_DEFAULTS'],
        },
      ],
    },
    {
      id: 'runtime-default-state-dimension-consolidation',
      consumer: 'esm/native/runtime/default_state.ts',
      owner: 'esm/shared/dimensions/runtime_default_state_dimension_policy.ts',
      symbols: [
        'BASE_LEG_DIMENSIONS',
        'BASE_PLINTH_POLICY',
        'CHEST_MODE_ACTIVE_DEFAULTS_POLICY',
        'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
        'DEFAULT_CHEST_DRAWERS_COUNT',
        'DEFAULT_CORNER_DOORS',
        'DEFAULT_CORNER_WIDTH',
        'DEFAULT_HEIGHT',
        'DEFAULT_HINGED_DOORS',
        'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
        'DEFAULT_WIDTH',
        'HINGED_DEFAULT_DEPTH',
      ],
      sources: [
        {
          file: 'esm/shared/dimensions/base_leg_policy.ts',
          symbols: ['BASE_LEG_DIMENSIONS'],
        },
        {
          file: 'esm/shared/dimensions/base_plinth_policy.ts',
          symbols: ['BASE_PLINTH_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/chest_mode_policy.ts',
          symbols: ['CHEST_MODE_ACTIVE_DEFAULTS_POLICY', 'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY'],
        },
        {
          file: 'esm/shared/dimensions/stack_split_policy.ts',
          symbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
        },
        {
          file: 'esm/shared/dimensions/wardrobe_defaults.ts',
          symbols: [
            'DEFAULT_CHEST_DRAWERS_COUNT',
            'DEFAULT_CORNER_DOORS',
            'DEFAULT_CORNER_WIDTH',
            'DEFAULT_HEIGHT',
            'DEFAULT_HINGED_DOORS',
            'DEFAULT_WIDTH',
            'HINGED_DEFAULT_DEPTH',
          ],
        },
      ],
    },
  ],
});

export const DIMENSION_COMPOSITION_CONTRACTS = deepFreeze(
  Object.values(DIMENSION_COMPOSITION_CONTRACT_LANES).flat()
);
