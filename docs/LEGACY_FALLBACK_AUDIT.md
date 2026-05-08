# Legacy / fallback audit

Generated at: 2026-05-08T12:53:03.262Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **385**
- Files with occurrences: **172**
- Category counts:
  - `runtime-default`: **364**
  - `browser-adapter`: **9**
  - `project-migration`: **5**
  - `test-fixture`: **7**
  - `legacy-runtime-risk`: **0**
  - `unknown`: **0**

## Policy

- Runtime compatibility must not grow silently. New `legacy`/`fallback` mentions require an intentional category and allowlist update.
- `project-migration` belongs at import/load/persisted-payload boundaries.
- `browser-adapter` belongs at browser/DOM/environment adapter boundaries.
- `legacy-runtime-risk` is the review queue for possible old live-path compatibility.
- `unknown` should stay at zero.

## Hot files

- `esm/native/ui/export/export_canvas_delivery_shared.ts` — **7** (runtime-default: 7)
- `esm/native/runtime/modules_recompute_request_policy.ts` — **6** (runtime-default: 6)
- `esm/test_no_side_effects_on_import.mjs` — **6** (test-fixture: 6)
- `esm/native/builder/build_string_normalizer.ts` — **5** (runtime-default: 5)
- `esm/native/kernel/kernel_install_support.ts` — **5** (runtime-default: 5)
- `esm/native/kernel/kernel_project_capture_shared.ts` — **5** (runtime-default: 5)
- `esm/native/runtime/cfg_access_core.ts` — **5** (runtime-default: 5)
- `esm/native/runtime/doors_runtime_support_shared.ts` — **5** (runtime-default: 5)
- `esm/native/runtime/error_normalization.ts` — **5** (runtime-default: 5)
- `esm/native/runtime/render_runtime_primitives.ts` — **5** (runtime-default: 5)
- `esm/native/builder/corner_geometry_plan.ts` — **4** (runtime-default: 4)
- `esm/native/builder/corner_state_normalize_shared.ts` — **4** (runtime-default: 4)
- `esm/native/builder/external_drawers_pipeline.ts` — **4** (runtime-default: 4)
- `esm/native/builder/hinged_doors_module_ops_split_parts.ts` — **4** (runtime-default: 4)
- `esm/native/builder/module_loop_pipeline_shared.ts` — **4** (runtime-default: 4)
- `esm/native/builder/render_carcass_ops_shared_readers.ts` — **4** (runtime-default: 4)
- `esm/native/features/model_record/model_record_normalizer.ts` — **4** (runtime-default: 4)
- `esm/native/features/sketch_drawer_sizing.ts` — **4** (runtime-default: 4)
- `esm/native/features/stack_split/stack_split.ts` — **4** (runtime-default: 4)
- `esm/native/kernel/kernel_shared.ts` — **4** (runtime-default: 4)
- `esm/native/platform/render_loop_impl_support.ts` — **4** (runtime-default: 4)
- `esm/native/runtime/platform_access_ops.ts` — **4** (runtime-default: 4)
- `esm/native/runtime/slice_write_access_dispatch_order.ts` — **4** (runtime-default: 4)
- `esm/native/services/canvas_picking_interior_hover_state.ts` — **4** (runtime-default: 4)
- `esm/native/services/canvas_picking_local_helpers_shared.ts` — **4** (runtime-default: 4)
- `esm/native/services/canvas_picking_module_selector_hits_candidates.ts` — **4** (runtime-default: 4)
- `esm/native/services/canvas_picking_projection_runtime_box_shared.ts` — **4** (runtime-default: 4)
- `esm/native/services/cloud_sync_command_shared.ts` — **4** (runtime-default: 4)
- `esm/native/services/render_surface_runtime_support_shared.ts` — **4** (runtime-default: 4)
- `esm/native/ui/export/export_canvas_core_shared.ts` — **4** (runtime-default: 4)

## Allowlist check

- Passed: current categorized inventory matches the allowlist.
