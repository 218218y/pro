import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAutoWidthForDoors,
  normalizeWardrobeDimensionDefaultType,
  resolveAutoWidthForDoors,
} from '../esm/shared/dimensions/wardrobe_default_resolution_policy.ts';
import {
  getDefaultDoorMountThicknessCm,
  normalizeDoorMountThicknessCm,
  resolveDoorMountThicknessesFromConfig,
} from '../esm/shared/dimensions/door_mount_thickness_policy.ts';
import {
  centimeters,
  centimetersToMeters,
  millimeters,
  millimetersToCentimeters,
} from '../esm/shared/dimensions/units.ts';

test('wardrobe defaults normalize type and round door counts before resolving automatic width', () => {
  assert.equal(normalizeWardrobeDimensionDefaultType('sliding'), 'sliding');
  assert.equal(normalizeWardrobeDimensionDefaultType('unknown'), 'hinged');
  assert.equal(resolveAutoWidthForDoors('hinged', -1), 0);
  assert.equal(resolveAutoWidthForDoors('hinged', 'not-a-number'), 0);
  assert.equal(resolveAutoWidthForDoors('hinged', 1.4), 40);
  assert.equal(resolveAutoWidthForDoors('hinged', 1.6), 80);
  assert.equal(resolveAutoWidthForDoors('sliding', 2), 160);
});

test('automatic width matching preserves its positive-width and tolerance boundaries', () => {
  assert.equal(isAutoWidthForDoors('hinged', 0, 2), true);
  assert.equal(isAutoWidthForDoors('hinged', Number.NaN, 2), true);
  assert.equal(isAutoWidthForDoors('hinged', 80.5, 2), true);
  assert.equal(isAutoWidthForDoors('hinged', 80.52, 2), false);
});

test('branded unit owners convert values and reject non-finite inputs', () => {
  assert.equal(millimetersToCentimeters(millimeters(180)), 18);
  assert.equal(centimetersToMeters(centimeters(240)), 2.4);
  assert.throws(() => centimeters(Number.NaN), /centimeters must be a finite number/);
});

test('door-mount defaults and overrides preserve mode, clamping, and step normalization', () => {
  assert.equal(getDefaultDoorMountThicknessCm('overlay'), 1.8);
  assert.equal(getDefaultDoorMountThicknessCm('inset'), 3.6);
  assert.equal(getDefaultDoorMountThicknessCm('unknown'), 1.8);
  assert.equal(normalizeDoorMountThicknessCm(''), null);
  assert.equal(normalizeDoorMountThicknessCm('invalid'), null);
  assert.equal(normalizeDoorMountThicknessCm(0.1), 0.4);
  assert.equal(normalizeDoorMountThicknessCm(9), 8);
  assert.equal(normalizeDoorMountThicknessCm(1.26), 1.3);

  const inset = resolveDoorMountThicknessesFromConfig({
    doorMountMode: 'inset',
    insetFrameThicknessCm: 4.24,
  });
  assert.equal(inset.mode, 'inset');
  assert.equal(inset.frameThicknessCm, 4.2);
  assert.equal(inset.shelfThicknessCm, 3.6);
  assert.equal(inset.frameThicknessM, 0.042);

  assert.equal(
    resolveDoorMountThicknessesFromConfig({ wardrobeType: 'sliding', doorMountMode: 'inset' }).mode,
    'overlay'
  );
});
