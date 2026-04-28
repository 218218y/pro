# Canvas Hit Identity Policy

Canvas picking must not let hover and commit derive different identities for the same visual target.

The canonical owner is:

- `esm/native/services/canvas_picking_hit_identity.ts`

The owner records the stable identity fields that matter for authoring decisions: target kind, part id, door/drawer id, module index, stack, surface id, face sign, face side, split part, and source.

## Rules

1. Hover hit records should be stamped as close as possible to raycast resolution.
2. Click hit finalization should publish the same canonical shape instead of forcing downstream code to re-guess identity from scattered fields.
3. Preferred-face hover fallbacks must also stamp identity and explicitly mark the source as `preferred-face`.
4. The identity contract is data-only. It must not call DOM, scene mutation, store mutation, timers, or UI operations.
5. `hitIdentity` stays optional on public contracts for existing fixtures and callers, but production hover/click paths must populate it.

This policy is intentionally small: it adds a stable record, not a new abstraction layer over picking behavior.
