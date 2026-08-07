# Legacy / fallback audit

Generated at: 2026-08-07T07:57:20.829Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **39**
- Files with occurrences: **15**
- Category counts:
  - `runtime-default`: **13**
  - `domain-default`: **13**
  - `error-message-default`: **0**
  - `framework-default`: **2**
  - `browser-adapter`: **2**
  - `project-migration`: **3**
  - `external-api-compat`: **0**
  - `compat-boundary`: **0**
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

- `esm/native/runtime/runtime_globals.ts` - **11** (runtime-default: 11)
- `esm/test_no_side_effects_on_import.mjs` - **5** (test-fixture: 5)
- `esm/native/runtime/ui_feedback_stable.ts` - **4** (domain-default: 2, runtime-default: 2)
- `esm/native/ui/errors_install_support.ts` - **3** (domain-default: 3)
- `esm/native/builder/materials_factory_texture_runtime.ts` - **2** (domain-default: 2)
- `esm/native/builder/module_layout_pipeline.ts` - **2** (project-migration: 2)
- `esm/native/runtime/browser_env_timers.ts` - **2** (domain-default: 2)
- `esm/native/ui/interactions/viewer_resize.ts` - **2** (browser-adapter: 2)
- `esm/native/ui/ui_boot_controller_reporter.ts` - **2** (domain-default: 2)
- `esm/native/builder/core_storage_compute_custom.ts` - **1** (domain-default: 1)
- `esm/native/runtime/app_helpers.ts` - **1** (project-migration: 1)
- `esm/native/services/render_surface_runtime_support_ops.ts` - **1** (domain-default: 1)
- `esm/native/ui/react/overlay_pdf_host.tsx` - **1** (framework-default: 1)
- `esm/native/ui/react/sidebar_app.tsx` - **1** (framework-default: 1)
- `esm/test_imports.mjs` - **1** (test-fixture: 1)

## Allowlist check

- Not run.
