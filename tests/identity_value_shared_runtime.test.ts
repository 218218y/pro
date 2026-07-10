import test from 'node:test';
import assert from 'node:assert/strict';

import { formatIdentityValue, readIdentityValue } from '../esm/shared/identity_value_shared.ts';
import {
  resolveDoorVisualSegmentIdentity,
  toCanonicalDoorVisualMapKey,
} from '../esm/shared/door_visual_key_contracts_shared.ts';

test('identity values preserve string and finite numeric ids', () => {
  assert.equal(formatIdentityValue(readIdentityValue('door_1')), 'door_1');
  assert.equal(formatIdentityValue(readIdentityValue(42)), '42');
  assert.equal(toCanonicalDoorVisualMapKey('d1'), 'd1_full');
  assert.equal(resolveDoorVisualSegmentIdentity(42).partId, '42');
});

test('identity values reject nullish and non-scalar identities', () => {
  assert.equal(formatIdentityValue(readIdentityValue(null)), '');
  assert.equal(formatIdentityValue(readIdentityValue(undefined)), '');
  assert.equal(formatIdentityValue(readIdentityValue({ id: 'door_1' })), '');
  assert.equal(formatIdentityValue(readIdentityValue(['door_1'])), '');
  assert.equal(formatIdentityValue(readIdentityValue(Number.NaN)), '');
  assert.equal(toCanonicalDoorVisualMapKey({ id: 'd1' }), '');
});
