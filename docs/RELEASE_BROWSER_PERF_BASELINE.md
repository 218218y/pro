# Release browser perf + E2E baseline

Generated: 2026-08-23T16:46:41.867Z
Measurement profile: release (Release static UX)
Pipeline: wp_release:perf -> static-release-server -> Chromium
Page: /index.html; observability mode: perf
Environment: win32 x64; CPU=11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz (8 logical); Node=v24.18.0; browser=151.0.7922.174; viewport=1280x800; cache=fresh-browser-context-per-run
Runtime milliseconds are comparable only across runs with the same environment, artifact, viewport, cache policy, and sequence.

## User flow timings

- boot.shell-visible: 1454ms
- boot.operational-ready.wait: 4ms
- boot.autosave-ready.wait: 2ms
- boot.operational-ready: 1521ms
- boot.autosave-ready: 2640ms
- export.settings-tab.open: 532ms
- settings.visual.global-click.roundtrip: 499ms
- header.sketch-mode.roundtrip: 1191ms
- viewer.notes.draw-mode.roundtrip: 460ms
- viewer.notes.visibility.roundtrip: 462ms
- viewer.contents.visibility.roundtrip: 1773ms
- adhesive-glass.first-use.black.apply-and-render: 2218ms
- adhesive-glass.first-use.variant-update-and-render: 601ms
- cabinet-core.configure: 4651ms
- cabinet-core.mixed-edit-burst: 9448ms
- cabinet-build-variants.profile-texture.configure: 2906ms
- cabinet-build-variants.authoring-matrix: 7523ms
- cabinet-build-variants.structure-material-door-burst: 10198ms
- cabinet-build-variants.option-burst: 3892ms
- cabinet-door-drawer-authoring.configure: 4768ms
- cabinet-door-drawer-authoring.mode-burst: 9027ms
- cabinet-door-drawer-authoring.layout-persistence-roundtrip: 4200ms
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip: 9099ms
- tab.settings.open: 149ms
- export.snapshot.download: 647ms
- export.copy.clipboard: 340ms
- export.render-sketch.clipboard: 1009ms
- export.dual.clipboard: 654ms
- settings-backup.roundtrip: 6230ms
- cloud-sync.floating.toggle-on: 294ms
- cloud-sync.floating.toggle-off: 199ms
- order-pdf.open-close.initial: 1143ms
- project.save-load.roundtrip: 1701ms
- project.reset-default.confirmed: 919ms
- export.clipboard.pressure: 2680ms
- order-pdf.reopen.pressure: 782ms
- project.restore-last-session: 2186ms
- project.persistence-recovery.burst: 10928ms
- project.load.invalid-keeps-state: 86ms
- project.load.recovery-sequence: 1617ms
- project.restore-last-session.missing-autosave: 2973ms
- settings-backup.invalid-import-keeps-state: 8378ms

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

- settingsBackup.import: recovered=1, steadyMedian=26ms, p95RecoveryWindow=32ms, maxRecoveryWindow=32ms, p95HangoverRatio=1.26x, maxHangoverRatio=1.26x, lingeringSettling=0
- project.restoreLastSession: recovered=1, steadyMedian=445ms, p95RecoveryWindow=402ms, maxRecoveryWindow=402ms, p95HangoverRatio=0.9x, maxHangoverRatio=0.9x, lingeringSettling=0
- project.load: recovered=1, steadyMedian=100ms, p95RecoveryWindow=78ms, maxRecoveryWindow=78ms, p95HangoverRatio=0.77x, maxHangoverRatio=0.77x, lingeringSettling=0

## Browser responsiveness metrics

- observerSupported=true, CLS=0 (6 shifts), LCP=1412ms, INP=424ms (306 interactions, source=event), Long Tasks=192 / total=24356ms / p95=324ms, render-settle=121 / p95=74ms

### Boot readiness truth

| Milestone         | Time from navigation | Meaning                                                              |
| ----------------- | -------------------: | -------------------------------------------------------------------- |
| shell-visible     |               1454ms | React shell mounted and viewer canvas attached                       |
| operational-ready |               1521ms | lifecycle bootReady reached after required UI boot and builder flush |
| autosave-ready    |               2640ms | delayed systemReady reached; autosave may activate                   |

### Top Long-Task Journeys

- cabinet-door-drawer-authoring: count=54, total=7549ms, max=428ms, p95=398ms, renderSettle=29 / total=352ms
- cabinet-core-authoring: count=39, total=6092ms, max=804ms, p95=359ms, renderSettle=34 / total=387ms
- cabinet-build-variants: count=66, total=5619ms, max=176ms, p95=132ms, renderSettle=49 / total=1084ms
- boot-and-shell: count=5, total=1357ms, max=748ms, p95=748ms, renderSettle=1 / total=6ms
- export-authoring: count=10, total=1328ms, max=447ms, p95=447ms, renderSettle=0 / total=0ms
- adhesive-glass-first-use: count=7, total=1322ms, max=551ms, p95=551ms, renderSettle=3 / total=181ms
- settings-backup-resilience: count=6, total=561ms, max=141ms, p95=141ms, renderSettle=3 / total=22ms
- project-roundtrip: count=4, total=381ms, max=126ms, p95=126ms, renderSettle=2 / total=54ms
- order-pdf-lifecycle: count=1, total=147ms, max=147ms, p95=147ms, renderSettle=0 / total=0ms

### Top Long-Task Steps

| Step                                                           | Long tasks |  Total |   Max | Render settle |
| -------------------------------------------------------------- | ---------: | -----: | ----: | ------------: |
| cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip |         18 | 3220ms | 428ms |         133ms |
| cabinet-core.mixed-edit-burst                                  |         24 | 2759ms | 166ms |         209ms |
| cabinet-build-variants.structure-material-door-burst           |         30 | 2463ms | 176ms |         571ms |
| cabinet-build-variants.authoring-matrix                        |         24 | 2109ms | 132ms |         387ms |
| cabinet-door-drawer-authoring.mode-burst                       |         20 | 2064ms | 164ms |         110ms |
| cabinet-core.configure                                         |          7 | 1432ms | 359ms |          44ms |
| viewer.contents.visibility.roundtrip                           |          3 | 1230ms | 804ms |          55ms |
| cabinet-door-drawer-authoring.layout-persistence-roundtrip     |          6 | 1201ms | 398ms |          66ms |
| adhesive-glass.first-use.black.apply-and-render                |          5 | 1120ms | 551ms |         157ms |
| boot.autosave-ready.wait                                       |          2 | 1073ms | 748ms |           6ms |
| cabinet-door-drawer-authoring.configure                        |         10 | 1064ms | 231ms |          43ms |
| header.sketch-mode.roundtrip                                   |          5 |  671ms | 263ms |           9ms |
| cabinet-build-variants.profile-texture.configure               |          6 |  625ms | 161ms |          21ms |
| settings-backup.roundtrip                                      |          6 |  561ms | 141ms |          22ms |
| export.clipboard.pressure                                      |          6 |  546ms | 126ms |           0ms |
| export.render-sketch.clipboard                                 |          1 |  447ms | 447ms |           0ms |
| cabinet-build-variants.option-burst                            |          6 |  422ms |  96ms |         106ms |
| boot.shell-visible                                             |          3 |  284ms | 165ms |           0ms |
| project.save-load.roundtrip                                    |          2 |  208ms | 126ms |          25ms |
| adhesive-glass.first-use.variant-update-and-render             |          2 |  202ms | 145ms |          23ms |

### Largest Long-Task root causes

| Journey                       | Step                                                           | Duration | Builder | Render | Store (exact slow commits) | Store step total | Unattributed |
| ----------------------------- | -------------------------------------------------------------- | -------: | ------: | -----: | -------------------------: | ---------------: | -----------: |
| cabinet-core-authoring        | viewer.contents.visibility.roundtrip                           |    804ms |   804ms |    0ms |                        0ms |              3ms |          1ms |
| boot-and-shell                | boot.autosave-ready.wait                                       |    748ms |     0ms |    0ms |                        0ms |              0ms |          0ms |
| adhesive-glass-first-use      | adhesive-glass.first-use.black.apply-and-render                |    551ms |     0ms |  551ms |                        0ms |             73ms |          1ms |
| export-authoring              | export.render-sketch.clipboard                                 |    447ms |     0ms |    0ms |                        0ms |              2ms |        447ms |
| cabinet-door-drawer-authoring | cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip |    428ms |     0ms |  428ms |                        0ms |             21ms |          0ms |

### UX target status (advisory)

- These product UX targets are fixed independently from the generated regression baseline; baseline regeneration cannot widen them.
- CLS: met, value=0, target<=0.1
- LCP: met, value=1412ms, target<=2500ms
- INP: missed, value=424ms, target<=200ms, gap=224ms

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

- add: uxAvg=330ms, uxP95=406ms, interactionWaitAvg=310ms, interactionWaitP95=385ms, codeAvg=20ms, codeP95=32ms, prepare=0ms, order=0ms, mutation=18ms, patch=2ms, storage=11ms, bottleneck=feedback-wait
- delete: uxAvg=308ms, uxP95=339ms, interactionWaitAvg=288ms, interactionWaitP95=320ms, codeAvg=20ms, codeP95=28ms, prepare=0ms, order=0ms, mutation=19ms, patch=2ms, storage=13ms, bottleneck=feedback-wait

### Settings backup import phase breakdown

- import: uxAvg=340ms, uxP95=386ms, confirmWaitAvg=316ms, confirmWaitP95=355ms, codeAvg=25ms, codeP95=32ms, readFile=9ms, parse=1ms, modelsMerge=0ms, colors=0ms, modelsFinalize=0ms, storageWrite=0ms x0, bottleneck=confirm-wait

## Store write pressure

Store commits: 86, no-op skips: 9, noBuild commits: 74, selector filtered: 2833, selector evaluations: 542, selector notifications: 140, tracked sources: 21, slow sources: 0, total source time: 63ms

### Store-heavy user-flow steps

- cabinet-build-variants.structure-material-door-burst: commits=65, selectorFiltered=2624, selectorEval=366, selectorNotify=102, sourceTime=48ms, duration=10198ms, topSources=PATCH:actions:room:setWardrobeType:restore:ui+config, PATCH:builder:dims:runtime, PATCH:react:tabs:set:ui
- cabinet-door-drawer-authoring.mode-burst: commits=45, selectorFiltered=1837, selectorEval=233, selectorNotify=111, sourceTime=177ms, duration=9027ms, topSources=PATCH:react:interior:sketchIntDrawersToggle:ui, PATCH:react:design:groovesEnabled:ui, PATCH:react:design:removeDoorsEnabled:ui
- cabinet-build-variants.authoring-matrix: commits=43, selectorFiltered=1738, selectorEval=240, selectorNotify=66, sourceTime=30ms, duration=7523ms, topSources=PATCH:react:tabs:set:ui, PATCH:builder:dims:runtime, PATCH:actions:room:setWardrobeType:restore:ui+config
- cabinet-core.mixed-edit-burst: commits=39, selectorFiltered=1596, selectorEval=198, selectorNotify=53, sourceTime=26ms, duration=9448ms, topSources=PATCH:react:tabs:set:ui, PATCH:react:structure:height:ui, PATCH:builder:dims:runtime
- project.persistence-recovery.burst: commits=37, selectorFiltered=1339, selectorEval=215, selectorNotify=61, sourceTime=26ms, duration=10928ms, topSources=PATCH:react:tabs:set:ui, PATCH:project.load:ui+config+runtime+mode+meta, PATCH:builder:dims:runtime

### Top store sources

- PATCH:project.load:ui+config+runtime+mode+meta: source=project.load, type=PATCH, slices=ui+config+runtime+mode+meta, count=9, noBuild=9, total=15ms, max=3ms, slow=0
- PATCH:react:tabs:set:ui: source=react:tabs:set, type=PATCH, slices=ui, count=17, noBuild=17, total=9ms, max=1ms, slow=0
- PATCH:builder:dims:runtime: source=builder:dims, type=PATCH, slices=runtime, count=10, noBuild=10, total=5ms, max=1ms, slow=0
- PATCH:autosave:info:ui: source=autosave:info, type=PATCH, slices=ui, count=12, noBuild=12, total=5ms, max=1ms, slow=0
- PATCH:react:design:savedColors:delete:ui+config: source=react:design:savedColors:delete, type=PATCH, slices=ui+config, count=3, noBuild=0, total=5ms, max=2ms, slow=0

## Builder scheduling pressure

Build requests: 27, executes: 28, immediate requests: 9, debounced requests: 18, immediate force: 9, immediate non-force: 0, coalesced force: 0, coalesced non-force: 18, force requests: 9, force executes: 9, pending overwrites: 0, suppressed requests: 0, suppressed executes: 0, debounce schedules: 18

### Build execution duration

- all: count=28, ok=28, error=0, total=1488ms, avg=53ms, p95=90ms, max=122ms
- immediate: count=9, avg=61ms, p95=122ms, max=122ms
- debounced: count=19, avg=50ms, p95=90ms, max=90ms
- force: count=9, avg=61ms, p95=122ms, max=122ms
- non-force: count=19, avg=50ms, p95=90ms, max=90ms

### Slow build reasons by execution duration

- project.load: count=9, ok=9, error=0, total=546ms, avg=61ms, p95=122ms, max=122ms
- react:structure:width: count=2, ok=2, error=0, total=150ms, avg=75ms, p95=90ms, max=90ms
- react:structure:height: count=2, ok=2, error=0, total=129ms, avg=65ms, p95=75ms, max=75ms
- flush: count=1, ok=1, error=0, total=71ms, avg=71ms, p95=71ms, max=71ms
- react:structure:depth: count=2, ok=2, error=0, total=97ms, avg=49ms, p95=56ms, max=56ms

### Build-heavy user-flow steps

- cabinet-build-variants.structure-material-door-burst: requests=25, executes=25, immediateForce=4, immediateNonForce=0, coalescedForce=0, coalescedNonForce=21, forceRequests=4, forceExecutes=4, pendingOverwrites=0, suppressedRequests=0, debounce=21, duration=10198ms, topReasons=react:header:sketch, react:structure:height, react:structure:width
- cabinet-core.mixed-edit-burst: requests=18, executes=18, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=18, forceRequests=0, forceExecutes=0, pendingOverwrites=0, suppressedRequests=0, debounce=18, duration=9448ms, topReasons=react:structure:depth, react:structure:height, react:structure:width
- cabinet-build-variants.authoring-matrix: requests=17, executes=17, immediateForce=2, immediateNonForce=0, coalescedForce=0, coalescedNonForce=15, forceRequests=2, forceExecutes=2, pendingOverwrites=0, suppressedRequests=0, debounce=15, duration=7523ms, topReasons=react:design:doorStyle, react:structure:height, react:structure:width
- project.persistence-recovery.burst: requests=14, executes=14, immediateForce=2, immediateNonForce=0, coalescedForce=0, coalescedNonForce=12, forceRequests=2, forceExecutes=2, pendingOverwrites=0, suppressedRequests=0, debounce=12, duration=10928ms, topReasons=react:design:custom:pickColor, react:design:savedColors:add, react:header:sketch
- cabinet-door-drawer-authoring.mode-burst: requests=12, executes=12, immediateForce=2, immediateNonForce=3, coalescedForce=0, coalescedNonForce=7, forceRequests=2, forceExecutes=2, pendingOverwrites=0, suppressedRequests=0, debounce=7, duration=9027ms, topReasons=react:boardMaterial, react:design:doorStyle, react:design:splitDoors

### Top build reasons

- project.load: requests=9, executes=9, immediateRequests=9, debouncedRequests=0, immediateForce=9, immediateNonForce=0, coalescedForce=0, coalescedNonForce=0, forceRequests=9, forceExecutes=9
- react:design:palette:saved: requests=3, executes=3, immediateRequests=0, debouncedRequests=3, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=3, forceRequests=0, forceExecutes=0
- react:design:savedColors:delete: requests=3, executes=3, immediateRequests=0, debouncedRequests=3, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=3, forceRequests=0, forceExecutes=0
- react:design:custom:pickColor: requests=2, executes=2, immediateRequests=0, debouncedRequests=2, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=2, forceRequests=0, forceExecutes=0
- react:design:savedColors:add: requests=2, executes=2, immediateRequests=0, debouncedRequests=2, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=2, forceRequests=0, forceExecutes=0

### Build-heavy customer journeys

- cabinet-build-variants: steps=4, requests=49, executes=49, immediateForce=8, immediateNonForce=0, coalescedForce=0, coalescedNonForce=41, forceRequests=8, forceExecutes=8, pendingOverwrites=0, suppressedRequests=0, debounce=41, total=24519ms, topReasons=react:design:doorStyle, actions:room:setWardrobeType:recompute, react:structure:height
- cabinet-door-drawer-authoring: steps=4, requests=29, executes=29, immediateForce=16, immediateNonForce=4, coalescedForce=0, coalescedNonForce=9, forceRequests=16, forceExecutes=16, pendingOverwrites=0, suppressedRequests=0, debounce=9, total=27094ms, topReasons=project.load, react:design:splitDoors, react:interior:sketchIntDrawersToggle
- cabinet-core-authoring: steps=7, requests=28, executes=28, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=28, forceRequests=0, forceExecutes=0, pendingOverwrites=0, suppressedRequests=0, debounce=28, total=18484ms, topReasons=react:header:sketch, react:structure:depth, react:structure:height
- project-roundtrip: steps=4, requests=17, executes=17, immediateForce=5, immediateNonForce=0, coalescedForce=0, coalescedNonForce=12, forceRequests=5, forceExecutes=5, pendingOverwrites=0, suppressedRequests=0, debounce=12, total=15734ms, topReasons=project.load, react:design:custom:pickColor, react:design:savedColors:add
- settings-backup-resilience: steps=2, requests=9, executes=9, immediateForce=0, immediateNonForce=0, coalescedForce=0, coalescedNonForce=9, forceRequests=0, forceExecutes=0, pendingOverwrites=0, suppressedRequests=0, debounce=9, total=14608ms, topReasons=react:design:savedColors:delete, react:design:palette:saved, react:design:custom:pickColor

## Customer journeys

- cabinet-build-variants: steps=4, total=24519ms, avgStep=6130ms, maxStep=10198ms, commits=132, selectorFiltered=5323, selectorEval=749, selectorNotify=211, sourceTime=92ms, topSources=PATCH:actions:room:setWardrobeType:restore:ui+config, PATCH:builder:dims:runtime, PATCH:react:boardMaterial:config, PATCH:react:design:custom:texture:config, PATCH:react:design:savedColors:add:ui+config
- cabinet-door-drawer-authoring: steps=4, total=27094ms, avgStep=6774ms, maxStep=9099ms, commits=113, selectorFiltered=4336, selectorEval=862, selectorNotify=295, sourceTime=276ms, topSources=PATCH:autosave:info:ui, PATCH:project.load:ui+config+runtime+mode+meta, PATCH:react:design:groovesEnabled:ui, PATCH:react:design:removeDoorsEnabled:ui, PATCH:react:interior:sketchIntDrawersToggle:ui
- cabinet-core-authoring: steps=7, total=18484ms, avgStep=2641ms, maxStep=9448ms, commits=69, selectorFiltered=2830, selectorEval=344, selectorNotify=104, sourceTime=52ms, topSources=PATCH:builder:dims:runtime, PATCH:react:design:savedColors:add:ui+config, PATCH:react:header:sketch:runtime, PATCH:react:settingsVisual:globalClick:runtime, PATCH:react:settingsVisual:globalClickUi:ui
- project-roundtrip: steps=4, total=15734ms, avgStep=3934ms, maxStep=10928ms, commits=51, selectorFiltered=1786, selectorEval=336, selectorNotify=103, sourceTime=39ms, topSources=PATCH:autosave:info:ui, PATCH:builder:dims:runtime, PATCH:project.load:ui+config+runtime+mode+meta, PATCH:react:project:name:ui, PATCH:react:tabs:set:ui
- export-authoring: steps=6, total=5479ms, avgStep=913ms, maxStep=2680ms, commits=34, selectorFiltered=1394, selectorEval=170, selectorNotify=40, sourceTime=16ms, topSources=PATCH:doors:runtime, PATCH:export:runtime, PATCH:react:tabs:set:ui, PATCH:room:updateWall:ui

### Journey diagnosis

- project-roundtrip: bottleneck=duration-heavy, burstySteps=4, repeatedSources=3, dominantSourceShare=26%, dominantSource=10ms, topStep=project.persistence-recovery.burst, topSource=PATCH:project.load:ui+config+runtime+mode+meta, burstyStepNames=project.persistence-recovery.burst, project.reset-default.confirmed, project.restore-last-session, project.save-load.roundtrip
- cabinet-build-variants: bottleneck=duration-heavy, burstySteps=4, repeatedSources=3, dominantSourceShare=20%, dominantSource=18ms, topStep=cabinet-build-variants.structure-material-door-burst, topSource=PATCH:actions:room:setWardrobeType:restore:ui+config, burstyStepNames=cabinet-build-variants.authoring-matrix, cabinet-build-variants.option-burst, cabinet-build-variants.profile-texture.configure, cabinet-build-variants.structure-material-door-burst
- cabinet-door-drawer-authoring: bottleneck=duration-heavy, burstySteps=4, repeatedSources=1, dominantSourceShare=37%, dominantSource=102ms, topStep=cabinet-door-drawer-authoring.mode-burst, topSource=PATCH:react:interior:sketchIntDrawersToggle:ui, burstyStepNames=cabinet-door-drawer-authoring.configure, cabinet-door-drawer-authoring.layout-persistence-roundtrip, cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip, cabinet-door-drawer-authoring.mode-burst
- export-authoring: bottleneck=duration-heavy, burstySteps=2, repeatedSources=3, dominantSourceShare=70%, dominantSource=12ms, topStep=export.clipboard.pressure, topSource=PATCH:room:updateWall:ui, burstyStepNames=export.clipboard.pressure, export.render-sketch.clipboard
- project-recovery-proveout: bottleneck=duration-heavy, burstySteps=2, repeatedSources=3, dominantSourceShare=60%, dominantSource=8ms, topStep=project.load.recovery-sequence, topSource=PATCH:project.load:ui+config+runtime+mode+meta, burstyStepNames=project.load.recovery-sequence, project.restore-last-session.missing-autosave

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

- cabinet-build-variants.authoring-matrix.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build authoring matrix should settle back to the canonical profile + texture authoring state)
- cabinet-build-variants.option-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build variants burst should settle back to the canonical profile + texture authoring state)
- cabinet-build-variants.structure-material-door-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Cabinet build variants structure/material/door burst should settle back to the canonical profile + texture authoring state)
- cabinet-core.mixed-edit-burst.restored-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פוסט","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":1,"savedColorValues":["#795848"],"savedTextureCount":0,"selectedSavedSwatchId":"saved_1787503615207","selectedSavedSwatchKind":"color","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פוסט","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":null,"grooveLinesCountMapCount":0,"groovesEnabled":false,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":false,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":false,"removedDoorMapCount":0,"savedColorCount":1,"savedColorValues":["#795848"],"savedTextureCount":0,"selectedSavedSwatchId":"saved_1787503615207","selectedSavedSwatchKind":"color","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":false,"wardrobeType":"פתיחה","width":195}, message=Mixed cabinet editing burst should settle back to the canonical cabinet core state)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.fixture-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer authored layout fixture should expose non-empty split/remove/groove/divider/drawer placement state through the perf fingerprint)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.reload-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":2,"drawerDividerCount":2,"externalDrawerSelectionCount":4,"grooveLinesCount":12,"grooveLinesCountMapCount":2,"groovesEnabled":true,"groovesMapCount":3,"internalDrawerPlacementCount":4,"internalDrawersEnabled":true,"removeDoorsEnabled":true,"removedDoorMapCount":2,"splitDoorBottomMapCount":1,"splitDoorMapCount":2,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer authored layout save-load roundtrip should preserve split/remove/groove/divider/drawer placement state)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.restored-authoring-state: ok (expected={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, actual={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, message=Door/drawer authored layout roundtrip should restore the canonical authoring toggle state after the seed project reload)
- cabinet-door-drawer-authoring.layout-persistence-roundtrip.restored-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Seed 1787503665740","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Seed 1787503665740","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Door/drawer authored layout roundtrip should restore the canonical cabinet core fingerprint after the seed project reload)
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
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.restored-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787503670062","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787503670062","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Door/drawer layout matrix roundtrip should restore the canonical cabinet core fingerprint after the seed project reload)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.fixture-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut should expose the expected cut/remove/drawer authoring fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.reload-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":3,"drawerDividerCount":1,"externalDrawerSelectionCount":1,"grooveLinesCount":9,"grooveLinesCountMapCount":3,"groovesEnabled":true,"groovesMapCount":4,"internalDrawerPlacementCount":3,"internalDrawersEnabled":true,"removeDoorsEnabled":false,"removedDoorMapCount":0,"splitDoorBottomMapCount":2,"splitDoorMapCount":4,"splitDoors":true,"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut save-load roundtrip should preserve the authored cut/remove/drawer fingerprint)
- cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.split-heavy-cut.saved-project-payload: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":10,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]},{"doorKey":"d4_full","trims":[{"axis":"vertical","color":"silver","sizeCm":null,"span":"third"}]}],"drawerDividerKeys":["div:int_2"],"grooveLinesCount":9,"grooveLinesCountEntries":[["d1_full",9],["d2_full",7],["d4_full",5]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full","groove_d4_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":false,"removedDoorKeys":[],"splitDoorBottomKeys":["splitb_d1","splitb_d3"],"splitDoorKeys":["split_d1","split_d2","split_d3","split_d4"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[],"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimSummary":[{"doorKey":"d1_full","trims":[{"axis":"vertical","color":"gold","sizeCm":10,"span":"custom"}]},{"doorKey":"d2_full","trims":[{"axis":"horizontal","color":"black","sizeCm":null,"span":"half"}]},{"doorKey":"d4_full","trims":[{"axis":"vertical","color":"silver","sizeCm":null,"span":"third"}]}],"drawerDividerKeys":["div:int_2"],"grooveLinesCount":9,"grooveLinesCountEntries":[["d1_full",9],["d2_full",7],["d4_full",5]],"groovesEnabled":true,"groovesMapKeys":["groove_d1_full","groove_d2_full","groove_d3_full","groove_d4_full"],"internalDrawersEnabled":true,"modulesConfiguration":[{"extDrawersCount":1,"index":0,"internalDrawerPlacementCount":3}],"removeDoorsEnabled":false,"removedDoorKeys":[],"splitDoorBottomKeys":["splitb_d1","splitb_d3"],"splitDoorKeys":["split_d1","split_d2","split_d3","split_d4"],"splitDoors":true,"stackSplitLowerModulesConfiguration":[],"wardrobeType":"hinged"}, message=Door/drawer layout scenario split-heavy-cut save should persist the authored cut/remove/drawer project payload branches)
- cabinet-door-drawer-authoring.mode-burst.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Cabinet Browser Perf 1787503612625","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":2,"savedColorValues":["#795848","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"saved_1787503628795","selectedSavedSwatchKind":"texture","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cabinet door/drawer authoring burst should preserve the canonical cabinet core fingerprint)
- cabinet-door-drawer-authoring.mode-burst.restored-state: ok (expected={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, actual={"extDrawerCount":null,"extDrawerModeActive":false,"extDrawerType":"","grooveLinesCount":null,"grooveModeActive":false,"groovesEnabled":true,"internalDrawerModeActive":false,"internalDrawersEnabled":true,"removeDoorModeActive":false,"removeDoorsEnabled":true,"splitCustomModeActive":false,"splitDoors":true,"splitModeActive":false}, message=Cabinet door/drawer authoring burst should settle back to the canonical authoring option state)
- project.load.invalid-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Invalid project load should preserve visible user state)
- project.load.recovery-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third valid project load after recovery should keep the recovered project state clean and relapse-free)
- project.load.recovery-restores-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A valid project load after an invalid load should recover the saved project state)
- project.load.recovery-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated valid project load after a failure should remain stable and preserve the recovered project state)
- project.persistence-recovery.load-restores-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cross-surface persistence burst should restore the canonical cabinet build options, selected texture state, dimensions, colors, and sketch mode after a valid project load)
- project.persistence-recovery.restore-restores-cabinet-core: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Cross-surface persistence burst should restore the canonical cabinet build options, selected texture state, dimensions, colors, and sketch mode after restore-last-session)
- project.restore-last-session.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Restore-last-session should rebuild the saved cabinet build options, selected texture state, dimensions, colors, and sketch mode after the app reloads)
- project.restore-last-session.missing-autosave-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Restore-last-session without autosave should keep user state unchanged)
- project.restore-last-session.recovery-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third restore-last-session after recovery should keep the saved project state clean and relapse-free)
- project.restore-last-session.recovery-restores-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A restore-last-session after a missing-autosave no-op should recover the saved project state once autosave returns)
- project.restore-last-session.recovery-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated restore-last-session after recovery should remain stable and preserve the saved project state)
- project.restore-last-session.saved-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Restore-last-session should rebuild the saved project fingerprint)
- project.save-load.cabinet-core-state: ok (expected={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, actual={"boardMaterial":"סנדביץ'","depth":62,"doorStyle":"פרופיל","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"height":247,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"savedTextureCount":1,"selectedSavedSwatchId":"","selectedSavedSwatchKind":"none","selectedSavedSwatchName":"","showContentsEnabled":false,"sketchModeEnabled":true,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"פתיחה","width":195}, message=Project roundtrip should preserve cabinet build options, dimensions, selected texture state, colors, and sketch mode)
- settings-backup.invalid-import-preserves-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Invalid settings backup import should preserve visible user state)
- settings-backup.recovery-import-clean-window: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#795848","#864982","#887655","#891176","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#795848","#864982","#887655","#891176","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A third valid settings backup import after recovery should keep the imported state clean and relapse-free)
- settings-backup.recovery-import-merges-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#795848","#864982","#887655","#891176","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#795848","#864982","#887655","#891176","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=A valid settings backup import after an invalid import should merge canonical backup colors into the current state)
- settings-backup.recovery-import-stays-stable: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#795848","#864982","#887655","#891176","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Browser Perf 1787503682659","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":5,"savedColorValues":["#795848","#864982","#887655","#891176","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated valid settings backup import after recovery should remain stable and preserve the canonical backup state)
- settings-backup.reimport.idempotent: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787503670062","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787503670062","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Repeated settings backup import should stay idempotent)
- settings-backup.roundtrip.saved-state: ok (expected={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787503670062","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, actual={"boardMaterial":"sandwich","doorStyle":"profile","doorTrimCount":0,"drawerDividerCount":0,"externalDrawerSelectionCount":0,"grooveLinesCount":12,"grooveLinesCountMapCount":0,"groovesEnabled":true,"groovesMapCount":0,"internalDrawerPlacementCount":0,"internalDrawersEnabled":true,"projectName":"Door Drawer Layout Matrix Seed 1787503670062","removeDoorsEnabled":true,"removedDoorMapCount":0,"savedColorCount":3,"savedColorValues":["#795848","#864982","saved_1787503628795"],"showContentsEnabled":false,"splitDoorBottomMapCount":0,"splitDoorMapCount":0,"splitDoors":true,"wardrobeType":"hinged"}, message=Settings backup import should rebuild the exported saved-color state)

## Sustained-use pressure signals

- settingsBackup.import: count=6/6, firstAvg=20ms, lastAvg=29ms, rawDrift=9ms (43.01%), materialDrift=0%, comparable=no, errors=1
- project.load: count=18/6, firstAvg=110ms, lastAvg=76ms, rawDrift=0ms (0%), materialDrift=0%, comparable=no, errors=1
- project.load.parse: count=18/3, firstAvg=0ms, lastAvg=0ms, rawDrift=0ms (63.16%), materialDrift=0%, comparable=yes, errors=0
- design.savedColor.delete.prepare: count=6/3, firstAvg=0ms, lastAvg=0ms, rawDrift=0ms (42.86%), materialDrift=0%, comparable=yes, errors=0
- design.savedColor.delete.patch: count=6/3, firstAvg=1ms, lastAvg=2ms, rawDrift=1ms (37.76%), materialDrift=0%, comparable=yes, errors=0

## Runtime domains

- project: required=4/4, metrics=12, entries=127, errors=1, marks=9, uxTotal=10895ms, codeTotal=6078ms, interactionWait=4817ms, maxCodeP95=519ms, worstCodeDrift=0%
- settings-backup: required=2/2, metrics=7, entries=35, errors=1, marks=0, uxTotal=4140ms, codeTotal=352ms, interactionWait=3789ms, maxCodeP95=32ms, worstCodeDrift=0%
- other: required=5/5, metrics=14, entries=753, errors=0, marks=0, uxTotal=8897ms, codeTotal=8897ms, interactionWait=0ms, maxCodeP95=138ms, worstCodeDrift=0%
- boot: required=2/2, metrics=102, entries=208, errors=0, marks=10, uxTotal=3053ms, codeTotal=3053ms, interactionWait=0ms, maxCodeP95=748ms, worstCodeDrift=0%
- export: required=4/4, metrics=4, entries=10, errors=0, marks=0, uxTotal=2263ms, codeTotal=2263ms, interactionWait=0ms, maxCodeP95=683ms, worstCodeDrift=0%

## Hotspot candidates

- project.load: codeTotal=1680ms, codeP95=199ms, codeMax=199ms, uxTotal=1680ms, interactionWait=0ms, count=18, errors=1
- settingsBackup.import: codeTotal=148ms, codeP95=32ms, codeMax=32ms, uxTotal=2042ms, interactionWait=1894ms, count=6, errors=1
- builder.execute: codeTotal=7319ms, codeP95=90ms, codeMax=804ms, uxTotal=7319ms, interactionWait=0ms, count=143, errors=0
- project.restoreLastSession: codeTotal=2182ms, codeP95=519ms, codeMax=519ms, uxTotal=2182ms, interactionWait=0ms, count=6, errors=0
- project.load.apply: codeTotal=1610ms, codeP95=193ms, codeMax=193ms, uxTotal=1610ms, interactionWait=0ms, count=18, errors=0

- boot.browser.setup: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.milestone.autosave-ready: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.milestone.operational-ready: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.milestone.shell-visible: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.phase.adapters: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- boot.phase.addons: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.phase.builder: count=4, kinds=phase, ok=4, error=0, mark=0, uxAvg=1ms, uxP95=3ms, codeAvg=1ms, codeP95=3ms, waitAvg=0ms
- boot.phase.final: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=14ms, uxP95=14ms, codeAvg=14ms, codeP95=14ms, waitAvg=0ms
- boot.phase.kernel: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=10ms, uxP95=10ms, codeAvg=10ms, codeP95=10ms, waitAvg=0ms
- boot.phase.platform: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=6ms, uxP95=6ms, codeAvg=6ms, codeP95=6ms, waitAvg=0ms
- boot.phase.services: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=24ms, uxP95=29ms, codeAvg=24ms, codeP95=29ms, waitAvg=0ms
- boot.phase.smoke: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.phase.ui: count=4, kinds=phase, ok=4, error=0, mark=0, uxAvg=1ms, uxP95=3ms, codeAvg=1ms, codeP95=3ms, waitAvg=0ms
- boot.post-mount.app-start.readiness: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=373ms, uxP95=453ms, codeAvg=373ms, codeP95=453ms, waitAvg=0ms
- boot.pre-react: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=63ms, uxP95=71ms, codeAvg=63ms, codeP95=71ms, waitAvg=0ms
- boot.react.mount.reactOverlayRoot: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.react.mount.reactSidebarRoot: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.react.mounted.reactOverlayRoot: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.react.mounted.reactSidebarRoot: count=2, kinds=mark, ok=0, error=0, mark=2, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.react.shell.mount: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.step.adapters.browser.activeElementIdReader: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.adapters.browser.surface: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.step.builder.core.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.builder.provide: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.step.builder.provide.refresh: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.builder.roomDesign: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.data.presetModels: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=6ms, uxP95=7ms, codeAvg=6ms, codeP95=7ms, waitAvg=0ms
- boot.step.io.projectIo: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.kernel.applyPlatformBootFlags: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.kernel.assertCanonicalActions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.assertStateKernel: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.cfgMeta: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.domainApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.step.kernel.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=5ms, uxP95=6ms, codeAvg=5ms, codeP95=6ms, waitAvg=0ms
- boot.step.kernel.mapsApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.kernel.stateApi: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.layers.core: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.layers.engine: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.applyRuntimeConfigDefaults: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.assertStore: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.bootMain: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.cachePruning: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.ensureGeometryCaches: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.initRenderState: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.install: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=3ms, codeAvg=3ms, codeP95=3ms, waitAvg=0ms
- boot.step.platform.lifecycleVisibility: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.pickingPrimitives: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.renderLoop: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.step.platform.renderScheduler: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.smokeChecks: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.platform.threeCleanup: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.platform.threeGeometryCachePatch: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.appStart: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.autosave: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.step.services.bootFinalizers: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.bootSeedsPart02: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=4ms, codeAvg=3ms, codeP95=4ms, waitAvg=0ms
- boot.step.services.buildReactions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.canvasPicking: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.cloudCollections: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=4ms, uxP95=5ms, codeAvg=4ms, codeP95=5ms, waitAvg=0ms
- boot.step.services.cloudSync: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=14ms, uxP95=16ms, codeAvg=14ms, codeP95=16ms, waitAvg=0ms
- boot.step.services.configCompounds: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.step.services.doorsRuntime: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.step.services.editState: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.history: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.models: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.step.services.notes: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.sceneView: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.services.seedUiEphemeralDefaults: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.step.services.viewport: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.assertDocument: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.errorsInstall: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.errorsSurface: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.modules.late: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.step.ui.modules.main: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- boot.ui.camera.prime: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.ui.first-render: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.history-baseline: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=4ms, codeAvg=2ms, codeP95=4ms, waitAvg=0ms
- boot.ui.interactions: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.ui.interactions.canvas: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.interactions.viewer-resize: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.models: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.ready-timers: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- boot.ui.room.build: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=6ms, uxP95=6ms, codeAvg=6ms, codeP95=6ms, waitAvg=0ms
- boot.ui.seed: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- boot.ui.shader-warmup.complete: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=311ms, uxP95=342ms, codeAvg=311ms, codeP95=342ms, waitAvg=0ms
- boot.ui.shader-warmup.submit: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=408ms, uxP95=748ms, codeAvg=408ms, codeP95=748ms, waitAvg=0ms
- boot.ui.store-reactivity: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.store-seed-history: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=4ms, uxP95=7ms, codeAvg=4ms, codeP95=7ms, waitAvg=0ms
- boot.ui.viewport: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=83ms, uxP95=94ms, codeAvg=83ms, codeP95=94ms, waitAvg=0ms
- boot.ui.viewport.attach: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.controls: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- boot.ui.viewport.create: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=73ms, uxP95=84ms, codeAvg=73ms, codeP95=84ms, waitAvg=0ms
- boot.ui.viewport.mirror-camera: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.viewport.mirror-target: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- boot.ui.viewport.renderer-setup: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=4ms, uxP95=6ms, codeAvg=4ms, codeP95=6ms, waitAvg=0ms
- boot.ui.viewport.scene: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.scene-groups: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.scene-sync: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=4ms, uxP95=4ms, codeAvg=4ms, codeP95=4ms, waitAvg=0ms
- boot.ui.viewport.shader-warmup-schedule: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- boot.ui.viewport.webgl-renderer: count=2, kinds=phase, ok=2, error=0, mark=0, uxAvg=56ms, uxP95=64ms, codeAvg=56ms, codeP95=64ms, waitAvg=0ms
- browser.cls: count=6, kinds=browser-metric, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.inp: count=314, kinds=browser-metric, ok=314, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.lcp: count=4, kinds=browser-metric, ok=4, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- browser.longTask: count=240, kinds=browser-metric, ok=240, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- builder.contents.folded-clothes: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=91ms, uxP95=136ms, codeAvg=91ms, codeP95=136ms, waitAvg=0ms
- builder.contents.hanging-clothes: count=1, kinds=phase, ok=1, error=0, mark=0, uxAvg=37ms, uxP95=37ms, codeAvg=37ms, codeP95=37ms, waitAvg=0ms
- builder.contents.total: count=9, kinds=phase, ok=9, error=0, mark=0, uxAvg=86ms, uxP95=138ms, codeAvg=86ms, codeP95=138ms, waitAvg=0ms
- builder.execute: count=143, kinds=phase, ok=143, error=0, mark=0, uxAvg=51ms, uxP95=90ms, codeAvg=51ms, codeP95=90ms, waitAvg=0ms
- cloudSync.floatingSync.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=17ms, uxP95=17ms, codeAvg=17ms, codeP95=17ms, waitAvg=0ms
- design.savedColor.add: count=7, kinds=action, ok=7, error=0, mark=0, uxAvg=330ms, uxP95=406ms, codeAvg=20ms, codeP95=32ms, waitAvg=310ms
- design.savedColor.add.mutation: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=18ms, uxP95=30ms, codeAvg=18ms, codeP95=30ms, waitAvg=0ms
- design.savedColor.add.order: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.add.patch: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- design.savedColor.add.prepare: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.add.prompt: count=7, kinds=interaction-wait, ok=7, error=0, mark=0, uxAvg=310ms, uxP95=385ms, codeAvg=0ms, codeP95=0ms, waitAvg=310ms
- design.savedColor.add.storage: count=7, kinds=phase, ok=7, error=0, mark=0, uxAvg=11ms, uxP95=20ms, codeAvg=11ms, codeP95=20ms, waitAvg=0ms
- design.savedColor.delete: count=6, kinds=action, ok=6, error=0, mark=0, uxAvg=308ms, uxP95=339ms, codeAvg=20ms, codeP95=28ms, waitAvg=288ms
- design.savedColor.delete.confirm: count=6, kinds=interaction-wait, ok=6, error=0, mark=0, uxAvg=288ms, uxP95=320ms, codeAvg=0ms, codeP95=0ms, waitAvg=288ms
- design.savedColor.delete.mutation: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=19ms, uxP95=27ms, codeAvg=19ms, codeP95=27ms, waitAvg=0ms
- design.savedColor.delete.order: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.delete.patch: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=2ms, uxP95=3ms, codeAvg=2ms, codeP95=3ms, waitAvg=0ms
- design.savedColor.delete.prepare: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- design.savedColor.delete.storage: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=13ms, uxP95=19ms, codeAvg=13ms, codeP95=19ms, waitAvg=0ms
- design.savedColor.storage.commit: count=13, kinds=phase, ok=13, error=0, mark=0, uxAvg=12ms, uxP95=19ms, codeAvg=12ms, codeP95=19ms, waitAvg=0ms
- export.copy: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=83ms, uxP95=115ms, codeAvg=83ms, codeP95=115ms, waitAvg=0ms
- export.dual: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=189ms, uxP95=306ms, codeAvg=189ms, codeP95=306ms, waitAvg=0ms
- export.renderSketch: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=419ms, uxP95=683ms, codeAvg=419ms, codeP95=683ms, waitAvg=0ms
- export.snapshot: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=192ms, uxP95=192ms, codeAvg=192ms, codeP95=192ms, waitAvg=0ms
- orderPdf.close: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- orderPdf.open: count=3, kinds=action, ok=3, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- project.load: count=18, kinds=action, ok=17, error=1, mark=0, uxAvg=93ms, uxP95=199ms, codeAvg=93ms, codeP95=199ms, waitAvg=0ms
- project.load.apply: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=89ms, uxP95=193ms, codeAvg=89ms, codeP95=193ms, waitAvg=0ms
- project.load.parse: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=0ms, uxP95=1ms, codeAvg=0ms, codeP95=1ms, waitAvg=0ms
- project.load.readFile: count=18, kinds=phase, ok=18, error=0, mark=0, uxAvg=3ms, uxP95=7ms, codeAvg=3ms, codeP95=7ms, waitAvg=0ms
- project.resetDefault: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=446ms, uxP95=446ms, codeAvg=446ms, codeP95=446ms, waitAvg=0ms
- project.restoreLastSession: count=6, kinds=action, ok=5, error=0, mark=1, uxAvg=364ms, uxP95=519ms, codeAvg=364ms, codeP95=519ms, waitAvg=0ms
- project.save: count=8, kinds=action, ok=8, error=0, mark=0, uxAvg=305ms, uxP95=382ms, codeAvg=4ms, codeP95=7ms, waitAvg=301ms
- project.save.commit: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- project.save.dispatched: count=8, kinds=mark, ok=0, error=0, mark=8, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- project.save.download: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=3ms, uxP95=4ms, codeAvg=3ms, codeP95=4ms, waitAvg=0ms
- project.save.export: count=8, kinds=phase, ok=8, error=0, mark=0, uxAvg=6ms, uxP95=11ms, codeAvg=6ms, codeP95=11ms, waitAvg=0ms
- project.save.prompt: count=8, kinds=interaction-wait, ok=8, error=0, mark=0, uxAvg=301ms, uxP95=377ms, codeAvg=0ms, codeP95=0ms, waitAvg=301ms
- render.frame.auto-hide-room-floor: count=76, kinds=browser-metric, ok=76, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.controls: count=151, kinds=browser-metric, ok=151, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.mirror: count=151, kinds=browser-metric, ok=151, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.motion: count=151, kinds=browser-metric, ok=151, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.renderer: count=151, kinds=browser-metric, ok=151, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.total: count=151, kinds=browser-metric, ok=151, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.frame.visual-effects: count=302, kinds=browser-metric, ok=302, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- render.settle: count=149, kinds=render-settle, ok=149, error=0, mark=0, uxAvg=16ms, uxP95=71ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- settingsBackup.export: count=1, kinds=action, ok=1, error=0, mark=0, uxAvg=10ms, uxP95=10ms, codeAvg=10ms, codeP95=10ms, waitAvg=0ms
- settingsBackup.import: count=6, kinds=action, ok=5, error=1, mark=0, uxAvg=340ms, uxP95=386ms, codeAvg=25ms, codeP95=32ms, waitAvg=316ms
- settingsBackup.import.collections.commit: count=5, kinds=phase, ok=5, error=0, mark=0, uxAvg=11ms, uxP95=14ms, codeAvg=11ms, codeP95=14ms, waitAvg=0ms
- settingsBackup.import.commit: count=5, kinds=phase, ok=5, error=0, mark=0, uxAvg=16ms, uxP95=21ms, codeAvg=16ms, codeP95=21ms, waitAvg=0ms
- settingsBackup.import.confirm: count=6, kinds=interaction-wait, ok=6, error=0, mark=0, uxAvg=316ms, uxP95=355ms, codeAvg=0ms, codeP95=0ms, waitAvg=316ms
- settingsBackup.import.parse: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms
- settingsBackup.import.readFile: count=6, kinds=phase, ok=6, error=0, mark=0, uxAvg=9ms, uxP95=14ms, codeAvg=9ms, codeP95=14ms, waitAvg=0ms
- settingsVisual.globalClick.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=3ms, uxP95=5ms, codeAvg=3ms, codeP95=5ms, waitAvg=0ms
- store.commit.slow: count=7, kinds=browser-metric, ok=7, error=0, mark=0, uxAvg=0ms, uxP95=0ms, codeAvg=0ms, codeP95=0ms, waitAvg=0ms
- structure.dimensions.depth.commit: count=11, kinds=action, ok=11, error=0, mark=0, uxAvg=6ms, uxP95=8ms, codeAvg=6ms, codeP95=8ms, waitAvg=0ms
- structure.dimensions.height.commit: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=6ms, uxP95=8ms, codeAvg=6ms, codeP95=8ms, waitAvg=0ms
- structure.dimensions.width.commit: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=7ms, uxP95=15ms, codeAvg=7ms, codeP95=15ms, waitAvg=0ms
- ui.header.sketch.toggle: count=13, kinds=action, ok=13, error=0, mark=0, uxAvg=2ms, uxP95=6ms, codeAvg=2ms, codeP95=6ms, waitAvg=0ms
- viewer.contents.visibility.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=2ms, uxP95=2ms, codeAvg=2ms, codeP95=2ms, waitAvg=0ms
- viewer.notes.drawMode.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=2ms, codeAvg=1ms, codeP95=2ms, waitAvg=0ms
- viewer.notes.visibility.toggle: count=2, kinds=action, ok=2, error=0, mark=0, uxAvg=1ms, uxP95=1ms, codeAvg=1ms, codeP95=1ms, waitAvg=0ms

## Recent runtime entries

- render.frame.controls: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- render.frame.visual-effects: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- render.frame.mirror: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- render.frame.renderer: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.longTask: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
- settingsBackup.import.confirm: kind=interaction-wait, ux=298ms, code=0ms, interactionWait=298ms [ok]
- settingsBackup.import.readFile: kind=phase, ux=8ms, code=8ms, interactionWait=0ms [ok]
- settingsBackup.import.parse: kind=phase, ux=0ms, code=0ms, interactionWait=0ms [ok]
- settingsBackup.import.collections.commit: kind=phase, ux=11ms, code=11ms, interactionWait=0ms [ok]
- settingsBackup.import.commit: kind=phase, ux=16ms, code=16ms, interactionWait=0ms [ok]
- settingsBackup.import: kind=action, ux=323ms, code=26ms, interactionWait=298ms [ok]
- browser.inp: kind=browser-metric, ux=0ms, code=0ms, interactionWait=0ms [ok]
