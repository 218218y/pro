# Legacy / fallback audit

Generated at: 2026-06-16T19:42:32.346Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **231**
- Files with occurrences: **102**
- Category counts:
  - `runtime-default`: **0**
  - `domain-default`: **141**
  - `error-message-default`: **27**
  - `framework-default`: **2**
  - `browser-adapter`: **2**
  - `project-migration`: **10**
  - `external-api-compat`: **0**
  - `compat-boundary`: **43**
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

- `esm/native/io/project_schema_shared.ts` - **8** (project-migration: 8)
- `esm/native/ui/react/tabs/design_tab_color_action_result_builders.ts` - **8** (error-message-default: 8)
- `esm/native/kernel/domain_api_modules_corner_shared.ts` - **7** (compat-boundary: 7)
- `esm/native/kernel/domain_api_surface_sections_bindings_doors.ts` - **6** (compat-boundary: 3, domain-default: 3)
- `esm/native/kernel/domain_api_surface_sections_map_writes.ts` - **6** (compat-boundary: 3, domain-default: 3)
- `esm/native/kernel/domain_module_stack_patch.ts` - **6** (compat-boundary: 5, project-migration: 1)
- `esm/native/ui/react/tabs/settings_visual_shared_room.ts` - **6** (domain-default: 6)
- `esm/native/kernel/cfg_meta.ts` - **5** (domain-default: 5)
- `esm/native/services/canvas_picking_hover_targets_interior_scan.ts` - **5** (domain-default: 5)
- `esm/native/services/canvas_picking_selector_internal_metrics.ts` - **5** (domain-default: 5)
- `esm/shared/wardrobe_dimension_tokens_shared.ts` - **5** (compat-boundary: 2, domain-default: 3)
- `esm/test_no_side_effects_on_import.mjs` - **5** (test-fixture: 5)
- `esm/native/features/door_trim_map.ts` - **4** (domain-default: 4)
- `esm/native/kernel/domain_api_surface_sections_bindings_drawers_dividers.ts` - **4** (domain-default: 4)
- `esm/native/platform/dirty_flag.ts` - **4** (domain-default: 4)
- `esm/native/runtime/meta_actions_namespace.ts` - **4** (domain-default: 4)
- `esm/native/services/canvas_picking_cell_dims_linear_context_modules.ts` - **4** (domain-default: 4)
- `esm/native/services/canvas_picking_hover_targets_interior_target.ts` - **4** (domain-default: 4)
- `esm/native/services/render_surface_runtime_support_readers.ts` - **4** (compat-boundary: 4)
- `esm/native/ui/html_sanitize_runtime.ts` - **4** (domain-default: 4)
- `esm/native/ui/notes_service_shared.ts` - **4** (domain-default: 4)
- `esm/native/ui/project_save_runtime.ts` - **4** (browser-adapter: 1, domain-default: 3)
- `esm/native/ui/react/tabs/design_tab_color_action_result_helpers.ts` - **4** (error-message-default: 4)
- `esm/native/ui/react/tabs/design_tab_color_action_result_reason.ts` - **4** (error-message-default: 4)
- `esm/native/features/stack_split/stack_split.ts` - **3** (compat-boundary: 3)
- `esm/native/kernel/domain_api_modules_corner_recompute_policy.ts` - **3** (domain-default: 3)
- `esm/native/kernel/domain_api_surface_sections_shared.ts` - **3** (compat-boundary: 1, domain-default: 2)
- `esm/native/kernel/state_api_meta_namespace.ts` - **3** (domain-default: 3)
- `esm/native/services/cloud_sync_delete_temp_runtime.ts` - **3** (error-message-default: 3)
- `esm/native/ui/project_save_runtime_action.ts` - **3** (domain-default: 3)

## Allowlist check

- Not run.
