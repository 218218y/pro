# Final Verification Summary

- schema_version: `1`
- run_id: `2763e8d4-2cbd-4fab-9615-056da6040925`
- generated_at: 2026-07-12T14:48:05.564Z
- workspace: `/mnt/data/pro_work/pro-linux`
- source_digest: `sha256:f1a047cf6d4ea519f5dcb80e0b7f5321d475e2c8ca285e0aacb03a57d700715a`
- source_files: **4198**
- lane_catalog_digest: `sha256:fe8957c54dd9db2f80ada621f694365cdd1f8a56b121a6429e1ce917cff56ae3`
- node: `v22.16.0`
- final_status: **passed**
- requested lanes: **2**
- completed selection: **yes**
- total results: **2**
- passed: **2**
- environment-blocked: **0**
- runner-blocked: **0**
- failed: **0**
- selected profiles: `control-plane`
- selected categories: `(all)`
- selected lanes: `(all)`
- skipped lanes: `(none)`
- resumed from: `(start)`
- requested lane ids: `verification-control-plane, toolchain-surfaces`
- completed lane ids: `verification-control-plane, toolchain-surfaces`
- state file: `(none)`

## Interpretation

All selected closeout lanes passed. This report is valid for the explicit selection recorded above.

No environment blockers were detected in this closeout run.

No runner blockers were detected in this closeout run.

## Lane results

### [PASS] Verification control-plane contracts

- id: `verification-control-plane`
- category: `toolchain`
- command: `npm run test:verification-control-plane`
- status: **passed**
- exit code: `0`
- duration: `1496ms`

#### stdout

```text

> test:verification-control-plane
> node tools/wp_test_group.mjs verification-control-plane

TAP version 13
# Subtest: generated report catalog owns every checked-in audit pair
ok 1 - generated report catalog owns every checked-in audit pair
  ---
  duration_ms: 2.078308
  type: 'test'
  ...
# Subtest: generated report selection rejects unknown ids and preserves catalog order
ok 2 - generated report selection rejects unknown ids and preserves catalog order
  ---
  duration_ms: 0.597142
  type: 'test'
  ...
# Subtest: generated report comparison ignores timestamps but catches semantic drift
ok 3 - generated report comparison ignores timestamps but catches semantic drift
  ---
  duration_ms: 2.767214
  type: 'test'
  ...
# Subtest: source identity is deterministic and changes when owned source changes
ok 4 - source identity is deterministic and changes when owned source changes
  ---
  duration_ms: 95.220903
  type: 'test'
  ...
# Subtest: lane catalog identity covers lane execution and profile membership
ok 5 - lane catalog identity covers lane execution and profile membership
  ---
  duration_ms: 2.44041
  type: 'test'
  ...
# Subtest: verification payload binds results to source lane catalog and explicit selection
ok 6 - verification payload binds results to source lane catalog and explicit selection
  ---
  duration_ms: 45.061826
  type: 'test'
  ...
# Subtest: verification validation fails closed for source drift lane drift and summary tampering
ok 7 - verification validation fails closed for source drift lane drift and summary tampering
  ---
  duration_ms: 113.625711
  type: 'test'
  ...
# Subtest: state compatibility rejects legacy or stale payloads with a reset instruction
ok 8 - state compatibility rejects legacy or stale payloads with a reset instruction
  ---
  duration_ms: 76.115168
  type: 'test'
  ...
# Subtest: summary and final status preserve environment blockers without treating them as clean proof
ok 9 - summary and final status preserve environment blockers without treating them as clean proof
  ---
  duration_ms: 0.243407
  type: 'test'
  ...
# Subtest: empty and partial selections cannot report a successful closeout
ok 10 - empty and partial selections cannot report a successful closeout
  ---
  duration_ms: 30.597373
  type: 'test'
  ...
# Subtest: verification summary contract derives markdown from one validated JSON payload
ok 11 - verification summary contract derives markdown from one validated JSON payload
  ---
  duration_ms: 84.605166
  type: 'test'
  ...
# Subtest: verification summary contract refuses to canonize a stale report
ok 12 - verification summary contract refuses to canonize a stale report
  ---
  duration_ms: 50.824422
  type: 'test'
  ...
# Subtest: closeout lanes keep stable ids and include critical families
ok 13 - closeout lanes keep stable ids and include critical families
  ---
  duration_ms: 1.625855
  type: 'test'
  ...
# Subtest: group-backed closeout lanes delegate to canonical test-group package facades
ok 14 - group-backed closeout lanes delegate to canonical test-group package facades
  ---
  duration_ms: 0.241134
  type: 'test'
  ...
# Subtest: overlay export closeout lane stays direct and grouped
ok 15 - overlay export closeout lane stays direct and grouped
  ---
  duration_ms: 0.267404
  type: 'test'
  ...
# Subtest: direct profiles stay stable for order-pdf sketch and cloud-sync
ok 16 - direct profiles stay stable for order-pdf sketch and cloud-sync
  ---
  duration_ms: 0.116827
  type: 'test'
  ...
# Subtest: normalize args collects profiles categories lane ids skips log dir and state options
ok 17 - normalize args collects profiles categories lane ids skips log dir and state options
  ---
  duration_ms: 0.452814
  type: 'test'
  ...
# Subtest: closeout CLI rejects unknown flags missing values and unknown selectors
ok 18 - closeout CLI rejects unknown flags missing values and unknown selectors
  ---
  duration_ms: 0.716772
  type: 'test'
  ...
# Subtest: select lanes respects profile resume and skip while preserving order
ok 19 - select lanes respects profile resume and skip while preserving order
  ---
  duration_ms: 0.222376
  type: 'test'
  ...
# Subtest: environment classifier recognizes playwright/browser failures
ok 20 - environment classifier recognizes playwright/browser failures
  ---
  duration_ms: 0.137228
  type: 'test'
  ...
# Subtest: runner classifier recognizes wrapper and sandbox failures
ok 21 - runner classifier recognizes wrapper and sandbox failures
  ---
  duration_ms: 0.361987
  type: 'test'
  ...
# Subtest: summary separates passed failures environment-blocked and runner-blocked lanes
ok 22 - summary separates passed failures environment-blocked and runner-blocked lanes
  ---
  duration_ms: 0.391982
  type: 'test'
  ...
# Subtest: state helpers merge by lane id and preserve canonical order
ok 23 - state helpers merge by lane id and preserve cano
...
[trimmed 1134 chars]
```

### [PASS] Toolchain surfaces (canonical group)

- id: `toolchain-surfaces`
- category: `toolchain`
- command: `npm run test:toolchain-surfaces`
- status: **passed**
- exit code: `0`
- duration: `11816ms`

#### stdout

```text

> test:toolchain-surfaces
> node tools/wp_test_group.mjs toolchain-surfaces

TAP version 13
# Subtest: [actions.patch types] fixture uses native @ts-expect-error contracts
ok 1 - [actions.patch types] fixture uses native @ts-expect-error contracts
  ---
  duration_ms: 1.836133
  type: 'test'
  ...
# Subtest: [actions.patch types] public/backend patch contract fixture typechecks through tsc
ok 2 - [actions.patch types] public/backend patch contract fixture typechecks through tsc
  ---
  duration_ms: 1991.797547
  type: 'test'
  ...
# Subtest: [actions.patch types] fixture is safe if discovered by the generic runtime runner
ok 3 - [actions.patch types] fixture is safe if discovered by the generic runtime runner
  ---
  duration_ms: 1798.394258
  type: 'test'
  ...
# Subtest: package-lock resolved tarballs stay on public registries
ok 4 - package-lock resolved tarballs stay on public registries
  ---
  duration_ms: 12.294605
  type: 'test'
  ...
# Subtest: ts runtime loader loads a plain TS module
ok 5 - ts runtime loader loads a plain TS module
  ---
  duration_ms: 905.210223
  type: 'test'
  ...
# Subtest: ts runtime loader resolves local .js imports to TS files
ok 6 - ts runtime loader resolves local .js imports to TS files
  ---
  duration_ms: 105.766123
  type: 'test'
  ...
# Subtest: ts runtime loader supports object mocks by exact specifier
ok 7 - ts runtime loader supports object mocks by exact specifier
  ---
  duration_ms: 184.56849
  type: 'test'
  ...
# Subtest: ts runtime loader supports dynamic mocks with loader context
ok 8 - ts runtime loader supports dynamic mocks with loader context
  ---
  duration_ms: 100.198626
  type: 'test'
  ...
# Subtest: ts runtime loader cache returns the same module instance
ok 9 - ts runtime loader cache returns the same module instance
  ---
  duration_ms: 7.557487
  type: 'test'
  ...
# Subtest: ts runtime loader transform errors include the fixture filename
ok 10 - ts runtime loader transform errors include the fixture filename
  ---
  duration_ms: 8.867264
  type: 'test'
  ...
# Subtest: ts runtime loader evaluate errors include the fixture filename
ok 11 - ts runtime loader evaluate errors include the fixture filename
  ---
  duration_ms: 96.823569
  type: 'test'
  ...
# Subtest: runtime tests do not reintroduce per-test TS VM loaders
ok 12 - runtime tests do not reintroduce per-test TS VM loaders
  ---
  duration_ms: 1207.376101
  type: 'test'
  ...
# Subtest: AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers
ok 13 - AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers
  ---
  duration_ms: 5.747458
  type: 'test'
  ...
# Subtest: AST adapter preserves import, dynamic import, member, and optional-chain shapes for callers
ok 14 - AST adapter preserves import, dynamic import, member, and optional-chain shapes for callers
  ---
  duration_ms: 78.118576
  type: 'test'
  ...
# Subtest: AST adapter keeps token/code-line metrics independent from tool callers
ok 15 - AST adapter keeps token/code-line metrics independent from tool callers
  ---
  duration_ms: 1.16216
  type: 'test'
  ...
# Subtest: AST adapter centralizes type-hardening AST counts
ok 16 - AST adapter centralizes type-hardening AST counts
  ---
  duration_ms: 0.823433
  type: 'test'
  ...
# Subtest: AST adapter exposes syntax error diagnostics without TypeScript compiler API
ok 17 - AST adapter exposes syntax error diagnostics without TypeScript compiler API
  ---
  duration_ms: 1.307489
  type: 'test'
  ...
# Subtest: no project tool/test/runtime source imports TypeScript directly
ok 18 - no project tool/test/runtime source imports TypeScript directly
  ---
  duration_ms: 3615.849499
  type: 'test'
  ...
# Subtest: AST adapter returns injected adapter instances without exposing TypeScript module wrapping
ok 19 - AST adapter returns injected adapter instances without exposing TypeScript module wrapping
  ---
  duration_ms: 0.251099
  type: 'test'
  ...
# Subtest: build-dist args parsing keeps clean/assets/help/unknown policy
ok 20 - build-dist args parsing keeps clean/assets/help/unknown policy
  ---
  duration_ms: 2.459253
  type: 'test'
  ...
# Subtest: build-dist path resolution stays rooted under project dist
ok 21 - build-dist path resolution stays rooted under project dist
  ---
  duration_ms: 0.421646
  type: 'test'
  ...
# Subtest: static asset copy mirrors html/runtime/public assets into dist
ok 22 - static asset copy mirrors html/runtime/public assets into dist
  ---
  duration_ms: 112.446088
  type: 'test'
  ...
# Subtest: static asset copy keeps repository tests out of dist outputs
ok 23 - static asset copy keeps repository tests out of dist outputs
  ---
  duration_ms: 89.672668
  type: 'test'
  ...
# Subtest: static asset copy fails when the canonical runtime config module is missing
ok 24 - static asset copy fails when the canonical runtime config module is mis
...
[trimmed 32504 chars]
```
