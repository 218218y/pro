import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSlidingTrackPalette,
  readDoorConfig,
  readDoorVisualFactory,
  readHingedDoorOp,
  readSlidingDoorOp,
  resolveSlidingDoorVisualState,
  resolveMirrorLayout,
} from '../esm/native/builder/render_door_ops_shared.ts';

test('render_door_ops_shared normalizes config and sliding visual state from split/full maps', () => {
  const cfg = readDoorConfig({
    doorSpecialMap: { d1_full: 'mirror' },
    curtainMap: { d2_full: 'linen' },
    mirrorLayoutMap: { d1_full: [{ widthCm: 40, faceSign: -1 }] },
    doorTrimMap: { d1_full: { top: true } },
    isMultiColorMode: true,
    slidingDoorHandlesEnabled: true,
  });

  assert.equal(cfg.isMultiColorMode, true);
  assert.equal(cfg.slidingDoorHandlesEnabled, true);
  assert.equal(cfg.doorSpecialMap?.d1_full, 'mirror');
  assert.deepEqual(cfg.mirrorLayoutMap?.d1_full, [{ widthCm: 40, faceSign: -1 }]);

  assert.deepEqual(resolveSlidingDoorVisualState(cfg, 'd1_full', null), {
    isMirror: true,
    isGlass: false,
    curtain: null,
  });
  assert.deepEqual(resolveSlidingDoorVisualState(cfg, 'd1_top', null), {
    isMirror: true,
    isGlass: false,
    curtain: null,
  });
  assert.deepEqual(resolveSlidingDoorVisualState(cfg, 'd2_bot', null), {
    isMirror: false,
    isGlass: true,
    curtain: 'linen',
  });
  assert.deepEqual(resolveMirrorLayout(cfg, 'd1_top'), [{ widthCm: 40, faceSign: -1 }]);
});

test('render_door_ops_shared parses sliding and hinged op payloads with sane fallbacks', () => {
  assert.deepEqual(readSlidingDoorOp({ width: 1, height: 2, x: 0.1 }, 1), {
    x: 0.1,
    y: 0,
    z: 0,
    width: 1,
    height: 2,
    partId: 'sliding_door_2',
    isOuter: false,
    index: undefined,
    total: undefined,
    minX: undefined,
    maxX: undefined,
  });
  assert.equal(readSlidingDoorOp({ width: 'bad', height: 2 }, 0), null);

  assert.deepEqual(readHingedDoorOp({ width: 0.6, height: 2.1, partId: 'd7_full', isMirror: true }), {
    x: 0,
    y: 0,
    z: 0,
    width: 0.6,
    height: 2.1,
    thickness: undefined,
    partId: 'd7_full',
    isLeftHinge: false,
    openAngle: undefined,
    isRemoved: false,
    isMirror: true,
    hasGroove: false,
    moduleIndex: undefined,
    pivotX: undefined,
    meshOffsetX: undefined,
    style: undefined,
    curtain: undefined,
    handleAbsY: undefined,
    allowHandle: undefined,
  });
});

test('render_door_ops_shared rail palette + door factory keep behavior canonical', () => {
  assert.deepEqual(createSlidingTrackPalette({ slidingTracksColor: 'black' }), {
    hex: 0x333333,
    lineHex: 0x000000,
    metalness: 0.35,
    roughness: 0.55,
    emissiveHex: 0x000000,
    emissiveIntensity: 0,
  });

  const createDoorVisual = readDoorVisualFactory(
    (_w, _h, _t, _m, _s, _g, _im, _c, _b, _f, _fc, _ml, partId) => ({
      add() {},
      userData: { partId },
    })
  );
  assert.ok(createDoorVisual);
  assert.equal(
    createDoorVisual?.(1, 2, 0.02, null, null, false, false, null, null, 1, false, null, 'doorA').userData
      ?.partId,
    'doorA'
  );

  const invalid = readDoorVisualFactory(() => ({ nope: true }));
  assert.throws(
    () => invalid?.(1, 2, 0.02, null, null, false, false, null, null, 1, false, null, 'doorB'),
    /invalid object/
  );
});
