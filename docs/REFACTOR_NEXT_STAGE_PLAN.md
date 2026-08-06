# Modernization decision gate

The numbered refactor track is closed. This file is the current decision gate for future modernization; it is not a stage diary.

## Current control plane

- `tools/wp_contract_registry.mjs` registers each canonical architecture contract with one owner, one package lane, its scope, and focused behavior evidence.
- `tools/wp_private_owner_import_boundary_audit.mjs` enforces registered facade/private-owner families through one data-driven import audit.
- The same audit owns identity-only private-wrapper topology. Deliberate facades need an explicit registry justification; reviewed single-consumer wrappers live in `tools/wp_identity_facade_inventory.json` with their exact importer, and dead wrappers are removed rather than preserved as compatibility archaeology.
- `tools/wp_test_portfolio_audit.mjs` owns test reachability, group integrity, historical-stage rejection, overlap mapping, and the rule that large direct package test lists must move into the canonical group catalog.
- Capability-named runtime and ownership tests preserve current behavior. Historical `refactor_stage*` proof files are not an accepted substitute. Phase 5 control-plane cleanup is complete: historical proof files are absent, dead identity wrappers are absent, current wrapper topology is explicit, and large named test lanes are catalog-backed.
- Performance observability is on browser schema 20: interaction wait is separated from code execution, CLS/LCP/Long Tasks/render-settle are measured, and INP is estimated from Event Timing interactions with a first-input fallback.
- Error-observability modernization is active and capability-based. The canonical Oxc-based silent-catch policy distinguishes 722 statement-free catches from the 74 truly bare catches and owns exact current-state layer ratchets for both. History operations, restore-state reads, timer cleanup, boot command finalizers, boot seed config/action/write fallbacks, the Autosave snapshot/storage/scheduling pipeline, camera access/motion, and the Saved Models clone/normalization seam now report nonfatal owner failures while preserving fail-soft behavior. Autosave continues from a rejected Project Capture result to the canonical History snapshot fallback, camera motion continues through vector-copy, manual-interpolation, and timer scheduling fallbacks, and Saved Models cloning fails closed rather than returning a live source object when every detached-copy strategy rejects.

## Phase 3 completion map

Phase 3 is completed by capability risk, not by mechanically eliminating every catch. The remaining work is ordered as follows:

1. **Saved Models persistence and collection transactions** — finish storage reads, canonical repair scheduling, atomic collection writes, listener publication, and PDF-draft capture. A failed write must leave runtime state unchanged; a failed read or repair must publish a stable diagnostic and return an explicit safe result.
2. **Configuration and edit-state mutation** — migrate `config_compounds_*` and `edit_state_*` paths where a swallowed setter, reset, or synchronization failure can leave partially applied user state. Keep normalization-only fallbacks separate from mutation failures.
3. **Cloud Sync persistence and reconciliation** — review the remaining collection repository, conflict store, pull/adoption, install lifecycle, and status publication catches. Preserve offline/reconnect recovery, but require diagnostics for lost commits, rejected reconciliation, and state-machine transition failures.
4. **Render, measurement, and Canvas commit paths** — handle render-surface scheduling, measurement-tool state, and Canvas click/paint commits where a user action can disappear. Hover preview, disposal, and optional visual cleanup remain best-effort unless they mutate durable state.
5. **Boot/install and UI state mirrors** — cover app start, UI boot, viewport installation, and state-mirror writes only where failure leaves a capability absent or state stale. Do not turn optional browser capability detection into noisy reporting.
6. **Classification closeout** — review the remaining statement-free catches by layer, convert genuine functional failures, document deliberate cleanup/browser fallbacks, and stop when every remaining catch is demonstrably non-business-state best-effort. Phase 3 does not require a zero global catch count.

The immediate next slice after the current Saved Models clone/normalization work is item 1: the Saved Models persistence and transaction family.

## Professional change gate

A structural change is justified only when it meets all of these conditions:

1. It removes a real ownership mix, duplicated path, measurable cost, or verified regression risk.
2. The canonical consumer contract is known before editing.
3. Behavior coverage remains focused on observable results; architecture coverage remains focused on imports, surfaces, and ownership.
4. A new facade is introduced only when it protects a deliberate API, service/family entry, environment boundary, or stable multi-consumer seam.
5. The result reduces future change cost rather than moving the same logic into more files.

Do not split by line count, create wrapper aliases for obsolete names, or add another test lane that reruns the canonical runtime suite. If a historical proof and a current contract protect the same invariant, keep the current contract and remove the historical proof.

## Validation matrix

| Change                        | Minimum focused validation                                                       |
| ----------------------------- | -------------------------------------------------------------------------------- |
| Private owner/facade topology | `check:contract-registry`, `check:private-owner-imports`, related behavior tests |
| Builder/render behavior       | focused runtime tests, `typecheck:builder`, relevant architecture contract       |
| Runtime/API hardening         | focused runtime/API tests, relevant typecheck, public-surface contract           |
| Project import/load ingress   | project fixture and migration-boundary checks                                    |
| Cloud Sync lifecycle          | focused race/timer tests and contracts                                           |
| Canvas pointer identity       | canvas identity/parity contracts and focused runtime tests                       |
| React UI behavior             | focused UI tests, nearest typecheck, design-system guards                        |
| Performance                   | measured smoke/browser baseline plus the owning hotpath contract                 |

Broad `npm test`, `npm run gate`, release, or browser lanes are reserved for changes whose scope actually crosses those boundaries.

## Stop condition

Stop restructuring when no concrete seam passes this gate. The correct next task is then a product feature, bug fix, targeted behavior test, or measured performance improvement—not another modernization stage.
