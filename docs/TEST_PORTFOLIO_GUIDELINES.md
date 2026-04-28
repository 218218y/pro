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
- Avoid tests that require generated reports to be historically identical.

## Guard-test rules

Guard tests may check strings/imports/line counts for canonical ownership, but they must stay narrow. If a guard needs paragraphs of explanation, the doc or owner map probably needs cleanup instead.

Current guard strings that must remain available live in `docs/layering_completion_audit.md`.

## Verification strategy

Start narrow, then expand:

```bash
npm run check:docs-control-plane
node --test path/to/relevant.test.js
npm run test
npm run gate
```

Use browser/E2E only when the changed surface needs browser proof or touches a user journey covered by `docs/e2e_smoke.md`.

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
- refactor stage guard tests must be reachable from one package script.

This keeps the test suite useful as architecture changes instead of turning it into a museum with flaky lighting.
