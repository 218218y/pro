# AGENTS.md

## Mission

Work as a careful senior engineer inside this repository.
Make high-confidence changes that preserve the project’s architecture and complete its migration direction.
Prefer the smallest coherent architectural change over broad speculative rewrites, but do not confuse
"focused" with "timid". When the task is cleanup/modernization and the old path is proven obsolete,
remove it end-to-end instead of preserving it behind aliases, fallbacks, or compatibility wrappers.

Do not optimize for quick green checks at the cost of reintroducing legacy patterns.
If a test is outdated relative to the intended architecture, update the test instead of regressing the code.

For release-bound modernization work, finishing one seam properly is better than leaving three half-migrated
bridges in place. Prefer a clear breaking cleanup with updated callers/tests/docs over a quiet compatibility
ladder that keeps the codebase confused.

---

## First things to read before editing

Before making changes, read these in order when relevant:

1. `package.json`
2. `docs/README.md`
3. `docs/dev_guide.md`
4. `docs/layering_completion_audit.md`
5. `docs/e2e_smoke.md` (if the task touches UI/browser flows)
6. the failing test(s) or guard file(s)
7. the directly affected implementation files

Start by understanding the intended architecture, not by patching symptoms.

---

## Repository profile

This is a layered Pure ESM application with strong architectural guardrails.

Key stack and shape:

- TypeScript + React 19 + Vite
- Zustand store architecture
- Three.js-heavy rendering/builder flows
- layered code under `esm/native/*`
- many architecture guard tests under `tests/*`
- custom verification scripts under `tools/*`

Important directories:

- `esm/boot/*`
- `esm/native/adapters/*`
- `esm/native/runtime/*`
- `esm/native/platform/*`
- `esm/native/kernel/*`
- `esm/native/builder/*`
- `esm/native/services/*`
- `esm/native/ui/*`
- `esm/native/io/*`
- `tests/*`
- `tools/*`

---

## Non-negotiable architecture rules

### 1) Pure ESM / no global app access in source layers

Inside `esm/*`, do not introduce or restore reliance on:

- `window.App`
- `globalThis.App`
- `window.THREE`
- `globalThis.THREE`

Browser/DOM access belongs only in the entry/adapters boundary, especially:

- `esm/entry_*`
- `esm/native/adapters/*`

If browser state is needed in runtime/adapters, prefer the browser-env helpers and existing injected dependency paths.

### 2) Store-driven SSOT only

UI state lives in the store, not in DOM snapshots.

Follow these rules:

- read state from the canonical store/state APIs
- do not reintroduce DOM-snapshot reads as a source of truth
- do not re-enable deprecated UI readback patterns
- do not add hybrid state paths “just in case”

### 3) Fail fast, no silent legacy fallbacks

Do not add or restore compatibility ladders, silent fallback cascades, legacy envelopes, or “best effort” shadow paths unless the task explicitly requires compatibility behavior.

Prefer:

- explicit assertions
- canonical access seams
- clear errors
- one stable path

Avoid:

- hybrid write paths
- shape guessing
- raw legacy store envelopes
- deprecated dispatch shims
- hidden fallback branches

### 4) No import side effects

Do not add modules that perform work merely on import.
Prefer explicit install/setup entrypoints.

### 5) Respect layer boundaries

Keep logic in the correct layer:

- domain/state derivation -> `kernel`
- infra/render/scheduling/store plumbing -> `platform`
- builder orchestration / render ops flows -> `builder`
- service orchestration -> `services`
- DOM/widgets/interactions -> `ui`
- browser integration -> `adapters`

Do not leak DOM or browser concerns into kernel/domain flows.

### 6) Preserve canonical migration direction

This repository is in an active hardening/migration track.
Do not reintroduce removed legacy access paths to satisfy old assumptions.

Especially avoid restoring:

- legacy cfg/store/global reads
- mixed canonical + legacy writes
- wrapper aliases for old names when callers should be updated
- “temporary” fallback bridges that become permanent

If an existing alias/fallback/compatibility path is still present, treat it as debt that needs an owner:

- prove whether current callers still need it
- move callers to the canonical API first
- add or update a guard so new callers cannot return to the old path
- remove the old path when the import graph and tests show it is unused
- document only the durable rule, not a stage diary

Do not keep obsolete wrappers only because removal touches several files. A multi-file cleanup is acceptable
when it removes a real second implementation and leaves the system simpler.

### 7) Build pipeline discipline

For build/builder work, prefer the canonical pipeline/context patterns already present in the repo.
Do not bypass the established build context flow with ad hoc argument bags or side channels.

### 8) Type hardening direction is intentional

Prefer stronger type surfaces.
Do not casually add `any`, broad casts, `AnyRecord`, or loose shape guessing unless there is no practical alternative.
When forced to cast, keep the cast narrow and local.

---

## Editing rules

- Keep diffs focused on one coherent seam or product bug.
- Do not rename/move files casually, but do rename/move when it materially improves ownership, removes an
  obsolete public name, or completes a planned migration.
- Do not change unrelated code while “cleaning up”.
- Preserve public APIs by default. When the task explicitly asks for modernization or public API cleanup,
  redesign the API deliberately after mapping consumers and migration risk.
- Keep comments aligned with reality; remove stale comments if behavior changes.
- Do not edit generated/build/vendor outputs unless the task explicitly targets them.
- Do not change release/obfuscation behavior unless requested.
- Do not modify lockfiles or dependency versions unless the task explicitly requires it.
- Do not use destructive git commands such as `git reset --hard`, `git checkout -- .`, or mass deletion to silence problems.

---

## How to approach a task

For every non-trivial task:

1. Read the relevant docs/tests/files first.
2. State the likely root cause or change target.
3. Make the smallest correct architectural fix, or the smallest complete modernization slice when cleanup is
   the task.
4. Run the smallest meaningful verification set first.
5. Expand verification only when the change risk justifies it, the user requests it, or a release-style handoff needs it.
6. Summarize exactly what changed and why.

Do not claim success without verification evidence.

---

## Modernization / cleanup work mode

Use this mode when the user asks to remove old compatibility, fallbacks, aliases, unclear paths, stale public
API, or mixed ownership.

### Required mapping before editing

Before changing code in a modernization task, map the seam:

1. current public/import surface and all consumers
2. canonical owner and intended replacement path
3. legacy/fallback/alias entry points, including CLI/script names and generated artifacts
4. persisted-data or deployment compatibility risk
5. tests/guards that must change so the old path cannot return
6. smallest complete slice that can be verified independently

If the map shows the old path is unused or only used by stale tests, remove it and update the tests. If the map
shows a real external/deployment dependency, keep a narrow compatibility boundary with a documented removal
condition; do not scatter fallback reads through runtime code.

### Public API cleanup sequence

When a public API looks stale or too broad:

1. inventory import sites with the existing contract/audit tools and direct search
2. classify each entry as canonical public facade, private owner leaked as public, external/deployment API, or
   unused stale entry
3. introduce or confirm the canonical API with typed contracts
4. migrate internal consumers to the canonical API
5. update the public API manifest/docs/guards
6. delete the stale entry only after the contract proves no live consumer remains

Do not leave a deprecated API in the manifest just because it is harmless. Harmless stale API becomes future
confusion.

### Cleanup quality bar

A cleanup is complete only when:

- there is one canonical read/write path
- old names are removed from source, scripts, docs, and tests unless intentionally kept as an external boundary
- generated/audit report targets are regenerated when their checked-in content is part of the contract
- callers are migrated rather than routed through a new shim
- tests prove both the new behavior and the removal guard
- the final summary states any remaining compatibility boundary explicitly

---

## How to handle failing tests

When a test fails:

1. Determine whether the code is wrong, or the test is guarding outdated assumptions.
2. If the architecture intentionally changed, update the test to match the new canonical behavior.
3. Do not regress production code just to satisfy stale tests.
4. Keep guard tests meaningful; do not weaken them without a specific reason.

---

## Verification policy

Choose the narrowest useful validation first. Codex should not run every available test, gate, smoke, and release lane after each normal fix.

Default local verification is intentionally bounded:

- run the most relevant targeted behavior/guard test(s) for the touched area
- run the nearest relevant TypeScript/typecheck command when source types are touched
- run `npm run lint` when touched source files are covered by the current lint profile
- skip broad suites unless the change crosses shared architecture boundaries, the user requests them, or targeted failures point there

GitHub/CI is expected to run the broader regression matrix after handoff. If CI later reports an unrelated failure, treat that as a follow-up task instead of front-loading every lane locally.

### Typical commands

General:

- `npm run lint`
- `npm run test`
- `npm run gate`
- `npm run verify`
- `npm run typecheck:all`

Treat `npm run test`, `npm run gate`, `npm run verify`, and `npm run typecheck:all` as broad lanes, not mandatory closeout for every small or medium fix.

Targeted typecheck commands:

- `npm run typecheck:boot`
- `npm run typecheck:kernel`
- `npm run typecheck:platform`
- `npm run typecheck:builder`
- `npm run typecheck:ui`
- `npm run typecheck:data`
- `npm run typecheck:io`
- `npm run typecheck:services`
- `npm run typecheck:runtime`
- `npm run typecheck:adapters-browser`

UI/browser smoke when relevant:

- `npm run e2e:smoke`

Do not run `npm run e2e:smoke` by default. Use it only when the change touches browser boot, Playwright coverage, canvas/browser interactions, user journeys listed in `docs/e2e_smoke.md`, or when the user explicitly asks for browser smoke.

### Verification expectations by task size

Small local fix:

- run the most relevant targeted test(s)
- run the nearest relevant typecheck command
- run `npm run lint` if touched source files are linted by current profile
- do not run broad gates or E2E smoke unless the local risk requires it

Cross-layer / architectural / boot / builder / services / state seam change:

- run relevant targeted checks
- add `npm run gate` only when the touched seam is shared enough that targeted checks are not credible, or when requested/release-style

UI interaction or browser behavior change:

- run relevant tests/checks
- run the narrowest relevant browser/E2E smoke when feasible
- reserve full `npm run e2e:smoke` for broad UI/browser journey risk or explicit request

Never skip mentioning which commands were run and whether they passed or failed.

---

## Output format after completing work

Always end with:

1. changed files
2. what changed
3. why this is the right fix
4. commands run
5. exact results
6. remaining risks or follow-up suggestions

Be concrete. No vague “should be fixed”.

---

## Repo-specific preferences

- prefer canonical access seams over direct deep object access
- preserve Zustand-first architecture
- preserve Pure ESM boundaries
- preserve fail-fast behavior
- prefer updating callers over adding compatibility wrappers
- prefer decomposition of oversized hot-path files when it materially improves maintainability without changing public behavior
- keep RenderOps / builder / services boundaries clean
- keep tests authoritative, but update stale guards when the intended architecture has moved forward

---

## When unsure

If architecture intent is unclear:

- inspect `docs/dev_guide.md`
- inspect nearby guard tests in `tests/*`
- inspect the nearest canonical helper/API already used in the area
- follow existing patterns instead of inventing a new one

Match the repository’s direction.
Do not improvise a parallel architecture.
