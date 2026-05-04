# Refactor Next-Stage Plan

Date: 2026-05-03  
Baseline: Stage 80 complete; measurement/performance closeout completed after the Stage 74 planning gate.  
Purpose: keep the remaining modernization work professional, useful, and bounded. This document is intentionally not a wish list of large files. It is the decision gate for deciding whether the next stage should split code, improve tests, harden contracts, or stop.

## Repository alignment update

The former root `new refactor_workmap` draft was reviewed against the live codebase on 2026-05-03. Its useful decisions have now been consolidated into this plan, `refactor_workmap.md`, `docs/REFACTOR_WORKMAP_PROGRESS.md`, and `docs/QUALITY_GUARDRAILS.md`. The old draft and dated workmap handoff files are no longer active source of truth.

Two assumptions in the older draft are now stale:

- `node tools/wp_cycles.js esm --json` reports 0 cycle groups across 2491 files and 7558 edges.
- `node tools/wp_cycles.js types --json` reports 0 cycle groups across 72 files and 174 edges.

So import-cycle work is now a guardrail, not an immediate decomposition target. The active lane wires `npm run check:import-cycles` into `check:refactor-guardrails` and `verify:refactor-modernization` so future Order PDF, export, React overlay, or type changes cannot reintroduce cycles silently.

The same baseline check confirmed that `check:legacy-fallbacks`, `check:refactor-closeout`, and `check:docs-control-plane` pass. Future work should therefore start from measured product risk, behavior coverage, or a newly proven ownership seam, not from the older draft's cycle-removal phase.

## Post-Stage-80 boundary hardening

The first post-closeout hardening slice is complete: `npm run check:private-owner-imports` now protects the recent facade/owner splits with a single import-boundary audit instead of isolated regex checks only.

The audit covers six high-risk public facade families:

- Builder sketch-box door visuals.
- Builder drawer shared render contracts.
- UI sketch-box controls runtime.
- Runtime `ui.raw` selectors.
- Runtime selector facades.
- Order PDF export commands.

Each registered private owner may be imported by its public facade and sibling owners in the same family. Cross-family consumers must import the public facade. This keeps the Stage 75-79 split work stable without creating Stage 81 or splitting more code.

## Control-plane metadata closeout

The stage catalog now carries explicit metadata for completed Stages 74-80:

- stage id and label;
- stable slug;
- stage kind;
- public facade or primary surface;
- guard file;
- verification lane;
- completion status.

The catalog also records post-closeout guardrails such as `check:import-cycles` and `check:private-owner-imports`. `check:refactor-integration` validates that this metadata matches package scripts and guard files. This keeps future work honest: a stage is not just a number in prose, it has an owner, a guard, and a lane.

## Project import fixture hardening

The next product-risk hardening slice is complete: `npm run check:project-import-fixtures` now runs real JSON project fixtures through schema normalization, UI snapshot construction, canonical `ui.raw` migration, and canonical config snapshot materialization.

The fixtures cover two important import cases:

- an enveloped legacy project loaded from JSON text with numeric strings, split-door maps, removed-door maps, saved colors, notes, stack-split settings, and persisted config branches;
- a minimal project envelope with empty replace-owned branches so project load proves those branches are explicit clears instead of accidental stale-state merges.

This keeps project compatibility at the project ingress layer and gives future import work behavior coverage without adding runtime fallback paths.

## CSS cascade ratchet hardening

The CSS cascade hardening slice is complete: `npm run check:css-style` now reads explicit limits from `tools/wp_css_style_budget.json` instead of embedding budget numbers inside the audit script.

The current ratchet covers:

- `!important` count;
- `transition: all` count;
- ad hoc `z-index` declarations;
- one-off `box-shadow` declarations.

Future CSS work should lower these budgets after cleanup. Increasing a budget is allowed only when a deliberate product/design decision accepts the extra cascade debt.

## Cloud Sync offline/reconnect behavior hardening

The Cloud Sync offline/reconnect hardening slice is complete: `npm run check:cloud-sync-offline-reconnect` now guards browser attention behavior for reconnect paths.

The guard proves two product-risk cases:

- visible offline attention attempts stay quiet and do not consume reconnect eligibility;
- a reconnect while the tab is hidden stays parked until the document becomes visible, then pulls through the canonical `attention:visibility` path.

This keeps offline/hidden behavior inside the lifecycle refresh policy instead of adding browser-binding fallbacks or duplicate state paths.

The browser smoke follow-up is also complete: `npm run e2e:cloud-sync-reconnect` runs a focused Playwright flow that moves the browser offline and back online, verifies the Cloud Sync panel stays stable, and proves a real sketch sync action remains usable after reconnect.

## Performance measurement refresh

The post-closeout measurement slice was refreshed on 2026-05-04. `npm run perf:smoke` passes under the stored budget when run as the foreground perf lane, and `npm run perf:browser` passes while refreshing `docs/BROWSER_PERF_AND_E2E_BASELINE.md`.

No code change was made from these measurements because the enforced budgets passed. Future performance work should start only from a measured regression or an accepted product decision to improve one of the reported hotspot candidates.

## Workmap file cleanup

The dated root workmaps and the root `new refactor_workmap` draft were removed after consolidation. The repository now keeps one short root pointer plus the canonical docs above, so future work does not need to choose between competing historical plans.

## Stage 74 decision

Stage 74 is a planning and control-plane stage, not another automatic file split.

The codebase has already completed many ownership splits. At this point, continuing by line count alone would make the project worse: more files, more imports, and more guard noise without better ownership. Future stages must prove that they remove a real ownership mix or improve a guard that protects behavior.

## Professional split gate

A future split is allowed only when all of these are true:

1. The source mixes at least two real responsibilities such as input normalization, geometry planning, material resolution, scene mutation, event registration, persistence, or UI rendering.
2. The public consumer contract can remain stable through a small facade or an already-canonical public module.
3. A guard can prove the new ownership boundary using concrete source anchors, not only a line-count limit.
4. The validation path is clear before touching the code: typecheck scope, affected tests, and at least one regression guard.
5. The split reduces future change risk. It should make the next bug fix easier, not merely move code into more files.

## Do not split when

Do not create a stage when the only reason is that a file is long; line count alone is not a reason to split. Do not split data tables, simple declarative mappings, or cohesive rendering procedures that already have one reason to change. Do not split if the result would introduce circular ownership, private-module imports from unrelated consumers, or tests that only check implementation trivia.

## Current state after Stage 73

The recent Builder sketch/render ownership work is coherent:

- preview sketch placement is behind a public facade;
- interior sketch orchestration is behind a public facade;
- external drawers, sketch-box shell, external drawer fronts, static contents, and sketch-box door visual routes each have focused owners;
- stage guards now protect the facades, route/material/core visual seams, drawer shared contract seams, and private-owner boundaries;
- the next work should be selected by coupling and responsibility mix, not by size.

## Next qualified implementation stages

These are the next useful candidates, ordered by expected value and risk control. Stages 75 through 80 are complete; further refactor work should stop unless a new bug, feature, or measured performance issue proves a fresh ownership seam.

### Stage 75 — Sketch box fronts/doors ownership review — completed

Completed area: `esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts`.

Outcome: the review did not split all fronts files. It split only the proven mixed seam: material/mirror resolution, special/styled/slab route policy, and core visual scene mutation now live in focused `render_interior_sketch_boxes_fronts_door_visual_*` owners while the public door visual module remains the orchestration seam used by door consumers.

Validation focus retained: front visual route guards, sketch box hover/manual dimension guards, mirror/glass route guards, and builder typecheck.

### Stage 76 — Drawer/shared render contract review — completed

Completed area: `esm/native/builder/render_drawer_ops_shared.ts`.

Outcome: the review did not split external/internal drawer scene mutation again. It split only the shared seam that had proven mixed ownership: contracts now live in `render_drawer_ops_shared_types.ts`, runtime guards/numeric readers in `render_drawer_ops_shared_guards.ts`, argument/callback adapters in `render_drawer_ops_shared_readers.ts`, drawer-op parsing in `render_drawer_ops_shared_ops.ts`, and mirror/glass/curtain state policy in `render_drawer_ops_shared_visual_state.ts`. The public `render_drawer_ops_shared.ts` module remains the stable facade used by drawer render consumers.

Validation focus retained: drawer render guards, external drawer visual route guards, motion-entry tests, and builder typecheck.

### Stage 77 — UI sketch-box controls controller/view review — completed

Completed area: `esm/native/ui/react/tabs/interior_layout_sketch_box_controls_*.ts(x)`.

Outcome: the review did not move JSX fragments around for line-count reasons. It split only the proven mixed runtime/control seam: the public `interior_layout_sketch_box_controls_runtime.ts` module now remains a stable facade, while shared types, sync helpers, dimension draft commits, panel/tool toggles, base/leg controls, and cornice selection live in focused runtime owners. View-state derivation moved to `interior_layout_sketch_box_controls_state.ts`, and declarative option data moved to `interior_layout_sketch_box_controls_options.ts`, leaving the section component focused on rendering and public runtime calls.

Validation focus retained: UI action surface/source guards, option button/design-system guards, sketch-box UI regression guards, and targeted TypeScript checks for the changed UI owners.

### Stage 78 — Runtime access surfaces closeout review — completed

Completed area: `esm/native/runtime/ui_raw_selectors.ts`, `runtime_selectors.ts`, and focused selector owner modules.

Outcome: the review did not create access wrappers for their own sake. It split two proven mixed seams while preserving the public facades: tolerant ui.raw snapshot fallback now lives in `ui_raw_selectors_snapshot.ts`, canonical raw-only fail-fast policy in `ui_raw_selectors_canonical.ts`, ui.raw store adapters in `ui_raw_selectors_store.ts`, and shared scalar parsing in `ui_raw_selectors_shared.ts`. Runtime selector defaults/snapshot access/store access were similarly separated across `runtime_selectors_shared.ts`, `runtime_selectors_normalizers.ts`, `runtime_selectors_snapshot.ts`, and `runtime_selectors_store.ts`. The canonical-vs-legacy boundary is now visible and guarded.

Validation focus retained: runtime selector policy, project migration boundary, runtime selector normalization tests, type-hardening, and public API contract tests.

### Stage 79 — Order PDF export/editor flow review — completed

Completed area: `esm/native/ui/react/pdf/order_pdf_overlay_export_commands.ts`.

Outcome: the review did not split the whole PDF editor or move UI callbacks around. It split only the proven async command seam: the public `order_pdf_overlay_export_commands.ts` module now remains a stable facade, while command contracts live in `order_pdf_overlay_export_commands_types.ts`, error result shaping in `order_pdf_overlay_export_commands_errors.ts`, imported-PDF load lifecycle in `order_pdf_overlay_export_commands_load_pdf.ts`, browser download commands in `order_pdf_overlay_export_commands_downloads.ts`, Gmail command execution in `order_pdf_overlay_export_commands_gmail.ts`, and pdf.js loader command wiring in `order_pdf_overlay_export_commands_pdfjs.ts`. React action callbacks continue to consume only the public command facade.

Validation focus retained: export command runtime tests, export overlay tests, command owner guard, docs-control-plane, refactor integration, and stage guards.

### Stage 80 — Measurement and performance guard closeout — completed

Completed area: perf/runtime measurement docs, hotpath guard wiring, smoke baseline ownership, and refactor stop conditions.

Outcome: this was deliberately not another source split. The closeout keeps `check:perf-hotpaths`, `perf:smoke`, `perf:browser`, `docs/PERF_AND_STABILITY_BASELINE.md`, and `docs/BROWSER_PERF_AND_E2E_BASELINE.md` as the active measurement surface. It also adds a Stage 80 guard so the completed refactor catalog, docs-control-plane, perf scripts, and stop policy stay synchronized.

Validation focus retained: `check:perf-hotpaths`, `check:refactor-closeout`, smoke/baseline script wiring, documented baseline targets, refactor integration, docs-control-plane, and stage guards.

## Refactor closeout after Stage 80

Stage 80 closes the current modernization/refactor track. The next professional move is not Stage 81 by default. Future work should be triaged as one of these:

1. **Bug fix** — reproduce the user-visible defect, fix the canonical owner, and add a behavior regression test.
2. **Measured performance work** — run or update the relevant perf smoke/baseline, then change the owner responsible for the measured regression.
3. **Feature work** — design the public API/state contract first, then implement the narrowest owner change.
4. **New refactor stage** — allowed only if it passes the professional split gate again with a concrete ownership seam and behavior validation.

Do not create Stage 81 just to continue the numbering. If no fresh ownership seam is proven, the refactor track is done.

## Validation matrix for every future stage

| Stage type                   | Required validation                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Builder render split         | `typecheck:builder`, relevant render/visual guards, new ownership guard             |
| Runtime/API hardening        | runtime selector/API tests, migration boundary guard, type-hardening audit          |
| Project import/load ingress  | `check:project-import-fixtures`, project migration boundary, runtime selector guard |
| CSS cascade cleanup          | `check:css-style`, `report:css-style`, budget decrease when counts improve          |
| Cloud Sync reconnect         | `check:cloud-sync-offline-reconnect`, `e2e:cloud-sync-reconnect`, race/timer guards |
| React UI split               | targeted UI tests, design-system/option-button guards, lint on changed files        |
| Order PDF split              | targeted PDF/editor guards, text-layer/sketch-preview guards, lint on changed files |
| Planning/control-plane stage | docs-control-plane audit, refactor integration audit, stage guard suite             |
| Refactor baseline audit      | `check:import-cycles`, `check:legacy-fallbacks`, `check:refactor-closeout`          |
| Facade/import-boundary guard | `check:private-owner-imports`, `check:refactor-integration`                         |

## Stop conditions

Stop creating refactor stages when the remaining candidates do not meet the professional split gate. At that point, the remaining work should become feature work, bug fixes, performance measurement, or test coverage improvements. A clean codebase is not one with the most files; it is one where each file has a clear reason to exist.
