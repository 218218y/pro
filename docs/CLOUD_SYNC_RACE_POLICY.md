# Cloud Sync race policy

Cloud Sync pull coalescers and main-row push flows must not carry stale queued work across lifecycle boundaries.

## Policy

- A queued follow-up pull may resume after an in-flight run only while the owner is still live and unsuppressed.
- If the owner becomes disposed or suppressed while a run is in flight, pending follow-up work is dropped and the queue state is reset.
- Fresh triggers after the stale window must start from a clean pending reason/count state.
- A pending main-row push requested while another push is in flight must be dropped if suppression starts before the in-flight push settles.
- Timer ownership remains outside the coalescer/flow; timer functions are received through dependencies.

## Guardrail

`npm run check:cloud-sync-races` verifies that pull coalescer finalizers and main-row push flows reset stale queued work, and that runtime tests cover dispose/suppression races.
