# Cloud Sync Timer Policy

Cloud Sync owns long-lived realtime, polling, coalescing and panel snapshot work. Timer access must stay deterministic because leaked or duplicated timers create double pulls, stale status publication, and hard-to-debug race conditions.

## Policy

- Cloud Sync code must not use global `setTimeout`, `clearTimeout`, `setInterval`, or `clearInterval` directly.
- Runtime-owned timers must come from either:
  - injected Cloud Sync deps (`setTimeoutFn`, `clearTimeoutFn`, `setIntervalFn`, `clearIntervalFn`), or
  - `getBrowserTimers(App)` at a single runtime boundary.
- Test fixtures may inject fake timers through deps. Production code must not fall back to globals locally.
- Timer cleanup functions should be idempotent and must tolerate `null`/`undefined` handles at owner boundaries.

## Current guard

`npm run check:cloud-sync-timers` runs `tools/wp_cloud_sync_timer_contract.mjs` and fails if a `cloud_sync*.ts` file introduces direct global timer calls or direct global timer fallbacks.

This keeps Cloud Sync timer behavior testable and prevents accidental bypasses of the browser/runtime timer surface.
