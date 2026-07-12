# Test portfolio guidelines

The test suite should prove behavior and preserve architecture without turning into archaeology.

## Test types

- **Behavior tests:** user-visible flows, state transitions, persistence, export, sync, build/render behavior.
- **Runtime hardening tests:** idempotency, failure modes, invalid input handling, recovery, no-op preservation.
- **Architecture guard tests:** thin checks that ownership seams remain decomposed and imports stay legal.
- **Smoke/E2E tests:** browser-level proof for critical journeys only.

## Keep / merge / remove

Keep a test when it protects a real behavior, public contract, or important ownership seam.

Merge tests when several files assert the same implementation detail from different angles.

Remove or rewrite tests when they only preserve old migration steps, historical closeout state, dead aliases, or implementation trivia that is no longer a contract.

## Good test shape

- Assert outcomes, not private call choreography, unless the test is explicitly an architecture guard.
- Use fixtures/builders instead of copying large payloads into every file.
- Name the behavior being protected.
- Prefer a small focused guard over a giant snapshot.
- Generated reports should be semantically current. Ignore volatile timestamps, but fail when metrics, inventories, or violations drift.

## Guard-test rules

Guard tests may check strings/imports/line counts for canonical ownership, but they must stay narrow. If a guard needs paragraphs of explanation, the doc or owner map probably needs cleanup instead.

Current guard strings that must remain available live in `docs/layering_completion_audit.md`.

## Verification strategy

Start narrow, then expand only when risk warrants it:

```bash
npm run check:docs-control-plane
node --test path/to/relevant.test.js
npm run test
npm run gate
```

For normal Codex fixes, do not treat `npm run test` or `npm run gate` as mandatory local closeout. Prefer the targeted behavior/guard test(s), the nearest relevant typecheck, and lint for touched linted source files. Let GitHub/CI run the full regression matrix after handoff; CI failures can be handled as follow-up fixes.

Use browser/E2E only when the changed surface needs browser proof or touches a user journey covered by `docs/e2e_smoke.md`. Do not run full `npm run e2e:smoke` for unrelated docs, tests, or non-browser source changes.

## CI runtime sharding

`npm run test` is the canonical all-runtime-test entrypoint. CI may split that same file list with `npm run test -- --shard=N/M` to reduce wall-clock time across GitHub runners, but the shards must partition the canonical runnable list without semantic duplication or omitted files.

Use concern-specific `test:*` scripts and verify lanes for targeted local validation. Do not rebuild the required CI runtime lane by stitching those scripts together, because many of them intentionally overlap.

## Portfolio audit lane

Stage 9 adds a portfolio-level audit:

```bash
npm run check:test-portfolio
npm run report:test-portfolio
npm run test:refactor-stage-guards
```

The audit is not a snapshot test for every assertion. It protects the control plane around tests:

- package scripts must not reference missing test files;
- files with `legacy` in the name must state their purpose as migration, compatibility, cleanup, root, guard, audit, contract, or surface coverage;
- refactor stage guard tests must be reachable through the canonical `tools/wp_test_group_catalog.mjs` group used by one short package facade;
- named test groups must not contain duplicate or missing files.

Large named groups belong in `tools/wp_test_group_catalog.mjs`, not in multi-thousand-character `package.json` commands. Each group declares its package-script binding, verification `kind`, canonical `owners`, execution `environment`, runner (`node-test`, `tsx-test`, or `serial-tsx`), portfolio role, optional serial policy, and file membership. `tools/wp_test_group.mjs` validates every member before spawning the matching canonical runner, and the portfolio audit reads the same catalog as its source of truth.

Use `portfolioRole: primary` only for non-overlapping top-level portfolio ownership. Use `focused` for targeted suites that intentionally reuse files from broader lanes, and `architecture` for long-lived guard collections. Primary overlap is a control-plane error; focused overlap is explicit and allowed.

Current centralized lanes include the major `tab-surfaces`, `canvas-surfaces`, `project-surfaces`, `toolchain-surfaces`, and `public-surfaces` portfolios; the focused `structure-tab-family-core`, `mirror-runtime`, `sketch-box-content-protocol`, all Order PDF runtime batches, Cloud Sync, and Sketch surface suites; plus the architecture-owned `refactor-stage-guards` collection. Package scripts and closeout lanes remain short facades and do not duplicate those file lists or serial policies. Direct closeout execution is reserved for build, performance, mixed-contract, or E2E work that is not a canonical test group.

The generated catalog can be inspected with:

```bash
npm run report:test-groups
npm run check:generated-reports
```

This keeps the test suite useful as architecture changes instead of turning it into a museum with flaky lighting.
