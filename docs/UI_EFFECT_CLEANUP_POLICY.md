# UI effect cleanup policy

React UI code may register DOM events only through a small cleanup owner once a file is migrated.

The owner is:

- `esm/native/ui/react/effects/dom_event_cleanup.ts`

Rules:

1. Effect setup must return one deterministic cleanup function.
2. Cleanup must be idempotent, because React effects can tear down more than once in development flows.
3. Order PDF and Notes pointer/keyboard effects must not call `addEventListener` and `removeEventListener` manually after migration.
4. The owner is intentionally tiny: no hidden state, no scheduling, no global registry, and no wrapper around business logic.

The guard is:

```bash
npm run check:ui-effect-cleanup
```
