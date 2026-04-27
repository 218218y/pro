import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeHash,
  stableSerializeCloudSyncValue,
} from '../esm/native/services/cloud_sync_support_shared.ts';

test('computeHash stays stable when payload objects differ only by key order', () => {
  const left = computeHash(
    [{ id: 'm1', name: 'Model 1', meta: { width: 80, depth: 60 } }],
    [{ id: 'c1', type: 'solid', value: '#fff', meta: { finish: 'matte', code: 'A1' } }],
    ['c1'],
    ['m1'],
    ['hidden-a']
  );

  const right = computeHash(
    [{ name: 'Model 1', id: 'm1', meta: { depth: 60, width: 80 } }],
    [{ value: '#fff', id: 'c1', meta: { code: 'A1', finish: 'matte' }, type: 'solid' }],
    ['c1'],
    ['m1'],
    ['hidden-a']
  );

  assert.equal(left, right);
});

test('computeHash still changes when ordered payload lists change', () => {
  const left = computeHash([{ id: 'm1', name: 'Model 1' }], [], ['c1', 'c2'], ['m1'], []);
  const right = computeHash([{ id: 'm1', name: 'Model 1' }], [], ['c2', 'c1'], ['m1'], []);

  assert.notEqual(left, right);
});

test('stableSerializeCloudSyncValue can preserve sketch-style null/type semantics without key-order drift', () => {
  const first = stableSerializeCloudSyncValue(
    {
      modules: [{ id: 'm1', size: { h: 200, w: 60 } }],
      meta: undefined,
      onHover: () => undefined,
      token: 7n,
    },
    { undefinedValue: 'null', bigintValue: 'quoted-n', otherPrimitiveValue: 'type-label' }
  );

  const reordered = stableSerializeCloudSyncValue(
    {
      token: 7n,
      onHover: function onHover() {
        return undefined;
      },
      modules: [{ size: { w: 60, h: 200 }, id: 'm1' }],
      meta: undefined,
    },
    { undefinedValue: 'null', bigintValue: 'quoted-n', otherPrimitiveValue: 'type-label' }
  );

  assert.equal(first, reordered);
  assert.match(first, /"7n"/);
  assert.match(first, /"function"/);
});
