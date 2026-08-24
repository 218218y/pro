# Release browser perf + E2E baseline

Generated: 2026-08-24T06:32:18.222Z
Measurement profile: release (Release static UX)
Pipeline: wp_release:perf -> static-release-server -> Chromium
Page: /index.html; observability mode: perf
Environment: win32 x64; CPU=11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz (8 logical); Node=v24.18.0; browser=151.0.7922.174; viewport=1280x800; cache=fresh-browser-context-per-run
Runtime milliseconds are comparable only across runs with the same environment, artifact, viewport, cache policy, and sequence.

## User flow timings

- boot.shell-visible: 1402ms
- boot.operational-ready.wait: 1ms
- boot.autosave-ready.wait: 56ms
- boot.operational-ready: 1459ms
- boot.autosave-ready: 2403ms
- export.settings-tab.open: 436ms
- settings.visual.global-click.roundtrip: 490ms
- header.sketch-mode.roundtrip: 745ms
- viewer.notes.draw-mode.roundtrip: 315ms
- viewer.notes.visibility.roundtrip: 306ms
- viewer.contents.visibility.roundtrip: 561ms
- adhesive-glass.first-use.black.apply-and-render: 1236ms
- adhesive-glass.first-use.variant-update-and-render: 237ms
- cabinet-core.configure: 2254ms
- cabinet-core.mixed-edit-burst: 5441ms
- cabinet-build-variants.profile-texture.configure: 1703ms
- cabinet-build-variants.authoring-matrix: 3668ms
- cabinet-build-variants.structure-material-door-burst: 4736ms
- cabinet-build-variants.option-burst: 2394ms
- cabinet-door-drawer-authoring.configure: 2366ms
- cabinet-door-drawer-authoring.mode-burst: 4749ms
- cabinet-door-drawer-authoring.layout-persistence-roundtrip: 2278ms
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip: 5669ms
- tab.settings.open: 80ms
- export.snapshot.download: 550ms
- export.copy.clipboard: 211ms
- export.render-sketch.clipboard: 370ms
- export.dual.clipboard: 281ms
- settings-backup.roundtrip: 4795ms
- cloud-sync.floating.toggle-on: 137ms
- cloud-sync.floating.toggle-off: 286ms
- order-pdf.open-close.initial: 995ms
- project.save-load.roundtrip: 960ms
- project.reset-default.confirmed: 713ms
- export.clipboard.pressure: 1743ms
- order-pdf.reopen.pressure: 390ms
- project.restore-last-session: 1202ms
- project.persistence-recovery.burst: 7595ms
- project.load.invalid-keeps-state: 58ms
- project.load.recovery-sequence: 903ms
- project.restore-last-session.missing-autosave: 1767ms
- settings-backup.invalid-import-keeps-state: 7183ms

## Runtime health

Page errors: 0
Console errors: 0
Diagnostics reports: 0
Clipboard writes: 0

## Project action events

- load: count=18, ok=17, failure=1, pending=0, lastReason=invalid
- reset-default: count=1, ok=1, failure=0, pending=0
- restore-last-session: count=6, ok=5, failure=1, pending=0, lastReason=missing-autosave
- save: count=16, ok=8, failure=0, pending=8

## Runtime outcome coverage

- project.load: statuses=ok/error, ok=17, error=1, mark=0, mixed=yes
- settingsBackup.import: statuses=ok/error, ok=5, error=1, mark=0, mixed=yes
- project.save.dispatched: statuses=mark, ok=0, error=0, mark=8, mixed=no
- adhesive-glass.first-use.input: statuses=mark, ok=0, error=0, mark=2, mixed=no
- adhesive-glass.shader-warmup.programs.after: statuses=mark, ok=0, error=0, mark=2, mixed=no

### Required mixed-outcome coverage

- project.load: ok>=1, error>=1
- project.restoreLastSession: ok>=1, mark>=1
- settingsBackup.import: ok>=2, error>=1

## Runtime recovery transitions

- project.load: transitions=error->ok, ok->error, ok->ok, last=ok, destabilizations=1, recoveries=1
- project.restoreLastSession: transitions=mark->ok, ok->mark, ok->ok, last=ok, destabilizations=1, recoveries=1
- settingsBackup.import: transitions=error->ok, ok->error, ok->ok, last=ok, destabilizations=1, recoveries=1

### Required recovery transitions

- project.load: error->ok>=1, ok->error>=1
- project.restoreLastSession: mark->ok>=1, ok->mark>=1
- settingsBackup.import: error->ok>=1, ok->error>=1

## Runtime recovery proveout

- adhesive-glass.first-use.input: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none
- adhesive-glass.shader-warmup.programs.after: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none
- adhesive-glass.shader-warmup.programs.before: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none
- boot.milestone.autosave-ready: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none
- boot.milestone.operational-ready: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none

### Required recovery proveout

- project.load: recovered>=1, stableRecoveries>=1, cleanRecoveries>=1, postRecoveryOkStreak>=3, recoverySpan<=1, unresolved<=0, relapses<=0
- project.restoreLastSession: recovered>=1, stableRecoveries>=1, cleanRecoveries>=1, postRecoveryOkStreak>=3, recoverySpan<=1, unresolved<=0, relapses<=0
- settingsBackup.import: recovered>=1, stableRecoveries>=1, cleanRecoveries>=1, postRecoveryOkStreak>=3, recoverySpan<=1, unresolved<=0, relapses<=0

## Runtime recovery debt

- project.save.dispatched: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=8, unresolved=1
- adhesive-glass.first-use.input: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=2, unresolved=1
- adhesive-glass.shader-warmup.programs.after: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=2, unresolved=1
- adhesive-glass.shader-warmup.programs.before: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=2, unresolved=1
- boot.milestone.autosave-ready: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=2, unresolved=1

## Runtime recovery hangover

- settingsBackup.import: recovered=1, steadyMedian=23ms, p95RecoveryWindow=32ms, maxRecoveryWindow=32ms, p95HangoverRatio=1.38x, maxHangoverRatio=1.38x, lingeringSettling=1
- project.load: recovered=1, steadyMedian=54ms, p95RecoveryWindow=53ms, maxRecoveryWindow=53ms, p95HangoverRatio=0.99x, maxHangoverRatio=0.99x, lingeringSettling=0
- project.restoreLastSession: recovered=1, steadyMedian=396ms, p95RecoveryWindow=375ms, maxRecoveryWindow=375ms, p95HangoverRatio=0.95x, maxHangoverRatio=0.95x, lingeringSettling=0

## Browser responsiveness metrics

- observerSupported=true, CLS=0 (5 shifts), LCP=1332ms, INP=144ms (306 interactions, source=event), Long Tasks=42 / total=4049ms / p95=191ms, render-settle=91 / p95=53ms

### Boot readiness truth

| Milestone         | Time from navigation | Meaning                                                              |
| ----------------- | -------------------: | -------------------------------------------------------------------- |
| shell-visible     |               1402ms | React shell mounted and viewer canvas attached                       |
| operational-ready |               1459ms | lifecycle bootReady reached after required UI boot and builder flush |
| autosave-ready    |               2403ms | delayed systemReady reached; autosave may activate                   |

### Top Long-Task Journeys

- cabinet-door-drawer-authoring: count=18, total=1493ms, max=160ms, p95=160ms, renderSettle=25 / total=239ms
- boot-and-shell: count=4, total=1018ms, max=572ms, p95=572ms, renderSettle=1 / total=3ms
- cabinet-core-authoring: count=10, total=653ms, max=91ms, p95=91ms, renderSettle=26 / total=729ms
- export-authoring: count=5, total=475ms, max=193ms, p95=193ms, renderSettle=0 / total=0ms
- adhesive-glass-first-use: count=3, total=286ms, max=139ms, p95=139ms, renderSettle=3 / total=90ms
- order-pdf-lifecycle: count=1, total=69ms, max=69ms, p95=69ms, renderSettle=0 / total=0ms
- project-roundtrip: count=1, total=55ms, max=55ms, p95=55ms, renderSettle=2 / total=18ms
- cabinet-build-variants: count=0, total=0ms, max=0ms, p95=0ms, renderSettle=31 / total=664ms
- settings-backup-resilience: count=0, total=0ms, max=0ms, p95=0ms, renderSettle=3 / total=19ms

### Top Long-Task Steps

| Step                                                           | Long tasks |  Total |   Max | Render settle |
| -------------------------------------------------------------- | ---------: | -----: | ----: | ------------: |
| cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip |         12 | 1022ms | 160ms |          53ms |
| boot.autosave-ready.wait                                       |          2 |  840ms | 572ms |           3ms |
| cabinet-door-drawer-authoring.layout-persistence-roundtrip     |          4 |  349ms | 105ms |          38ms |
| adhesive-glass.first-use.black.apply-and-render                |          3 |  286ms | 139ms |          79ms |
| cabinet-core.configure                                         |          3 |  235ms |  91ms |         166ms |
| export.render-sketch.clipboard                                 |          1 |  193ms | 193ms |           0ms |
| boot.shell-visible                                             |          2 |  178ms | 114ms |           0ms |
| cabinet-core.mixed-edit-burst                                  |          3 |  156ms |  54ms |         338ms |
| header.sketch-mode.roundtrip                                   |          2 |  133ms |  76ms |          31ms |
| viewer.contents.visibility.roundtrip                           |          2 |  129ms |  68ms |         116ms |
| export.clipboard.pressure                                      |          2 |  125ms |  71ms |           0ms |
| cabinet-door-drawer-authoring.configure                        |          2 |  122ms |  67ms |          44ms |
| export.dual.clipboard                                          |          1 |   88ms |  88ms |           0ms |
| export.snapshot.download                                       |          1 |   69ms |  69ms |           0ms |
| order-pdf.open-close.initial                                   |          1 |   69ms |  69ms |           0ms |
| project.save-load.roundtrip                                    |          1 |   55ms |  55ms |           3ms |
| adhesive-glass.first-use.variant-update-and-render             |          0 |    0ms |   0ms |          11ms |
| cabinet-build-variants.authoring-matrix                        |          0 |    0ms |   0ms |         209ms |
| cabinet-build-variants.option-burst                            |          0 |    0ms |   0ms |          53ms |
| cabinet-build-variants.profile-texture.configure               |          0 |    0ms |   0ms |          23ms |

### Largest Long-Task root causes

| Journey                       | Step                                                           | Duration | Builder | Mirror | Renderer | Effects | Store (exact slow commits) | Other | Unattributed |
| ----------------------------- | -------------------------------------------------------------- | -------: | ------: | -----: | -------: | ------: | -------------------------: | ----: | -----------: |
| boot-and-shell                | boot.autosave-ready.wait                                       |    572ms |     0ms |    0ms |      0ms |     0ms |                        0ms | 572ms |          0ms |
| boot-and-shell                | boot.autosave-ready.wait                                       |    268ms |     0ms |    1ms |    264ms |     2ms |                        0ms |   2ms |          0ms |
| export-authoring              | export.render-sketch.clipboard                                 |    193ms |     0ms |    0ms |      0ms |     0ms |                        0ms |   0ms |        193ms |
| cabinet-door-drawer-authoring | cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip |    160ms |     0ms |  142ms |     18ms |     0ms |                        0ms |   1ms |          0ms |
| adhesive-glass-first-use      | adhesive-glass.first-use.black.apply-and-render                |    139ms |     0ms |  135ms |      2ms |     0ms |                        0ms |   1ms |          2ms |

### UX target status (advisory)

- These product UX targets are fixed independently from the generated regression baseline; baseline regeneration cannot widen them.
- CLS: met, value=0, target<=0.1
- LCP: met, value=1332ms, target<=2500ms
- INP: met, value=144ms, target<=200ms

## Runtime perf summary

Required metrics present: 25/25

### Required metric coverage

- boot.browser.setup: count=2, required>=1
- boot.react.mount.reactSidebarRoot: count=2, required>=1
- project.save: count=8, required>=1
- project.load: count=18, required>=6
- project.resetDefault: count=1, required>=1
- project.restoreLastSession: count=6, required>=6
- export.snapshot: count=1, required>=1
- export.copy: count=3, required>=3
- export.renderSketch: count=3, required>=3
- export.dual: count=3, required>=3
- settingsVisual.globalClick.toggle: count=2, required>=1
- ui.header.sketch.toggle: count=13, required>=1
- viewer.notes.drawMode.toggle: count=2, required>=1
- viewer.notes.visibility.toggle: count=2, required>=1
- viewer.contents.visibility.toggle: count=2, required>=1
- structure.dimensions.width.commit: count=13, required>=7
- structure.dimensions.height.commit: count=13, required>=7
- structure.dimensions.depth.commit: count=11, required>=7
- design.savedColor.add: count=7, required>=5
- design.savedColor.delete: count=6, required>=3
- cloudSync.floatingSync.toggle: count=2, required>=1
- orderPdf.open: count=3, required>=3
- orderPdf.close: count=3, required>=3
- settingsBackup.export: count=1, required>=1
- settingsBackup.import: count=6, required>=6

### Saved colors phase breakdown

- add: uxAvg=328ms, uxP95=385ms, interactionWaitAvg=302ms, interactionWaitP95=368ms, codeAvg=26ms, codeP95=45ms, prepare=0ms, order=0ms, mutation=26ms, patch=1ms, storage=21ms, bottleneck=feedback-wait
- delete: uxAvg=300ms, uxP95=329ms, interactionWaitAvg=272ms, interactionWaitP95=299ms, codeAvg=28ms, codeP95=37ms, prepare=0ms, order=0ms, mutation=27ms, patch=1ms, storage=24ms, bottleneck=feedback-wait

### Settings backup import phase breakdown

- import: uxAvg=320ms, uxP95=328ms, confirmWaitAvg=294ms, confirmWaitP95=296ms, codeAvg=27ms, codeP95=32ms, readFile=20ms, parse=0ms, modelsMerge=0ms, colors=0ms, modelsFinalize=0ms, storageWrite=0ms x0, bottleneck=confirm-wait

## Store write pressure

Store commits: 82, no-op skips: 9, noBuild commits: 70, selector filtered: 2673, selector evaluations: 534, selector notifications: 140, tracked sources: 21, slow sources: 0, total source time: 28ms

### Store-heavy user-flow steps

- cabinet-build-variants.structure-material-door-burst: commits=56, selectorFiltered=2234, selectorEval=342, selectorNotify=100, sourceTime=18ms, duration=4736ms, topSources=PATCH:actions:room:setWardrobeType:restore:ui+config, PATCH:react:tabs:set:ui, PATCH:react:structure:height:ui
- cabinet-door-drawer-authoring.mode-burst: commits=44, selectorFiltered=1796, selectorEval=228, selectorNotify=110, sourceTime=103ms, duration=4749ms, topSources=PATCH:react:interior:sketchIntDrawersToggle:ui, PATCH:react:design:groovesEnabled:ui, PATCH:react:design:removeDoorsEnabled:ui
- cabinet-build-variants.authoring-matrix: commits=37, selectorFiltered=1477, selectorEval=225, selectorNotify=65, sourceTime=12ms, duration=3668ms, topSources=PATCH:actions:room:setWardrobeType:restore:ui+config, PATCH:react:tabs:set:ui, PATCH:react:structure:height:ui
- project.persistence-recovery.burst: commits=33, selectorFiltered=1179, selectorEval=207, selectorNotify=61, sourceTime=11ms, duration=7595ms, topSources=PATCH:project.load:ui+config+runtime+mode+meta, PATCH:react:design:savedColors:add:ui+config, PATCH:react:tabs:set:ui
- cabinet-core.mixed-edit-burst: commits=32, selectorFiltered=1291, selectorEval=181, selectorNotify=52, sourceTime=8ms, duration=5441ms, topSources=PATCH:react:tabs:set:ui, PATCH:react:structure:width:ui, PATCH:react:design:savedColors:add:ui+config

### Top store sources

- PATCH:project.load:ui+config+runtime+mode+meta: source=project.load, type=PATCH, slices=ui+config+runtime+mode+meta, count=9, noBuild=9, total=7ms, max=2ms, slow=0
- PATCH:cloudSync:site2:tabsGate:ui: source=cloudSync:site2:tabsGate, type=PATCH, slices=ui, count=1, noBuild=1, total=3ms, max=3ms, slow=0
- PATCH:react:tabs:set:ui: source=react:tabs:set, type=PATCH, slices=ui, count=17, noBuild=17, total=3ms, max=0ms, slow=0
- PATCH:autosave:info:ui: source=autosave:info, type=PATCH, slices=ui, count=12, noBuild=12, total=2ms, max=1ms, slow=0
- PATCH:builder:dims:runtime: source=builder:dims, type=PATCH, slices=runtime, count=6, noBuild=6, total=2ms, max=1ms, slow=0

## Builder scheduling pressure

Build requests: 27, executes: 24, immediate requests: 9, debounced requests: 18, immediate force: 9, immediate non-force: 0, coalesced force: 0, coalesced non-force: 18, force requests: 9, force executes: 9, pending overwrites: 4, suppressed requests: 0, suppressed executes: 0, debounce schedules: 18

### Build execution duration

- all: count=24, ok=24, error=0, total=710ms, avg=30ms, p95=43ms, max=70ms
- immediate: count=9, avg=33ms, p95=70ms, max=70ms
- debounced: count=15, avg=28ms, p95=43ms, max=43ms
- force: count=9, avg=33ms, p95=70ms, max=70ms
- non-force: count=15, avg=28ms, p95=43ms, max=43ms

### Slow build reasons by execution duration

- project.load: count=9, ok=9, error=0, total=297ms, avg=33ms, p95=70ms, max=70ms
- react:design:palette:saved: count=3, ok=3, error=0, total=90ms, avg=30ms, p95=43ms, max=43ms
- flush: count=1, ok=1, error=0, total=40ms, avg=40ms, p95=40ms, max=40ms
- react:structure:depth: count=2, ok=2, error=0, total=61ms, avg=30ms, p95=39ms, max=39ms
- react:design:savedColors:delete: count=3, ok=3, error=0, total=95ms, avg=32ms, p95=35ms, max=35ms

### Build-heavy user-flow steps

- cabinet-build-variants.structure-material-door-burst: requests=25, executes=15, immediateForce=4, immediateNonForce=0, coalescedForce=0, coalescedNonForce=21, forceRequests=4, forceExecutes=4, pendingOverwrites=10, suppressedRequests=0, debounce=21, duration=4736ms, topReasons=actions:room:setWardrobeType:recompute, react:boardMaterial, react:structure:depth
- cabinet-core.mixed-edit-burst: requests=18, executes=12, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=18, forceRequests=0, forceExecutes=0, pendingOverwrites=6, suppressedRequests=0, debounce=18, duration=5441ms, topReasons=react:structure:depth, react:design:custom:pickColor, react:design:savedColors:add
- project.persistence-recovery.burst: requests=14, executes=10, immediateForce=2, immediateNonForce=0, coalescedForce=0, coalescedNonForce=12, forceRequests=2, forceExecutes=2, pendingOverwrites=4, suppressedRequests=0, debounce=12, duration=7595ms, topReasons=react:design:custom:pickColor, react:design:savedColors:add, react:header:sketch
- cabinet-build-variants.authoring-matrix: requests=17, executes=9, immediateForce=2, immediateNonForce=0, coalescedForce=0, coalescedNonForce=15, forceRequests=2, forceExecutes=2, pendingOverwrites=8, suppressedRequests=0, debounce=15, duration=3668ms, topReasons=react:boardMaterial, react:structure:depth, actions:room:setWardrobeType:recompute
- cabinet-door-drawer-authoring.mode-burst: requests=12, executes=9, immediateForce=2, immediateNonForce=3, coalescedForce=0, coalescedNonForce=7, forceRequests=2, forceExecutes=2, pendingOverwrites=3, suppressedRequests=0, debounce=7, duration=4749ms, topReasons=react:boardMaterial, react:interior:sketchIntDrawersToggle, react:design:doorStyle

### Top build reasons

- project.load: requests=9, executes=9, immediateRequests=9, debouncedRequests=0, immediateForce=9, immediateNonForce=0, coalescedForce=0, coalescedNonForce=0, forceRequests=9, forceExecutes=9
- react:design:palette:saved: requests=3, executes=3, immediateRequests=0, debouncedRequests=3, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=3, forceRequests=0, forceExecutes=0
- react:design:savedColors:delete: requests=3, executes=3, immediateRequests=0, debouncedRequests=3, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=3, forceRequests=0, forceExecutes=0
- react:design:custom:pickColor: requests=2, executes=2, immediateRequests=0, debouncedRequests=2, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=2, forceRequests=0, forceExecutes=0
- react:design:savedColors:add: requests=2, executes=2, immediateRequests=0, debouncedRequests=2, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=2, forceRequests=0, forceExecutes=0

### Build-heavy customer journeys

- cabinet-build-variants: steps=4, requests=49, executes=31, immediateForce=8, immediateNonForce=0, coalescedForce=0, coalescedNonForce=41, forceRequests=8, forceExecutes=8, pendingOverwrites=18, suppressedRequests=0, debounce=41, total=12501ms, topReasons=actions:room:setWardrobeType:recompute, react:boardMaterial, react:structure:depth
- cabinet-door-drawer-authoring: steps=4, requests=29, executes=25, immediateForce=16, immediateNonForce=4, coalescedForce=0, coalescedNonForce=9, forceRequests=16, forceExecutes=16, pendingOverwrites=4, suppressedRequests=0, debounce=9, total=15062ms, topReasons=project.load, react:interior:sketchIntDrawersToggle, react:boardMaterial
- cabinet-core-authoring: steps=7, requests=28, executes=20, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=28, forceRequests=0, forceExecutes=0, pendingOverwrites=8, suppressedRequests=0, debounce=28, total=10112ms, topReasons=react:header:sketch, react:structure:depth, react:design:custom:pickColor
- project-roundtrip: steps=4, requests=17, executes=13, immediateForce=5, immediateNonForce=0, coalescedForce=0, coalescedNonForce=12, forceRequests=5, forceExecutes=5, pendingOverwrites=4, suppressedRequests=0, debounce=12, total=10470ms, topReasons=project.load, react:design:custom:pickColor, react:design:savedColors:add
- settings-backup-resilience: steps=2, requests=9, executes=9, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=9, forceRequests=0, forceExecutes=0, pendingOverwrites=0, suppressedRequests=0, debounce=9, total=11978ms, topReasons=react:design:savedColors:delete, react:design:palette:saved, react:design:custom:pickColor

## Customer journeys

- cabinet-build-variants: steps=4, total=12501ms, avgStep=3125ms, maxStep=4736ms, commits=118, selectorFiltered=4713, selectorEval=715, selectorNotify=209, sourceTime=39ms, topSources=PATCH:actions:room:setWardrobeType:restore:runtime:runtime, PATCH:actions:room:setWardrobeType:restore:ui+config, PATCH:react:design:custom:pickTexture:ui, PATCH:react:design:savedColors:add:ui+config, PATCH:react:structure:height:ui
- cabinet-door-drawer-authoring: steps=4, total=15062ms, avgStep=3766ms, maxStep=5669ms, commits=111, selectorFiltered=4254, selectorEval=852, selectorNotify=293, sourceTime=160ms, topSources=PATCH:autosave:info:ui, PATCH:project.load:ui+config+runtime+mode+meta, PATCH:react:design:groovesEnabled:ui, PATCH:react:design:removeDoorsEnabled:ui, PATCH:react:interior:sketchIntDrawersToggle:ui
- cabinet-core-authoring: steps=7, total=10112ms, avgStep=1445ms, maxStep=5441ms, commits=60, selectorFiltered=2437, selectorEval=323, selectorNotify=102, sourceTime=18ms, topSources=PATCH:react:design:custom:pickColor:ui, PATCH:react:design:savedColors:add:ui+config, PATCH:react:header:sketch:runtime, PATCH:react:settingsVisual:globalClick:runtime, PATCH:react:settingsVisual:globalClickUi:ui
- project-roundtrip: steps=4, total=10470ms, avgStep=2618ms, maxStep=7595ms, commits=47, selectorFiltered=1626, selectorEval=328, selectorNotify=103, sourceTime=16ms, topSources=PATCH:autosave:info:ui, PATCH:builder:dims:runtime, PATCH:project.load:ui+config+runtime+mode+meta, PATCH:react:design:savedColors:add:ui+config, PATCH:react:project:name:ui
- export-authoring: steps=6, total=3235ms, avgStep=539ms, maxStep=1743ms, commits=34, selectorFiltered=1394, selectorEval=170, selectorNotify=40, sourceTime=8ms, topSources=PATCH:doors:runtime, PATCH:export:runtime, PATCH:react:tabs:set:ui, PATCH:room:updateWall:ui

### Journey diagnosis

- cabinet-build-variants: bottleneck=duration-heavy, burstySteps=4, repeatedSources=3, dominantSourceShare=31%, dominantSource=12ms, topStep=cabinet-build-variants.structure-material-door-burst, topSource=PATCH:actions:room:setWardrobeType:restore:ui+config, burstyStepNames=cabinet-build-variants.authoring-matrix, cabinet-build-variants.option-burst, cabinet-build-variants.profile-texture.configure, cabinet-build-variants.structure-material-door-burst
- project-roundtrip: bottleneck=duration-heavy, burstySteps=4, repeatedSources=2, dominantSourceShare=37%, dominantSource=6ms, topStep=project.persistence-recovery.burst, topSource=PATCH:project.load:ui+config+runtime+mode+meta, burstyStepNames=project.persistence-recovery.burst, project.reset-default.confirmed, project.restore-last-session, project.save-load.roundtrip
- cabinet-door-drawer-authoring: bottleneck=duration-heavy, burstySteps=4, repeatedSources=1, dominantSourceShare=47%, dominantSource=76ms, topStep=cabinet-door-drawer-authoring.mode-burst, topSource=PATCH:react:interior:sketchIntDrawersToggle:ui, burstyStepNames=cabinet-door-drawer-authoring.configure, cabinet-door-drawer-authoring.layout-persistence-roundtrip, cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip, cabinet-door-drawer-authoring.mode-burst
- export-authoring: bottleneck=duration-heavy, burstySteps=2, repeatedSources=3, dominantSourceShare=58%, dominantSource=5ms, topStep=export.clipboard.pressure, topSource=PATCH:room:updateWall:ui, burstyStepNames=export.clipboard.pressure, export.render-sketch.clipboard
- project-recovery-proveout: bottleneck=duration-heavy, burstySteps=2, repeatedSources=3, dominantSourceShare=54%, dominantSource=3ms, topStep=project.restore-last-session.missing-autosave, topSource=PATCH:project.load:ui+config+runtime+mode+meta, burstyStepNames=project.load.recovery-sequence, project.restore-last-session.missing-autosave

### Required customer journey coverage

- boot-and-shell: steps=4, required>=2
- cabinet-core-authoring: steps=7, required>=2
- cabinet-build-variants: steps=4, required>=4
- cabinet-door-drawer-authoring: steps=4, required>=4
- export-authoring: steps=6, required>=5
- settings-backup-resilience: steps=2, required>=2
- cloud-sync-controls: steps=2, required>=2
- order-pdf-lifecycle: steps=2, required>=2
- project-roundtrip: steps=4, required>=4
- project-recovery-proveout: steps=3, required>=3

## State integrity checks

- cabinet-build-variants.authoring-matrix.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build authoring matrix should settle back to the canonical profile + texture authoring state)
- cabinet-build-variants.option-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build variants burst should settle back to the canonical profile + texture authoring state)
- cabinet-build-variants.structure-material-door-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build variants structure/material/door burst should settle back to the canonical profile + texture authoring state)
- cabinet-core.mixed-edit-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פוסט","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":1,"savedColorValues":["#996124"],"savedTextureCount":0,"selectedSavedSwatchId":"saved_1787553146587","selectedSavedSwatchKind":"color","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פוסט","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":1,"savedColorValues":["#996124"],"savedTextureCount":0,"selectedSavedSwatchId":"saved_1787553146587","selectedSavedSwatchKind":"color","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Mixed cabinet editing burst should settle back to the canonical cabinet core state)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.fixture-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer authored layout fixture should expose non-empty split/remove/groove/divider/drawer placement state through the perf fingerprint)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.reload-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer authored layout save-load roundtrip should preserve split/remove/groove/divider/drawer placement state)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.restored-authoring-state: ok (expected={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, actual={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, message=Door/drawer authored layout roundtrip should restore the canonical authoring toggle state after the seed project reload)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.restored-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Seed 1787553172902","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Seed 1787553172902","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Door/drawer authored layout roundtrip should restore the canonical cabinet core fingerprint after the seed project reload)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.saved-project-payload: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":12,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]}],"drawerDividerKeys":["div:ext_2","div:int_4"],"grooveLinesCount":12,"grooveLinesCountEntries":[["d1_full",12],["d2_full",8]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":3,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":true,"removedDoorKeys":["removed_d3_full","removed_d4_full"],"splitDoorBottomKeys":["splitb_d1"],"splitDoorKeys":["split_d1","split_d2"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":1}],"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":12,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]}],"drawerDividerKeys":["div:ext_2","div:int_4"],"grooveLinesCount":12,"grooveLinesCountEntries":[["d1_full",12],["d2_full",8]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":3,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":true,"removedDoorKeys":["removed_d3_full","removed_d4_full"],"splitDoorBottomKeys":["splitb_d1"],"splitDoorKeys":["split_d1","split_d2"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":1}],"wardrobeType":"hinged"}, message=Door/drawer authored layout save should persist the authored cut/remove/groove/divider/drawer project payload branches)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.drawer-stack-heavy.fixture-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"flat","doorTrimCount":1,"drawerDividerCount":4,"externalDrawerSelectionCount":5,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"internalDrawerPlacementCount":9,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"flat","doorTrimCount":1,"drawerDividerCount":4,"externalDrawerSelectionCount":5,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"internalDrawerPlacementCount":9,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"hinged"}, message=Door/drawer layout scenario drawer-stack-heavy should expose the expected cut/remove/drawer authoring fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.drawer-stack-heavy.reload-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"flat","doorTrimCount":1,"drawerDividerCount":4,"externalDrawerSelectionCount":5,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"internalDrawerPlacementCount":9,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"flat","doorTrimCount":1,"drawerDividerCount":4,"externalDrawerSelectionCount":5,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"internalDrawerPlacementCount":9,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"hinged"}, message=Door/drawer layout scenario drawer-stack-heavy save-load roundtrip should preserve the authored cut/remove/drawer fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.drawer-stack-heavy.saved-project-payload: ok (expected={"boardMaterial":"sandwich","doorStyle":"flat","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"nickel","sizeCm":6,"span":"custom"}]}],"drawerDividerKeys":["div:ext_1","div:int_1","div:int_2","div:int_3"],"grooveLinesCount":null,"grooveLinesCountEntries":[],"groovesEnabled":false,"groovesMapKeys":[],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":2,"index":0,"internalDrawerPlacementCount":2},{"extDrawersCount":2,"index":1,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":false,"removedDoorKeys":[],"splitDoorBottomKeys":[],"splitDoorKeys":[],"splitDoors":false,"stackSplitLowerModulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":4}],"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"flat","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"nickel","sizeCm":6,"span":"custom"}]}],"drawerDividerKeys":["div:ext_1","div:int_1","div:int_2","div:int_3"],"grooveLinesCount":null,"grooveLinesCountEntries":[],"groovesEnabled":false,"groovesMapKeys":[],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":2,"index":0,"internalDrawerPlacementCount":2},{"extDrawersCount":2,"index":1,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":false,"removedDoorKeys":[],"splitDoorBottomKeys":[],"splitDoorKeys":[],"splitDoors":false,"stackSplitLowerModulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":4}],"wardrobeType":"hinged"}, message=Door/drawer layout scenario drawer-stack-heavy save should persist the authored cut/remove/drawer project payload branches)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.mixed-layout.fixture-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer layout scenario mixed-layout should expose the expected cut/remove/drawer authoring fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.mixed-layout.reload-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer layout scenario mixed-layout save-load roundtrip should preserve the authored cut/remove/drawer fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.mixed-layout.saved-project-payload: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":12,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]}],"drawerDividerKeys":["div:ext_2","div:int_4"],"grooveLinesCount":12,"grooveLinesCountEntries":[["d1_full",12],["d2_full",8]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":3,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":true,"removedDoorKeys":["removed_d3_full","removed_d4_full"],"splitDoorBottomKeys":["splitb_d1"],"splitDoorKeys":["split_d1","split_d2"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":1}],"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":12,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]}],"drawerDividerKeys":["div:ext_2","div:int_4"],"grooveLinesCount":12,"grooveLinesCountEntries":[["d1_full",12],["d2_full",8]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":3,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":true,"removedDoorKeys":["removed_d3_full","removed_d4_full"],"splitDoorBottomKeys":["splitb_d1"],"splitDoorKeys":["split_d1","split_d2"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":1}],"wardrobeType":"hinged"}, message=Door/drawer layout scenario mixed-layout save should persist the authored cut/remove/drawer project payload branches)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.open-niche-remove.fixture-state: ok (expected={"boardMaterial":"melamine","doorStyle":"double_profile","doorTrimCount":0,"drawerDividerCount":1,"externalDrawerSelectionCount":3,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"removeDoorsEnabled":true,"removedDoorMapCount":4,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"hinged"}, actual={"boardMaterial":"melamine","doorStyle":"double_profile","doorTrimCount":0,"drawerDividerCount":1,"externalDrawerSelectionCount":3,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"removeDoorsEnabled":true,"removedDoorMapCount":4,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"hinged"}, message=Door/drawer layout scenario open-niche-remove should expose the expected cut/remove/drawer authoring fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.open-niche-remove.reload-state: ok (expected={"boardMaterial":"melamine","doorStyle":"double_profile","doorTrimCount":0,"drawerDividerCount":1,"externalDrawerSelectionCount":3,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"removeDoorsEnabled":true,"removedDoorMapCount":4,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"hinged"}, actual={"boardMaterial":"melamine","doorStyle":"double_profile","doorTrimCount":0,"drawerDividerCount":1,"externalDrawerSelectionCount":3,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"removeDoorsEnabled":true,"removedDoorMapCount":4,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"hinged"}, message=Door/drawer layout scenario open-niche-remove save-load roundtrip should preserve the authored cut/remove/drawer fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.open-niche-remove.saved-project-payload: ok (expected={"boardMaterial":"melamine","doorStyle":"double_profile","doorTrimSummary":[],"drawerDividerKeys":["div:ext_1"],"grooveLinesCount":null,"grooveLinesCountEntries":[],"groovesEnabled":false,"groovesMapKeys":[],"internalDrawersEnabled":false,"modulesConfiguration":[{"extDrawersCount":2,"index":0,"internalDrawerPlacementCount":0},{"extDrawersCount":1,"index":1,"internalDrawerPlacementCount":0}],"removeDoorsEnabled":true,"removedDoorKeys":["removed_d1_full","removed_d2_full","removed_d3_full","removed_d4_full"],"splitDoorBottomKeys":[],"splitDoorKeys":[],"splitDoors":false,"stackSplitLowerModulesConfiguration":[],"wardrobeType":"hinged"}, actual={"boardMaterial":"melamine","doorStyle":"double_profile","doorTrimSummary":[],"drawerDividerKeys":["div:ext_1"],"grooveLinesCount":null,"grooveLinesCountEntries":[],"groovesEnabled":false,"groovesMapKeys":[],"internalDrawersEnabled":false,"modulesConfiguration":[{"extDrawersCount":2,"index":0,"internalDrawerPlacementCount":0},{"extDrawersCount":1,"index":1,"internalDrawerPlacementCount":0}],"removeDoorsEnabled":true,"removedDoorKeys":["removed_d1_full","removed_d2_full","removed_d3_full","removed_d4_full"],"splitDoorBottomKeys":[],"splitDoorKeys":[],"splitDoors":false,"stackSplitLowerModulesConfiguration":[],"wardrobeType":"hinged"}, message=Door/drawer layout scenario open-niche-remove save should persist the authored cut/remove/drawer project payload branches)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.restored-authoring-state: ok (expected={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, actual={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, message=Door/drawer layout matrix roundtrip should restore the canonical authoring toggle state after the seed project reload)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.restored-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787553175226","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787553175226","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Door/drawer layout matrix roundtrip should restore the canonical cabinet core fingerprint after the seed project reload)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.fixture-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut should expose the expected cut/remove/drawer authoring fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.reload-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut save-load roundtrip should preserve the authored cut/remove/drawer fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.saved-project-payload: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":10,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]},{"doorKey":"d4_full","trims":[{"axis":"vertical","color":"silver","sizeCm":null,"span":"third"}]}],"drawerDividerKeys":["div:int_2"],"grooveLinesCount":9,"grooveLinesCountEntries":[["d1_full",9],["d2_full",7],["d4_full",5]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full","groove_d4_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":false,"removedDoorKeys":[],"splitDoorBottomKeys":["splitb_d1","splitb_d3"],"splitDoorKeys":["split_d1","split_d2","split_d3","split_d4"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[],"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":10,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]},{"doorKey":"d4_full","trims":[{"axis":"vertical","color":"silver","sizeCm":null,"span":"third"}]}],"drawerDividerKeys":["div:int_2"],"grooveLinesCount":9,"grooveLinesCountEntries":[["d1_full",9],["d2_full",7],["d4_full",5]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full","groove_d4_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":false,"removedDoorKeys":[],"splitDoorBottomKeys":["splitb_d1","splitb_d3"],"splitDoorKeys":["split_d1","split_d2","split_d3","split_d4"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[],"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut save should persist the authored cut/remove/drawer project payload branches)
- cabinet-door-drawer-authoring.mode-burst.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Cabinet Browser Perf 1787553145289","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787553154282","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cabinet door/drawer authoring burst should preserve the canonical cabinet core fingerprint)
- cabinet-door-drawer-authoring.mode-burst.restored-state: ok (expected={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, actual={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, message=Cabinet door/drawer authoring burst should settle back to the canonical authoring option state)
- project.load.invalid-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Invalid project load should preserve visible user state)
- project.load.recovery-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third valid project load after recovery should keep the recovered project state clean and relapse-free)
- project.load.recovery-restores-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A valid project load after an invalid load should recover the saved project state)
- project.load.recovery-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated valid project load after a failure should remain stable and preserve the recovered project state)
- project.persistence-recovery.load-restores-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cross-surface persistence burst should restore the canonical cabinet build options, selected texture state, dimensions, colors, and sketch mode after a valid project load)
- project.persistence-recovery.restore-restores-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cross-surface persistence burst should restore the canonical cabinet build options, selected texture state, dimensions, colors, and sketch mode after restore-last-session)
- project.restore-last-session.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Restore-last-session should rebuild the saved cabinet build options, selected texture state, dimensions, colors, and sketch mode after the app reloads)
- project.restore-last-session.missing-autosave-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Restore-last-session without autosave should keep user state unchanged)
- project.restore-last-session.recovery-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third restore-last-session after recovery should keep the saved project state clean and relapse-free)
- project.restore-last-session.recovery-restores-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A restore-last-session after a missing-autosave no-op should recover the saved project state once autosave returns)
- project.restore-last-session.recovery-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated restore-last-session after recovery should remain stable and preserve the saved project state)
- project.restore-last-session.saved-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Restore-last-session should rebuild the saved project fingerprint)
- project.save-load.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Project roundtrip should preserve cabinet build options, dimensions, selected texture state, colors, and sketch mode)
- settings-backup.invalid-import-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Invalid settings backup import should preserve visible user state)
- settings-backup.recovery-import-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#033298","#047651","#049449","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#033298","#047651","#049449","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third valid settings backup import after recovery should keep the imported state clean and relapse-free)
- settings-backup.recovery-import-merges-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#033298","#047651","#049449","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#033298","#047651","#049449","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A valid settings backup import after an invalid import should merge canonical backup colors into the current state)
- settings-backup.recovery-import-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#033298","#047651","#049449","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787553182649","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#033298","#047651","#049449","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated valid settings backup import after recovery should remain stable and preserve the canonical backup state)
- settings-backup.reimport.idempotent: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787553175226","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787553175226","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated settings backup import should stay idempotent)
- settings-backup.roundtrip.saved-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787553175226","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787553175226","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#033298","#996124","saved_1787553154282"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Settings backup import should rebuild the exported saved-color state)

## Sustained-use pressure signals

- settingsBackup.import: count=6/6, firstAvg=26ms, lastAvg=27ms, rawDrift=1ms (3.84%), materialDrift=0%, comparable=no, errors=1
- project.load: count=18/6, firstAvg=62ms, lastAvg=46ms, rawDrift=0ms (0%), materialDrift=0%, comparable=no, errors=1
- structure.dimensions.depth.commit: count=11/7, firstAvg=2ms, lastAvg=3ms, rawDrift=1ms (65.06%), materialDrift=0%, comparable=yes, errors=0
- orderPdf.close: count=3/3, firstAvg=1ms, lastAvg=1ms, rawDrift=0ms (60%), materialDrift=0%, comparable=yes, errors=0
- builder.execute: count=109/3, firstAvg=21ms, lastAvg=33ms, rawDrift=12ms (55.86%), materialDrift=0%, comparable=yes, errors=0

## Runtime domains

- project: required=4/4, metrics=12, entries=127, errors=1, marks=9, uxTotal=9525ms, codeTotal=4157ms, interactionWait=5368ms, maxCodeP95=405ms, worstCodeDrift=0%
- settings-backup: required=2/2, metrics=7, entries=35, errors=1, marks=0, uxTotal=3866ms, codeTotal=343ms, interactionWait=3523ms, maxCodeP95=32ms, worstCodeDrift=0%
- other: required=5/5, metrics=20, entries=636, errors=0, marks=6, uxTotal=3066ms, codeTotal=3066ms, interactionWait=0ms, maxCodeP95=55ms, worstCodeDrift=0%
- boot: required=2/2, metrics=102, entries=208, errors=0, marks=10, uxTotal=1972ms, codeTotal=1972ms, interactionWait=0ms, maxCodeP95=572ms, worstCodeDrift=0%
- design: required=2/2, metrics=15, entries=104, errors=0, marks=0, uxTotal=8772ms, codeTotal=1282ms, interactionWait=7490ms, maxCodeP95=45ms, worstCodeDrift=0%

## Hotspot candidates

- project.load: codeTotal=969ms, codeP95=106ms, codeMax=106ms, uxTotal=969ms, interactionWait=0ms, count=18, errors=1
- settingsBackup.import: codeTotal=159ms, codeP95=32ms, codeMax=32ms, uxTotal=1921ms, interactionWait=1762ms, count=6, errors=1
- builder.execute: codeTotal=2953ms, codeP95=55ms, codeMax=81ms, uxTotal=2953ms, interactionWait=0ms, count=109, errors=0
- project.restoreLastSession: codeTotal=1838ms, codeP95=405ms, codeMax=405ms, uxTotal=1838ms, interactionWait=0ms, count=6, errors=0
- project.load.apply: codeTotal=875ms, codeP95=104ms, codeMax=104ms, uxTotal=875ms, interactionWait=0ms, count=18, errors=0

- adhesive-glass.first-use.input: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- adhesive-glass.shader-warmup.programs.after: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- adhesive-glass.shader-warmup.programs.before: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.browser.setup: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.milestone.autosave-ready: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.milestone.operational-ready: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.milestone.shell-visible: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.phase.adapters: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.phase.addons: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.phase.builder: count=4, kinds=phase, ok=4, error=0, mark=0, uxAvg=1ms, uxP95=3ms, codeAvg=1ms, codeP95=3ms, waitAvg=0ms
- boot.phase.final: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=9ms, uxP95=11ms, codeAvg=9ms, codeP95=11ms, waitAvg=0ms
- boot.phase.kernel: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=6ms, uxP95=6ms, codeAvg=6ms, codeP95=6ms, waitAvg=0ms
- boot.phase.platform: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=4ms, codeAvg=3ms, codeP95=4ms, waitAvg=0ms
- boot.phase.services: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=16ms, uxP95=24ms, codeAvg=16ms, codeP95=24ms, waitAvg=0ms
- boot.phase.smoke: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.phase.ui: count=4, kinds=phase, ok=4, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.post-mount.app-start.readiness: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=261ms, uxP95=388ms, codeAvg=261ms, codeP95=388ms, waitAvg=0ms
- boot.pre-react: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=40ms, uxP95=54ms, codeAvg=40ms, codeP95=54ms, waitAvg=0ms
- boot.react.mount.reactOverlayRoot: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.react.mount.reactSidebarRoot: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- boot.react.mounted.reactOverlayRoot: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.react.mounted.reactSidebarRoot: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.react.shell.mount: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- boot.step.adapters.browser.activeElementIdReader: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.adapters.browser.surface: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.builder.core.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.builder.provide: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- boot.step.builder.provide.refresh: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.builder.roomDesign: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.data.presetModels: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=4ms, uxP95=6ms, codeAvg=4ms, codeP95=6ms, waitAvg=0ms
- boot.step.io.projectIo: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.applyPlatformBootFlags: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.kernel.assertCanonicalActions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.assertStateKernel: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.cfgMeta: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.domainApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.kernel.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.step.kernel.mapsApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.stateApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.layers.core: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.layers.engine: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.applyRuntimeConfigDefaults: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.assertStore: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.bootMain: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.cachePruning: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.ensureGeometryCaches: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.initRenderState: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.step.platform.lifecycleVisibility: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.pickingPrimitives: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.renderLoop: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.renderScheduler: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.smokeChecks: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.threeCleanup: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.threeGeometryCachePatch: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.appStart: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.autosave: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.bootFinalizers: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.bootSeedsPart02: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=4ms, codeAvg=3ms, codeP95=4ms, waitAvg=0ms
- boot.step.services.buildReactions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.canvasPicking: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.cloudCollections: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=4ms, codeAvg=2ms, codeP95=4ms, waitAvg=0ms
- boot.step.services.cloudSync: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=9ms, uxP95=14ms, codeAvg=9ms, codeP95=14ms, waitAvg=0ms
- boot.step.services.configCompounds: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.doorsRuntime: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.editState: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.history: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.models: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.notes: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.sceneView: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.seedUiEphemeralDefaults: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- boot.step.services.viewport: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.assertDocument: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.errorsInstall: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.errorsSurface: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.modules.late: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.modules.main: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.ui.camera.prime: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.ui.first-render: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.history-baseline: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.ui.interactions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.interactions.canvas: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.interactions.viewer-resize: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.ui.models: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.ready-timers: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.ui.room.build: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=5ms, codeAvg=3ms, codeP95=5ms, waitAvg=0ms
- boot.ui.seed: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.shader-warmup.complete: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=199ms, uxP95=283ms, codeAvg=199ms, codeP95=283ms, waitAvg=0ms
- boot.ui.shader-warmup.submit: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=294ms, uxP95=572ms, codeAvg=294ms, codeP95=572ms, waitAvg=0ms
- boot.ui.store-reactivity: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.store-seed-history: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.ui.viewport: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=35ms, uxP95=51ms, codeAvg=35ms, codeP95=51ms, waitAvg=0ms
- boot.ui.viewport.attach: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.controls: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.viewport.create: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=30ms, uxP95=44ms, codeAvg=30ms, codeP95=44ms, waitAvg=0ms
- boot.ui.viewport.mirror-camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.viewport.mirror-target: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.ui.viewport.renderer-setup: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.ui.viewport.scene: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.scene-groups: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.scene-sync: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.ui.viewport.shader-warmup-schedule: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.webgl-renderer: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=24ms, uxP95=37ms, codeAvg=24ms, codeP95=37ms, waitAvg=0ms
- browser.cls: count=5, kinds=browser-metric, ok=5, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.inp: count=319, kinds=browser-metric, ok=319, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.lcp: count=4, kinds=browser-metric, ok=4, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.longTask: count=61, kinds=browser-metric, ok=61, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- builder.contents.folded-clothes: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=4ms, uxP95=27ms, codeAvg=4ms, codeP95=27ms, waitAvg=0ms
- builder.contents.hanging-clothes: count=1, kinds=phase, ok=1, error=0, mark=0, uxAvg=17ms, uxP95=17ms, codeAvg=17ms, codeP95=17ms, waitAvg=0ms
- builder.contents.total: count=9, kinds=phase, ok=9, error=0, mark=0, uxAvg=6ms, uxP95=27ms, codeAvg=6ms, codeP95=27ms, waitAvg=0ms
- builder.execute: count=109, kinds=phase, ok=109, error=0, mark=0, uxAvg=27ms, uxP95=55ms, codeAvg=27ms, codeP95=55ms, waitAvg=0ms
- cloudSync.floatingSync.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=11ms, uxP95=15ms, codeAvg=11ms, codeP95=15ms, waitAvg=0ms
- design.savedColor.add: count=7, kinds=action, ok=7, error=0, mark=0, uxAvg=328ms, uxP95=385ms, codeAvg=26ms, codeP95=45ms, waitAvg=302ms
- design.savedColor.add.mutation: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=26ms, uxP95=45ms, codeAvg=26ms, codeP95=45ms, waitAvg=0ms
- design.savedColor.add.order: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.add.patch: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- design.savedColor.add.prepare: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.add.prompt: count=7, kinds=interaction-wait, ok=7, error=0, mark=0, uxAvg=302ms, uxP95=368ms, codeAvg=0ms, codeP95=0ms, waitAvg=302ms
- design.savedColor.add.storage: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=21ms, uxP95=42ms, codeAvg=21ms, codeP95=42ms, waitAvg=0ms
- design.savedColor.delete: count=6, kinds=action, ok=6, error=0, mark=0, uxAvg=300ms, uxP95=329ms, codeAvg=28ms, codeP95=37ms, waitAvg=272ms
- design.savedColor.delete.confirm: count=6, kinds=interaction-wait, ok=6, error=0, mark=0, uxAvg=272ms, uxP95=299ms, codeAvg=0ms, codeP95=0ms, waitAvg=272ms
- design.savedColor.delete.mutation: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=27ms, uxP95=36ms, codeAvg=27ms, codeP95=36ms, waitAvg=0ms
- design.savedColor.delete.order: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.delete.patch: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- design.savedColor.delete.prepare: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.delete.storage: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=24ms, uxP95=32ms, codeAvg=24ms, codeP95=32ms, waitAvg=0ms
- design.savedColor.storage.commit: count=13, kinds=phase, ok=13, error=0, mark=0, uxAvg=22ms, uxP95=41ms, codeAvg=22ms, codeP95=41ms, waitAvg=0ms
- export.copy: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=32ms, uxP95=52ms, codeAvg=32ms, codeP95=52ms, waitAvg=0ms
- export.dual: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=81ms, uxP95=112ms, codeAvg=81ms, codeP95=112ms, waitAvg=0ms
- export.renderSketch: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=148ms, uxP95=212ms, codeAvg=148ms, codeP95=212ms, waitAvg=0ms
- export.snapshot: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=89ms, uxP95=89ms, codeAvg=89ms, codeP95=89ms, waitAvg=0ms
- mirror.cube.first-presentation: count=2, kinds=browser-metric, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- mirror.cube.reflection-ready: count=2, kinds=browser-metric, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- mirror.cube.update: count=82, kinds=browser-metric, ok=82, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- orderPdf.close: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- orderPdf.open: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- project.load: count=18, kinds=action, ok=17, error=1, mark=0, uxAvg=54ms, uxP95=106ms, codeAvg=54ms, codeP95=106ms, waitAvg=0ms
- project.load.apply: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=49ms, uxP95=104ms, codeAvg=49ms, codeP95=104ms, waitAvg=0ms
- project.load.parse: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- project.load.readFile: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=5ms, uxP95=9ms, codeAvg=5ms, codeP95=9ms, waitAvg=0ms
- project.resetDefault: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=349ms, uxP95=349ms, codeAvg=349ms, codeP95=349ms, waitAvg=0ms
- project.restoreLastSession: count=6, kinds=action, ok=5, error=0, mark=1, uxAvg=306ms, uxP95=405ms, codeAvg=306ms, codeP95=405ms, waitAvg=0ms
- project.save: count=8, kinds=action, ok=8, error=0, mark=0, uxAvg=337ms, uxP95=372ms, codeAvg=1ms, codeP95=2ms, waitAvg=335ms
- project.save.commit: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- project.save.dispatched: count=8, kinds=mark, ok=0, error=0, mark=8, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- project.save.download: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- project.save.export: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=2ms, uxP95=7ms, codeAvg=2ms, codeP95=7ms, waitAvg=0ms
- project.save.prompt: count=8, kinds=interaction-wait, ok=8, error=0, mark=0, uxAvg=336ms, uxP95=371ms, codeAvg=0ms, codeP95=0ms, waitAvg=336ms
- render.frame.auto-hide-room-floor: count=18, kinds=browser-metric, ok=18, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.controls: count=38, kinds=browser-metric, ok=38, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.mirror: count=38, kinds=browser-metric, ok=38, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.motion: count=38, kinds=browser-metric, ok=38, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.renderer: count=38, kinds=browser-metric, ok=38, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.total: count=38, kinds=browser-metric, ok=38, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.visual-effects: count=76, kinds=browser-metric, ok=76, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.settle: count=115, kinds=render-settle, ok=115, error=0, mark=0, uxAvg=19ms, uxP95=50ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- settingsBackup.export: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- settingsBackup.import: count=6, kinds=action, ok=5, error=1, mark=0, uxAvg=320ms, uxP95=328ms, codeAvg=27ms, codeP95=32ms, waitAvg=294ms
- settingsBackup.import.collections.commit: count=5, kinds=phase, ok=5, error=0, mark=0, uxAvg=5ms, uxP95=8ms, codeAvg=5ms, codeP95=8ms, waitAvg=0ms
- settingsBackup.import.commit: count=5, kinds=phase, ok=5, error=0, mark=0, uxAvg=8ms, uxP95=10ms, codeAvg=8ms, codeP95=10ms, waitAvg=0ms
- settingsBackup.import.confirm: count=6, kinds=interaction-wait, ok=6, error=0, mark=0, uxAvg=294ms, uxP95=296ms, codeAvg=0ms, codeP95=0ms, waitAvg=294ms
- settingsBackup.import.parse: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- settingsBackup.import.readFile: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=20ms, uxP95=30ms, codeAvg=20ms, codeP95=30ms, waitAvg=0ms
- settingsVisual.globalClick.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- store.commit.slow: count=7, kinds=browser-metric, ok=7, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- structure.dimensions.depth.commit: count=11, kinds=action, ok=11, error=0, mark=0, uxAvg=2ms, uxP95=6ms, codeAvg=2ms, codeP95=6ms, waitAvg=0ms
- structure.dimensions.height.commit: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- structure.dimensions.width.commit: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=3ms, uxP95=4ms, codeAvg=3ms, codeP95=4ms, waitAvg=0ms
- ui.header.sketch.toggle: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- viewer.contents.visibility.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- viewer.notes.drawMode.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- viewer.notes.visibility.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms

## Recent runtime entries

- render.frame.visual-effects: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- render.frame.controls: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- render.frame.visual-effects: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- render.frame.mirror: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- render.frame.renderer: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.longTask: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- settingsBackup.import.confirm: kind=interaction-wait, ux=292ms, code=0ms, interactionWait=292ms [ok]
- settingsBackup.import.readFile: kind=phase, ux=13ms, code=13ms, interactionWait=0ms [ok]
- settingsBackup.import.parse: kind=phase, ux=0ms, code=0ms, interactionWait=0ms [ok]
- settingsBackup.import.collections.commit: kind=phase, ux=3ms, code=3ms, interactionWait=0ms [ok]
- settingsBackup.import.commit: kind=phase, ux=6ms, code=6ms, interactionWait=0ms [ok]
- settingsBackup.import: kind=action, ux=312ms, code=20ms, interactionWait=292ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
