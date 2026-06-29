import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampSketchFreeBoxCenterY,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxGeometry,
  resolveSketchBoxSegmentForContent,
  resolveSketchFreeBoxGeometry,
} from '../esm/native/builder/render_interior_sketch_layout.ts';
import { resolveSketchBoxHeight } from '../esm/native/builder/render_interior_sketch_boxes_shell_height.ts';
import { resolveSketchBoxShellGeometry } from '../esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts';
import {
  MATERIAL_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

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

test('render sketch box shell geometry rejects string-encoded live box dimensions', () => {
  assert.equal(
    resolveSketchBoxHeight({
      rawHeight: '0.8',
      defaultHeight: null,
      woodThick: 0.02,
      spanH: 2,
      isFreePlacement: false,
    }),
    null
  );

  const renderArgs = {
    effectiveBottomY: 0,
    effectiveTopY: 2,
    spanH: 2,
    innerW: 1,
    woodThick: 0.02,
    internalDepth: 0.55,
    internalCenterX: 0,
    internalZ: 0,
    clampY: (y: number) => y,
  } as any;

  assert.equal(
    resolveSketchBoxShellGeometry({
      box: { yNorm: '0.5', heightM: 0.8, widthM: '0.4', depthM: '0.3' } as any,
      isFreePlacement: false,
      height: 0.8,
      renderArgs,
      freeWardrobeBox: null,
    }),
    null
  );

  assert.equal(
    resolveSketchBoxShellGeometry({
      box: { freePlacement: true, absX: '0.2', absY: 0.8, heightM: 0.8, widthM: 0.4 } as any,
      isFreePlacement: true,
      height: 0.8,
      renderArgs,
      freeWardrobeBox: { centerX: 0, centerY: 1, centerZ: 0, width: 1, height: 2, depth: 0.55 },
    }),
    null
  );
});

test('render interior sketch layout geometry rejects string-encoded live numeric overrides', () => {
  const geometry = resolveSketchBoxGeometry({
    innerW: 0.8,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: 0.1,
    woodThick: 0.02,
    widthM: '0.4' as any,
    depthM: '0.3' as any,
    xNorm: '1' as any,
  });

  assert.equal(geometry.outerW, 0.8);
  assert.equal(geometry.outerD, 0.5);
  assert.equal(geometry.centerX, 0);

  const freeGeometry = resolveSketchFreeBoxGeometry({
    wardrobeWidth: 1.4,
    wardrobeDepth: 0.55,
    backZ: -0.25,
    centerX: 0.4,
    woodThick: 0.02,
    widthM: '0.7' as any,
    depthM: '0.35' as any,
  });

  assert.equal(freeGeometry.outerW, SKETCH_BOX_DIMENSIONS.geometry.defaultOuterWidthM);
  assert.equal(freeGeometry.outerD, SKETCH_BOX_DIMENSIONS.geometry.defaultOuterDepthM);

  assert.equal(
    clampSketchFreeBoxCenterY({
      centerY: -1,
      boxH: 0.6,
      wardrobeCenterY: 1,
      wardrobeHeight: 2,
      pad: '0.05' as any,
    }),
    0.3
  );
});

test('render interior sketch layout geometry rejects string-encoded runtime placement args', () => {
  const geometry = resolveSketchBoxGeometry({
    innerW: '0.8' as any,
    internalCenterX: '0.4' as any,
    internalDepth: '0.5' as any,
    internalZ: '0.1' as any,
    woodThick: '0.02' as any,
    widthM: null,
    depthM: null,
    xNorm: 1,
  });

  assert.equal(geometry.outerW, SKETCH_BOX_DIMENSIONS.geometry.minOuterWidthM);
  assert.equal(geometry.outerD, SKETCH_BOX_DIMENSIONS.geometry.minOuterDepthM);
  assert.equal(geometry.centerX, 0);
  assert.equal(geometry.centerZ, 0);

  const freeGeometry = resolveSketchFreeBoxGeometry({
    wardrobeWidth: '1.4' as any,
    wardrobeDepth: '0.55' as any,
    backZ: '-0.25' as any,
    centerX: '0.4' as any,
    woodThick: '0.02' as any,
    widthM: null,
    depthM: null,
  });

  assert.equal(freeGeometry.outerW, SKETCH_BOX_DIMENSIONS.geometry.defaultOuterWidthM);
  assert.equal(freeGeometry.outerD, SKETCH_BOX_DIMENSIONS.geometry.defaultOuterDepthM);
  assert.equal(freeGeometry.centerX, 0);
  assert.equal(freeGeometry.innerBackZ, MATERIAL_DIMENSIONS.wood.thicknessM);

  assert.equal(
    clampSketchFreeBoxCenterY({
      centerY: '1' as any,
      boxH: 0.6,
      wardrobeCenterY: 1,
      wardrobeHeight: 2,
      pad: 0.05,
    }),
    0
  );
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

test('render interior sketch layout dividers sort explicit dividers and ignore removed persisted fallbacks', () => {
  const explicit = readSketchBoxDividers({
    dividers: [
      { id: 'right', xNorm: 0.8 },
      { id: 'left', xNorm: 0.2 },
      { id: 'legacy-string', xNorm: '0.4' },
      { id: 'typed-with-string-meta', xNorm: 0.4, yNorm: '0.5', frontZ: '0.2' },
    ],
  });
  assert.deepEqual(
    explicit.map(divider => ({
      id: divider.id,
      xNorm: divider.xNorm,
      yNorm: divider.yNorm,
      frontZ: divider.frontZ,
    })),
    [
      { id: 'left', xNorm: 0.2, yNorm: undefined, frontZ: undefined },
      { id: 'typed-with-string-meta', xNorm: 0.4, yNorm: undefined, frontZ: undefined },
      { id: 'right', xNorm: 0.8, yNorm: undefined, frontZ: undefined },
    ]
  );

  assert.deepEqual(
    readSketchBoxHorizontalDividers({
      horizontalDividers: [
        { id: 'legacy-string', yNorm: '0.4' },
        { id: 'typed-with-string-meta', yNorm: 0.4, xNorm: '0.5', frontZ: '0.2' },
      ],
    }).map(divider => ({
      id: divider.id,
      yNorm: divider.yNorm,
      xNorm: divider.xNorm,
      frontZ: divider.frontZ,
    })),
    [{ id: 'typed-with-string-meta', yNorm: 0.4, xNorm: undefined, frontZ: undefined }]
  );

  assert.deepEqual(readSketchBoxDividers({ centerDivider: true, dividerXNorm: 0.5 }), []);
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

  assert.equal(
    resolveSketchBoxSegmentForContent({
      dividers,
      boxCenterX: 0,
      innerW: 0.8,
      woodThick: 0.02,
      xNorm: '0.5' as any,
    }),
    null
  );
});
