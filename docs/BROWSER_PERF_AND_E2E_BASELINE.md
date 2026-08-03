# Browser perf + E2E baseline

Schema: 19

Status: **baseline reset required**.

The previous report was invalidated because it mixed human `prompt` / `confirm` waiting time with JavaScript execution time. Schema 19 intentionally has no compatibility fallback for the old measurement format.

Generate the first valid baseline after installing the browser-test dependencies:

```bash
npm run perf:browser:update-baseline
```

That command writes `tools/wp_browser_perf_smoke_baseline.json` and replaces this reset notice with a measured report. `npm run perf:browser` fails closed while the schema-19 baseline is missing or stale.

## Measurement model

- `uxTotalMs`: complete action duration as experienced by the user.
- `codeExecutionMs`: action duration excluding the union of overlapping `interaction-wait` spans.
- `interactionWaitMs`: time spent waiting for user-controlled prompt or confirmation responses.
- `phase`: focused read, parse, compute, storage, build, download, or commit work.
- `render.settle`: two animation frames after a successful build or viewer action.

Hotspot ranking uses actionable `action` and `phase` entries and ranks by code execution. `prompt`, `confirm`, browser metrics, marks, and render-settle entries are not CPU hotspots.

## Browser metrics

Schema 19 records CLS, LCP, Long Tasks, and render-settle through `PerformanceObserver` and exact aggregation of the captured raw entries. Layout shifts caused by recent user input are excluded from CLS.

## Runtime health

No schema-19 browser run has been recorded yet.

## Runtime perf summary

No schema-19 runtime baseline has been recorded yet. UX-total and code-execution budgets will be generated independently.

## Store write pressure

No schema-19 browser run has been recorded yet.

## Builder scheduling pressure

No schema-19 browser run has been recorded yet.
