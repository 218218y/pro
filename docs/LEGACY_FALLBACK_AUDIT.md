# Legacy / fallback audit

Generated at: 2026-05-11T04:28:41.597Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **515**
- Files with occurrences: **167**
- Category counts:
  - `runtime-default`: **0**
  - `domain-default`: **184**
  - `error-message-default`: **29**
  - `framework-default`: **2**
  - `browser-adapter`: **40**
  - `project-migration`: **49**
  - `external-api-compat`: **12**
  - `compat-boundary`: **193**
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

- `esm/native/services/cloud_sync_panel_api_snapshots_sources.ts` - **21** (compat-boundary: 6, domain-default: 15)
- `esm/native/services/scene_view_lighting_renderer.ts` - **21** (compat-boundary: 13, external-api-compat: 8)
- `esm/entry_pro_overlay.ts` - **19** (browser-adapter: 19)
- `esm/native/runtime/project_io_access_load.ts` - **16** (project-migration: 16)
- `esm/native/runtime/render_access_state_runtime.ts` - **14** (compat-boundary: 14)
- `esm/native/runtime/project_io_access_restore.ts` - **13** (project-migration: 13)
- `esm/native/builder/scheduler_install.ts` - **10** (compat-boundary: 10)
- `esm/native/services/autosave_shared.ts` - **10** (compat-boundary: 10)
- `esm/entry_pro_shared.ts` - **8** (browser-adapter: 8)
- `esm/native/builder/post_build_front_reveal_frames_cleanup.ts` - **8** (compat-boundary: 8)
- `esm/native/io/project_schema_shared.ts` - **8** (project-migration: 8)
- `esm/native/services/scene_view_shared_contracts.ts` - **8** (compat-boundary: 6, external-api-compat: 2)
- `esm/native/ui/react/tabs/design_tab_color_action_result_builders.ts` - **8** (error-message-default: 8)
- `esm/entry_pro_start_runtime.ts` - **7** (browser-adapter: 7)
- `esm/native/kernel/domain_api_modules_corner_shared.ts` - **7** (compat-boundary: 7)
- `esm/native/ui/settings_backup_shared_collections.ts` - **7** (compat-boundary: 4, domain-default: 3)
- `esm/native/kernel/domain_api_surface_sections_bindings_doors.ts` - **6** (compat-boundary: 3, domain-default: 3)
- `esm/native/kernel/domain_api_surface_sections_map_writes.ts` - **6** (compat-boundary: 3, domain-default: 3)
- `esm/native/kernel/domain_module_stack_patch.ts` - **6** (compat-boundary: 5, project-migration: 1)
- `esm/native/ui/react/tabs/render_tab_shared_room.ts` - **6** (domain-default: 6)
- `esm/shared/wardrobe_dimension_tokens_shared.ts` - **6** (compat-boundary: 3, domain-default: 3)
- `esm/native/io/project_schema_migrations_settings.ts` - **5** (project-migration: 5)
- `esm/native/kernel/cfg_meta.ts` - **5** (domain-default: 5)
- `esm/native/services/canvas_picking_hover_targets_interior_scan.ts` - **5** (domain-default: 5)
- `esm/native/services/canvas_picking_selector_internal_metrics.ts` - **5** (domain-default: 5)
- `esm/native/services/cloud_sync_panel_api_snapshots_shared.ts` - **5** (domain-default: 5)
- `esm/native/ui/export/export_order_pdf_composite_image_slots_runtime.ts` - **5** (compat-boundary: 5)
- `esm/test_no_side_effects_on_import.mjs` - **5** (test-fixture: 5)
- `esm/native/builder/visuals_and_contents.ts` - **4** (compat-boundary: 4)
- `esm/native/features/door_trim_map.ts` - **4** (domain-default: 4)

## Allowlist check

- Not run.
