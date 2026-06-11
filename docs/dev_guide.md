# WardrobePro developer guide

This is the canonical short guide for changing the project without reintroducing legacy patterns.

## Non-negotiables

- **Pure ESM:** source under `esm/` must not depend on `window.App`, `globalThis.App`, `window.THREE`, or `globalThis.THREE`.
- **Store-driven SSOT:** UI state lives in the store. Do not read DOM snapshots or shadow bags as the source of truth.
- **Fail fast:** missing required state/deps should throw a clear error, not silently fall back.
- **No import side effects:** modules expose explicit setup/install functions; boot decides when they run.
- **One owner per public surface:** avoid compatibility aliases that become second implementations.

## Boot path

```text
index_pro.html
  -> esm/entry_pro.ts              # browser adapter, allowed to touch window/document
      -> esm/main.ts:boot()        # pure application boot
          -> esm/app_container.ts
          -> esm/boot/boot_sequence.ts
              -> esm/boot/boot_manifest.ts
                  -> layer installers
                  -> esm/native/ui/ui_manifest.ts
                  -> final UI wiring
```

`esm/entry_*` owns browser dependency collection. `esm/main.ts` and deeper modules must stay import-safe.

## Layer map

- `esm/boot/*` — boot order and install manifests.
- `esm/native/runtime/*` — low-level helpers, assertions, stable-surface primitives.
- `esm/native/platform/*` — store/platform/browser orchestration.
- `esm/native/kernel/*` — domain state derivation and canonical APIs.
- `esm/native/builder/*` — builder/render/build orchestration.
- `esm/native/services/*` — services, persistence, sync, canvas picking, lifecycle surfaces.
- `esm/native/ui/*` — React UI, overlays, selectors, and user interaction wiring.
- `esm/native/adapters/*` — browser/DOM integration boundary.
- `tests/*` — behavior and architecture guards.
- `tools/*` — verification, release, bundle, audit, and smoke scripts.

## Change workflow

1. Read `package.json`, this guide, `QUALITY_GUARDRAILS.md`, `layering_completion_audit.md`, and the directly affected tests/files.
2. Identify the canonical owner before editing.
3. Keep changes surgical: fix the owner, not callers one by one.
4. Add/adjust behavior tests for user-visible behavior and thin guard tests for ownership boundaries.
5. Run the smallest relevant verification first, then a broader gate when the change touches shared surfaces.

## Common commands

```bash
npm run check:docs-control-plane
npm run test
npm run gate
npm run gate:full
npm run e2e:smoke:list
npm run e2e:smoke
npm run perf:smoke
npm run perf:browser
```

Use `npm run gate` before normal handoff. Use `npm run gate:full` before release-style handoff.

## UI/state rules

- UI updates go through `App.actions.*`, especially `App.actions.ui.patch(...)` for simple UI state updates.
- Action-only controls, such as export or file dialogs, should not be modeled as persistent UI state unless there is real state to preserve.
- UI should consume public service/API seams rather than importing deep runtime internals.

## Build/render rules

- Kernel derives build state from the canonical store or explicit overrides.
- Builder/render operations should receive explicit deps/context.
- Avoid duplicate builds, duplicate writes, and rerenders that do not reflect semantic state changes.

## Install rules

- Installers must be idempotent and healing: safe to call again, able to restore missing methods, and never wrap an already-installed surface repeatedly.
- Do not split an ownership surface into two competing installers.

## Documentation rules

- Keep active docs short and operational.
- Put facts where future work will actually look for them.
- Consolidate durable rules into `QUALITY_GUARDRAILS.md` instead of scattering one-off policy files.
- Do not create new closeout/stage files for completed work; update the living doc that owns the topic.
