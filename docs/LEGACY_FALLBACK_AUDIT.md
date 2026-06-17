# Legacy / fallback audit

Generated at: 2026-06-17T07:35:36.069Z

## Summary

- Source root: `esm`
- Total categorized occurrences: **9**
- Files with occurrences: **5**
- Category counts:
  - `runtime-default`: **0**
  - `domain-default`: **0**
  - `error-message-default`: **0**
  - `framework-default`: **2**
  - `browser-adapter`: **0**
  - `project-migration`: **1**
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

- `esm/test_no_side_effects_on_import.mjs` - **5** (test-fixture: 5)
- `esm/native/features/project_config/project_config_persisted_payload_shared.ts` - **1** (project-migration: 1)
- `esm/native/ui/react/overlay_pdf_host.tsx` - **1** (framework-default: 1)
- `esm/native/ui/react/sidebar_app.tsx` - **1** (framework-default: 1)
- `esm/test_imports.mjs` - **1** (test-fixture: 1)

## Allowlist check

- Not run.
