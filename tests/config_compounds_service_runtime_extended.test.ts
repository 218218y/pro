import test from 'node:test';
import assert from 'node:assert/strict';

import { installConfigCompoundsService } from '../esm/native/services/config_compounds.ts';

test('config compounds install clones options instead of retaining caller references', () => {
  const App: { services?: Record<string, unknown> } = { services: Object.create(null) };
  const opts = { maxAttempts: 4, retryDelayMs: 7 };

  const service = installConfigCompoundsService(App as never, opts);
  assert.notEqual(service.options, opts);
  assert.deepEqual(service.options, { maxAttempts: 4, retryDelayMs: 7 });

  opts.maxAttempts = 99;
  assert.deepEqual(service.options, { maxAttempts: 4, retryDelayMs: 7 });
});

test('config compounds install heals drifted public slots back to canonical refs', () => {
  const App: { services?: Record<string, unknown> } = { services: Object.create(null) };

  const first = installConfigCompoundsService(App as never, { maxAttempts: 2, retryDelayMs: 5 });
  const seedRef = first.seed;
  const isSeededRef = first.isSeeded;

  assert.equal(typeof seedRef, 'function');
  assert.equal(typeof isSeededRef, 'function');

  first.seed = (() => false) as typeof first.seed;
  first.isSeeded = (() => false) as typeof first.isSeeded;

  const healed = installConfigCompoundsService(App as never, { maxAttempts: 3, retryDelayMs: 1 });
  assert.equal(healed, first);
  assert.equal(healed.seed, seedRef);
  assert.equal(healed.isSeeded, isSeededRef);
  assert.deepEqual(healed.options, { maxAttempts: 3, retryDelayMs: 1 });
});
