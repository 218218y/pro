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

A local ownership test must inspect only the source files and behavior it owns. Repository-wide Layer Contract collection belongs to `tests/helpers/repository_layer_contract_fixture.mjs`, which memoizes one graph and evaluation for central Layer Contract/closeout tests. Do not call the graph collector from individual ownership tests or from another helper. When a ledger entry names an exact consumer, analyze that consumer directly instead of walking all of `esm`.

Historical ledger prefixes are protected centrally by the final migration closeout and its exact inventory fingerprint. Local ownership tests should protect current imports, aliases, formulas, and behavior; they should not copy historical `migrationBudgets` prefixes or rerun the global closeout. This separation keeps failures attributable: a behavior regression fails its owner test, while ledger drift fails one central contract.

Layer proposal output is concise by default so CI logs show the decision instead of dumping the full baseline. Use `node tools/wp_layer_contract.js --propose --json` only when the complete machine-readable proposal is needed. CLI tests must use a minimal `--root` fixture rather than scanning the production tree merely to verify argument handling or exit codes.

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

`npm run test` is the canonical all-runtime-test entrypoint. CI splits that same file list into three cost-balanced shards with `npm run test -- --shard=N/3` to reduce wall-clock time across GitHub runners. `tools/wp_test_shard_policy.js` uses measured costs for proven slow outliers and a deterministic file-size fallback for ordinary or newly added tests, then assigns files with least-loaded bin packing. The shards must still partition the canonical runnable list without semantic duplication or omitted files.

Do not replace the cost policy with alphabetical round-robin or three hand-maintained file lists. When repeated CI runs show a durable imbalance, profile the full Node 24 runtime suite, update only measured outliers in `KNOWN_SLOW_TEST_COSTS`, and keep the fallback for unprofiled files. Machine-specific absolute times may vary; the tracked values are relative scheduling costs.

Use concern-specific `test:*` scripts and verify lanes for targeted local validation. Do not rebuild the required CI runtime lane by stitching those scripts together, because many of them intentionally overlap.

## Portfolio audit lane

The portfolio-level audit is the canonical test control plane:

```bash
npm run check:test-portfolio
npm run report:test-portfolio
```

The audit is not a snapshot test for every assertion. It protects the control plane around tests:

- package scripts must not reference missing test files;
- files with `legacy` in the name must state their purpose as migration, compatibility, cleanup, root, guard, audit, contract, or surface coverage;
- architecture contracts must have one canonical owner in `tools/wp_contract_registry.mjs`;
- numbered `refactor_stage*` proof files are rejected once their current invariant is covered by a capability-named contract;
- overlap between stage/source/ownership guards is mapped so redundant proofs can be consolidated deliberately;
- named test groups must not contain duplicate or missing files.
- repository-wide Layer Contract collection must remain behind the one cached central fixture.

Large named groups belong in `tools/wp_test_group_catalog.mjs`, not in multi-thousand-character `package.json` commands. Each group declares its package-script binding, verification `kind`, canonical `owners`, execution `environment`, runner (`node-test`, `tsx-test`, or `serial-tsx`), portfolio role, optional serial policy, and file membership. `tools/wp_test_group.mjs` validates every member before spawning the matching canonical runner, and the portfolio audit reads the same catalog as its source of truth.

Use `portfolioRole: primary` only for non-overlapping top-level portfolio ownership. Use `focused` for targeted suites that intentionally reuse files from broader lanes, and `architecture` for long-lived guard collections. Primary overlap is a control-plane error; focused overlap is explicit and allowed.

Current centralized lanes include the major `tab-surfaces`, `canvas-surfaces`, `project-surfaces`, `toolchain-surfaces`, and `public-surfaces` portfolios; plus focused runtime families such as Structure Tab, Mirror, Sketch Box, Order PDF, Cloud Sync, and Sketch surfaces. Package scripts remain short facades and do not duplicate those file lists or serial policies. Architecture ownership lives in the contract registry, not in a second test group that reruns tests already reached by `npm test`.

The generated catalog can be inspected with:

```bash
npm run report:test-groups
npm run check:generated-reports
```

This keeps the test suite useful as architecture changes instead of turning it into a museum with flaky lighting.
