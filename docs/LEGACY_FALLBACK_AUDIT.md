# Legacy / fallback audit

Generated at: 2026-05-10T09:35:01.255Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **52**
- Files with occurrences: **40**
- Category counts:
  - `runtime-default`: **31**
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
- `esm/native/runtime/slice_write_access_dispatch_order.ts` — **4** (runtime-default: 4)
- `esm/native/adapters/browser/ui_ops.ts` — **3** (browser-adapter: 3)
- `esm/native/io/project_io_feedback_bridge.ts` — **2** (project-migration: 2)
- `esm/native/runtime/ui_write_access.ts` — **2** (runtime-default: 2)
- `esm/entry_pro_overlay.ts` — **1** (browser-adapter: 1)
- `esm/entry_pro.ts` — **1** (browser-adapter: 1)
- `esm/native/adapters/browser/active_element.ts` — **1** (browser-adapter: 1)
- `esm/native/adapters/browser/CONTRACT.md` — **1** (browser-adapter: 1)
- `esm/native/builder/module_layout_pipeline.ts` — **1** (runtime-default: 1)
- `esm/native/builder/post_build_extras_pipeline.ts` — **1** (runtime-default: 1)
- `esm/native/builder/post_build_front_reveal_frames_drawers.ts` — **1** (runtime-default: 1)
- `esm/native/builder/post_build_sketch_door_cuts_modules.ts` — **1** (runtime-default: 1)
- `esm/native/builder/render_interior_preset_ops_wall_faces.ts` — **1** (runtime-default: 1)
- `esm/native/builder/render_interior_sketch_support_rods.ts` — **1** (runtime-default: 1)
- `esm/native/builder/room_floor_texture.ts` — **1** (runtime-default: 1)
- `esm/native/builder/scheduler_runtime.ts` — **1** (runtime-default: 1)
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
- `esm/native/runtime/mode_write_access.ts` — **1** (runtime-default: 1)
- `esm/native/runtime/runtime_write_access.ts` — **1** (runtime-default: 1)
- `esm/native/runtime/slice_write_access_dispatch.ts` — **1** (project-migration: 1)

## Allowlist check

- Passed: current categorized inventory matches the allowlist.
