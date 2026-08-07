# Legacy / fallback audit

Generated at: 2026-08-07T09:31:44.781Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **144**
- Files with occurrences: **78**
- Category counts:
  - `runtime-default`: **13**
  - `domain-default`: **101**
  - `error-message-default`: **0**
  - `framework-default`: **2**
  - `browser-adapter`: **4**
  - `project-migration`: **11**
  - `external-api-compat`: **0**
  - `compat-boundary`: **1**
  - `test-fixture`: **6**
  - `legacy-runtime-risk`: **6**
  - `unknown`: **0**

## Policy

- Runtime compatibility must not grow silently. New `legacy`/`fallback`/`compat` mentions require an intentional category and allowlist update.
- The scanner includes camelCase and PascalCase identifiers, not only standalone words.
- `framework-default` is reserved for framework-owned API names such as React `Suspense` fallback props.
- `project-migration` belongs at import/load/persisted-payload boundaries.
- `browser-adapter` belongs at browser/DOM/environment adapter boundaries.
- `domain-default` and `error-message-default` are ordinary default-value names, kept visible so they do not hide runtime compatibility work.
- `external-api-compat` is reserved for third-party/framework compatibility seams.
- `compat-boundary` is a reviewed canonicalization or persisted-shape compatibility seam, not an unowned live fallback.
- `legacy-runtime-risk` is the review queue for possible old live-path compatibility.
- `unknown` should stay at zero.

## Hot files

- `esm/native/runtime/runtime_globals.ts` - **11** (runtime-default: 11)
- `esm/native/builder/plan.ts` - **8** (domain-default: 4, legacy-runtime-risk: 4)
- `esm/test_no_side_effects_on_import.mjs` - **5** (test-fixture: 5)
- `esm/native/runtime/ui_feedback_stable.ts` - **4** (domain-default: 2, runtime-default: 2)
- `esm/native/services/site_variant.ts` - **4** (domain-default: 4)
- `esm/native/services/viewer_measurement_tool.ts` - **4** (domain-default: 4)
- `esm/native/builder/door_trim_visuals.ts` - **3** (domain-default: 3)
- `esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts` - **3** (domain-default: 3)
- `esm/native/builder/visuals_and_contents_door_visual_glass.ts` - **3** (domain-default: 3)
- `esm/native/features/modules_configuration/corner_cells_snapshot_stack.ts` - **3** (domain-default: 3)
- `esm/native/services/canvas_picking_cell_dims_post_click_hover.ts` - **3** (domain-default: 3)
- `esm/native/services/canvas_picking_projection_runtime_box_object.ts` - **3** (domain-default: 3)
- `esm/native/services/canvas_picking_projection_runtime_box_wardrobe_scene.ts` - **3** (domain-default: 3)
- `esm/native/services/doors_runtime_visuals_drawers.ts` - **3** (domain-default: 3)
- `esm/native/ui/errors_install_support.ts` - **3** (domain-default: 3)
- `esm/native/builder/materials_factory_texture_runtime.ts` - **2** (domain-default: 2)
- `esm/native/builder/module_layout_pipeline.ts` - **2** (project-migration: 2)
- `esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts` - **2** (domain-default: 2)
- `esm/native/builder/render_adapter.ts` - **2** (domain-default: 2)
- `esm/native/builder/render_interior_sketch_boxes_contents_parts_materials.ts` - **2** (project-migration: 2)
- `esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts` - **2** (domain-default: 2)
- `esm/native/builder/render_interior_sketch_module_geometry.ts` - **2** (domain-default: 2)
- `esm/native/builder/render_preview_sketch_pipeline_shared.ts` - **2** (domain-default: 2)
- `esm/native/builder/room_visual_apply.ts` - **2** (domain-default: 2)
- `esm/native/builder/visuals_and_contents_door_visual_cache.ts` - **2** (domain-default: 2)
- `esm/native/runtime/browser_env_timers.ts` - **2** (domain-default: 2)
- `esm/native/services/canvas_picking_door_action_hover_preview_materials.ts` - **2** (domain-default: 2)
- `esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_config.ts` - **2** (domain-default: 1, legacy-runtime-risk: 1)
- `esm/native/services/canvas_picking_sketch_free_boxes.ts` - **2** (domain-default: 1, legacy-runtime-risk: 1)
- `esm/native/services/viewport_runtime_support.ts` - **2** (domain-default: 2)

## Allowlist check

- Not run.
