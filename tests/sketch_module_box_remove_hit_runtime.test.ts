import test from 'node:test';
import assert from 'node:assert/strict';

import { findSketchModuleBoxHit } from '../esm/native/services/canvas_picking_sketch_box_overlap.ts';

type FindArgs = Parameters<typeof findSketchModuleBoxHit>[0];

function makeArgs(overrides: Partial<FindArgs> = {}): FindArgs {
  return {
    boxes: [
      {
        id: 'box_mid',
        yNorm: 0.5,
        heightM: 0.6,
      },
    ],
    cursorX: 0,
    cursorY: 0,
    bottomY: -1,
    spanH: 2,
    innerW: 1.2,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    woodThick: 0.018,
    resolveSketchBoxGeometry: ({ innerW, internalCenterX, widthM, depthM, xNorm }) => {
      const outerW = widthM != null && widthM > 0 ? widthM : innerW;
      const outerD = depthM != null && depthM > 0 ? depthM : 0.5;
      const leftX = internalCenterX - innerW / 2;
      const rawCenterX = xNorm != null ? leftX + xNorm * innerW : internalCenterX;
      const centerMinX = internalCenterX - innerW / 2 + outerW / 2;
      const centerMaxX = internalCenterX + innerW / 2 - outerW / 2;
      const x =
        centerMaxX > centerMinX ? Math.max(centerMinX, Math.min(centerMaxX, rawCenterX)) : internalCenterX;
      return {
        outerW,
        innerW: Math.max(0.01, outerW - 0.036),
        centerX: x,
        xNorm: xNorm ?? 0.5,
        centered: Math.abs(x - internalCenterX) <= 0.001,
        outerD,
        innerD: Math.max(0.01, outerD - 0.036),
        centerZ: 0,
        innerCenterZ: 0,
        innerBackZ: -outerD / 2,
      };
    },
    ...overrides,
  };
}

test('module box hit resolves from most of the box body and not only near the center line', () => {
  const hit = findSketchModuleBoxHit(
    makeArgs({
      cursorY: 0.24,
    })
  );

  assert.ok(hit);
  assert.equal(hit.boxId, 'box_mid');
  assert.equal(hit.boxH, 0.6);
});

test('module box hit keeps shifted boxes removable when pointer is inside their real X span', () => {
  const hit = findSketchModuleBoxHit(
    makeArgs({
      boxes: [
        {
          id: 'box_corner_like',
          yNorm: 0.5,
          heightM: 0.5,
          widthM: 0.36,
          xNorm: 0.8,
        },
      ],
      cursorX: 0.22,
      cursorY: 0.12,
    })
  );

  assert.ok(hit);
  assert.equal(hit.boxId, 'box_corner_like');
  assert.ok(Math.abs(hit.centerX - 0.36) <= 1e-9);
});

test('module box hit ignores pointer positions outside the box footprint', () => {
  const hit = findSketchModuleBoxHit(
    makeArgs({
      cursorY: 0.52,
    })
  );

  assert.equal(hit, null);
});
