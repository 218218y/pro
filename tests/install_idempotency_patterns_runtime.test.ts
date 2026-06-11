import test from 'node:test';
import assert from 'node:assert/strict';

import {
  asRecord,
  hasCallableContract,
  hasLiveHandle,
  hasOwnNumberSlots,
} from '../esm/native/runtime/install_idempotency_patterns.ts';

test('install idempotency helpers recognize callable contracts and live handles', () => {
  const record = {
    a() {},
    b() {},
    cleanup() {},
    x: 0,
    y: 1,
  };

  assert.equal(asRecord(record), record);
  assert.equal(hasCallableContract(record, ['a', 'b']), true);
  assert.equal(hasCallableContract(record, ['a', 'missing' as never]), false);
  assert.equal(hasLiveHandle(record, 'cleanup'), true);
  assert.equal(hasOwnNumberSlots(record, ['x', 'y']), true);
  assert.equal(hasOwnNumberSlots(record, ['x', 'z' as never]), false);
});
