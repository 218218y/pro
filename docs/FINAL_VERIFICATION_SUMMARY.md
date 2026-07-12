# Final Verification Summary

- schema_version: `1`
- run_id: `97b60373-743e-43d4-a8ba-41edcef33188`
- generated_at: 2026-07-12T15:06:03.327Z
- workspace: `/mnt/data/work_latest_project2/latestzip`
- source_digest: `sha256:6503a5b00cec92ed9e785b350c5d650a3db7a229a345f35a5c12fb261f607586`
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
- duration: `1477ms`

#### stdout

```text

> test:verification-control-plane
> node tools/wp_test_group.mjs verification-control-plane

TAP version 13
# Subtest: generated report catalog owns every checked-in audit pair
ok 1 - generated report catalog owns every checked-in audit pair
  ---
  duration_ms: 1.851276
  type: 'test'
  ...
# Subtest: generated report selection rejects unknown ids and preserves catalog order
ok 2 - generated report selection rejects unknown ids and preserves catalog order
  ---
  duration_ms: 0.547356
  type: 'test'
  ...
# Subtest: generated report comparison ignores timestamps but catches semantic drift
ok 3 - generated report comparison ignores timestamps but catches semantic drift
  ---
  duration_ms: 2.468547
  type: 'test'
  ...
# Subtest: source identity is deterministic and changes when owned source changes
ok 4 - source identity is deterministic and changes when owned source changes
  ---
  duration_ms: 96.424159
  type: 'test'
  ...
# Subtest: lane catalog identity covers lane execution and profile membership
ok 5 - lane catalog identity covers lane execution and profile membership
  ---
  duration_ms: 2.30161
  type: 'test'
  ...
# Subtest: verification payload binds results to source lane catalog and explicit selection
ok 6 - verification payload binds results to source lane catalog and explicit selection
  ---
  duration_ms: 67.206103
  type: 'test'
  ...
# Subtest: verification validation fails closed for source drift lane drift and summary tampering
ok 7 - verification validation fails closed for source drift lane drift and summary tampering
  ---
  duration_ms: 158.078345
  type: 'test'
  ...
# Subtest: state compatibility rejects legacy or stale payloads with a reset instruction
ok 8 - state compatibility rejects legacy or stale payloads with a reset instruction
  ---
  duration_ms: 51.502156
  type: 'test'
  ...
# Subtest: summary and final status preserve environment blockers without treating them as clean proof
ok 9 - summary and final status preserve environment blockers without treating them as clean proof
  ---
  duration_ms: 0.431201
  type: 'test'
  ...
# Subtest: empty and partial selections cannot report a successful closeout
ok 10 - empty and partial selections cannot report a successful closeout
  ---
  duration_ms: 33.599825
  type: 'test'
  ...
# Subtest: verification summary contract derives markdown from one validated JSON payload
ok 11 - verification summary contract derives markdown from one validated JSON payload
  ---
  duration_ms: 80.908625
  type: 'test'
  ...
# Subtest: verification summary contract refuses to canonize a stale report
ok 12 - verification summary contract refuses to canonize a stale report
  ---
  duration_ms: 68.949506
  type: 'test'
  ...
# Subtest: closeout lanes keep stable ids and include critical families
ok 13 - closeout lanes keep stable ids and include critical families
  ---
  duration_ms: 1.295726
  type: 'test'
  ...
# Subtest: group-backed closeout lanes delegate to canonical test-group package facades
ok 14 - group-backed closeout lanes delegate to canonical test-group package facades
  ---
  duration_ms: 0.227774
  type: 'test'
  ...
# Subtest: overlay export closeout lane stays direct and grouped
ok 15 - overlay export closeout lane stays direct and grouped
  ---
  duration_ms: 0.263548
  type: 'test'
  ...
# Subtest: direct profiles stay stable for order-pdf sketch and cloud-sync
ok 16 - direct profiles stay stable for order-pdf sketch and cloud-sync
  ---
  duration_ms: 0.120451
  type: 'test'
  ...
# Subtest: normalize args collects profiles categories lane ids skips log dir and state options
ok 17 - normalize args collects profiles categories lane ids skips log dir and state options
  ---
  duration_ms: 0.443685
  type: 'test'
  ...
# Subtest: closeout CLI rejects unknown flags missing values and unknown selectors
ok 18 - closeout CLI rejects unknown flags missing values and unknown selectors
  ---
  duration_ms: 0.704303
  type: 'test'
  ...
# Subtest: select lanes respects profile resume and skip while preserving order
ok 19 - select lanes respects profile resume and skip while preserving order
  ---
  duration_ms: 0.230107
  type: 'test'
  ...
# Subtest: environment classifier recognizes playwright/browser failures
ok 20 - environment classifier recognizes playwright/browser failures
  ---
  duration_ms: 0.127983
  type: 'test'
  ...
# Subtest: runner classifier recognizes wrapper and sandbox failures
ok 21 - runner classifier recognizes wrapper and sandbox failures
  ---
  duration_ms: 0.312772
  type: 'test'
  ...
# Subtest: summary separates passed failures environment-blocked and runner-blocked lanes
ok 22 - summary separates passed failures environment-blocked and runner-blocked lanes
  ---
  duration_ms: 0.396028
  type: 'test'
  ...
# Subtest: state helpers merge by lane id and preserve canonical order
ok 23 - state helpers merge by lane id and preserve cano
...
[trimmed 1135 chars]
```

### [PASS] Toolchain surfaces (canonical group)

- id: `toolchain-surfaces`
- category: `toolchain`
- command: `npm run test:toolchain-surfaces`
- status: **passed**
- exit code: `0`
- duration: `12064ms`

#### stdout

```text

> test:toolchain-surfaces
> node tools/wp_test_group.mjs toolchain-surfaces

TAP version 13
# Subtest: [actions.patch types] fixture uses native @ts-expect-error contracts
ok 1 - [actions.patch types] fixture uses native @ts-expect-error contracts
  ---
  duration_ms: 1.732616
  type: 'test'
  ...
# Subtest: [actions.patch types] public/backend patch contract fixture typechecks through tsc
ok 2 - [actions.patch types] public/backend patch contract fixture typechecks through tsc
  ---
  duration_ms: 2469.778175
  type: 'test'
  ...
# Subtest: [actions.patch types] fixture is safe if discovered by the generic runtime runner
ok 3 - [actions.patch types] fixture is safe if discovered by the generic runtime runner
  ---
  duration_ms: 1501.504553
  type: 'test'
  ...
# Subtest: package-lock resolved tarballs stay on public registries
ok 4 - package-lock resolved tarballs stay on public registries
  ---
  duration_ms: 15.22509
  type: 'test'
  ...
# Subtest: ts runtime loader loads a plain TS module
ok 5 - ts runtime loader loads a plain TS module
  ---
  duration_ms: 1107.275217
  type: 'test'
  ...
# Subtest: ts runtime loader resolves local .js imports to TS files
ok 6 - ts runtime loader resolves local .js imports to TS files
  ---
  duration_ms: 102.979118
  type: 'test'
  ...
# Subtest: ts runtime loader supports object mocks by exact specifier
ok 7 - ts runtime loader supports object mocks by exact specifier
  ---
  duration_ms: 93.635538
  type: 'test'
  ...
# Subtest: ts runtime loader supports dynamic mocks with loader context
ok 8 - ts runtime loader supports dynamic mocks with loader context
  ---
  duration_ms: 104.994445
  type: 'test'
  ...
# Subtest: ts runtime loader cache returns the same module instance
ok 9 - ts runtime loader cache returns the same module instance
  ---
  duration_ms: 94.725137
  type: 'test'
  ...
# Subtest: ts runtime loader transform errors include the fixture filename
ok 10 - ts runtime loader transform errors include the fixture filename
  ---
  duration_ms: 8.63402
  type: 'test'
  ...
# Subtest: ts runtime loader evaluate errors include the fixture filename
ok 11 - ts runtime loader evaluate errors include the fixture filename
  ---
  duration_ms: 92.419452
  type: 'test'
  ...
# Subtest: runtime tests do not reintroduce per-test TS VM loaders
ok 12 - runtime tests do not reintroduce per-test TS VM loaders
  ---
  duration_ms: 1111.542254
  type: 'test'
  ...
# Subtest: AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers
ok 13 - AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers
  ---
  duration_ms: 13.348802
  type: 'test'
  ...
# Subtest: AST adapter preserves import, dynamic import, member, and optional-chain shapes for callers
ok 14 - AST adapter preserves import, dynamic import, member, and optional-chain shapes for callers
  ---
  duration_ms: 2.279437
  type: 'test'
  ...
# Subtest: AST adapter keeps token/code-line metrics independent from tool callers
ok 15 - AST adapter keeps token/code-line metrics independent from tool callers
  ---
  duration_ms: 1.305701
  type: 'test'
  ...
# Subtest: AST adapter centralizes type-hardening AST counts
ok 16 - AST adapter centralizes type-hardening AST counts
  ---
  duration_ms: 1.413449
  type: 'test'
  ...
# Subtest: AST adapter exposes syntax error diagnostics without TypeScript compiler API
ok 17 - AST adapter exposes syntax error diagnostics without TypeScript compiler API
  ---
  duration_ms: 79.984029
  type: 'test'
  ...
# Subtest: no project tool/test/runtime source imports TypeScript directly
ok 18 - no project tool/test/runtime source imports TypeScript directly
  ---
  duration_ms: 3599.387121
  type: 'test'
  ...
# Subtest: AST adapter returns injected adapter instances without exposing TypeScript module wrapping
ok 19 - AST adapter returns injected adapter instances without exposing TypeScript module wrapping
  ---
  duration_ms: 0.292922
  type: 'test'
  ...
# Subtest: build-dist args parsing keeps clean/assets/help/unknown policy
ok 20 - build-dist args parsing keeps clean/assets/help/unknown policy
  ---
  duration_ms: 1.900138
  type: 'test'
  ...
# Subtest: build-dist path resolution stays rooted under project dist
ok 21 - build-dist path resolution stays rooted under project dist
  ---
  duration_ms: 0.316938
  type: 'test'
  ...
# Subtest: static asset copy mirrors html/runtime/public assets into dist
ok 22 - static asset copy mirrors html/runtime/public assets into dist
  ---
  duration_ms: 184.814268
  type: 'test'
  ...
# Subtest: static asset copy keeps repository tests out of dist outputs
ok 23 - static asset copy keeps repository tests out of dist outputs
  ---
  duration_ms: 4.876266
  type: 'test'
  ...
# Subtest: static asset copy fails when the canonical runtime config module is missing
ok 24 - static asset copy fails when the canonical runtime config module is mi
...
[trimmed 34229 chars]
```
