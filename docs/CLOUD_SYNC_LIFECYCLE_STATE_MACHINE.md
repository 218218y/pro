# Cloud sync lifecycle state machine

This is the compact lifecycle contract for cloud sync. Keep implementation details in code; keep only durable state/event rules here.

## Core phases

| Phase       | Meaning                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| `idle`      | Sync is not active.                                                      |
| `starting`  | Local startup/install path is preparing sync.                            |
| `pulling`   | Remote state is being fetched/applied.                                   |
| `realtime`  | Live realtime/polling subscriptions are active.                          |
| `attention` | User/action attention is required or a recoverable problem was detected. |
| `stopping`  | Sync is being disabled or cleaned up.                                    |
| `error`     | A non-silent failure was surfaced.                                       |

## Ownership rules

- Lifecycle orchestration belongs in cloud-sync service owners, not UI controllers.
- Panel/UI code displays state and dispatches actions; it does not invent lifecycle state.
- Pull scopes and realtime scopes must be normalized through the canonical scope registry.
- Realtime hint senders should dedupe normalized scope/row values before broadcasting.
- Snapshot mutation and liveness guards must be centralized so local panel state, remote pulls, and realtime updates do not drift.

## Transition rules

- `idle -> starting -> pulling -> realtime` is the normal enable path.
- Recoverable transport/apply problems move to `attention`; successful retry returns to `pulling` or `realtime`.
- Disable/cleanup moves through `stopping` and ends at `idle`.
- Fatal setup failures move to `error` with a visible reason.
- Repeated start/stop/pull calls must be singleflight or idempotent.

## Verification focus

Tests should cover lifecycle transitions, duplicate suppression, panel action publication, snapshot coalescing, async pull hardening, and recovery from stale/missing remote rows.
