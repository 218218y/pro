# Legacy / fallback audit

Generated at: 2026-05-10T01:47:39.022Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **283**
- Files with occurrences: **147**
- Category counts:
  - `runtime-default`: **262**
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

- `esm/test_no_side_effects_on_import.mjs` — **6** (test-fixture: 6)
- `esm/native/platform/render_loop_impl_support.ts` — **4** (runtime-default: 4)
- `esm/native/runtime/platform_access_ops.ts` — **4** (runtime-default: 4)
- `esm/native/runtime/slice_write_access_dispatch_order.ts` — **4** (runtime-default: 4)
- `esm/native/services/canvas_picking_interior_hover_state.ts` — **4** (runtime-default: 4)
- `esm/native/services/canvas_picking_local_helpers_shared.ts` — **4** (runtime-default: 4)
- `esm/native/services/canvas_picking_module_selector_hits_candidates.ts` — **4** (runtime-default: 4)
- `esm/native/services/canvas_picking_projection_runtime_box_shared.ts` — **4** (runtime-default: 4)
- `esm/native/services/cloud_sync_command_shared.ts` — **4** (runtime-default: 4)
- `esm/native/services/render_surface_runtime_support_shared.ts` — **4** (runtime-default: 4)
- `esm/native/ui/notes_service_sanitize.ts` — **4** (runtime-default: 4)
- `esm/native/ui/react/tabs/interior_tab_helpers_core.ts` — **4** (runtime-default: 4)
- `esm/native/ui/react/tabs/structure_tab_core_numbers.ts` — **4** (runtime-default: 4)
- `esm/shared/mirror_layout_contracts_shared.ts` — **4** (runtime-default: 4)
- `esm/native/adapters/browser/ui_ops.ts` — **3** (browser-adapter: 3)
- `esm/native/builder/corner_wing_carcass_shared.ts` — **3** (runtime-default: 3)
- `esm/native/builder/render_interior_sketch_boxes_fronts_support.ts` — **3** (runtime-default: 3)
- `esm/native/builder/visuals_and_contents_shared.ts` — **3** (runtime-default: 3)
- `esm/native/features/modules_configuration/modules_config_structure.ts` — **3** (runtime-default: 3)
- `esm/native/kernel/domain_api_shared.ts` — **3** (runtime-default: 3)
- `esm/native/platform/platform_shared.ts` — **3** (runtime-default: 3)
- `esm/native/runtime/browser_clipboard.ts` — **3** (runtime-default: 3)
- `esm/native/services/canvas_picking_core_support_errors.ts` — **3** (runtime-default: 3)
- `esm/native/services/config_compounds_shared.ts` — **3** (runtime-default: 3)
- `esm/native/services/doors_runtime_state.ts` — **3** (runtime-default: 3)
- `esm/native/ui/export/export_canvas_delivery_shared.ts` — **3** (runtime-default: 3)
- `esm/native/ui/react/notes/notes_overlay_helpers_shared.ts` — **3** (runtime-default: 3)
- `esm/native/ui/react/pdf/order_pdf_overlay_sketch_card_text_layer_editor_hooks.ts` — **3** (runtime-default: 3)
- `esm/native/ui/react/pdf/order_pdf_overlay_sketch_note_box_runtime.ts` — **3** (runtime-default: 3)
- `esm/native/builder/corner_connector_cornice_shared.ts` — **2** (runtime-default: 2)

## Allowlist check

- Passed: current categorized inventory matches the allowlist.
