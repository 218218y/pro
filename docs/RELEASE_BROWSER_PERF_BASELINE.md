# Release browser perf + E2E baseline

Generated: 2026-08-23T13:43:11.213Z
Measurement profile: release (Release static UX)
Pipeline: wp_release:perf -> static-release-server -> Chromium
Page: /index.html; observability mode: perf
Environment: win32 x64; CPU=11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz (8 logical); Node=v24.18.0; browser=151.0.7922.174; viewport=1280x800; cache=fresh-browser-context-per-run
Runtime milliseconds are comparable only across runs with the same environment, artifact, viewport, cache policy, and sequence.

## User flow timings

- boot.shell-visible: 1410ms
- boot.operational-ready.wait: 2ms
- boot.autosave-ready.wait: 357ms
- boot.operational-ready: 1457ms
- boot.autosave-ready: 2411ms
- export.settings-tab.open: 429ms
- settings.visual.global-click.roundtrip: 357ms
- header.sketch-mode.roundtrip: 317ms
- viewer.notes.draw-mode.roundtrip: 385ms
- viewer.notes.visibility.roundtrip: 412ms
- viewer.contents.visibility.roundtrip: 878ms
- cabinet-core.configure: 2849ms
- cabinet-core.mixed-edit-burst: 5827ms
- cabinet-build-variants.profile-texture.configure: 2100ms
- cabinet-build-variants.authoring-matrix: 4200ms
- cabinet-build-variants.structure-material-door-burst: 5618ms
- cabinet-build-variants.option-burst: 2600ms
- cabinet-door-drawer-authoring.configure: 2757ms
- cabinet-door-drawer-authoring.mode-burst: 5649ms
- cabinet-door-drawer-authoring.layout-persistence-roundtrip: 2634ms
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip: 5752ms
- tab.settings.open: 69ms
- export.snapshot.download: 624ms
- export.copy.clipboard: 253ms
- export.render-sketch.clipboard: 346ms
- export.dual.clipboard: 279ms
- settings-backup.roundtrip: 5302ms
- cloud-sync.floating.toggle-on: 216ms
- cloud-sync.floating.toggle-off: 168ms
- order-pdf.open-close.initial: 1099ms
- project.save-load.roundtrip: 1039ms
- project.reset-default.confirmed: 678ms
- export.clipboard.pressure: 1868ms
- order-pdf.reopen.pressure: 479ms
- project.restore-last-session: 1365ms
- project.persistence-recovery.burst: 8494ms
- project.load.invalid-keeps-state: 71ms
- project.load.recovery-sequence: 942ms
- project.restore-last-session.missing-autosave: 1970ms
- settings-backup.invalid-import-keeps-state: 7561ms

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
- boot.milestone.autosave-ready: statuses=mark, ok=0, error=0, mark=2, mixed=no
- boot.milestone.operational-ready: statuses=mark, ok=0, error=0, mark=2, mixed=no

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

- boot.milestone.autosave-ready: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none
- boot.milestone.operational-ready: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none
- boot.milestone.shell-visible: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none
- boot.react.mounted.reactOverlayRoot: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none
- boot.react.mounted.reactSidebarRoot: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none

### Required recovery proveout

- project.load: recovered>=1, stableRecoveries>=1, cleanRecoveries>=1, postRecoveryOkStreak>=3, recoverySpan<=1, unresolved<=0, relapses<=0
- project.restoreLastSession: recovered>=1, stableRecoveries>=1, cleanRecoveries>=1, postRecoveryOkStreak>=3, recoverySpan<=1, unresolved<=0, relapses<=0
- settingsBackup.import: recovered>=1, stableRecoveries>=1, cleanRecoveries>=1, postRecoveryOkStreak>=3, recoverySpan<=1, unresolved<=0, relapses<=0

## Runtime recovery debt

- project.save.dispatched: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=8, unresolved=1
- boot.milestone.autosave-ready: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=2, unresolved=1
- boot.milestone.operational-ready: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=2, unresolved=1
- boot.milestone.shell-visible: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=2, unresolved=1
- boot.react.mounted.reactOverlayRoot: debtCount=1, totalDebt=0ms, avgDebt=0ms, p95Debt=0ms, maxDebt=0ms, maxDebtEntries=2, unresolved=1

## Runtime recovery hangover

- settingsBackup.import: recovered=1, steadyMedian=19ms, p95RecoveryWindow=25ms, maxRecoveryWindow=25ms, p95HangoverRatio=1.3x, maxHangoverRatio=1.3x, lingeringSettling=0
- project.restoreLastSession: recovered=1, steadyMedian=380ms, p95RecoveryWindow=380ms, maxRecoveryWindow=380ms, p95HangoverRatio=1x, maxHangoverRatio=1x, lingeringSettling=0
- project.load: recovered=1, steadyMedian=56ms, p95RecoveryWindow=44ms, maxRecoveryWindow=44ms, p95HangoverRatio=0.8x, maxHangoverRatio=0.8x, lingeringSettling=0

## Browser responsiveness metrics

- observerSupported=true, CLS=0 (5 shifts), LCP=1360ms, INP=232ms (299 interactions, source=event), Long Tasks=41 / total=4035ms / p95=192ms, render-settle=95 / p95=46ms

### Boot readiness truth

| Milestone         | Time from navigation | Meaning                                                              |
| ----------------- | -------------------: | -------------------------------------------------------------------- |
| shell-visible     |               1410ms | React shell mounted and viewer canvas attached                       |
| operational-ready |               1457ms | lifecycle bootReady reached after required UI boot and builder flush |
| autosave-ready    |               2411ms | delayed systemReady reached; autosave may activate                   |

### Top Long-Task Journeys

- cabinet-door-drawer-authoring: count=21, total=1506ms, max=127ms, p95=120ms, renderSettle=26 / total=223ms
- cabinet-core-authoring: count=9, total=1267ms, max=508ms, p95=508ms, renderSettle=26 / total=585ms
- boot-and-shell: count=3, total=634ms, max=463ms, p95=463ms, renderSettle=1 / total=4ms
- export-authoring: count=4, total=375ms, max=130ms, p95=130ms, renderSettle=0 / total=0ms
- cabinet-build-variants: count=2, total=126ms, max=66ms, p95=66ms, renderSettle=36 / total=800ms
- order-pdf-lifecycle: count=1, total=62ms, max=62ms, p95=62ms, renderSettle=0 / total=0ms
- project-roundtrip: count=0, total=0ms, max=0ms, p95=0ms, renderSettle=2 / total=13ms
- settings-backup-resilience: count=0, total=0ms, max=0ms, p95=0ms, renderSettle=3 / total=49ms

### Top Long-Task Steps

| Step                                                           | Long tasks |  Total |   Max | Render settle |
| -------------------------------------------------------------- | ---------: | -----: | ----: | ------------: |
| cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip |         14 | 1001ms | 127ms |          34ms |
| viewer.contents.visibility.roundtrip                           |          2 |  653ms | 508ms |          51ms |
| boot.autosave-ready.wait                                       |          2 |  540ms | 463ms |           4ms |
| cabinet-door-drawer-authoring.layout-persistence-roundtrip     |          5 |  372ms | 120ms |          16ms |
| cabinet-core.configure                                         |          3 |  262ms | 130ms |         198ms |
| header.sketch-mode.roundtrip                                   |          1 |  192ms | 192ms |           1ms |
| cabinet-core.mixed-edit-burst                                  |          3 |  160ms |  57ms |         250ms |
| export.clipboard.pressure                                      |          2 |  151ms |  94ms |           0ms |
| export.render-sketch.clipboard                                 |          1 |  130ms | 130ms |           0ms |
| cabinet-build-variants.authoring-matrix                        |          2 |  126ms |  66ms |         278ms |
| boot.shell-visible                                             |          1 |   94ms |  94ms |           0ms |
| export.snapshot.download                                       |          1 |   94ms |  94ms |           0ms |
| cabinet-door-drawer-authoring.configure                        |          1 |   81ms |  81ms |          84ms |
| order-pdf.open-close.initial                                   |          1 |   62ms |  62ms |           0ms |
| cabinet-door-drawer-authoring.mode-burst                       |          1 |   52ms |  52ms |          90ms |
| cabinet-build-variants.option-burst                            |          0 |    0ms |   0ms |          76ms |
| cabinet-build-variants.profile-texture.configure               |          0 |    0ms |   0ms |          15ms |
| cabinet-build-variants.structure-material-door-burst           |          0 |    0ms |   0ms |         430ms |
| project.reset-default.confirmed                                |          0 |    0ms |   0ms |          10ms |
| project.save-load.roundtrip                                    |          0 |    0ms |   0ms |           3ms |

### Largest Long-Task root causes

| Journey                | Step                                 | Duration | Builder | Render | Store (exact slow commits) | Store step total | Unattributed |
| ---------------------- | ------------------------------------ | -------: | ------: | -----: | -------------------------: | ---------------: | -----------: |
| cabinet-core-authoring | viewer.contents.visibility.roundtrip |    508ms |   508ms |    0ms |                        0ms |              3ms |          0ms |
| boot-and-shell         | boot.autosave-ready.wait             |    463ms |     0ms |    0ms |                        0ms |              0ms |          0ms |
| cabinet-core-authoring | header.sketch-mode.roundtrip         |    192ms |     0ms |  192ms |                        0ms |              1ms |          0ms |
| cabinet-core-authoring | viewer.contents.visibility.roundtrip |    145ms |     0ms |  145ms |                        0ms |              3ms |          0ms |
| cabinet-core-authoring | cabinet-core.configure               |    130ms |     0ms |  130ms |                        0ms |              8ms |          0ms |

### UX target status (advisory)

- These product UX targets are fixed independently from the generated regression baseline; baseline regeneration cannot widen them.
- CLS: met, value=0, target<=0.1
- LCP: met, value=1360ms, target<=2500ms
- INP: missed, value=232ms, target<=200ms, gap=32ms

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

- add: uxAvg=345ms, uxP95=383ms, interactionWaitAvg=327ms, interactionWaitP95=373ms, codeAvg=19ms, codeP95=49ms, prepare=0ms, order=0ms, mutation=18ms, patch=1ms, storage=14ms, bottleneck=feedback-wait
- delete: uxAvg=347ms, uxP95=388ms, interactionWaitAvg=331ms, interactionWaitP95=362ms, codeAvg=16ms, codeP95=26ms, prepare=0ms, order=0ms, mutation=15ms, patch=1ms, storage=12ms, bottleneck=feedback-wait

### Settings backup import phase breakdown

- import: uxAvg=351ms, uxP95=373ms, confirmWaitAvg=328ms, confirmWaitP95=349ms, codeAvg=24ms, codeP95=31ms, readFile=13ms, parse=0ms, modelsMerge=0ms, colors=0ms, modelsFinalize=0ms, storageWrite=0ms x0, bottleneck=confirm-wait

## Store write pressure

Store commits: 83, no-op skips: 9, noBuild commits: 71, selector filtered: 2713, selector evaluations: 536, selector notifications: 140, tracked sources: 21, slow sources: 0, total source time: 39ms

### Store-heavy user-flow steps

- cabinet-build-variants.structure-material-door-burst: commits=57, selectorFiltered=2275, selectorEval=347, selectorNotify=101, sourceTime=25ms, duration=5618ms, topSources=PATCH:actions:room:setWardrobeType:restore:ui+config, PATCH:react:tabs:set:ui, PATCH:react:boardMaterial:config
- cabinet-door-drawer-authoring.mode-burst: commits=43, selectorFiltered=1755, selectorEval=223, selectorNotify=109, sourceTime=117ms, duration=5649ms, topSources=PATCH:react:interior:sketchIntDrawersToggle:ui, PATCH:react:design:removeDoorsEnabled:ui, PATCH:react:design:groovesEnabled:ui
- cabinet-build-variants.authoring-matrix: commits=37, selectorFiltered=1477, selectorEval=225, selectorNotify=65, sourceTime=19ms, duration=4200ms, topSources=PATCH:actions:room:setWardrobeType:restore:ui+config, PATCH:react:tabs:set:ui, PATCH:react:design:doorStyle:ui
- project.persistence-recovery.burst: commits=34, selectorFiltered=1219, selectorEval=209, selectorNotify=61, sourceTime=14ms, duration=8494ms, topSources=PATCH:react:tabs:set:ui, PATCH:project.load:ui+config+runtime+mode+meta, PATCH:react:structure:width:ui
- cabinet-core.mixed-edit-burst: commits=33, selectorFiltered=1332, selectorEval=186, selectorNotify=53, sourceTime=16ms, duration=5827ms, topSources=PATCH:react:tabs:set:ui, PATCH:react:design:savedColors:add:ui+config, PATCH:react:structure:width:ui

### Top store sources

- PATCH:project.load:ui+config+runtime+mode+meta: source=project.load, type=PATCH, slices=ui+config+runtime+mode+meta, count=9, noBuild=9, total=11ms, max=3ms, slow=0
- PATCH:react:tabs:set:ui: source=react:tabs:set, type=PATCH, slices=ui, count=17, noBuild=17, total=5ms, max=1ms, slow=0
- PATCH:autosave:info:ui: source=autosave:info, type=PATCH, slices=ui, count=12, noBuild=12, total=4ms, max=1ms, slow=0
- PATCH:react:project:name:ui: source=react:project:name, type=PATCH, slices=ui, count=9, noBuild=9, total=3ms, max=1ms, slow=0
- PATCH:react:design:savedColors:delete:ui+config: source=react:design:savedColors:delete, type=PATCH, slices=ui+config, count=3, noBuild=0, total=3ms, max=2ms, slow=0

## Builder scheduling pressure

Build requests: 27, executes: 25, immediate requests: 9, debounced requests: 18, immediate force: 9, immediate non-force: 0, coalesced force: 0, coalesced non-force: 18, force requests: 9, force executes: 9, pending overwrites: 3, suppressed requests: 0, suppressed executes: 0, debounce schedules: 18

### Build execution duration

- all: count=25, ok=25, error=0, total=793ms, avg=32ms, p95=52ms, max=75ms
- immediate: count=9, avg=37ms, p95=75ms, max=75ms
- debounced: count=16, avg=28ms, p95=52ms, max=52ms
- force: count=9, avg=37ms, p95=75ms, max=75ms
- non-force: count=16, avg=28ms, p95=52ms, max=52ms

### Slow build reasons by execution duration

- project.load: count=9, ok=9, error=0, total=337ms, avg=37ms, p95=75ms, max=75ms
- react:structure:height: count=1, ok=1, error=0, total=52ms, avg=52ms, p95=52ms, max=52ms
- react:design:palette:saved: count=3, ok=3, error=0, total=112ms, avg=37ms, p95=43ms, max=43ms
- react:structure:depth: count=2, ok=2, error=0, total=69ms, avg=35ms, p95=38ms, max=38ms
- react:design:savedColors:delete: count=3, ok=3, error=0, total=91ms, avg=30ms, p95=34ms, max=34ms

### Build-heavy user-flow steps

- cabinet-build-variants.structure-material-door-burst: requests=25, executes=16, immediateForce=4, immediateNonForce=0, coalescedForce=0, coalescedNonForce=21, forceRequests=4, forceExecutes=4, pendingOverwrites=9, suppressedRequests=0, debounce=21, duration=5618ms, topReasons=actions:room:setWardrobeType:recompute, react:boardMaterial, react:structure:depth
- cabinet-build-variants.authoring-matrix: requests=17, executes=13, immediateForce=2, immediateNonForce=0, coalescedForce=0, coalescedNonForce=15, forceRequests=2, forceExecutes=2, pendingOverwrites=4, suppressedRequests=0, debounce=15, duration=4200ms, topReasons=react:design:doorStyle, react:boardMaterial, react:header:sketch
- cabinet-core.mixed-edit-burst: requests=18, executes=12, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=18, forceRequests=0, forceExecutes=0, pendingOverwrites=6, suppressedRequests=0, debounce=18, duration=5827ms, topReasons=react:structure:depth, react:design:custom:pickColor, react:design:savedColors:add
- project.persistence-recovery.burst: requests=14, executes=11, immediateForce=2, immediateNonForce=0, coalescedForce=0, coalescedNonForce=12, forceRequests=2, forceExecutes=2, pendingOverwrites=3, suppressedRequests=0, debounce=12, duration=8494ms, topReasons=react:design:custom:pickColor, react:design:savedColors:add, react:header:sketch
- cabinet-door-drawer-authoring.mode-burst: requests=12, executes=9, immediateForce=2, immediateNonForce=3, coalescedForce=0, coalescedNonForce=7, forceRequests=2, forceExecutes=2, pendingOverwrites=3, suppressedRequests=0, debounce=7, duration=5649ms, topReasons=react:boardMaterial, react:interior:sketchIntDrawersToggle, react:design:doorStyle

### Top build reasons

- project.load: requests=9, executes=9, immediateRequests=9, debouncedRequests=0, immediateForce=9, immediateNonForce=0, coalescedForce=0, coalescedNonForce=0, forceRequests=9, forceExecutes=9
- react:design:palette:saved: requests=3, executes=3, immediateRequests=0, debouncedRequests=3, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=3, forceRequests=0, forceExecutes=0
- react:design:savedColors:delete: requests=3, executes=3, immediateRequests=0, debouncedRequests=3, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=3, forceRequests=0, forceExecutes=0
- react:design:custom:pickColor: requests=2, executes=2, immediateRequests=0, debouncedRequests=2, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=2, forceRequests=0, forceExecutes=0
- react:design:savedColors:add: requests=2, executes=2, immediateRequests=0, debouncedRequests=2, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=2, forceRequests=0, forceExecutes=0

### Build-heavy customer journeys

- cabinet-build-variants: steps=4, requests=49, executes=36, immediateForce=8, immediateNonForce=0, coalescedForce=0, coalescedNonForce=41, forceRequests=8, forceExecutes=8, pendingOverwrites=13, suppressedRequests=0, debounce=41, total=14518ms, topReasons=actions:room:setWardrobeType:recompute, react:design:doorStyle, react:boardMaterial
- cabinet-door-drawer-authoring: steps=4, requests=29, executes=26, immediateForce=16, immediateNonForce=4, coalescedForce=0, coalescedNonForce=9, forceRequests=16, forceExecutes=16, pendingOverwrites=3, suppressedRequests=0, debounce=9, total=16792ms, topReasons=project.load, react:interior:sketchIntDrawersToggle, react:boardMaterial
- cabinet-core-authoring: steps=7, requests=27, executes=20, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=27, forceRequests=0, forceExecutes=0, pendingOverwrites=7, suppressedRequests=0, debounce=27, total=11025ms, topReasons=react:header:sketch, react:structure:depth, react:design:custom:pickColor
- project-roundtrip: steps=4, requests=17, executes=14, immediateForce=5, immediateNonForce=0, coalescedForce=0, coalescedNonForce=12, forceRequests=5, forceExecutes=5, pendingOverwrites=3, suppressedRequests=0, debounce=12, total=11576ms, topReasons=project.load, react:design:custom:pickColor, react:design:savedColors:add
- settings-backup-resilience: steps=2, requests=9, executes=9, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=9, forceRequests=0, forceExecutes=0, pendingOverwrites=0, suppressedRequests=0, debounce=9, total=12863ms, topReasons=react:design:savedColors:delete, react:design:palette:saved, react:design:custom:pickColor

## Customer journeys

- cabinet-build-variants: steps=4, total=14518ms, avgStep=3630ms, maxStep=5618ms, commits=118, selectorFiltered=4713, selectorEval=715, selectorNotify=209, sourceTime=55ms, topSources=PATCH:actions:room:setWardrobeType:restore:ui+config, PATCH:actions:room:setWardrobeType:runtime, PATCH:react:boardMaterial:config, PATCH:react:design:doorStyle:ui, PATCH:react:design:savedColors:add:ui+config
- cabinet-door-drawer-authoring: steps=4, total=16792ms, avgStep=4198ms, maxStep=5752ms, commits=111, selectorFiltered=4254, selectorEval=852, selectorNotify=293, sourceTime=174ms, topSources=PATCH:autosave:info:ui, PATCH:project.load:ui+config+runtime+mode+meta, PATCH:react:design:groovesEnabled:ui, PATCH:react:design:removeDoorsEnabled:ui, PATCH:react:interior:sketchIntDrawersToggle:ui
- cabinet-core-authoring: steps=7, total=11025ms, avgStep=1575ms, maxStep=5827ms, commits=59, selectorFiltered=2398, selectorEval=316, selectorNotify=96, sourceTime=32ms, topSources=PATCH:react:design:savedColors:add:ui+config, PATCH:react:header:sketch:runtime, PATCH:react:settingsVisual:globalClick:runtime, PATCH:react:settingsVisual:globalClickUi:ui, PATCH:react:sketch:syncUi:ui
- project-roundtrip: steps=4, total=11576ms, avgStep=2894ms, maxStep=8494ms, commits=48, selectorFiltered=1666, selectorEval=330, selectorNotify=102, sourceTime=23ms, topSources=PATCH:autosave:info:ui, PATCH:builder:dims:runtime, PATCH:project.load:ui+config+runtime+mode+meta, PATCH:react:project:name:ui, PATCH:react:structure:width:ui
- export-authoring: steps=6, total=3439ms, avgStep=573ms, maxStep=1868ms, commits=34, selectorFiltered=1394, selectorEval=170, selectorNotify=40, sourceTime=10ms, topSources=PATCH:doors:runtime, PATCH:export:runtime, PATCH:react:tabs:set:ui, PATCH:room:updateWall:ui

### Journey diagnosis

- project-roundtrip: bottleneck=duration-heavy, burstySteps=4, repeatedSources=3, dominantSourceShare=34%, dominantSource=8ms, topStep=project.persistence-recovery.burst, topSource=PATCH:project.load:ui+config+runtime+mode+meta, burstyStepNames=project.persistence-recovery.burst, project.reset-default.confirmed, project.restore-last-session, project.save-load.roundtrip
- cabinet-build-variants: bottleneck=duration-heavy, burstySteps=4, repeatedSources=3, dominantSourceShare=30%, dominantSource=16ms, topStep=cabinet-build-variants.structure-material-door-burst, topSource=PATCH:actions:room:setWardrobeType:restore:ui+config, burstyStepNames=cabinet-build-variants.authoring-matrix, cabinet-build-variants.option-burst, cabinet-build-variants.profile-texture.configure, cabinet-build-variants.structure-material-door-burst
- cabinet-door-drawer-authoring: bottleneck=duration-heavy, burstySteps=4, repeatedSources=1, dominantSourceShare=39%, dominantSource=67ms, topStep=cabinet-door-drawer-authoring.mode-burst, topSource=PATCH:react:interior:sketchIntDrawersToggle:ui, burstyStepNames=cabinet-door-drawer-authoring.configure, cabinet-door-drawer-authoring.layout-persistence-roundtrip, cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip, cabinet-door-drawer-authoring.mode-burst
- export-authoring: bottleneck=duration-heavy, burstySteps=2, repeatedSources=3, dominantSourceShare=73%, dominantSource=7ms, topStep=export.clipboard.pressure, topSource=PATCH:room:updateWall:ui, burstyStepNames=export.clipboard.pressure, export.render-sketch.clipboard
- project-recovery-proveout: bottleneck=duration-heavy, burstySteps=2, repeatedSources=3, dominantSourceShare=55%, dominantSource=5ms, topStep=project.load.recovery-sequence, topSource=PATCH:project.load:ui+config+runtime+mode+meta, burstyStepNames=project.load.recovery-sequence, project.restore-last-session.missing-autosave

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

- cabinet-build-variants.authoring-matrix.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build authoring matrix should settle back to the canonical profile + texture authoring state)
- cabinet-build-variants.option-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build variants burst should settle back to the canonical profile + texture authoring state)
- cabinet-build-variants.structure-material-door-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build variants structure/material/door burst should settle back to the canonical profile + texture authoring state)
- cabinet-core.mixed-edit-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פוסט","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":1,"savedColorValues":["#556629"],"savedTextureCount":0,"selectedSavedSwatchId":"saved_1787492598473","selectedSavedSwatchKind":"color","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פוסט","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":1,"savedColorValues":["#556629"],"savedTextureCount":0,"selectedSavedSwatchId":"saved_1787492598473","selectedSavedSwatchKind":"color","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Mixed cabinet editing burst should settle back to the canonical cabinet core state)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.fixture-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer authored layout fixture should expose non-empty split/remove/groove/divider/drawer placement state through the perf fingerprint)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.reload-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer authored layout save-load roundtrip should preserve split/remove/groove/divider/drawer placement state)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.restored-authoring-state: ok (expected={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, actual={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, message=Door/drawer authored layout roundtrip should restore the canonical authoring toggle state after the seed project reload)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.restored-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Seed 1787492628635","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Seed 1787492628635","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Door/drawer authored layout roundtrip should restore the canonical cabinet core fingerprint after the seed project reload)
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
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.restored-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787492631341","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787492631341","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Door/drawer layout matrix roundtrip should restore the canonical cabinet core fingerprint after the seed project reload)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.fixture-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut should expose the expected cut/remove/drawer authoring fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.reload-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut save-load roundtrip should preserve the authored cut/remove/drawer fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.saved-project-payload: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":10,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]},{"doorKey":"d4_full","trims":[{"axis":"vertical","color":"silver","sizeCm":null,"span":"third"}]}],"drawerDividerKeys":["div:int_2"],"grooveLinesCount":9,"grooveLinesCountEntries":[["d1_full",9],["d2_full",7],["d4_full",5]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full","groove_d4_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":false,"removedDoorKeys":[],"splitDoorBottomKeys":["splitb_d1","splitb_d3"],"splitDoorKeys":["split_d1","split_d2","split_d3","split_d4"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[],"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":10,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]},{"doorKey":"d4_full","trims":[{"axis":"vertical","color":"silver","sizeCm":null,"span":"third"}]}],"drawerDividerKeys":["div:int_2"],"grooveLinesCount":9,"grooveLinesCountEntries":[["d1_full",9],["d2_full",7],["d4_full",5]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full","groove_d4_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":false,"removedDoorKeys":[],"splitDoorBottomKeys":["splitb_d1","splitb_d3"],"splitDoorKeys":["split_d1","split_d2","split_d3","split_d4"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[],"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut save should persist the authored cut/remove/drawer project payload branches)
- cabinet-door-drawer-authoring.mode-burst.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Cabinet Browser Perf 1787492596702","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#556629","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787492606787","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cabinet door/drawer authoring burst should preserve the canonical cabinet core fingerprint)
- cabinet-door-drawer-authoring.mode-burst.restored-state: ok (expected={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, actual={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, message=Cabinet door/drawer authoring burst should settle back to the canonical authoring option state)
- project.load.invalid-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Invalid project load should preserve visible user state)
- project.load.recovery-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third valid project load after recovery should keep the recovered project state clean and relapse-free)
- project.load.recovery-restores-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A valid project load after an invalid load should recover the saved project state)
- project.load.recovery-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated valid project load after a failure should remain stable and preserve the recovered project state)
- project.persistence-recovery.load-restores-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cross-surface persistence burst should restore the canonical cabinet build options, selected texture state, dimensions, colors, and sketch mode after a valid project load)
- project.persistence-recovery.restore-restores-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cross-surface persistence burst should restore the canonical cabinet build options, selected texture state, dimensions, colors, and sketch mode after restore-last-session)
- project.restore-last-session.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Restore-last-session should rebuild the saved cabinet build options, selected texture state, dimensions, colors, and sketch mode after the app reloads)
- project.restore-last-session.missing-autosave-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Restore-last-session without autosave should keep user state unchanged)
- project.restore-last-session.recovery-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third restore-last-session after recovery should keep the saved project state clean and relapse-free)
- project.restore-last-session.recovery-restores-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A restore-last-session after a missing-autosave no-op should recover the saved project state once autosave returns)
- project.restore-last-session.recovery-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated restore-last-session after recovery should remain stable and preserve the saved project state)
- project.restore-last-session.saved-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Restore-last-session should rebuild the saved project fingerprint)
- project.save-load.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Project roundtrip should preserve cabinet build options, dimensions, selected texture state, colors, and sketch mode)
- settings-backup.invalid-import-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Invalid settings backup import should preserve visible user state)
- settings-backup.recovery-import-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#556629","#598474","#614374","#616364","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#556629","#598474","#614374","#616364","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third valid settings backup import after recovery should keep the imported state clean and relapse-free)
- settings-backup.recovery-import-merges-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#556629","#598474","#614374","#616364","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#556629","#598474","#614374","#616364","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A valid settings backup import after an invalid import should merge canonical backup colors into the current state)
- settings-backup.recovery-import-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#556629","#598474","#614374","#616364","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787492638958","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#556629","#598474","#614374","#616364","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated valid settings backup import after recovery should remain stable and preserve the canonical backup state)
- settings-backup.reimport.idempotent: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787492631341","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787492631341","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated settings backup import should stay idempotent)
- settings-backup.roundtrip.saved-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787492631341","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787492631341","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#556629","#598474","saved_1787492606787"],"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Settings backup import should rebuild the exported saved-color state)

## Sustained-use pressure signals

- project.load: count=18/6, firstAvg=57ms, lastAvg=42ms, rawDrift=0ms (0%), materialDrift=0%, comparable=no, errors=1
- settingsBackup.import: count=6/6, firstAvg=24ms, lastAvg=23ms, rawDrift=0ms (0%), materialDrift=0%, comparable=no, errors=1
- design.savedColor.delete.storage: count=6/3, firstAvg=9ms, lastAvg=14ms, rawDrift=5ms (55.2%), materialDrift=0%, comparable=yes, errors=0
- project.restoreLastSession: count=6/6, firstAvg=259ms, lastAvg=367ms, rawDrift=108ms (41.69%), materialDrift=0%, comparable=no, errors=0
- design.savedColor.delete.mutation: count=6/3, firstAvg=13ms, lastAvg=17ms, rawDrift=5ms (38.98%), materialDrift=0%, comparable=yes, errors=0

## Runtime domains

- project: required=4/4, metrics=12, entries=127, errors=1, marks=9, uxTotal=9485ms, codeTotal=4137ms, interactionWait=5348ms, maxCodeP95=413ms, worstCodeDrift=0%
- settings-backup: required=2/2, metrics=7, entries=35, errors=1, marks=0, uxTotal=4257ms, codeTotal=323ms, interactionWait=3934ms, maxCodeP95=31ms, worstCodeDrift=0%
- other: required=5/5, metrics=11, entries=513, errors=0, marks=0, uxTotal=3609ms, codeTotal=3609ms, interactionWait=0ms, maxCodeP95=52ms, worstCodeDrift=0%
- boot: required=2/2, metrics=101, entries=206, errors=0, marks=10, uxTotal=1443ms, codeTotal=1443ms, interactionWait=0ms, maxCodeP95=464ms, worstCodeDrift=0%
- export: required=4/4, metrics=4, entries=10, errors=0, marks=0, uxTotal=908ms, codeTotal=908ms, interactionWait=0ms, maxCodeP95=168ms, worstCodeDrift=0%

## Hotspot candidates

- project.load: codeTotal=887ms, codeP95=74ms, codeMax=74ms, uxTotal=887ms, interactionWait=0ms, count=18, errors=1
- settingsBackup.import: codeTotal=142ms, codeP95=31ms, codeMax=31ms, uxTotal=2108ms, interactionWait=1967ms, count=6, errors=1
- builder.execute: codeTotal=3582ms, codeP95=52ms, codeMax=508ms, uxTotal=3582ms, interactionWait=0ms, count=114, errors=0
- project.restoreLastSession: codeTotal=1879ms, codeP95=397ms, codeMax=397ms, uxTotal=1879ms, interactionWait=0ms, count=6, errors=0
- project.load.apply: codeTotal=836ms, codeP95=70ms, codeMax=70ms, uxTotal=836ms, interactionWait=0ms, count=18, errors=0

- boot.browser.setup: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- boot.milestone.autosave-ready: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.milestone.operational-ready: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.milestone.shell-visible: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.phase.adapters: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.phase.addons: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.phase.builder: count=4, kinds=phase, ok=4, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.phase.final: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=8ms, uxP95=10ms, codeAvg=8ms, codeP95=10ms, waitAvg=0ms
- boot.phase.kernel: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=6ms, uxP95=6ms, codeAvg=6ms, codeP95=6ms, waitAvg=0ms
- boot.phase.platform: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=4ms, uxP95=4ms, codeAvg=4ms, codeP95=4ms, waitAvg=0ms
- boot.phase.services: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=16ms, uxP95=20ms, codeAvg=16ms, codeP95=20ms, waitAvg=0ms
- boot.phase.smoke: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.phase.ui: count=4, kinds=phase, ok=4, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.post-mount.app-start.readiness: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=245ms, uxP95=369ms, codeAvg=245ms, codeP95=369ms, waitAvg=0ms
- boot.pre-react: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=40ms, uxP95=48ms, codeAvg=40ms, codeP95=48ms, waitAvg=0ms
- boot.react.mount.reactOverlayRoot: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.react.mount.reactSidebarRoot: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.react.mounted.reactOverlayRoot: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.react.mounted.reactSidebarRoot: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.react.shell.mount: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.step.adapters.browser.activeElementIdReader: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.adapters.browser.surface: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.builder.core.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.builder.provide: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.step.builder.provide.refresh: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.builder.roomDesign: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.data.presetModels: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=4ms, uxP95=5ms, codeAvg=4ms, codeP95=5ms, waitAvg=0ms
- boot.step.io.projectIo: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.applyPlatformBootFlags: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.kernel.assertCanonicalActions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.assertStateKernel: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.cfgMeta: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.domainApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.kernel.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=4ms, uxP95=4ms, codeAvg=4ms, codeP95=4ms, waitAvg=0ms
- boot.step.kernel.mapsApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.stateApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.layers.core: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.layers.engine: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.applyRuntimeConfigDefaults: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.assertStore: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.bootMain: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.cachePruning: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.ensureGeometryCaches: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.initRenderState: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- boot.step.platform.lifecycleVisibility: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.pickingPrimitives: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.renderLoop: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.renderScheduler: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.smokeChecks: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.threeCleanup: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.threeGeometryCachePatch: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.appStart: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.autosave: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.bootFinalizers: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.bootSeedsPart02: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.step.services.buildReactions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.canvasPicking: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.cloudCollections: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.step.services.cloudSync: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=9ms, uxP95=12ms, codeAvg=9ms, codeP95=12ms, waitAvg=0ms
- boot.step.services.configCompounds: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.doorsRuntime: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.editState: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.history: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.models: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.notes: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.sceneView: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.seedUiEphemeralDefaults: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.step.services.viewport: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.assertDocument: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.errorsInstall: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.errorsSurface: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.modules.late: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.modules.main: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.ui.camera.prime: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.first-render: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.history-baseline: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.interactions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.interactions.canvas: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.interactions.viewer-resize: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.models: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.ready-timers: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.room.build: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=4ms, codeAvg=3ms, codeP95=4ms, waitAvg=0ms
- boot.ui.seed: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.shader-warmup.execute: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=259ms, uxP95=464ms, codeAvg=259ms, codeP95=464ms, waitAvg=0ms
- boot.ui.store-reactivity: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.store-seed-history: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.ui.viewport: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=32ms, uxP95=44ms, codeAvg=32ms, codeP95=44ms, waitAvg=0ms
- boot.ui.viewport.attach: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.controls: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.viewport.create: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=27ms, uxP95=38ms, codeAvg=27ms, codeP95=38ms, waitAvg=0ms
- boot.ui.viewport.mirror-camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.mirror-target: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.renderer-setup: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.ui.viewport.scene: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.scene-groups: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.scene-sync: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.ui.viewport.shader-warmup-schedule: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.webgl-renderer: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=21ms, uxP95=31ms, codeAvg=21ms, codeP95=31ms, waitAvg=0ms
- browser.cls: count=5, kinds=browser-metric, ok=5, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.inp: count=310, kinds=browser-metric, ok=310, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.lcp: count=4, kinds=browser-metric, ok=4, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.longTask: count=55, kinds=browser-metric, ok=55, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- builder.execute: count=114, kinds=phase, ok=114, error=0, mark=0, uxAvg=31ms, uxP95=52ms, codeAvg=31ms, codeP95=52ms, waitAvg=0ms
- cloudSync.floatingSync.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=12ms, uxP95=13ms, codeAvg=12ms, codeP95=13ms, waitAvg=0ms
- design.savedColor.add: count=7, kinds=action, ok=7, error=0, mark=0, uxAvg=345ms, uxP95=383ms, codeAvg=19ms, codeP95=49ms, waitAvg=327ms
- design.savedColor.add.mutation: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=18ms, uxP95=48ms, codeAvg=18ms, codeP95=48ms, waitAvg=0ms
- design.savedColor.add.order: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.add.patch: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- design.savedColor.add.prepare: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.add.prompt: count=7, kinds=interaction-wait, ok=7, error=0, mark=0, uxAvg=327ms, uxP95=373ms, codeAvg=0ms, codeP95=0ms, waitAvg=327ms
- design.savedColor.add.storage: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=14ms, uxP95=45ms, codeAvg=14ms, codeP95=45ms, waitAvg=0ms
- design.savedColor.delete: count=6, kinds=action, ok=6, error=0, mark=0, uxAvg=347ms, uxP95=388ms, codeAvg=16ms, codeP95=26ms, waitAvg=331ms
- design.savedColor.delete.confirm: count=6, kinds=interaction-wait, ok=6, error=0, mark=0, uxAvg=331ms, uxP95=362ms, codeAvg=0ms, codeP95=0ms, waitAvg=331ms
- design.savedColor.delete.mutation: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=15ms, uxP95=25ms, codeAvg=15ms, codeP95=25ms, waitAvg=0ms
- design.savedColor.delete.order: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.delete.patch: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- design.savedColor.delete.prepare: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.delete.storage: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=12ms, uxP95=23ms, codeAvg=12ms, codeP95=23ms, waitAvg=0ms
- design.savedColor.storage.commit: count=13, kinds=phase, ok=13, error=0, mark=0, uxAvg=13ms, uxP95=44ms, codeAvg=13ms, codeP95=44ms, waitAvg=0ms
- export.copy: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=51ms, uxP95=57ms, codeAvg=51ms, codeP95=57ms, waitAvg=0ms
- export.dual: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=75ms, uxP95=85ms, codeAvg=75ms, codeP95=85ms, waitAvg=0ms
- export.renderSketch: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=135ms, uxP95=168ms, codeAvg=135ms, codeP95=168ms, waitAvg=0ms
- export.snapshot: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=124ms, uxP95=124ms, codeAvg=124ms, codeP95=124ms, waitAvg=0ms
- orderPdf.close: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- orderPdf.open: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- project.load: count=18, kinds=action, ok=17, error=1, mark=0, uxAvg=49ms, uxP95=74ms, codeAvg=49ms, codeP95=74ms, waitAvg=0ms
- project.load.apply: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=46ms, uxP95=70ms, codeAvg=46ms, codeP95=70ms, waitAvg=0ms
- project.load.parse: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- project.load.readFile: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=2ms, uxP95=5ms, codeAvg=2ms, codeP95=5ms, waitAvg=0ms
- project.resetDefault: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=413ms, uxP95=413ms, codeAvg=413ms, codeP95=413ms, waitAvg=0ms
- project.restoreLastSession: count=6, kinds=action, ok=5, error=0, mark=1, uxAvg=313ms, uxP95=397ms, codeAvg=313ms, codeP95=397ms, waitAvg=0ms
- project.save: count=8, kinds=action, ok=8, error=0, mark=0, uxAvg=337ms, uxP95=381ms, codeAvg=3ms, codeP95=5ms, waitAvg=334ms
- project.save.commit: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- project.save.dispatched: count=8, kinds=mark, ok=0, error=0, mark=8, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- project.save.download: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- project.save.export: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=5ms, uxP95=10ms, codeAvg=5ms, codeP95=10ms, waitAvg=0ms
- project.save.prompt: count=8, kinds=interaction-wait, ok=8, error=0, mark=0, uxAvg=334ms, uxP95=378ms, codeAvg=0ms, codeP95=0ms, waitAvg=334ms
- render.frame.auto-hide-room-floor: count=11, kinds=browser-metric, ok=11, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.controls: count=25, kinds=browser-metric, ok=25, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.mirror: count=25, kinds=browser-metric, ok=25, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.motion: count=25, kinds=browser-metric, ok=25, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.renderer: count=25, kinds=browser-metric, ok=25, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.total: count=25, kinds=browser-metric, ok=25, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.visual-effects: count=50, kinds=browser-metric, ok=50, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.settle: count=120, kinds=render-settle, ok=120, error=0, mark=0, uxAvg=17ms, uxP95=45ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- settingsBackup.export: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=5ms, uxP95=5ms, codeAvg=5ms, codeP95=5ms, waitAvg=0ms
- settingsBackup.import: count=6, kinds=action, ok=5, error=1, mark=0, uxAvg=351ms, uxP95=373ms, codeAvg=24ms, codeP95=31ms, waitAvg=328ms
- settingsBackup.import.collections.commit: count=5, kinds=phase, ok=5, error=0, mark=0, uxAvg=8ms, uxP95=13ms, codeAvg=8ms, codeP95=13ms, waitAvg=0ms
- settingsBackup.import.commit: count=5, kinds=phase, ok=5, error=0, mark=0, uxAvg=12ms, uxP95=18ms, codeAvg=12ms, codeP95=18ms, waitAvg=0ms
- settingsBackup.import.confirm: count=6, kinds=interaction-wait, ok=6, error=0, mark=0, uxAvg=328ms, uxP95=349ms, codeAvg=0ms, codeP95=0ms, waitAvg=328ms
- settingsBackup.import.parse: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- settingsBackup.import.readFile: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=13ms, uxP95=25ms, codeAvg=13ms, codeP95=25ms, waitAvg=0ms
- settingsVisual.globalClick.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=5ms, codeAvg=3ms, codeP95=5ms, waitAvg=0ms
- store.commit.slow: count=4, kinds=browser-metric, ok=4, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- structure.dimensions.depth.commit: count=11, kinds=action, ok=11, error=0, mark=0, uxAvg=3ms, uxP95=5ms, codeAvg=3ms, codeP95=5ms, waitAvg=0ms
- structure.dimensions.height.commit: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=3ms, uxP95=7ms, codeAvg=3ms, codeP95=7ms, waitAvg=0ms
- structure.dimensions.width.commit: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=4ms, uxP95=8ms, codeAvg=4ms, codeP95=8ms, waitAvg=0ms
- ui.header.sketch.toggle: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- viewer.contents.visibility.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- viewer.notes.drawMode.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- viewer.notes.visibility.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms

## Recent runtime entries

- design.savedColor.delete.mutation: kind=phase, ux=14ms, code=14ms, interactionWait=0ms [ok]
- design.savedColor.delete: kind=action, ux=349ms, code=14ms, interactionWait=335ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- builder.execute: kind=phase, ux=26ms, code=26ms, interactionWait=0ms [ok]
- render.settle: kind=render-settle, ux=2ms, code=0ms, interactionWait=0ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- settingsBackup.import.confirm: kind=interaction-wait, ux=332ms, code=0ms, interactionWait=332ms [ok]
- settingsBackup.import.readFile: kind=phase, ux=7ms, code=7ms, interactionWait=0ms [ok]
- settingsBackup.import.parse: kind=phase, ux=0ms, code=0ms, interactionWait=0ms [ok]
- settingsBackup.import.collections.commit: kind=phase, ux=8ms, code=8ms, interactionWait=0ms [ok]
- settingsBackup.import.commit: kind=phase, ux=11ms, code=11ms, interactionWait=0ms [ok]
- settingsBackup.import: kind=action, ux=351ms, code=19ms, interactionWait=332ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
