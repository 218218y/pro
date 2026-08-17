# Legacy / fallback audit

Generated at: 2026-08-17T16:09:17.881Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **556**
- Files with occurrences: **216**
- Reviewed compatibility seams under growth ratchet: **21**
- Category counts:
  - `runtime-default`: **60**
  - `domain-default`: **401**
  - `error-message-default`: **42**
  - `framework-default`: **3**
  - `browser-adapter`: **18**
  - `forward-compatibility`: **1**
  - `legacy-rejection`: **3**
  - `project-migration`: **1**
  - `external-api-compat`: **4**
  - `compat-boundary`: **16**
  - `test-fixture`: **7**
  - `legacy-runtime-risk`: **0**
  - `unknown`: **0**

## Policy

- Runtime compatibility must not grow silently. Reviewed migration/API/compatibility seams are growth-ratcheted; ordinary defaults remain visible without creating allowlist churn.
- The scanner includes prefix, camelCase, PascalCase, `compatibility`, and `compatible` vocabulary.
- `framework-default` is reserved for framework-owned API names such as React `Suspense` fallback props.
- `forward-compatibility` describes intentional forward-compatible data/config behavior and is informational.
- `legacy-rejection` records fail-closed guards that explicitly reject retired result shapes; it is informational, not live compatibility.
- `project-migration` belongs at import/load/persisted-payload boundaries and is growth-ratcheted.
- `browser-adapter` belongs at browser/DOM/environment adapter boundaries.
- `domain-default` and `error-message-default` are ordinary default-value names, kept visible so they do not hide runtime compatibility work.
- `external-api-compat` is reserved for third-party/framework compatibility seams and is growth-ratcheted.
- `compat-boundary` is an explicitly reviewed live compatibility seam and is growth-ratcheted.
- `legacy-runtime-risk` is forbidden in the checked baseline: ambiguous live legacy paths must be removed or made an explicit reviewed seam.
- `unknown` should stay at zero.

## Hot files

- `esm/native/ui/react/notes/notes_overlay_editor_async.ts` - **15** (domain-default: 15)
- `esm/native/builder/visuals_and_contents_door_visual_glass.ts` - **14** (domain-default: 11, external-api-compat: 3)
- `esm/native/builder/render_preview_sketch_pipeline_shared.ts` - **12** (domain-default: 12)
- `esm/native/builder/core_carcass_cornice.ts` - **11** (domain-default: 11)
- `esm/native/runtime/groove_lines_access.ts` - **11** (domain-default: 6, runtime-default: 5)
- `esm/native/runtime/runtime_globals.ts` - **11** (runtime-default: 11)
- `esm/native/services/viewer_measurement_tool_resolution.ts` - **11** (domain-default: 11)
- `esm/native/ui/react/overlay_feedback_host_timers.ts` - **11** (domain-default: 11)
- `esm/native/builder/module_loop_pipeline_runtime_shared.ts` - **10** (domain-default: 10)
- `esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts` - **9** (domain-default: 9)
- `esm/native/builder/render_interior_sketch_drawers_external_plan.ts` - **9** (domain-default: 9)
- `esm/native/builder/render_interior_sketch_module_geometry.ts` - **8** (domain-default: 8)
- `esm/native/builder/core_doors_compute.ts` - **6** (domain-default: 6)
- `esm/native/builder/corner_connector_emit.ts` - **6** (domain-default: 6)
- `esm/native/features/sketch_stack_positioning.ts` - **6** (domain-default: 6)
- `esm/native/ui/project_load_runtime_action.ts` - **6** (error-message-default: 6)
- `esm/test_no_side_effects_on_import.mjs` - **6** (test-fixture: 6)
- `esm/native/runtime/browser_env_surface.ts` - **5** (runtime-default: 5)
- `esm/native/runtime/doors_runtime_support_modes.ts` - **5** (compat-boundary: 1, domain-default: 1, runtime-default: 3)
- `esm/native/services/canvas_picking_door_shared.ts` - **5** (domain-default: 5)
- `esm/native/services/canvas_picking_hover_targets_drawer.ts` - **5** (domain-default: 5)
- `esm/native/ui/project_session_commands_shared.ts` - **5** (error-message-default: 5)
- `esm/shared/dimensions/compatibility/legacy_dimension_number_view.ts` - **5** (compat-boundary: 5)
- `esm/shared/room_architecture_shared.ts` - **5** (domain-default: 1, runtime-default: 4)
- `esm/native/builder/render_interior_sketch_layout_geometry.ts` - **4** (domain-default: 4)
- `esm/native/builder/render_interior_sketch_support_shelves.ts` - **4** (domain-default: 4)
- `esm/native/builder/visuals_and_contents_door_visual.ts` - **4** (domain-default: 4)
- `esm/native/kernel/domain_api_modules_corner_recompute_policy.ts` - **4** (runtime-default: 4)
- `esm/native/runtime/ui_feedback_stable.ts` - **4** (domain-default: 2, runtime-default: 2)
- `esm/native/services/canvas_picking_door_layout_alignment.ts` - **4** (domain-default: 4)

## Allowlist check

- Not run.
