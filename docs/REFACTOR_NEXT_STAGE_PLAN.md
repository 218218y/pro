# Modernization decision gate

The numbered refactor track is closed. This file is the current decision gate for future modernization; it is not a stage diary.

## Current control plane

- `tools/wp_contract_registry.mjs` registers each canonical architecture contract with one owner, one package lane, its scope, and focused behavior evidence.
- `tools/wp_private_owner_import_boundary_audit.mjs` enforces registered facade/private-owner families through one data-driven import audit.
- The same audit owns identity-only private-wrapper topology. Deliberate facades need an explicit registry justification; reviewed single-consumer wrappers live in `tools/wp_identity_facade_inventory.json` with their exact importer, and dead wrappers are removed rather than preserved as compatibility archaeology.
- `tools/wp_test_portfolio_audit.mjs` owns test reachability, group integrity, historical-stage rejection, overlap mapping, and the rule that large direct package test lists must move into the canonical group catalog.
- Capability-named runtime and ownership tests preserve current behavior. Historical `refactor_stage*` proof files are not an accepted substitute. Phase 5 control-plane cleanup is complete: historical proof files are absent, dead identity wrappers are absent, current wrapper topology is explicit, and large named test lanes are catalog-backed.

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
