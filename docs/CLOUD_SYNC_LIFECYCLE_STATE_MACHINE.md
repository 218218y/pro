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

## Credential lifecycle

| State          | Meaning and transition rule                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| `public`       | The owner obtains an ephemeral public-room credential on demand.                 |
| `active`       | A private credential is valid for more than 24 hours.                            |
| `expiring`     | The credential is inside the 24-hour renewal window; one `renew-room` is shared. |
| `expired`      | No read/write request is sent; the user must open a fresh signed link.           |
| `room-expired` | Retention deleted the room; the credential is cleared and cannot recreate it.    |
| `rate-limited` | Retry waits for the gateway `Retry-After`/`retryAfterSeconds` deadline.          |
| `offline`      | Network recovery may retry without discarding a still-valid credential.          |
| `error`        | Invalid authorization or a server failure is visible and is not a missing row.   |

- Storage schema 2 owns the complete `{ room, token, expiresAt }` credential.
- Schema 1 is migrated from the signed token's `exp` claim; invalid legacy values fail closed.
- New share links use a URL fragment. Query parsing exists only for previously issued signed links and must not be used by link generation.
- Private renewal is allowed only while the old credential is still valid and only for its exact base room.
- A still-valid token cannot resurrect a retention-deleted room: read, write and renewal receive typed
  `room_expired`, clear the local credential, and never enter the missing-row seed path.
- Runtime-status publication drives panel snapshots, so credential state changes are visible without a reload.

## Read, conflict, and local commit rules

- `row: null` means a successful gateway response with no row. Typed authorization, rate-limit, network,
  and server failures remain failures through the domain owner and cannot seed a remote row.
- While rate-limited, the owner suppresses ordinary pull/push work until the published retry deadline and
  schedules only the lifecycle recovery attempt.
- A merge that leaves conflict keys publishes an unresolved conflict with those keys and the remote
  revision. Automatic conflict retry stops rather than silently choosing a payload. The private owner
  persists the full base/local/remote record per room; public React status exposes metadata only.
- `keep-local` rebases the user's choices for the conflicting keys onto the latest verified remote row.
  Unrelated remote fields and unrelated entity changes are preserved. `use-remote` adopts the verified
  row locally before the conflict is cleared. A corrupt persisted conflict fails closed and permits only
  an explicit remote recovery.
- The local collections repository commits one schema-versioned envelope before UI refresh or Cloud push.
  Per-collection keys are deployment mirrors for existing consumers, not the canonical Cloud read source.
- Browser read-modify-write mutations run under the injected Web Lock for the envelope and re-read the
  canonical value inside that lock. A non-browser process lock is an explicit diagnostic mode only; a
  browser without Web Locks fails closed for mutation rather than claiming cross-tab safety.
- Local entity/list commands pass a functional mutator that is evaluated against that locked reread; a
  precomputed partial collection snapshot is not a valid mutation input. Remote and import snapshots use
  the explicit whole-envelope commit boundary.
- `services.cloudCollections` is the installation owner for the browser lock capability and is installed
  before model and Cloud Sync consumers. Repository caching preserves that first isolation owner and rejects
  a later mode change instead of silently downgrading or upgrading an already-published repository.
- The per-collection deployment mirrors are reconciled on service install through 2026-10-15. After that
  window, remove their writers and readers once telemetry plus the repository consumer guard prove that no
  production consumer remains; the canonical envelope must not gain a fallback read during retirement.

## Verification focus

Tests should cover lifecycle transitions, duplicate suppression, panel action publication, snapshot coalescing, async pull hardening, recovery from stale/missing remote rows, schema-1 migration, fragment links, proactive renewal singleflight, local expiry rejection, typed 403/429/network failures, and panel status publication.
