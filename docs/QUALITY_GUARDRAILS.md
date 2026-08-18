# Quality guardrails

This file keeps the active engineering policies in one place. Historical stage notes and one-off audit dumps should not be re-added to `docs/`.

## Core source rules

- `esm/` stays Pure ESM: no `window.App`, `globalThis.App`, `window.THREE`, or `globalThis.THREE` probing in source layers.
- Browser/DOM access belongs at entry/adapters/UI boundaries, not in kernel, builder, or domain code.
- Missing required state/dependencies should fail with clear errors instead of silent legacy fallback chains.
- Store state is the source of truth; do not rebuild behavior from DOM snapshots or shadow bags.
- New modules must not perform work on import. Expose explicit install/setup functions.
- Production TypeScript should avoid `as any`; prefer concrete types, `unknown` plus narrowing, and narrow local casts only when unavoidable.

## ESNext runtime target

- Browser development and production bundles intentionally target `ESNext`; no legacy-browser transpilation target should be introduced.
- `tsconfig.json` owns TypeScript language/type availability through `target`, `module`, and `lib`, all set to `ESNext`. Vite still needs its own explicit target because it does not use TypeScript's `target` as the bundle target.
- `tools/wp_esnext_target_policy.mjs` is the canonical Vite/Oxc target owner. Vite development, ordinary Vite builds, the release bundle, and the Three.js vendor bundle must consume that policy.
- ESNext syntax/API adoption must stay runtime-aware: browser-owned code may use APIs guaranteed by the supported current browsers, while Node-executed tools/tests must run on both the Node 22 compatibility floor declared by `.node-version-compat` and the primary Node 24 line declared by `.node-version`. `engines` and `devEngines` encode both ranges. The Node 22 floor permits `Promise.withResolvers`, `Map.groupBy`, and the standard Set methods; APIs unavailable at that floor, including `Promise.try` and `RegExp.escape`, must not be used in Node-executed paths.
- Prefer modern APIs when they remove real state, mutation, or compatibility code; do not churn stable loops merely to use newer syntax.

Relevant check:

```bash
npm run check:esnext-target
```

## Public facades and external API boundaries

Use `docs/FACADE_AND_PUBLIC_API_POLICY.md` as the active decision policy for split modules.

- WardrobePro is a private application. Source paths are internal unless an explicit machine-readable manifest promotes them; absence from a manifest means unsupported.
- `tools/wp_public_surface_policy.json` owns supported and retired source-path policy. Retired paths must remain absent across static, dynamic, alias, extensionless, and directory-index import forms.
- The supported dimension API is the exact 53-route Runtime/Services inventory. Outside focused owners, direct dimension re-exports must be exact Runtime-manifest entries; wildcard barrels, aliases, unlisted routes, and parallel re-export surfaces are forbidden. The 15 facade-owned aggregate identities remain retired, while narrow owner-specific internal compositions are allowed.
- A facade is correct when it protects a deliberate public import boundary, a service/family entry point, a browser/adapter boundary, or a widely used stable seam.
- A facade is not correct when it exists only to hide arbitrary fragmentation, preserve a bad name forever, or bypass a public API contract.
- Do not keep splitting by line count alone. A cohesive 150–300 line owner is usually better than several tiny files that scatter one responsibility across the project.
- Split when there are real separate responsibilities, high volatility, lifecycle/side-effect seams, behavior-test seams, or an import boundary worth protecting.
- External API changes must be deliberate: inventory current consumers, introduce the canonical API, migrate internal imports, keep a compatibility shim only when it has an owner and removal criteria, and then remove the old entry after guards prove it is unused.
- Tiny facades should stay tiny. They may re-export, compose a stable factory/hook, or normalize a narrow public contract; they must not regain business logic, hidden state, timers, DOM access, storage access, or fallback chains.
- Private owner modules should be imported only by their facade or by sibling owners inside the same implementation family. Cross-family consumers should use the public facade unless the policy explicitly marks a lower-level owner as public.
- `tools/wp_contract_registry.mjs` is the canonical registry for architecture contracts and private-owner families. Add the owner, scope, package lane, behavior evidence, and facade justification there instead of creating a numbered stage proof.
- `check:private-owner-imports` is the data-driven cross-family guard. Deliberate facade families and public/boot entries require an explicit justification; the remaining reviewed single-consumer identity wrappers are listed with their exact importer in `tools/wp_identity_facade_inventory.json`. New wrappers, stale entries, and importer drift fail with readable path-level diagnostics rather than an opaque topology hash.
- Ownership guard tests are useful, but they are not enough by themselves. Every risky split should also keep behavior/runtime coverage for the public operation that the facade exposes.
- Historical stage proofs must not be retained after the current invariant has a canonical owner. Capability-named behavior tests and registered architecture contracts are the durable control plane.
- Viewer Measurement is capability-isolated at both geometry and orchestration boundaries. Resolution cores receive `ViewerMeasurementGeometryRuntime` for camera, grid-map, local-box measurement, and world-to-local projection. The public `viewer_measurement_tool.ts` facade may accept `AppContainer` only to construct `ViewerMeasurementFeatureRuntime`; `viewer_measurement_tool_flow.ts` consumes grouped state/render/UI/diagnostic capabilities and must not import runtime accessors or mention `AppContainer`. `viewer_measurement_tool_runtime.ts` is the sole feature adapter allowed to translate those capabilities to application/runtime services. Runtime tests execute the flow with injected capabilities and no application object; `lint-architecture/capability-boundary:viewer-measurement-*` guards the boundary.
- Planar Reflector lifecycle ownership is explicit: `planar_reflector_state.ts` owns canonical reflector metadata/state reads, `planar_reflector_warm_cache.ts` owns warm target reuse/disposal, and `planar_reflector_refresh_runtime.ts` owns progressive refresh/retry/backoff plus render-pass attempts. `planar_reflector_runtime.ts` remains installation/material/cube-fallback ownership and must not directly reclaim render-pass scheduling or warm-cache/backoff state. `lint-architecture/planar-reflector:lifecycle-ownership` guards this boundary.
- Geometry descriptor families promoted to Build IR must have one producer/consumer type contract, stable semantic discriminants, finite/positive numeric invariants, and a runtime matrix for the feature's high-risk combinations before Three.js emission. The main carcass uses this boundary for cornice and shell geometry: `carcass_cornice_ir.ts` owns cornice segments and `carcass_shell_ir.ts` owns shell boards/back panels across normal, stepped, removed-side, and stack-split-prefixed identities. The corner family now follows the same rule end-to-end: `corner_cornice_ir.ts` owns `profile`/`wave`/`box` operations, wing/connector planners compute deterministic plans, and `corner_cornice_render.ts` is the single Three.js emission boundary. Renderer-side duplicate guards, profile/runtime readers, and generic `MutableRecord`/`UnknownRecord` field rediscovery are not part of these boundaries. `lint-architecture/typed-ir:carcass-shell` and `lint-architecture/typed-ir:corner-cornice` prevent those producer/render seams from drifting back to the old dynamic-record pattern.
- Reusable Canvas part-hover previews must cross the typed `PartHoverPreviewCommand` boundary instead of passing ad-hoc `UnknownRecord` payloads through picking clients. The protocol owns `box`/`object_boxes`, add/remove intent, finite/positive geometry validation, and explicit cleanup scope; the runtime adapter alone may probe `setSketchPlacementPreview` or attach `App`/`THREE`. Generic paint hover, removable-part hover, and Cell Dimensions hover are migrated. Do not widen this envelope with drawer-motion or manual-layout-specific fields merely to reduce file count; specialized families keep their own contracts until an active change proves a narrower shared seam. `lint-architecture/preview-protocol:part-hover` guards the migrated clients.

Relevant checks:

```bash
npm run check:import-cycles
npm run check:contract-registry
npm run check:private-owner-imports
npm run check:docs-control-plane
npm run verify:refactor-modernization
npm run check:refactor-guardrails
```

## Declarative architecture contracts

- Architecture contracts should describe semantic invariants, not preserve implementation formatting. Prefer declarative manifests plus AST-derived imports/exports/provenance and focused behavior tests over source-text regexes, exact statement ordering, literal counts, or function/body hashes.
- Source-shape or hash checks require a documented reason that the invariant cannot be expressed structurally or behaviorally. Do not retain a hash merely because it existed in an earlier refactor proof.
- Identity-only composition owners are compared by exported symbol provenance. Reordering or regrouping equivalent `export { ... } from ...` statements is allowed; aliases, copied values, added logic, wrong provenance, or consumer bypasses are not.
- Reusable contract engines must have mutation tests proving both sides of the boundary: harmless representation changes still pass, while ownership and behavior drift still fail.
- The identity-composition manifest now covers twelve Dimension Composition owners. Core Carcass and Chest Mode Inputs use the same canonical contract instead of retaining duplicate source-shape ownership tests, while Render Loop Door Motion and Runtime Default State now join the manifest through exact export provenance, focused-consumer routing, alias rejection, and owner-bypass detection. One canonical contract-engine test plus the runtime-identity matrix protects the family.
- The static-policy manifest now covers five policies: Structure Tab auto-width, Platform startup defaults, Preset Models defaults, Wardrobe Sanitization, and the literal-only Wardrobe Module Layout policy. Literal-only frozen policies may declare an empty source list; exact projection shape, consumer inventory, and member-only usage remain structural invariants.
- Five redundant source-shape ownership files were removed in this consolidation: Core Carcass Shared, Chest Mode Inputs, Render Loop Door Motion, Runtime Default State, and Core Module Layout. Their formula/state/motion/layout semantics remain covered by focused runtime behavior matrices rather than regexes over implementation statements.

Focused checks:

```bash
node --test tests/wp_declarative_contract_engine_runtime.test.js
node --test tests/wardrobe_default_resolution_owner_contract.test.js
npm run test:offline:dimension-composition-runtime
```

## Control-plane reports, scripts, and site profiles

- Checked-in audit reports must represent current repository state. `tools/wp_generated_report_contract.mjs` catalogs both source-derived audit pairs and the separate final-verification release evidence pair.
- `npm run check:generated-reports` and `npm run report:generated` operate only on source-derived reports that can be reproduced deterministically from the repository. `FINAL_VERIFICATION_SUMMARY.*` is intentionally excluded from that default set because it is stateful release evidence, not a source generator output.
- Validate release evidence explicitly with `npm run check:verification-summary`. Its JSON is the source of truth, its Markdown is derived from that JSON, and validation fails when its schema, source-tree digest, lane-catalog digest, per-lane digest, selection, summary, or final status is stale. Focused profiles may pass independently but cannot write this pair; final-report eligibility requires every default closeout lane to complete with a clean `passed` status.
- A closeout state file may be resumed only against the exact source and lane catalog that created it. After source or control-plane changes, reset the state instead of merging old results into a new run.
- Report comparison is semantic: volatile `generatedAt` lines/fields are ignored, while changed counts, inventories, policies, source identities, or violations fail the check.
- Named test groups and aggregate suite composition belong in `tools/wp_test_group_catalog.mjs`. `package.json` exposes one generic `test:group` runner instead of mirroring every group as a package-script facade. A direct `test:*` package command may name at most four test files; larger lanes must declare owners, runner, portfolio role, serial policy, and membership in the catalog. Execution environment is implied by the canonical runner and is not duplicated as separate catalog metadata. Aggregate suites use `group-sequence` and reference child groups rather than copying their file inventories.
- A closeout lane that exactly matches a canonical test group must reference that group through `testGroupId`; duplicating the same file list directly is a control-plane error. Build, perf, mixed-contract, and E2E lanes remain direct when they are not test groups.
- Exact duplicate package commands are not allowed. Do not preserve aliases such as a second “strict” name when both names execute the same lane.
- Every `sites/*/site.profile.mjs` participates in one cross-profile contract. Store ids, local-storage namespaces, signed-room gateway configuration, realtime channel prefixes, required assets, release status, and deployment URLs must be validated together. Browser profiles must not select database tables.
- `sites/bargig/site.profile.mjs` is the sole source of Bargig runtime values. The root `wp_runtime_config.mjs` is generated, and dev/build/release entrypoints fail when it is stale.
- Draft profiles may retain placeholder deployment hosts with visible warnings. Active profiles may not.

Relevant checks:

```bash
npm run check:docs-control-plane
npm run check:generated-reports
npm run check:verification-summary
npm run verify:closeout -- --profile control-plane
npm run verify:closeout:release
npm run report:generated
npm run check:script-duplicates
npm run check:site-profiles
npm run check:test-portfolio
```

## Measurement and modernization closeout

- The numbered refactor track is closed. New guards are named by capability and registered by current invariant, never by continuing the stage sequence.
- Refactor completion is not proven by smaller files. It is proven by stable public seams, behavior tests, hotpath guards, and practical smoke baselines.
- Keep `check:perf-hotpaths` as the fast source-level performance gate for render/scheduler hotpaths.
- Use `perf:smoke`, `perf:browser`, and `perf:browser:release` for measured runtime/browser baselines when dependencies and a browser environment are available; update baselines only after a deliberate product/performance decision.
- Browser performance schema 23 binds every generated regression baseline to one complete measurement profile and tracks CLS, LCP, Long Task count/total/p95, render-settle, and INP. Repeated-action drift is enforced only for clean, comparable sequences and only when the late-half code-execution increase is at least 20ms; mixed recovery outcomes are covered by their outcome/transition/recovery contracts, while sub-20ms timer noise remains visible in reports without becoming a percentage-only gate. Runtime spans dominated by explicit interaction wait remain visible but are not duplicated in the internal runtime-UX budget: full customer-journey budgets and app-owned code-execution budgets remain blocking. Small store/recovery duration overruns also require at least 20ms of material excess. INP is collected from Event Timing entries grouped by `interactionId`, estimated as the p98 interaction, and falls back to `first-input` when no interaction id is available. The dev regression profile has a 500ms INP ceiling to absorb dev-server scheduling variance; the fixed product target remains 200ms and the release regression floor remains 200ms. Browser evidence requires usable CLS, LCP, and INP measurement semantics: zero CLS is valid only when the layout-shift observer capability is present, LCP requires at least one observed entry, and INP requires a usable interaction. Missing evidence is `unmeasured`, never a zero-duration pass.
- `perf:browser` owns Vite-dev regression detection. `perf:browser:release` owns release UX truth: the canonical release packager emits a minified, content-hashed artifact in `perf` observability mode, the static server serves that folder, and the runner verifies the served build id and bundle digest before measuring it. Dev and release baselines are separate and profile mismatches fail; neither baseline regeneration can alter the fixed advisory product UX targets.
- A quantitative browser budget breach is release-blocking only when one clean confirmation run reproduces it. The confirmation is limited to numeric `exceeded budget` candidates; browser/page errors, missing evidence, profile/schema mismatches, behavioral coverage failures, and other contract failures fail immediately without retry.
- The default final closeout includes both `browser-perf` and `browser-perf-release`. A focused code/contract profile may pass without browser dependencies, but `FINAL_VERIFICATION_SUMMARY.*` cannot be written as a clean final pass until browser preflight, E2E smoke, dev-regression performance evidence, and release-UX performance evidence all complete. Use `verify:closeout:browser-evidence` for that focused evidence bundle.
- Run `perf:smoke` as the foreground perf lane when enforcing total-runtime budgets; concurrent browser perf work can add machine noise to the aggregate time while individual script timings remain healthy.
- If a future performance issue appears, start from measured regressions and the owning surface, not from broad file decomposition.

Relevant checks:

```bash
npm run check:perf-hotpaths
npm run perf:smoke
npm run perf:browser
npm run perf:browser:release
```

## Functional error observability

- A functional operation may remain fail-soft, but it must not fail silently. Report nonfatal failures through the canonical runtime error surface with a stable `where` and `op` identity.
- Empty catches are allowed only for reviewed cleanup, defensive browser fallbacks, or diagnostics that cannot affect business state. Do not use an empty catch around history writes, build requests, command installation, persistence, or state mutation.
- `check:silent-catches` parses production sources with Oxc and owns three exact current-state ratchets by layer: all statement-free catches (including documented best-effort blocks), bare catches with no statement or explanation, and vague comments whose body is only `// ignore` or `// swallow`. The exact mutable inventory is generated in `docs/MODERNIZATION_STATE.md`; the policy invariant remains **0 bare catches and 0 vague catch comments across all production layers**. All production layers now have zero vague catch comments: reviewed fallbacks in those layers carry capability-specific rationale, while functional Canvas mode-reset/door-refresh failures and Builder bootstrap convergence publish diagnostics instead of disappearing. Kernel History/Meta follow-through, preset-model boot installation, lifecycle recovery, Sketch Mode commits, runtime Door commands, Autosave schedule/cancel/flush access, render-state/surface writes, Viewer Resize apply/scheduling, Lifecycle DOM event dispatch, Accessibility shortcuts, and Interior/Handle UI actions are now observable rather than silently dropping required follow-through or publishing false-success state. The UI closeout also routes Notes persistence/draw hooks, Room mutations, structural recompute, Interior drawer bootstrap, Settings global-click synchronization, Sidebar state clamps, Multicolor actions, and mode-controller apply/cleanup failures through explicit UI diagnostics while leaving event suppression, DOM mirroring, browser probes, timer cleanup, prefetch, and reporter isolation as precisely classified best-effort fallbacks. Any increase fails immediately; any reduction must update the exact ratchet in the same change so that removed debt cannot return. Runtime Boot/Internal/Doors/Cache access and required Platform Tools installation are now observable or fail closed where appropriate; reviewed browser, DOM, timer, subscription, cache-metadata, debug, and disposal fallbacks use explicit capability-specific classifications. Functional owners that have completed observability migration are separately locked to zero statement-free catches.
- Protected functional owners now include boot finalizers, the boot-seed colors/flags/runtime pipeline, the complete history runtime/schedule/shared family, the Autosave runtime/schedule/shared/snapshot family, the camera access/motion/runtime/shared family, the Config Compounds install/seed/read/write family, the Saved Models clone/normalization/persistence/transaction/listener/PDF seam, the complete Edit State reset/synchronization path including the dimension runtime coalescer and React mode-action entry, the Cloud Sync conflict-store, main-row pull/adoption, install-lifecycle, and status-publication owners, and the commit-critical history-touch, platform render-scheduler, Canvas paint-commit, and Canvas structural-authoring owners. Config Compounds must not mark boot state seeded until both compound writes are visible in one concrete config snapshot, must clear every completed in-flight attempt so a later call can retry, and must report rejected writes, exhausted retries, timer failures, and failed verification nonfatally. Saved Models must read one canonical envelope per load, recompute repairs under the collection lock, batch related repairs into one transaction, keep runtime state unchanged after a failed durable write, publish independently detached listener and runtime-mirror snapshots, and report mirror or PDF-state failures nonfatally. Edit State reset must preserve independent cleanup after a rejected owner while exposing a real success result to project/kernel/UI callers; rejected React or native UI transitions must stop before door, chrome, and transition-callback side effects; dimension synchronization must commit builder and runtime mirrors together, roll the builder mirror back after a rejected runtime write, and fall through to an immediate commit when scheduling is unavailable. Cloud Sync scheduled pulls must retain coalescing while reporting timer and execution failures, remote adoption must schedule the correct recovery after rejected commits, conflict resolution must retain the active conflict until a durable resolved record or tombstone exists, and collection/status subscribers must receive detached snapshots. History batch fallback must never replay a callback after canonical execution has started; Canvas paint refresh/render must follow only a completed config mutation; camera-pose writes must restore the previous pose after rejected control/projection updates; and render-scheduler follow-through failures must reach the canonical platform rejection reporter. Canvas module structural writes must cross `canvas_picking_structural_commit.ts`: mutations execute against a detached draft, successful reconciliation preserves stable nested object identity, rejected/throwing writers restore the prior config, and click-side hover/toast/motion effects must not advertise an uncommitted write. Direct drawer-hit and manual-layout routing failures publish stable diagnostics while retaining geometry and hover fail-soft behavior. Expand this set only when a capability migration includes focused fail-soft and diagnostic behavior tests; do not add per-stage proof files.

Relevant check:

```bash
npm run check:silent-catches
```

## Dependency security and release audit

- The required dependency-security gate is release-scoped: `npm run audit:release` checks only non-development dependencies and fails on high or critical advisories. This is the dependency tree that can ship with or support the production application.
- `npm run audit:toolchain` reviews the complete lockfile, including build, lint, test, and release tooling. Findings in development-only tools remain visible and must be assessed, but they do not automatically block a release when the release-scoped audit is clean and the vulnerable path is not exposed to untrusted input.
- Never use `npm audit fix --force` as a routine remediation step. Review the dependency path, the proposed parent-package change, runtime exposure, and release/test coverage before accepting a breaking downgrade or override.
- A clean release audit does not declare the toolchain risk-free; it proves only that the production dependency set has no advisory at the configured severity. Keep development advisories under review until an upstream-compatible fix is available.
- Dependency audits require registry advisory data and therefore stay outside deterministic offline gates and release-build scripts. CI owns the blocking release audit; local and manual review owns the full toolchain audit.

Relevant checks:

```bash
npm run audit:release
npm run audit:toolchain
npm explain <package>
```

## Browser security headers

- `Content-Security-Policy` enforces only the low-risk `base-uri`, `object-src`, and `frame-ancestors` baseline until measured evidence supports broader enforcement.
- The full CSP stays in `Content-Security-Policy-Report-Only` without `unsafe-inline`. Source HTML and generated release boot/404 surfaces must not add inline script or style dependencies.
- Cloudflare Pages Web Analytics is allowed only through `script-src-elem` for the exact `static.cloudflareinsights.com/beacon.min.js` path and its versioned path prefix. Automatic Cloudflare injection reports to the same origin, so `connect-src 'self'` remains sufficient and no broad Cloudflare host allowance is added to `script-src`.
- CSP reports attributed to browser extensions, filtering middleware, or injected helpers such as `card-injection.js` are external-environment noise. Do not weaken `style-src` with `unsafe-inline`, dynamic hashes, or third-party allowlists to silence them; reproduce in a clean browser/network before treating them as application defects.
- `Reporting-Endpoints`, `report-to`, and `report-uri` use `/__csp-report`. The hosting profile must route that path to a collector that accepts CSP reports and retains aggregate counts by build, route, and effective directive.
- The browser adapter listener samples and throttles violations, removes query strings and cross-origin paths, keeps a bounded session baseline, and sends best-effort reports. It must never block boot.
- Promote additional directives to enforcement only after the collector baseline is quiet for the relevant builds/routes and the browser security header contracts pass for source and release output.

Relevant checks:

```bash
npm run check:browser-security-headers
node --import tsx --test tests/browser_csp_telemetry_runtime.test.ts
node --test tests/wp_release_runtime.test.js
```

## Layer ratchet freshness

- `contract:layers:propose` is the canonical decrease-only architecture proposal.
- A clean proposal that still contains lower budgets or removable edges is allowed only within the configured `ratchet.pendingReductionGraceDays` window after the last reviewed ratchet application.
- `contract:layers:ratchet` fails after that window, so CI cannot carry known architecture slack indefinitely.
- Applying a clean reduction refreshes `ratchet.reviewedAt`; growth, facade decisions, and ownership failures remain review-blocking and are never absorbed by this guard.

Relevant checks:

```bash
npm run contract:layers
npm run contract:layers:propose
npm run contract:layers:ratchet
```

## CSS cascade

- `tools/wp_css_style_budget.json` is the active CSS debt ratchet for `css/react_styles.css`.
- `check:css-style` must read that budget file instead of embedding limits in code.
- New CSS should not increase `!important`, `transition: all`, total `z-index`, or one-off `box-shadow` counts.
- Every `z-index` declaration in `css/react_styles.css` must use a shared `--wp-z-*` token; raw numbers belong only in `css/react_tokens.css`.
- When CSS cleanup lowers a count, lower the matching budget in the same change. Raising a budget requires an explicit product/design reason in the review.
- `report:css-style` regenerates the checked-in report targets from the same budget.

Relevant checks:

```bash
npm run check:css-style
npm run report:css-style
```

## Builder and render

- Builder orchestration moves through prepared/context objects after the prepare seam, not loose `args` bags.
- Dependency validation belongs at resolver boundaries such as `resolveBuilderDepsOrThrow`.
- Builder code must not use DOM/storage/global timer access directly.
- Render hotpaths should not gain casual probes or duplicate render triggers. Measure through explicit perf/debug owners.
- Perf baselines should be updated only after measured improvement or a deliberate accepted product change.
- Generated Three.js mirrors under `tools/three_addons/` are vendor refresh outputs. Keep them out of source style gates and validate their runtime surface through `wp_three_vendor_contract`.

Relevant checks:

```bash
npm run check:builder-context-policy
npm run check:builder-pipeline-contract
npm run check:perf-hotpaths
npm run contract:three-vendor
```

## Canvas picking

- Hover and click must describe the same visual target through canonical hit identity data.
- `esm/native/services/canvas_picking_hit_identity.ts` owns stable identity fields such as target kind, part id, door/drawer id, module index, stack, surface id, face side/sign, split part, and source.
- Click finalization should preserve the strongest available object metadata instead of re-guessing from weaker ids.
- Mirror hits that expose only `faceSign` must still resolve a canonical inside/outside face side.
- Mirror paint commits must receive the finalized `hitIdentity`; a resolved mirror click must carry an explicit `hitFaceSign` and full-door/sized-placement discriminator, while geometry-independent full-door resolution may read the matching face from canonical hit identity and must remove matching full-face layouts instead of duplicating them.
- Split lower-stack door ids, sketch-box door metadata, and explicit object stack tags must flow through the same hit identity owner used by regular doors.
- Split click commits must normalize effective top/bot/mid part ids through the same split map-key policy and split-hover base-key owner before reading family bounds or dispatching split actions.
- Transparent removed-door restore hitboxes must be pickable only in remove-door mode and only when their owner carries removed-door metadata; transparent material arrays must not block normal clicks.
- Paint target resolution must preserve sketch-box door part keys for special paint maps; canonical sketch door ids may describe identity but must not replace the persisted map key.
- Click identity must not invent a `top` stack when no stack hint exists; use explicit object/module stack evidence only.
- Sketch hover host identity is owned by `services/canvas_picking_sketch_hover_identity.ts`; transient records emit and read only canonical `hostModuleKey`/`hostIsBottom`, retired `moduleKey`/`isBottom` fields are rejected at both read and write boundaries, and incomplete identity never defaults to the top stack.
- Manual Layout hover mutation commands cross the versioned `manualLayoutCommand` envelope owned by `services/canvas_picking_manual_layout_command.ts`; closed add/remove unions cover module boxes, shelves, rods, storage, and internal/external drawer stacks, exact-shape decoding rejects missing operations, unknown versions, invalid geometry, missing removal identity, and extra fields, and malformed matched hovers are consumed and cleared before any direct-hit fallback or structural patch.
- Identity helpers stay data-only: no DOM, scene mutation, store writes, timers, or UI operations.
- Browser pointer smoke should exercise a real `pointermove`/`pointerdown`/`pointerup` path for at least one canvas operation, proving hover eligibility and click commit resolve to the same canonical target.

Relevant checks:

```bash
npm run check:canvas-hit-identity
npm run check:canvas-hit-parity
npm run e2e:canvas-pointer-parity
```

## Cloud Sync

- Lifecycle orchestration belongs in cloud-sync service owners; UI/panel code displays state and dispatches actions.
- `createCloudSyncOwnerGatewayIo` is the stable gateway composition surface. Credential/session lifecycle, row cache, conflict journal, gateway transport, conflict resolution, and remote adoption stay in independent state/lifecycle owners rather than being recombined into one runtime owner.
- Browser-only conflict locking belongs at the runtime-access boundary and is injected into the conflict-resolution owner; service-domain conflict logic must not import browser-runtime capability access directly.
- Long-lived timers must come from injected Cloud Sync dependencies or a single browser-runtime timer boundary, not direct global timer calls.
- Pull coalescers and main-row push flows must reset stale queued work across dispose/suppression boundaries.
- Repeated start/stop/pull calls must be singleflight or idempotent.
- Debounced Cloud Sync work must re-check suppression when the timer fires, not only when it is scheduled.
- Main-row push failures must be reported non-fatally and must still notify settled listeners so parked pulls can recover.
- Recovery pulls must not run ahead of a debounced main-row push; reconnect/attention/polling refresh work stays parked until the pending local write settles.
- Browser attention listeners must report non-fatal pull errors and remain usable for later events.
- Offline attention attempts must not consume reconnect eligibility; hidden reconnects must wait for a visible return before pulling.
- Browser reconnect smoke should prove the visible Cloud Sync panel stays stable across offline/online transitions and that a real Cloud Sync action remains usable after reconnect.
- A successful read with `row: null` is the only missing-row result. Authorization, rate-limit, network, and server failures stay typed through the domain owner and must never trigger local seeding.
- A rate-limited owner pauses Cloud reads until the gateway retry deadline; background polling must not create a retry storm.
- Unmergeable CAS conflicts publish their conflict keys and remote revision, and automatic retry remains stopped until the conflict is resolved explicitly.
- Cloud collections are committed through the single versioned envelope repository. Per-collection keys are deployment mirrors only; Cloud refresh/push begins only after the canonical envelope commit succeeds.
- Scheduled main-row pulls must preserve request coalescing, convert synchronous pull throws into rejected promises, report timer/diagnostic/async failures, and execute immediately when timer registration is unavailable.
- Remote main-row adoption must report read, seed, hash, local-commit, and revision-mismatch failures and schedule the matching pull or push recovery without claiming convergence.
- Conflict resolution may clear the active conflict only after a durable resolved-state record or durable tombstone is confirmed. If both persistence paths fail, resolution fails closed and the conflict remains active.
- Collection observers and status subscribers receive independent detached snapshots. One subscriber may not mutate canonical state or the value seen by another subscriber.
- Cloud retention is lease-based per base room. Public room families never expire; authenticated private-room issue/renew/read/write activity extends the reviewed lease for the full family, including subresources and tombstones.
- Cloud room capabilities accept only the fixed seven-row family namespace. Scheduled deletion reconciles leases before enablement and is verified after its first Cron run.
- Browser and Edge gateway roles never receive cleanup or table-delete authority. Retention starts in dry-run mode, deletes only bounded tenant/store batches through the database maintenance owner, and records counts without room ids, bucket hashes, tokens, or payloads.

Relevant docs/checks:

```bash
docs/CLOUD_SYNC_LIFECYCLE_STATE_MACHINE.md
npm run check:cloud-sync-timers
npm run check:cloud-sync-races
npm run check:cloud-sync-owner-decomposition
npm run check:cloud-sync-offline-reconnect
npm run e2e:cloud-sync-reconnect
```

## Project load and runtime selectors

- Project compatibility belongs at project ingress, not inside the live runtime/build path.
- Project files must already use the current top-level schema metadata; old persisted shapes are rejected at project ingress.
- After load/import canonicalization, runtime and builder paths should read canonical state only.
- Runtime/build state has no tolerant direct `ui.*` dimension reader; current-schema project ingress must provide canonical `ui.raw` before commit.
- Real project import fixtures under `tests/fixtures/project_import/` guard current-schema ingress, canonical `ui.raw` validation, config replace-owned branches, and map cleanup behavior.
- Project load preparation is side-effect free. Canonical UI, config, runtime, and meta state enter the store through one transaction commit; history baseline is part of the critical finalize boundary, and a critical failure rolls state and history back to their exact pre-load snapshots.
- Camera, lighting, notes, build scheduling, notifications, and telemetry run only after the critical state/history commit succeeds.
- Long-running user actions return an operation handle with `operationId`, `acceptedAt`, and one terminal `settled` promise. A pending result without a terminal handle is invalid; UI events and performance spans close from the same settled business result.

Relevant checks:

```bash
npm run check:project-import-fixtures
npm run check:project-migration-boundary
npm run check:runtime-selector-policy
```

## Feature APIs and HTML sinks

- `esm/native/features/` is shared domain logic. External layers should import only deliberate public feature entries.
- Do not add barrels/wrappers just to bypass a public API contract.
- Raw HTML sinks are allowed only inside UI/runtime owners that sanitize, escape, or intentionally mount trusted fragments.
- New sinks must be deliberate and covered by the sink audit allowlist/reasoning.

Relevant checks:

```bash
npm run check:features-public-api
npm run check:html-sinks
```

## React UI primitives and effects

- Repeated choice controls should use the existing option/swatch primitives instead of rebuilding selectable button behavior locally.
- `OptionButton`, `OptionButtonGroup`, `ColorSwatch`, and `ColorSwatchItem` are the current preferred primitives for migrated tab controls.
- React DOM event effects should return one deterministic, idempotent cleanup function.
- Migrated pointer/keyboard effects should use the shared cleanup owner instead of manual scattered `addEventListener` / `removeEventListener` pairs.

Relevant checks:

```bash
npm run check:ui-design-system
npm run check:ui-effect-cleanup
```
