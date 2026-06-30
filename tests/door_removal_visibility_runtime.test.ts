import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRemoveDoorModeFromSnapshot,
  resolveRemoveDoorsEnabledFromSnapshots,
} from '../esm/native/features/door_authoring/api.ts';

test('door removal visibility resolves only canonical UI and primary-mode snapshots', () => {
  assert.equal(isRemoveDoorModeFromSnapshot({ primary: 'remove_door' }), true);
  assert.equal(isRemoveDoorModeFromSnapshot({ primary: 'none' }), false);
  assert.equal(isRemoveDoorModeFromSnapshot(null), false);

  assert.equal(resolveRemoveDoorsEnabledFromSnapshots({ removeDoorsEnabled: true }, null), true);
  assert.equal(resolveRemoveDoorsEnabledFromSnapshots({ removeDoorsEnabled: '1' }, null), false);
  assert.equal(resolveRemoveDoorsEnabledFromSnapshots({}, { primary: 'remove_door' }), true);
  assert.equal(resolveRemoveDoorsEnabledFromSnapshots({}, { primary: 'none' }), false);
  assert.equal(
    resolveRemoveDoorsEnabledFromSnapshots({ removeDoors: true } as never, { primary: 'none' }),
    false
  );
});
