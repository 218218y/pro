import test from 'node:test';
import assert from 'node:assert/strict';

import { selectAutosaveInfo } from '../esm/native/ui/react/selectors/ui_selectors.ts';

test('selectAutosaveInfo returns only normalized autosave payloads from ui state', () => {
  assert.deepEqual(selectAutosaveInfo({ autosaveInfo: { timestamp: 123, dateString: '2026-03-17 19:00' } }), {
    timestamp: 123,
    dateString: '2026-03-17 19:00',
  });

  assert.deepEqual(selectAutosaveInfo({ autosaveInfo: { timestamp: Number.NaN, dateString: 'saved' } }), {
    timestamp: undefined,
    dateString: 'saved',
  });

  assert.deepEqual(selectAutosaveInfo({ autosaveInfo: { timestamp: 456 } }), {
    timestamp: 456,
    dateString: undefined,
  });

  assert.equal(selectAutosaveInfo({ autosaveInfo: {} }), null);
  assert.equal(selectAutosaveInfo({}), null);
});
