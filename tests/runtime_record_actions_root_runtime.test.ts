import test from 'node:test';
import assert from 'node:assert/strict';

import { asRecord, cloneRecord } from '../esm/native/runtime/record.ts';
import {
  ensureActionsRoot,
  ensureDomainApiNamespaces,
  ensureStateApiNamespaces,
} from '../esm/native/kernel/actions_root.ts';

test('runtime record helpers clone seeded records without mutating the caller seed', () => {
  const seed = { base: true, nested: { fromSeed: true } };
  const merged = asRecord({ extra: 1 }, seed);
  const cloned = cloneRecord({ another: 2 }, seed);

  assert.deepEqual(seed, { base: true, nested: { fromSeed: true } });
  assert.deepEqual(merged, { base: true, nested: { fromSeed: true }, extra: 1 });
  assert.deepEqual(cloned, { base: true, nested: { fromSeed: true }, another: 2 });
  assert.notEqual(merged, seed);
  assert.notEqual(cloned, seed);
});

test('actions_root namespaces reuse one canonical mutable actions root across state/domain installers', () => {
  const app: Record<string, unknown> = {};

  const root = ensureActionsRoot(app as never);
  const stateNs = ensureStateApiNamespaces(app as never);
  const domainNs = ensureDomainApiNamespaces(app as never);

  assert.equal(root, stateNs.actions);
  assert.equal(root, domainNs.actions);
  assert.equal(stateNs.config, domainNs.config);
  assert.equal(domainNs.dividers, (root as Record<string, unknown>).dividers);
  assert.equal(Object.getPrototypeOf(root as object), null);
  assert.equal(Object.getPrototypeOf(stateNs.history as object), null);
  assert.equal(Object.getPrototypeOf(domainNs.dividers as object), null);

  domainNs.dividers.toggle = () => 'ok';
  assert.equal(typeof domainNs.dividers.toggle, 'function');
  assert.equal(typeof ensureDomainApiNamespaces(app as never).dividers.toggle, 'function');
});
