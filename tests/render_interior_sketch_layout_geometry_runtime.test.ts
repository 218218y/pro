import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampSketchFreeBoxCenterY,
  readSketchBoxDividers,
  resolveSketchBoxGeometry,
  resolveSketchBoxSegmentForContent,
  resolveSketchFreeBoxGeometry,
} from '../esm/native/builder/render_interior_sketch_layout.ts';

test('render interior sketch layout geometry clamps box size and center inside the internal span', () => {
  const geometry = resolveSketchBoxGeometry({
    innerW: 0.8,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: 0.1,
    woodThick: 0.02,
    widthM: 2.4,
    depthM: 0.04,
    xNorm: 1,
  });

  assert.equal(geometry.outerW, 0.8);
  assert.equal(geometry.outerD, 0.05);
  assert.equal(geometry.centerX, 0);
  assert.ok(Math.abs(geometry.innerW - 0.76) < 1e-9);
  assert.ok(Math.abs(geometry.innerD - 0.03) < 1e-9);
});

test('render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry', () => {
  const geometry = resolveSketchFreeBoxGeometry({
    wardrobeWidth: 1.4,
    wardrobeDepth: 0.55,
    backZ: -0.25,
    centerX: 0.4,
    woodThick: 0.02,
    widthM: 0.7,
    depthM: 0.35,
  });

  assert.equal(geometry.outerW, 0.7);
  assert.equal(geometry.outerD, 0.35);
  assert.equal(geometry.centerX, 0.4);
  assert.ok(Math.abs(geometry.innerW - 0.66) < 1e-9);
  assert.ok(Math.abs(geometry.innerD - 0.33) < 1e-9);

  const clampedLow = clampSketchFreeBoxCenterY({
    centerY: -1,
    boxH: 0.6,
    wardrobeCenterY: 1,
    wardrobeHeight: 2,
    pad: 0.05,
  });
  const clampedHigh = clampSketchFreeBoxCenterY({
    centerY: 3.4,
    boxH: 0.6,
    wardrobeCenterY: 1,
    wardrobeHeight: 2,
    pad: 0.05,
  });

  assert.equal(clampedLow, 0.35);
  assert.ok(Math.abs(clampedHigh - 3) < 1e-9);
});

test('render interior sketch layout dividers sort explicit dividers and still honor legacy centered fallbacks', () => {
  const explicit = readSketchBoxDividers({
    dividers: [
      { id: 'right', xNorm: 0.8 },
      { id: 'left', xNorm: 0.2 },
    ],
  });
  assert.deepEqual(
    explicit.map(divider => ({ id: divider.id, xNorm: divider.xNorm })),
    [
      { id: 'left', xNorm: 0.2 },
      { id: 'right', xNorm: 0.8 },
    ]
  );

  const legacyCentered = readSketchBoxDividers({ centerDivider: true });
  assert.deepEqual(legacyCentered, [{ id: 'legacy_divider', xNorm: 0.5, centered: true }]);
});

test('render interior sketch layout resolves content segments from divider-separated spans', () => {
  const dividers = readSketchBoxDividers({
    dividers: [
      { id: 'left', xNorm: 0.25 },
      { id: 'right', xNorm: 0.75 },
    ],
  });

  const leftSegment = resolveSketchBoxSegmentForContent({
    dividers,
    boxCenterX: 0,
    innerW: 0.8,
    woodThick: 0.02,
    xNorm: 0.1,
  });
  const middleSegment = resolveSketchBoxSegmentForContent({
    dividers,
    boxCenterX: 0,
    innerW: 0.8,
    woodThick: 0.02,
    xNorm: 0.5,
  });
  const rightSegment = resolveSketchBoxSegmentForContent({
    dividers,
    boxCenterX: 0,
    innerW: 0.8,
    woodThick: 0.02,
    xNorm: 0.9,
  });

  assert.ok(leftSegment);
  assert.ok(middleSegment);
  assert.ok(rightSegment);
  assert.ok((leftSegment?.centerX ?? 0) < 0);
  assert.ok(Math.abs(middleSegment?.centerX ?? 99) < 0.05);
  assert.ok((rightSegment?.centerX ?? 0) > 0);
  assert.ok((middleSegment?.width ?? 0) > (leftSegment?.width ?? 0));
  assert.ok((middleSegment?.width ?? 0) > (rightSegment?.width ?? 0));
});
