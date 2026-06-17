# Legacy / fallback audit

Generated at: 2026-06-16T21:01:09.550Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **135**
- Files with occurrences: **76**
- Category counts:
  - `runtime-default`: **0**
  - `domain-default`: **95**
  - `error-message-default`: **11**
  - `framework-default`: **2**
  - `browser-adapter`: **2**
  - `project-migration`: **2**
  - `external-api-compat`: **0**
  - `compat-boundary`: **17**
  - `test-fixture`: **6**
  - `legacy-runtime-risk`: **0**
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

- `esm/native/kernel/cfg_meta.ts` - **5** (domain-default: 5)
- `esm/shared/wardrobe_dimension_tokens_shared.ts` - **5** (compat-boundary: 2, domain-default: 3)
- `esm/test_no_side_effects_on_import.mjs` - **5** (test-fixture: 5)
- `esm/native/features/door_trim_map.ts` - **4** (domain-default: 4)
- `esm/native/platform/dirty_flag.ts` - **4** (domain-default: 4)
- `esm/native/runtime/meta_actions_namespace.ts` - **4** (domain-default: 4)
- `esm/native/services/canvas_picking_cell_dims_linear_context_modules.ts` - **4** (domain-default: 4)
- `esm/native/services/render_surface_runtime_support_readers.ts` - **4** (compat-boundary: 4)
- `esm/native/ui/html_sanitize_runtime.ts` - **4** (domain-default: 4)
- `esm/native/ui/notes_service_shared.ts` - **4** (domain-default: 4)
- `esm/native/ui/project_save_runtime.ts` - **4** (browser-adapter: 1, domain-default: 3)
- `esm/native/features/stack_split/stack_split.ts` - **3** (compat-boundary: 3)
- `esm/native/kernel/domain_api_modules_corner_recompute_policy.ts` - **3** (domain-default: 3)
- `esm/native/kernel/state_api_meta_namespace.ts` - **3** (domain-default: 3)
- `esm/native/services/cloud_sync_delete_temp_runtime.ts` - **3** (error-message-default: 3)
- `esm/native/ui/project_save_runtime_action.ts` - **3** (domain-default: 3)
- `esm/native/builder/module_loop_pipeline_runtime_shared.ts` - **2** (compat-boundary: 2)
- `esm/native/kernel/state_api_shared.ts` - **2** (domain-default: 2)
- `esm/native/kernel/state_api.ts` - **2** (domain-default: 2)
- `esm/native/runtime/errors.ts` - **2** (domain-default: 2)
- `esm/native/runtime/platform_access_ops.ts` - **2** (domain-default: 2)
- `esm/native/services/app_start.ts` - **2** (compat-boundary: 2)
- `esm/native/services/camera_shared.ts` - **2** (domain-default: 2)
- `esm/native/services/cloud_sync_status_install_runtime.ts` - **2** (domain-default: 2)
- `esm/native/ui/errors_install_surface.ts` - **2** (error-message-default: 2)
- `esm/native/ui/export/export_order_pdf_capture_open_closed.ts` - **2** (domain-default: 2)
- `esm/native/ui/export/export_order_pdf_capture_render_sketch.ts` - **2** (domain-default: 2)
- `esm/native/ui/project_load_runtime_action.ts` - **2** (error-message-default: 2)
- `esm/native/ui/react/boot_react_ui.tsx` - **2** (domain-default: 2)
- `esm/native/builder/build_state_resolver.ts` - **1** (compat-boundary: 1)

## Allowlist check

- Not run.
