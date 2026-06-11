import test from 'node:test';
import assert from 'node:assert/strict';

import { patchViaActions } from '../esm/native/runtime/actions_access.ts';

type AnyRecord = Record<string, unknown>;

test('[actions-access] empty patch prefers meta.touch before generic root patch', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: {
        touch(meta?: AnyRecord) {
          calls.push({ op: 'meta.touch', meta });
          return { via: 'touch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'patch' };
      },
    },
  } as AnyRecord;

  assert.equal(patchViaActions(App as any, {}, { source: 'history:touch' }), true);
  assert.deepEqual(calls, [{ op: 'meta.touch', meta: { source: 'history:touch' } }]);
});

test('[actions-access] single-slice patch still prefers namespaced patch surfaces before generic root patch', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      runtime: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'runtime.patch', patch, meta });
          return { via: 'runtime.patch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'patch' };
      },
    },
  } as AnyRecord;

  assert.equal(patchViaActions(App as any, { runtime: { sketchMode: true } }, { source: 'rt' }), true);
  assert.deepEqual(calls, [{ op: 'runtime.patch', patch: { sketchMode: true }, meta: { source: 'rt' } }]);
});

test('[actions-access] canonicalizes noisy one-slice payloads before routing, instead of falling back to generic root patch', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      runtime: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'runtime.patch', patch, meta });
          return { via: 'runtime.patch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'patch' };
      },
    },
  } as AnyRecord;

  assert.equal(
    patchViaActions(
      App as any,
      { runtime: { sketchMode: true }, ui: {}, unknown: { ignored: true } },
      { source: 'rt:noisy-single' }
    ),
    true
  );
  assert.deepEqual(calls, [
    {
      op: 'runtime.patch',
      patch: { sketchMode: true },
      meta: { source: 'rt:noisy-single' },
    },
  ]);
});

test('[actions-access] fails closed on unknown-only or empty-single canonical payloads instead of dispatching synthetic root patches', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: {
        touch(meta?: AnyRecord) {
          calls.push({ op: 'meta.touch', meta });
          return { via: 'touch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'patch' };
      },
    },
  } as AnyRecord;

  assert.equal(
    patchViaActions(App as any, { unknown: { ignored: true } }, { source: 'unknown-only' }),
    false
  );
  assert.equal(patchViaActions(App as any, { ui: {} }, { source: 'empty-single' }), false);
  assert.deepEqual(calls, []);
});

test('[actions-access] root patch fallback receives the canonical filtered payload, not raw unknown or empty slices', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'patch' };
      },
    },
  } as AnyRecord;

  assert.equal(
    patchViaActions(
      App as any,
      { runtime: { sketchMode: true }, ui: {}, unknown: { ignored: true }, config: { width: 120 } },
      { source: 'root:canonicalized' }
    ),
    true
  );
  assert.deepEqual(calls, [
    {
      op: 'actions.patch',
      patch: { runtime: { sketchMode: true }, config: { width: 120 } },
      meta: { source: 'root:canonicalized' },
    },
  ]);
});
