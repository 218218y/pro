# Legacy / fallback audit

Generated at: 2026-05-10T13:25:39.008Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **34**
- Files with occurrences: **26**
- Category counts:
  - `runtime-default`: **14**
  - `browser-adapter`: **9**
  - `project-migration`: **4**
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
- `esm/native/adapters/browser/ui_ops.ts` — **3** (browser-adapter: 3)
- `esm/native/io/project_io_feedback_bridge.ts` — **2** (project-migration: 2)
- `esm/entry_pro_overlay.ts` — **1** (browser-adapter: 1)
- `esm/entry_pro.ts` — **1** (browser-adapter: 1)
- `esm/native/adapters/browser/active_element.ts` — **1** (browser-adapter: 1)
- `esm/native/adapters/browser/CONTRACT.md` — **1** (browser-adapter: 1)
- `esm/native/builder/room_floor_texture.ts` — **1** (runtime-default: 1)
- `esm/native/features/project_config/project_config_persisted_payload_shared.ts` — **1** (project-migration: 1)
- `esm/native/io/project_schema_door_maps.ts` — **1** (project-migration: 1)
- `esm/native/platform/boot_main.ts` — **1** (browser-adapter: 1)
- `esm/native/platform/dirty_flag.ts` — **1** (runtime-default: 1)
- `esm/native/platform/smoke_checks_shared.ts` — **1** (runtime-default: 1)
- `esm/native/platform/smoke_checks.ts` — **1** (browser-adapter: 1)
- `esm/native/runtime/browser_clipboard.ts` — **1** (runtime-default: 1)
- `esm/native/runtime/browser_env_timers.ts` — **1** (runtime-default: 1)
- `esm/native/runtime/meta_profiles_access.ts` — **1** (runtime-default: 1)
- `esm/native/runtime/meta_profiles_contract.ts` — **1** (runtime-default: 1)
- `esm/native/services/cloud_sync_config_shared.ts` — **1** (runtime-default: 1)
- `esm/native/services/ui_ephemeral_defaults.ts` — **1** (runtime-default: 1)
- `esm/native/ui/interactions/project_save_load.ts` — **1** (runtime-default: 1)
- `esm/native/ui/react/overlay_pdf_host.tsx` — **1** (runtime-default: 1)
- `esm/native/ui/react/sidebar_app.tsx` — **1** (runtime-default: 1)
- `esm/native/ui/react/sidebar_header_actions.ts` — **1** (runtime-default: 1)
- `esm/native/ui/react/tabs/interior_tab_sections_handles.tsx` — **1** (runtime-default: 1)
- `esm/test_imports.mjs` — **1** (test-fixture: 1)

## Allowlist check

- Passed: current categorized inventory matches the allowlist.
