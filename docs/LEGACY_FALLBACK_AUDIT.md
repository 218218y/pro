# Legacy / fallback audit

Generated at: 2026-04-30T19:21:42.428Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **922**
- Files with occurrences: **287**
- Category counts:
  - `runtime-default`: **731**
  - `browser-adapter`: **18**
  - `project-migration`: **21**
  - `test-fixture`: **7**
  - `legacy-runtime-risk`: **145**
  - `unknown`: **0**

## Policy

- Runtime compatibility must not grow silently. New `legacy`/`fallback` mentions require an intentional category and allowlist update.
- `project-migration` belongs at import/load/persisted-payload boundaries.
- `browser-adapter` belongs at browser/DOM/environment adapter boundaries.
- `legacy-runtime-risk` is the review queue for possible old live-path compatibility.
- `unknown` should stay at zero.

## Hot files

- `esm/native/runtime/runtime_selectors.ts` — **30** (legacy-runtime-risk: 1, project-migration: 1, runtime-default: 28)
- `esm/native/ui/react/tabs/interior_tab_view_state_shared.ts` — **24** (runtime-default: 24)
- `esm/native/runtime/config_selectors_readers.ts` — **23** (legacy-runtime-risk: 1, runtime-default: 22)
- `esm/native/ui/react/notes/notes_overlay_text_style_runtime.ts` — **23** (legacy-runtime-risk: 7, runtime-default: 16)
- `esm/native/runtime/config_selectors_shared.ts` — **21** (runtime-default: 21)
- `esm/native/runtime/ui_raw_selectors.ts` — **21** (project-migration: 5, runtime-default: 16)
- `esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_session.ts` — **16** (runtime-default: 16)
- `esm/native/platform/three_geometry_cache_patch_contracts.ts` — **14** (runtime-default: 14)
- `esm/native/platform/platform_util.ts` — **12** (runtime-default: 12)
- `esm/native/runtime/config_selectors_scalars.ts` — **12** (runtime-default: 12)
- `esm/native/ui/pdf/order_pdf_document_fields_runtime.ts` — **11** (runtime-default: 11)
- `esm/native/ui/react/actions/cloud_sync_actions.ts` — **11** (runtime-default: 11)
- `esm/native/features/base_leg_support.ts` — **10** (runtime-default: 10)
- `esm/native/kernel/kernel_state_kernel_config_shared.ts` — **9** (runtime-default: 9)
- `esm/native/ui/export/export_order_pdf_text_details.ts` — **9** (runtime-default: 9)
- `esm/native/ui/react/tabs/design_tab_shared.ts` — **9** (runtime-default: 9)
- `esm/native/builder/hinged_doors_module_ops_context.ts` — **8** (runtime-default: 8)
- `esm/native/runtime/storage_access.ts` — **8** (runtime-default: 8)
- `esm/native/ui/export/export_canvas_engine.ts` — **8** (legacy-runtime-risk: 8)
- `esm/native/features/modules_configuration/corner_cells_snapshot_shared.ts` — **7** (runtime-default: 7)
- `esm/native/features/modules_configuration/modules_config_contracts.ts` — **7** (runtime-default: 7)
- `esm/native/runtime/cache_access.ts` — **7** (legacy-runtime-risk: 6, project-migration: 1)
- `esm/native/services/render_surface_runtime.ts` — **7** (runtime-default: 7)
- `esm/native/ui/export/export_canvas_delivery_shared.ts` — **7** (runtime-default: 7)
- `esm/native/builder/render_door_ops_shared_ops.ts` — **6** (runtime-default: 6)
- `esm/native/features/door_style_overrides.ts` — **6** (legacy-runtime-risk: 3, runtime-default: 3)
- `esm/native/features/door_trim_shared.ts` — **6** (runtime-default: 6)
- `esm/native/features/library_preset/library_preset_shared.ts` — **6** (runtime-default: 6)
- `esm/native/kernel/kernel_builder_request_policy_shared.ts` — **6** (runtime-default: 6)
- `esm/native/kernel/kernel_builder_request_policy.ts` — **6** (runtime-default: 6)

## Allowlist check

- Not run.
