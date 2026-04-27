import test from 'node:test';
import assert from 'node:assert/strict';

import { __wp_resolveSketchBoxGeometry } from '../esm/native/services/canvas_picking_local_helpers.ts';
import {
  isSketchModuleBoxPlacementBlocked,
  resolveSketchModuleBoxPlacement,
} from '../esm/native/services/canvas_picking_sketch_box_overlap.ts';

const moduleArgs = {
  bottomY: -1,
  spanH: 2,
  innerW: 1.2,
  internalCenterX: 0,
  internalDepth: 0.55,
  internalZ: 0,
  woodThick: 0.018,
  resolveSketchBoxGeometry: __wp_resolveSketchBoxGeometry,
};

test('inside sketch boxes cannot overlap an existing box', () => {
  const blocked = isSketchModuleBoxPlacementBlocked({
    boxes: [
      {
        id: 'a',
        yNorm: 0.5,
        heightM: 0.4,
        widthM: 0.6,
        depthM: 0.45,
        xNorm: 0.5,
      },
    ],
    centerX: 0,
    centerY: 0.1,
    boxW: 0.6,
    boxH: 0.4,
    ...moduleArgs,
  });

  assert.equal(blocked, true);
});

test('inside sketch boxes may still touch at the edge without being treated as overlap', () => {
  const blocked = isSketchModuleBoxPlacementBlocked({
    boxes: [
      {
        id: 'a',
        yNorm: 0.5,
        heightM: 0.4,
        widthM: 0.6,
        depthM: 0.45,
        xNorm: 0.5,
      },
    ],
    centerX: 0,
    centerY: 0.401,
    boxW: 0.6,
    boxH: 0.4,
    ...moduleArgs,
  });

  assert.equal(blocked, false);
});

test('inside sketch boxes relocate above an overlapped box instead of making the hover disappear', () => {
  const resolved = resolveSketchModuleBoxPlacement({
    boxes: [
      {
        id: 'a',
        yNorm: 0.5,
        heightM: 0.4,
        widthM: 0.6,
        depthM: 0.45,
        xNorm: 0.5,
      },
    ],
    desiredCenterX: 0,
    desiredCenterY: 0.05,
    boxW: 0.6,
    boxH: 0.4,
    pad: 0.006,
    ...moduleArgs,
  });

  assert.equal(resolved.blocked, false);
  assert.equal(resolved.adjusted, true);
  assert.ok(Math.abs(resolved.centerY - 0.4) <= 1e-9);
});

test('inside sketch boxes can keep stacking upward through multiple existing boxes', () => {
  const resolved = resolveSketchModuleBoxPlacement({
    boxes: [
      { id: 'a', yNorm: 0.5, heightM: 0.4, widthM: 0.6, depthM: 0.45, xNorm: 0.5 },
      { id: 'b', yNorm: 0.675, heightM: 0.4, widthM: 0.6, depthM: 0.45, xNorm: 0.5 },
    ],
    desiredCenterX: 0,
    desiredCenterY: 0.05,
    boxW: 0.6,
    boxH: 0.4,
    pad: 0.006,
    ...moduleArgs,
  });

  assert.equal(resolved.blocked, false);
  assert.equal(resolved.adjusted, true);
  assert.ok(Math.abs(resolved.centerY - 0.75) <= 1e-9);
});
