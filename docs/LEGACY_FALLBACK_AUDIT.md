# Legacy / fallback audit

Generated at: 2026-05-11T03:06:57.896Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **11**
- Files with occurrences: **6**
- Category counts:
  - `runtime-default`: **0**
  - `framework-default`: **2**
  - `browser-adapter`: **1**
  - `project-migration`: **1**
  - `test-fixture`: **7**
  - `legacy-runtime-risk`: **0**
  - `unknown`: **0**

## Policy

- Runtime compatibility must not grow silently. New `legacy`/`fallback` mentions require an intentional category and allowlist update.
- `framework-default` is reserved for framework-owned API names such as React `Suspense` fallback props.
- `project-migration` belongs at import/load/persisted-payload boundaries.
- `browser-adapter` belongs at browser/DOM/environment adapter boundaries.
- `legacy-runtime-risk` is the review queue for possible old live-path compatibility.
- `unknown` should stay at zero.

## Hot files

- `esm/test_no_side_effects_on_import.mjs` - **6** (test-fixture: 6)
- `esm/native/adapters/browser/CONTRACT.md` - **1** (browser-adapter: 1)
- `esm/native/features/project_config/project_config_persisted_payload_shared.ts` - **1** (project-migration: 1)
- `esm/native/ui/react/overlay_pdf_host.tsx` - **1** (framework-default: 1)
- `esm/native/ui/react/sidebar_app.tsx` - **1** (framework-default: 1)
- `esm/test_imports.mjs` - **1** (test-fixture: 1)

## Allowlist check

- Passed: current categorized inventory matches the allowlist.
