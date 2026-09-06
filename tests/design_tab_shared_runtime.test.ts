import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readDesignTabCorniceType,
  readDesignTabDoorStyle,
  readDesignTabModeState,
} from '../esm/native/ui/react/tabs/design_tab_shared.ts';

test('design-tab shared readers normalize legacy/raw values safely', () => {
  assert.equal(readDesignTabDoorStyle('PROFILE'), 'profile');
  assert.equal(readDesignTabDoorStyle('weird', 'double_profile'), 'double_profile');

  assert.equal(readDesignTabCorniceType('WAVE'), 'wave');
  assert.equal(readDesignTabCorniceType(null), 'classic');

  assert.deepEqual(readDesignTabModeState({ primary: 'split', opts: { splitVariant: 'custom' } }), {
    primaryMode: 'split',
    splitVariant: 'custom',
    cellDoorCount: null,
  });

  assert.deepEqual(readDesignTabModeState({ primary: null, opts: { splitVariant: 12 } }), {
    primaryMode: 'none',
    splitVariant: '',
    cellDoorCount: null,
  });

  assert.deepEqual(readDesignTabModeState({ primary: 'cell_dims', opts: { cellDoorCount: 2 } }), {
    primaryMode: 'cell_dims',
    splitVariant: '',
    cellDoorCount: 2,
  });

  assert.deepEqual(readDesignTabModeState(undefined), {
    primaryMode: 'none',
    splitVariant: '',
    cellDoorCount: null,
  });
});
