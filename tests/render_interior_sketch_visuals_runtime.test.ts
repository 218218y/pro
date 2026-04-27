import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readSketchDoorVisualFactory,
  resolveSketchFrontVisualState,
} from '../esm/native/builder/render_interior_sketch_visuals_door_state.ts';

test('render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts', () => {
  const mirrorLayout = [{ widthCm: 30, heightCm: 80 }];
  const state = resolveSketchFrontVisualState(
    {
      cfg: {
        isMultiColorMode: true,
        doorSpecialMap: { drawer_1: 'mirror' },
        curtainMap: { drawer_1: 'linen' },
        mirrorLayoutMap: { drawer_1: mirrorLayout },
      },
      getPartColorValue: () => 'glass',
    } as any,
    'drawer_1'
  );

  assert.deepEqual(state, {
    isMirror: true,
    isGlass: false,
    curtainType: null,
    mirrorLayout,
  });
});

test('render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists', () => {
  const state = resolveSketchFrontVisualState(
    {
      cfg: {
        isMultiColorMode: true,
        doorSpecialMap: {},
        curtainMap: { drawer_2: 'linen' },
        mirrorLayoutMap: {},
      },
      getPartColorValue: () => 'glass',
    } as any,
    'drawer_2'
  );

  assert.deepEqual(state, {
    isMirror: false,
    isGlass: true,
    curtainType: 'linen',
    mirrorLayout: null,
  });
});

test('render interior sketch visuals expose callable factories only for function inputs', () => {
  const callable = () => 'ok';
  assert.equal(readSketchDoorVisualFactory(callable), callable);
  assert.equal(readSketchDoorVisualFactory(null), null);
  assert.equal(readSketchDoorVisualFactory({}), null);
});
