import test from 'node:test';
import assert from 'node:assert/strict';

import {
  healStableSurfaceSlot,
  installStableSurfaceSlot,
  resolveStableSurfaceSlot,
} from '../esm/native/runtime/stable_surface_slots.ts';

test('stable surface slots: install adopts healthy public values, preserves canonical internals, and heals drift', () => {
  const surface: Record<string, unknown> = { value: { tag: 'legacy', ok: true } };
  const isHealthy = (value: unknown): value is { tag: string; ok: true } =>
    !!value && typeof value === 'object' && (value as { ok?: unknown }).ok === true;

  const first = installStableSurfaceSlot(surface, 'value', '__wpValue', isHealthy, () => ({
    tag: 'factory',
    ok: true,
  }));
  assert.equal(first, surface.value);
  assert.equal(first, surface.__wpValue);

  surface.value = { tag: 'drifted', ok: true };

  const healed = healStableSurfaceSlot(surface, 'value', '__wpValue', isHealthy);
  assert.equal(healed, first);
  assert.equal(surface.value, first);
  assert.equal(surface.__wpValue, first);
});

test('stable surface slots: resolve ignores invalid public/stable values and falls back to factory output', () => {
  const invalid = { value: { ok: false }, __wpValue: { ok: false } };
  const isHealthy = (value: unknown): value is { ok: true; tag: string } =>
    !!value && typeof value === 'object' && (value as { ok?: unknown }).ok === true;

  const resolved = resolveStableSurfaceSlot(invalid, 'value', '__wpValue', isHealthy, () => ({
    ok: true,
    tag: 'factory',
  }));
  assert.deepEqual(resolved, { ok: true, tag: 'factory' });
});
