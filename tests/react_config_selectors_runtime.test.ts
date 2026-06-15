import test from 'node:test';
import assert from 'node:assert/strict';

import {
  selectSavedColors,
  selectColorSwatchesOrder,
  selectHasInternalDrawersData,
  selectGroovesDirty,
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

test('react config selectors detect sketch internal drawer data', () => {
  assert.equal(
    selectHasInternalDrawersData({
      modulesConfiguration: [{ sketchExtras: { drawers: [{ id: 'd1' }] } }],
    } as never),
    true
  );
  assert.equal(
    selectHasInternalDrawersData({
      cornerConfiguration: { sketchExtras: { drawers: [{ id: 'corner' }] } },
    } as never),
    true
  );
});

test('react config selectors detect whole-door sketch-box grooves as dirty state', () => {
  assert.equal(
    selectGroovesDirty({
      groovesMap: { groove_regular: false },
      modulesConfiguration: [
        {
          sketchExtras: {
            boxes: [{ id: 'sbf_alpha', doors: [{ id: 'sbdr_1', groove: true }] }],
          },
        },
      ],
    } as never),
    true
  );

  assert.equal(
    selectGroovesDirty({
      stackSplitLowerModulesConfiguration: [
        {
          sketchExtras: {
            boxes: [{ id: 'sbf_lower', doors: [{ id: 'sbdr_2', groove: true }] }],
          },
        },
      ],
    } as never),
    true
  );

  assert.equal(
    selectGroovesDirty({
      cornerConfiguration: {
        stackSplitLower: {
          modulesConfiguration: [
            {
              sketchExtras: {
                boxes: [{ id: 'sbf_corner_lower', doors: [{ id: 'sbdr_3', groove: true }] }],
              },
            },
          ],
        },
      },
    } as never),
    true
  );

  assert.equal(
    selectGroovesDirty({
      groovesMap: { groove_regular: false },
      modulesConfiguration: [
        {
          sketchExtras: {
            boxes: [{ id: 'sbf_alpha', doors: [{ id: 'sbdr_1', groove: false }] }],
          },
        },
      ],
    } as never),
    false
  );
});
