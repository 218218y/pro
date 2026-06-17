# Legacy / fallback audit

Generated at: 2026-06-17T03:51:06.388Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **73**
- Files with occurrences: **50**
- Category counts:
  - `runtime-default`: **0**
  - `domain-default`: **51**
  - `error-message-default`: **8**
  - `framework-default`: **2**
  - `browser-adapter`: **0**
  - `project-migration`: **2**
  - `external-api-compat`: **0**
  - `compat-boundary`: **4**
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

- `esm/test_no_side_effects_on_import.mjs` - **5** (test-fixture: 5)
- `esm/native/services/canvas_picking_cell_dims_linear_context_modules.ts` - **4** (domain-default: 4)
- `esm/native/ui/html_sanitize_runtime.ts` - **4** (domain-default: 4)
- `esm/native/ui/notes_service_shared.ts` - **4** (domain-default: 4)
- `esm/native/services/cloud_sync_delete_temp_runtime.ts` - **3** (error-message-default: 3)
- `esm/native/runtime/errors.ts` - **2** (domain-default: 2)
- `esm/native/runtime/platform_access_ops.ts` - **2** (domain-default: 2)
- `esm/native/services/app_start.ts` - **2** (compat-boundary: 2)
- `esm/native/services/cloud_sync_status_install_runtime.ts` - **2** (domain-default: 2)
- `esm/native/ui/errors_install_surface.ts` - **2** (error-message-default: 2)
- `esm/native/ui/export/export_order_pdf_capture_open_closed.ts` - **2** (domain-default: 2)
- `esm/native/ui/export/export_order_pdf_capture_render_sketch.ts` - **2** (domain-default: 2)
- `esm/native/ui/react/boot_react_ui.tsx` - **2** (domain-default: 2)
- `esm/native/builder/build_state_resolver.ts` - **1** (compat-boundary: 1)
- `esm/native/builder/post_build_front_reveal_frames_doors.ts` - **1** (domain-default: 1)
- `esm/native/builder/provide.ts` - **1** (compat-boundary: 1)
- `esm/native/features/project_config/project_config_persisted_payload_shared.ts` - **1** (project-migration: 1)
- `esm/native/kernel/domain_module_stack_patch.ts` - **1** (project-migration: 1)
- `esm/native/platform/dirty_flag.ts` - **1** (domain-default: 1)
- `esm/native/platform/render_loop_impl_front_overlay.ts` - **1** (domain-default: 1)
- `esm/native/runtime/browser_clipboard.ts` - **1** (domain-default: 1)
- `esm/native/runtime/browser_download.ts` - **1** (domain-default: 1)
- `esm/native/runtime/browser_file_read.ts` - **1** (domain-default: 1)
- `esm/native/runtime/commands_access.ts` - **1** (domain-default: 1)
- `esm/native/runtime/history_system_access_shared.ts` - **1** (domain-default: 1)
- `esm/native/runtime/platform_access_debug_stats.ts` - **1** (domain-default: 1)
- `esm/native/runtime/storage_access.ts` - **1** (domain-default: 1)
- `esm/native/services/autosave_runtime.ts` - **1** (domain-default: 1)
- `esm/native/services/cloud_sync_lifecycle_realtime_runtime_start.ts` - **1** (error-message-default: 1)
- `esm/native/services/cloud_sync_status_install_shared.ts` - **1** (domain-default: 1)

## Allowlist check

- Not run.
