# WardrobePro Refactor Next Phase Plan — 2026-05-03

## Summary

The repository is currently deep into the ownership-split phase. The active progress file now reaches Stage 69, including the render interior sketch external-drawers ownership split. That progress should not be rolled back.

The direction is mostly professional: tiny public facades can protect stable import paths while focused owner modules hold state, materials, geometry, lifecycle, controller logic, and policies. The risk is not the pattern itself. The risk is continuing it mechanically after the hot files are already small enough.

The next phase should add policy and guardrails around facade/public-API decisions, then rebalance toward product-risk slices rather than endless file splitting.

## Architecture decision

### Keep facade + owners where it is a real public boundary

Keep the small facade pattern for:

- builder/render public operations;
- service install surfaces;
- React hook/controller entry points;
- PDF/sketch public UI module entry points;
- cross-family imports where callers should not depend on private owner layout;
- paths that already have many existing consumers.

This keeps API churn low and lets the implementation move without shaking the whole app.

### Stop using line count as the main trigger

Do not keep splitting merely because a file is above 200 or 300 lines.

A cohesive 220-line module with one reason to change is fine. A 40-line file can still be bad if it is just one fragment of a tangled responsibility. Professional code is not “small files at any cost”; it is clear boundaries, predictable behavior, and easy review.

Practical rule:

- under 150 lines: usually do not split;
- 150–300 lines: split only for clear responsibility or side-effect seams;
- 300–500 lines: inspect seriously, but split only with behavior coverage;
- over 500 lines: likely hotspot, still split by real ownership, not by scissors;
- any size: if it owns public API, preserve or redesign that API deliberately.

### Do not make facade the default religion

For one-caller internal code, direct owner imports are often better. For a wrong public API, design a new API and migrate to it deliberately. A facade should be a boundary, not a costume.

### Do not break external API as the first move

Breaking imports can be correct only after inventory, migration, and guardrails. The professional rule is “stable outside, clean inside” unless the outside contract itself is proven wrong.

## What looks good in the current repository

- The active progress marker already identifies Stage 43–69 as ownership splits and points to `verify:refactor-modernization`, `check:refactor-guardrails`, and `test:refactor-stage-guards` as the main lanes.
- The stage catalog centralizes completed stage labels and integration anchors.
- Recent facades are genuinely tiny public entry points rather than logic warehouses.
- Recent ownership guard tests verify that facades stay tiny and that consumers keep using the public facade instead of private owners.

## What should be improved

### 1. Add facade/API boundary policy

Add `docs/FACADE_AND_PUBLIC_API_POLICY.md` and link it from `docs/QUALITY_GUARDRAILS.md`.

This tells future work when to keep a facade, when to avoid one, when to stop splitting, and when a public API redesign is justified.

### 2. Strengthen guard tests beyond regex

The Stage 43–69 ownership guards are useful, but many are mainly file-shape checks. The next phase should add behavior tests for the public operations exposed by recent facades.

Examples:

- factory returns the same public method names after split;
- cleanup/settle/report callbacks still fire;
- public facade and internal owner do not diverge in critical branches;
- runtime tests cover a realistic user path for the split module.

### 3. Add private-owner import boundary audit

Add a future tool that rejects cross-family imports of private owner modules such as `*_state`, `*_materials`, `*_apply`, `*_controller_state`, etc., unless the module is explicitly marked public.

The current tests often check one consumer file. A graph audit is stronger.

### 4. Upgrade stage catalog metadata

The catalog currently proves that Stage 0..69 labels exist. That is useful, but high-number stages should eventually have explicit metadata:

```ts
{
  id: 69,
  slug: 'render-interior-sketch-external-drawers-ownership',
  publicFacade: 'esm/native/builder/render_interior_sketch_external_drawers.ts',
  guard: 'tests/refactor_stage69_render_interior_sketch_external_drawers_ownership_guard.test.js',
  verificationLane: 'test:refactor-stage-guards',
}
```

This makes the audit less dependent on prose and easier to extend.

### 5. Re-balance the next product work

After the policy closeout, do not continue only with file splits. Move back to product-risk slices:

1. Cloud Sync real browser/offline/reconnect behavior.
2. Canvas hover/click/commit parity in browser flows.
3. Project import/load migration fixtures from real saved payloads.
4. CSS cascade/design-system cleanup with visual or component-level protection.
5. Type-hardening around remaining broad surfaces and `unknown`/cast-heavy adapters.
6. Public API/import-boundary audit.

## Proposed next stages

### Stage 70 — Facade/API policy closeout

Files:

- `docs/FACADE_AND_PUBLIC_API_POLICY.md`
- `docs/QUALITY_GUARDRAILS.md`
- `README_UPDATED_PLAN_FILES.md`
- `refactor_workmap_next_phase_2026-05-03.md`

Goal:

- Decide officially that facades are kept only as real public boundaries.
- Define when external API may be changed.
- Define when to stop splitting small/cohesive modules.
- Require behavior guard coverage for risky ownership splits.

No production code changes.

### Stage 71 — Public/private owner import boundary audit

Goal:

- Add a tool that detects private owner imports from outside the owning family.
- Mark deliberate public owner modules explicitly.
- Keep cross-family consumers on public facades.

Expected code files in a future PR:

- `tools/wp_facade_import_boundary_audit.mjs`
- package script such as `check:facade-boundaries`
- one runtime test for the audit tool.

### Stage 72 — Recent facade behavior coverage

Goal:

- Select the latest 5–8 facade splits and add behavior tests where current coverage is mostly regex/file-shape.
- Prefer high-risk owners: render preview, PDF sketch runtime, Cloud Sync, Canvas.

### Stage 73 — Product-risk slice

Pick one:

- Cloud Sync reconnect/offline browser flow;
- Canvas commit parity e2e flow;
- Project migration fixture closeout;
- CSS cascade ratchet.

Do not pick “another random hot file” unless product-risk lanes are already green.

## Bug and risk checklist for the next audit

Run or add checks for:

- cross-family imports of private owner modules;
- circular imports introduced by splits;
- facades that gained logic after being split;
- guard tests that only assert implementation text and no behavior;
- fallback/legacy inventory drift;
- `as any` / broad casts in production source;
- swallowed errors that report nonfatal but skip settle/cleanup;
- duplicate timers or unclosed listeners in React hooks and service lifecycles;
- CSS cascade regressions from oversized selectors, `!important`, z-index, and transition rules;
- stale docs that describe old stage counts or obsolete next steps.

## Verification lanes after applying only plan files

Because these files are documentation/policy-only, the expected check set is:

```bash
npm run check:docs-control-plane
npm run verify:refactor-modernization
```

After a future code PR for the audit tool, add:

```bash
npm run check:facade-boundaries
npm run test:refactor-stage-guards
npm run check:refactor-guardrails
```

## Actual progress update — 2026-05-03

The proposed next-stage numbering in this planning note was overtaken by the later Builder ownership work. The actual completed baseline is now **Stage 71**:

- Stage 70 completed the public-facade split for `render_interior_sketch_ops.ts`.
- Stage 71 completed the public-facade split for `render_interior_sketch_boxes_shell.ts`.

The next recommended technical stages are still aligned with the policy direction here, but should be renumbered from the current baseline:

1. Stage 72 — split or harden the next remaining Builder hotspot, preferably `render_interior_sketch_boxes_fronts_drawers.ts` or `render_interior_sketch_boxes_fronts_doors.ts`, with a new ownership guard.
2. Stage 73 — add a public/private owner import-boundary audit so private owner modules cannot leak across families.
3. Stage 74 — add behavior tests around the most recent render/sketch facade splits, beyond regex ownership guards.
