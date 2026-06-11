import test from 'node:test';
import assert from 'node:assert/strict';

import {
  healStableSurfaceMethod,
  installStableSurfaceMethod,
  resolveStableSurfaceMethod,
} from '../esm/native/runtime/stable_surface_methods.ts';

test('stable surface methods: install adopts healthy public refs, preserves canonical internals, and heals drift', () => {
  const healthy = () => 'healthy';
  const surface: any = { run: healthy };

  const first = installStableSurfaceMethod(surface, 'run', '__wpRun', () => () => 'factory');
  assert.equal(first, healthy);
  assert.equal(surface.run, healthy);
  assert.equal(surface.__wpRun, healthy);

  const canonical = surface.__wpRun;
  surface.run = () => 'drifted';

  const healed = installStableSurfaceMethod(surface, 'run', '__wpRun', () => () => 'new-factory');
  assert.equal(healed, canonical);
  assert.equal(surface.run, canonical);
  assert.equal(surface.__wpRun, canonical);
});

test('stable surface methods: resolve/ heal fall back safely when no callable seam exists', () => {
  const empty: any = {};
  assert.equal(resolveStableSurfaceMethod(empty, 'run', '__wpRun'), null);
  assert.equal(healStableSurfaceMethod(empty, 'run', '__wpRun'), null);

  const factoryFn = () => 'factory';
  const installed = installStableSurfaceMethod(empty, 'run', '__wpRun', () => factoryFn);
  assert.equal(installed, factoryFn);
  assert.equal(empty.run, factoryFn);
  assert.equal(empty.__wpRun, factoryFn);
});
