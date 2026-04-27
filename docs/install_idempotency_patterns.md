# Install idempotency patterns

Installers must be safe to call more than once and must heal partially installed surfaces.

## Required behavior

- Re-running an installer must not double-wrap functions.
- Missing methods should be restored when the canonical owner can recreate them.
- Existing compatible methods may be preserved when they are the canonical implementation.
- Required deps should be validated clearly and early.
- Public surfaces should expose one canonical owner.

## Preferred pattern

```ts
export function installFeature(app: AppContainer): void {
  assertFeatureDeps(app);
  const surface = ensureFeatureSurface(app);
  surface.run = createFeatureRun(app);
  surface.reset = createFeatureReset(app);
}
```

## Avoid

- “already installed” booleans that skip healing missing members
- wrapping an existing wrapper
- fallback chains that hide missing deps
- installer-local aliases that become a second API
- importing a module just to trigger setup side effects

## Verification

Add a runtime test that installs twice, removes one installed member, installs again, and verifies that the member is healed without duplicating behavior.
