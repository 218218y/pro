import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readRenderOpNumber,
  readRenderOpNumberOr,
  readRenderOpPositiveNumber,
} from '../esm/native/builder/render_ops_number_contracts.ts';
import {
  readHingedDoorOp,
  readSlidingDoorOp,
  readSlidingRail,
} from '../esm/native/builder/render_door_ops_shared.ts';
import {
  readExternalDrawerOp,
  readInternalDrawerOp,
} from '../esm/native/builder/render_drawer_ops_shared.ts';

test('render op numbers accept only finite numeric runtime payloads', () => {
  assert.equal(readRenderOpNumber(0), 0);
  assert.equal(readRenderOpNumber(0.25), 0.25);
  assert.equal(readRenderOpNumber('0.25'), null);
  assert.equal(readRenderOpNumber(''), null);
  assert.equal(readRenderOpNumber(null), null);
  assert.equal(readRenderOpNumber(false), null);
  assert.equal(readRenderOpNumber(Number.NaN), null);
  assert.equal(readRenderOpNumberOr('0.25', 7), 7);
  assert.equal(readRenderOpPositiveNumber(0), null);
  assert.equal(readRenderOpPositiveNumber(0.25), 0.25);
});

test('door op readers reject string encoded required dimensions and ignore string encoded optional geometry', () => {
  assert.equal(readSlidingDoorOp({ width: '1', height: 2 }, 0), null);
  assert.equal(readSlidingRail({ width: 1, height: '0.02', depth: 0.04 }), null);

  const hinged = readHingedDoorOp({
    width: 0.6,
    height: 2.1,
    partId: 'door_1',
    meshOffsetX: '0.1',
    handleAbsY: '1.2',
    moduleDoors: '2',
  });
  assert.ok(hinged);
  assert.equal(hinged.meshOffsetX, undefined);
  assert.equal(hinged.handleAbsY, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(hinged, 'moduleDoors'), false);
});

test('drawer op readers reject string encoded required dimensions and ignore string encoded optional geometry', () => {
  assert.equal(
    readExternalDrawerOp({ partId: 'ext_1', visualW: '0.6', visualH: 0.2, boxW: 0.5, boxH: 0.12, boxD: 0.4 }),
    null
  );
  assert.equal(readInternalDrawerOp({ partId: 'int_1', width: 0.5, height: '0.2', depth: 0.4 }), null);

  const external = readExternalDrawerOp({
    partId: 'ext_2',
    visualW: 0.6,
    visualH: 0.2,
    boxW: 0.5,
    boxH: 0.12,
    boxD: 0.4,
    boxOffsetZ: '0.03',
    closed: { x: '0.1', y: 0.2, z: 0.3 },
  });
  assert.ok(external);
  assert.equal(external.boxOffsetZ, undefined);
  assert.deepEqual(external.closed, { x: undefined, y: 0.2, z: 0.3 });

  const internal = readInternalDrawerOp({
    partId: 'int_2',
    width: 0.5,
    height: 0.2,
    depth: 0.4,
    cassetteBaseY: '0.42',
    openZ: '0.8',
  });
  assert.ok(internal);
  assert.equal(internal.cassetteBaseY, undefined);
  assert.equal(internal.openZ, undefined);
});
