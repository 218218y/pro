# Final Verification Summary

- schema_version: `1`
- run_id: `28406dfe-b9ae-4f7b-9903-e9551a4c9067`
- generated_at: 2026-07-12T12:37:21.953Z
- workspace: `/mnt/data/pro-next/pro-linux`
- source_digest: `sha256:02fede67f1b6d1037c3792233b51ac674bbcec7a20cc5a27ca6bc5b8e581ca6a`
- source_files: **4197**
- lane_catalog_digest: `sha256:7a2bdd423f2bc7f579ebed592d6c21014d31e6e3e59385fb34e302f33fab5eb9`
- node: `v22.16.0`
- final_status: **passed**
- requested lanes: **1**
- completed selection: **yes**
- total results: **1**
- passed: **1**
- environment-blocked: **0**
- runner-blocked: **0**
- failed: **0**
- selected profiles: `control-plane`
- selected categories: `(all)`
- selected lanes: `(all)`
- skipped lanes: `(none)`
- resumed from: `(start)`
- requested lane ids: `verification-control-plane`
- completed lane ids: `verification-control-plane`
- state file: `(none)`

## Interpretation

All selected closeout lanes passed. This report is valid for the explicit selection recorded above.

No environment blockers were detected in this closeout run.

No runner blockers were detected in this closeout run.

## Lane results

### [PASS] Verification control-plane contracts

- id: `verification-control-plane`
- category: `toolchain`
- command: `node --test tests/wp_verification_manifest_runtime.test.cjs tests/wp_verify_closeout_support_runtime.test.cjs tests/wp_generated_report_contract_runtime.test.js tests/wp_verification_summary_contract_runtime.test.js`
- status: **passed**
- exit code: `0`
- duration: `1882ms`

#### stdout

```text
TAP version 13
# Subtest: generated report catalog owns every checked-in audit pair
ok 1 - generated report catalog owns every checked-in audit pair
  ---
  duration_ms: 2.972863
  type: 'test'
  ...
# Subtest: generated report selection rejects unknown ids and preserves catalog order
ok 2 - generated report selection rejects unknown ids and preserves catalog order
  ---
  duration_ms: 0.893213
  type: 'test'
  ...
# Subtest: generated report comparison ignores timestamps but catches semantic drift
ok 3 - generated report comparison ignores timestamps but catches semantic drift
  ---
  duration_ms: 3.33655
  type: 'test'
  ...
# Subtest: source identity is deterministic and changes when owned source changes
ok 4 - source identity is deterministic and changes when owned source changes
  ---
  duration_ms: 111.13779
  type: 'test'
  ...
# Subtest: lane catalog identity covers lane execution and profile membership
ok 5 - lane catalog identity covers lane execution and profile membership
  ---
  duration_ms: 1.002949
  type: 'test'
  ...
# Subtest: verification payload binds results to source lane catalog and explicit selection
ok 6 - verification payload binds results to source lane catalog and explicit selection
  ---
  duration_ms: 80.548734
  type: 'test'
  ...
# Subtest: verification validation fails closed for source drift lane drift and summary tampering
ok 7 - verification validation fails closed for source drift lane drift and summary tampering
  ---
  duration_ms: 197.42336
  type: 'test'
  ...
# Subtest: state compatibility rejects legacy or stale payloads with a reset instruction
ok 8 - state compatibility rejects legacy or stale payloads with a reset instruction
  ---
  duration_ms: 75.534293
  type: 'test'
  ...
# Subtest: summary and final status preserve environment blockers without treating them as clean proof
ok 9 - summary and final status preserve environment blockers without treating them as clean proof
  ---
  duration_ms: 0.353007
  type: 'test'
  ...
# Subtest: empty and partial selections cannot report a successful closeout
ok 10 - empty and partial selections cannot report a successful closeout
  ---
  duration_ms: 52.54215
  type: 'test'
  ...
# Subtest: verification summary contract derives markdown from one validated JSON payload
ok 11 - verification summary contract derives markdown from one validated JSON payload
  ---
  duration_ms: 97.467965
  type: 'test'
  ...
# Subtest: verification summary contract refuses to canonize a stale report
ok 12 - verification summary contract refuses to canonize a stale report
  ---
  duration_ms: 83.379174
  type: 'test'
  ...
# Subtest: closeout lanes keep stable ids and include critical families
ok 13 - closeout lanes keep stable ids and include critical families
  ---
  duration_ms: 1.998864
  type: 'test'
  ...
# Subtest: overlay export closeout lane stays direct and grouped
ok 14 - overlay export closeout lane stays direct and grouped
  ---
  duration_ms: 0.458775
  type: 'test'
  ...
# Subtest: direct profiles stay stable for order-pdf sketch and cloud-sync
ok 15 - direct profiles stay stable for order-pdf sketch and cloud-sync
  ---
  duration_ms: 0.212026
  type: 'test'
  ...
# Subtest: normalize args collects profiles categories lane ids skips log dir and state options
ok 16 - normalize args collects profiles categories lane ids skips log dir and state options
  ---
  duration_ms: 0.819902
  type: 'test'
  ...
# Subtest: closeout CLI rejects unknown flags missing values and unknown selectors
ok 17 - closeout CLI rejects unknown flags missing values and unknown selectors
  ---
  duration_ms: 1.286314
  type: 'test'
  ...
# Subtest: select lanes respects profile resume and skip while preserving order
ok 18 - select lanes respects profile resume and skip while preserving order
  ---
  duration_ms: 0.507306
  type: 'test'
  ...
# Subtest: environment classifier recognizes playwright/browser failures
ok 19 - environment classifier recognizes playwright/browser failures
  ---
  duration_ms: 0.312166
  type: 'test'
  ...
# Subtest: runner classifier recognizes wrapper and sandbox failures
ok 20 - runner classifier recognizes wrapper and sandbox failures
  ---
  duration_ms: 0.327634
  type: 'test'
  ...
# Subtest: summary separates passed failures environment-blocked and runner-blocked lanes
ok 21 - summary separates passed failures environment-blocked and runner-blocked lanes
  ---
  duration_ms: 0.710031
  type: 'test'
  ...
# Subtest: state helpers merge by lane id and preserve canonical order
ok 22 - state helpers merge by lane id and preserve canonical order
  ---
  duration_ms: 0.825592
  type: 'test'
  ...
# Subtest: state helpers roundtrip versioned payloads and return null when the file is missing
ok 23 - state helpers roundtrip versioned payloads and return null when the file is missing
  ---
  duration_ms: 956.436789
  type: 'test'
  ...
# Subtest: reset-
...
[trimmed 815 chars]
```
