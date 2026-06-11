# Architecture overview

WardrobePro is a layered Pure ESM application with a store-driven domain model, React UI, Three.js rendering, strong architecture guards, and custom verification tooling.

## Core architecture

- Browser entry adapters gather browser/DOM dependencies and pass them inward explicitly.
- Pure core modules do not depend on global runtime bags.
- Store state is the canonical source of UI/domain truth.
- Domain/build/render flows should fail clearly when required inputs are missing.
- Public seams should have one owner and executable coverage.

## Main flow

```text
Browser entry
  -> boot manifest
  -> app container + layer installers
  -> store/platform/kernel/builder/services/ui
  -> user actions
  -> canonical store/domain state
  -> builder/render/export/sync services
```

## High-risk surfaces

Treat these as shared ownership boundaries; do not patch around them casually:

- Cloud sync lifecycle, transport, realtime hints, tabs, panel actions, snapshot coalescing.
- Slice-write dispatch and other hot-path write routing.
- Domain API surface sections and saved-model persistence/apply flows.
- Order PDF editor, draft, sketch, export capture, template field specs, and image slots.
- Notes overlay state, palette geometry, text-style normalization, and persistence.
- Builder scheduler request/execute gates and duplicate-build suppression.
- Canvas picking click/hover/sketch/manual layout flows.
- Render ops decomposition around carcass, preview, dimensions, interior presets, rods, and sketch extras.

## Quality bar

A good change usually does all of this:

- updates the canonical owner, not a symptom caller
- preserves import safety
- keeps installers idempotent
- avoids duplicate aliases/fallback chains
- adds behavior proof or tight guard coverage
- updates the relevant living doc only if future work needs the knowledge

## Related docs

- `docs/dev_guide.md`
- `docs/ARCHITECTURE_OWNERSHIP_MAP.md`
- `docs/QUALITY_GUARDRAILS.md`
- `docs/TEST_PORTFOLIO_GUIDELINES.md`
- `docs/layering_completion_audit.md`
- `docs/e2e_smoke.md`
- `docs/install_idempotency_patterns.md`
- `docs/CLOUD_SYNC_LIFECYCLE_STATE_MACHINE.md`
- `docs/supabase_cloud_sync_setup.md`
