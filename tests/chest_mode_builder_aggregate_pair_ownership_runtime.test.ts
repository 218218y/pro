import test from 'node:test';
import assert from 'node:assert/strict';

import { buildChestModeIfNeeded } from '../esm/native/builder/chest_mode_pipeline.ts';
import { CHEST_MODE_COMMODE_CONSTRAINTS_POLICY } from '../esm/shared/dimensions/chest_mode_policy.ts';

import type { BuilderContentsRenderPolicy, ConfigStateLike, UnknownRecord } from '../types/index.ts';

const cfgSnapshot: ConfigStateLike = {};
const renderPolicy: BuilderContentsRenderPolicy = Object.freeze({
  sketchMode: false,
  addOutlines: null,
});

test('Chest Mode pipeline returns false without invoking build outside Chest mode', () => {
  let buildCalls = 0;
  let followThroughCalls = 0;

  const result = buildChestModeIfNeeded({
    ui: { isChestMode: false },
    buildChestOnly: () => {
      buildCalls += 1;
    },
    followThrough: () => {
      followThroughCalls += 1;
    },
  });

  assert.equal(result, false);
  assert.equal(buildCalls, 0);
  assert.equal(followThroughCalls, 0);
});

test('Chest Mode pipeline preserves focused mirror defaults, unit conversion, payload, and follow-through order', () => {
  const calls: string[] = [];
  let payload: UnknownRecord | undefined;
  let followThroughInput: UnknownRecord | undefined;

  const result = buildChestModeIfNeeded({
    ui: {
      isChestMode: true,
      baseType: 'legs',
      baseLegStyle: 'square',
      baseLegColor: 'nickel',
      baseLegPlatformMode: 'stage',
      baseLegPlatformSideMode: 'flush',
      colorChoice: '#ffffff',
      customColor: '#123456',
      doorStyle: 'profile',
      groovesEnabled: true,
      chestCommodeEnabled: true,
    },
    widthCm: 123,
    heightCm: 88,
    depthCm: 44,
    drawersCount: 3,
    cfgSnapshot,
    renderPolicy,
    buildChestOnly: input => {
      calls.push('build');
      payload = input;
    },
    followThrough: input => {
      calls.push('followThrough');
      followThroughInput = input;
    },
  });

  assert.equal(result, true);
  assert.deepEqual(calls, ['build', 'followThrough']);
  assert.ok(payload);
  assert.deepEqual(Object.keys(payload), [
    'H',
    'totalW',
    'D',
    'drawersCount',
    'baseType',
    'baseLegStyle',
    'baseLegColor',
    'baseLegPlatformMode',
    'baseLegPlatformSideMode',
    'baseLegPlatformSideOverhangCm',
    'baseLegPlatformFrontOverhangCm',
    'basePlinthHeightCm',
    'baseLegHeightCm',
    'baseLegWidthCm',
    'colorChoice',
    'customColor',
    'doorStyle',
    'isGroovesEnabled',
    'chestCommodeEnabled',
    'chestCommodeMirrorHeightCm',
    'chestCommodeMirrorWidthCm',
    'cfgSnapshot',
    'renderPolicy',
  ]);
  assert.equal(payload.H, 0.88);
  assert.equal(payload.totalW, 1.23);
  assert.equal(payload.D, 0.44);
  assert.equal(payload.drawersCount, 3);
  assert.equal(
    payload.chestCommodeMirrorHeightCm,
    CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.defaultMirrorHeightCm
  );
  assert.equal(payload.chestCommodeMirrorWidthCm, 123);
  assert.equal(payload.cfgSnapshot, cfgSnapshot);
  assert.equal(payload.renderPolicy, renderPolicy);
  assert.deepEqual(followThroughInput, { cfgSnapshot, addOutlines: renderPolicy.addOutlines });
});

test('Chest Mode pipeline preserves explicit mirror dimensions and requires snapshots', () => {
  let payload: UnknownRecord | undefined;
  const common = {
    ui: {
      isChestMode: true,
      chestCommodeMirrorHeightCm: 92,
      chestCommodeMirrorWidthCm: 117,
    },
    widthCm: 120,
    heightCm: 80,
    depthCm: 40,
    drawersCount: 2,
    buildChestOnly: (input: UnknownRecord) => {
      payload = input;
    },
    followThrough: () => undefined,
  };

  assert.equal(
    buildChestModeIfNeeded({
      ...common,
      cfgSnapshot,
      renderPolicy,
    }),
    true
  );
  assert.equal(payload?.chestCommodeMirrorHeightCm, 92);
  assert.equal(payload?.chestCommodeMirrorWidthCm, 117);

  assert.throws(
    () => buildChestModeIfNeeded({ ...common, cfgSnapshot: null, renderPolicy }),
    /cfgSnapshot is required/u
  );
  assert.throws(
    () =>
      buildChestModeIfNeeded({
        ...common,
        cfgSnapshot,
        renderPolicy: undefined,
      }),
    /snapshot renderPolicy is required/u
  );
});
