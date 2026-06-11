import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readDesignTabCorniceType,
  readDesignTabDoorStyle,
  readDesignTabModeState,
} from '../esm/native/ui/react/tabs/design_tab_shared.ts';

test('design-tab shared readers normalize legacy/raw values safely', () => {
  assert.equal(readDesignTabDoorStyle('PROFILE'), 'profile');
  assert.equal(readDesignTabDoorStyle('weird', 'tom'), 'tom');

  assert.equal(readDesignTabCorniceType('WAVE'), 'wave');
  assert.equal(readDesignTabCorniceType(null), 'classic');

  assert.deepEqual(readDesignTabModeState({ primary: 'split', opts: { splitVariant: 'custom' } }), {
    primaryMode: 'split',
    splitVariant: 'custom',
  });

  assert.deepEqual(readDesignTabModeState({ primary: null, opts: { splitVariant: 12 } }), {
    primaryMode: 'none',
    splitVariant: '',
  });

  assert.deepEqual(readDesignTabModeState(undefined), {
    primaryMode: 'none',
    splitVariant: '',
  });
});
