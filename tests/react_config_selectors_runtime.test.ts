import test from 'node:test';
import assert from 'node:assert/strict';

import {
  selectSavedColors,
  selectColorSwatchesOrder,
  selectHasInternalDrawersData,
} from '../esm/native/ui/react/selectors/config_selectors.ts';

test('react config selectors keep saved colors and swatch order typed with safe defaults', () => {
  const cfg = {
    savedColors: [
      { id: 'c1', value: '#fff' },
      { id: 'c2', type: 'texture', value: 'oak' },
    ],
    colorSwatchesOrder: ['c2', 'c1'],
  };

  assert.deepEqual(selectSavedColors(cfg as never), [
    { id: 'c1', value: '#fff' },
    { id: 'c2', type: 'texture', value: 'oak' },
  ]);
  assert.deepEqual(selectColorSwatchesOrder(cfg as never), ['c2', 'c1']);
  assert.deepEqual(selectSavedColors({} as never), []);
  assert.deepEqual(selectColorSwatchesOrder({} as never), []);
});

test('react config selectors detect internal drawer data in modules and corner config safely', () => {
  assert.equal(
    selectHasInternalDrawersData({ modulesConfiguration: [{ intDrawersList: [{ id: 'd1' }] }] } as never),
    true
  );
  assert.equal(
    selectHasInternalDrawersData({ cornerConfiguration: { internalDrawers: [{ id: 'corner' }] } } as never),
    true
  );
  assert.equal(
    selectHasInternalDrawersData({ modulesConfiguration: [{ intDrawersSlot: 0 }] } as never),
    false
  );
});
