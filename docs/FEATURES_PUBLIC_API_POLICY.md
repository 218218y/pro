# Features Public API Policy

`esm/native/features/` is a shared domain layer, not a utility junk drawer. Builder, services, IO, kernel, and UI may consume feature logic only through deliberate public entries listed in `tools/wp_features_public_api_manifest.json`.

## Rules

- Feature internals can import each other inside `esm/native/features/`.
- Layers outside `features/` must import only manifest entries.
- New feature files are private by default.
- A new public feature entry must be added to the manifest and should have a clear domain reason.
- Do not add a barrel or wrapper just to silence the contract. Prefer a small pure feature API file, or keep the import private.

## Current improvement

`interior_layout_presets/custom_from_preset.ts` was moved behind `interior_layout_presets/api.ts` for external callers. The pure operation implementation now lives in `interior_layout_presets/ops.ts`, while `api.ts` remains the external surface for the family.

## Verification

Run:

```bash
npm run check:features-public-api
```
