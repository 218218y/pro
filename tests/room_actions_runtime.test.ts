import test from 'node:test';
import assert from 'node:assert/strict';

import { setManualWidth, setWardrobeType } from '../esm/native/ui/react/actions/room_actions.ts';

test('room_actions delegate manual-width and wardrobe-type changes through namespaced actions', () => {
  const calls: unknown[][] = [];
  const app = {
    actions: {
      room: {
        setManualWidth(next: boolean, meta?: Record<string, unknown>) {
          calls.push(['manual', next, meta]);
          return next;
        },
        setWardrobeType(next: string) {
          calls.push(['wardrobe', next]);
          return next;
        },
      },
    },
  };

  assert.equal(setManualWidth(app, true), true);
  assert.equal(setWardrobeType(app, 'sliding'), 'sliding');

  assert.deepEqual(calls[0], ['manual', true, { source: 'react:manualWidth' }]);
  assert.deepEqual(calls[1], ['wardrobe', 'sliding']);
});
