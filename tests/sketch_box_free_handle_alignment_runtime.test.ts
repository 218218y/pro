import test from 'node:test';
import assert from 'node:assert/strict';

import { HANDLE_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import { resolveSketchBoxDoorLayout } from '../esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts';
import { resolveSketchFreeBoxSharedHandleAbsY } from '../esm/native/builder/render_interior_sketch_boxes_fronts_door_handle_policy.ts';

function createRenderArgs(
  options: { freePlacement: boolean; cfg?: Record<string, unknown>; box?: Record<string, unknown> } = {
    freePlacement: true,
  }
) {
  const woodThick = 0.02;
  const centerY = 1;
  const sideH = 1.2;
  const innerBottomY = centerY - sideH / 2;
  const innerTopY = centerY + sideH / 2;
  const box = options.box || {
    doors: [
      { id: 'left', enabled: true, hinge: 'left' },
      { id: 'right', enabled: true, hinge: 'right' },
    ],
    regularExtDrawers: [{ id: 'regular-stack', count: 4, xNorm: 0.25, yNormC: 0.5 }],
  };

  return {
    frontsArgs: {
      shell: {
        box,
        boxId: 'freeHandleBox',
        boxPid: 'sketch_box_free_0_freeHandleBox',
        isFreePlacement: options.freePlacement,
        height: sideH + 2 * woodThick,
        halfH: sideH / 2 + woodThick,
        centerY,
        sideH,
        boxMat: { id: 'box-mat' },
        geometry: {
          centerX: 0,
          innerW: 1,
          outerW: 1 + 2 * woodThick,
          centerZ: 0,
          outerD: 0.5,
          innerD: 0.46,
          innerBackZ: -0.23,
        },
        innerBottomY,
        innerTopY,
        frontZ: 0.25,
        regularDepth: 0.5,
      },
      boxDividers: [],
      boxHorizontalDividers: [],
      resolveBoxDrawerSpan: () => ({
        segment: null,
        innerW: 1,
        innerCenterX: 0,
        outerW: 1 + 2 * woodThick,
        outerCenterX: 0,
        faceW: 1 + 2 * woodThick,
        faceCenterX: 0,
      }),
      args: {
        App: {},
        input: { cfg: options.cfg || {} },
        group: { add() {} },
        woodThick,
        moduleIndex: 0,
        moduleKeyStr: '0',
        createDoorVisual: null,
        THREE: {},
        isFn: (value: unknown) => typeof value === 'function',
        currentShelfMat: { id: 'shelf-mat' },
        bodyMat: { id: 'body-mat' },
        getPartMaterial: null,
        getPartColorValue: null,
        createBoard: null,
      },
    },
    doorStyle: 'flat',
    doorStyleMap: {},
    resolvePartMaterial: (_partId: string, fallback: unknown) => fallback,
  } as any;
}

test('free-placement sketch-box doors share the lifted handle height from box external drawers', () => {
  const renderArgs = createRenderArgs({
    freePlacement: true,
    cfg: {
      globalHandleType: 'edge',
      handlesMap: { __wp_edge_handle_variant_global: 'long' },
    },
  });

  const sharedHandleAbsY = resolveSketchFreeBoxSharedHandleAbsY(renderArgs);
  const withoutLongEdge = resolveSketchFreeBoxSharedHandleAbsY(
    createRenderArgs({
      freePlacement: true,
      cfg: { globalHandleType: 'edge', handlesMap: {} },
    })
  );

  assert.ok(sharedHandleAbsY != null);
  assert.ok(withoutLongEdge != null);
  assert.ok(sharedHandleAbsY > renderArgs.frontsArgs.shell.centerY);
  assert.ok(Math.abs(sharedHandleAbsY - withoutLongEdge - HANDLE_DIMENSIONS.edge.longLiftExtraM) < 1e-9);

  const layout = resolveSketchBoxDoorLayout({
    renderArgs,
    placement: {
      door: { id: 'left', enabled: true, hinge: 'left' },
      index: 0,
      segment: null,
      verticalSegment: null,
    } as any,
    placementsBySegment: new Map(),
    sharedHandleAbsY,
  });

  assert.equal(layout?.groupUserData.__handleAbsY, sharedHandleAbsY);
});

test('free-placement sketch-box row doors clamp handles like lower and upper hinged cabinets', () => {
  const renderArgs = createRenderArgs({
    freePlacement: true,
    box: {
      horizontalDividers: [{ id: 'middle-row', yNorm: 0.5, centered: true }],
      doors: [
        { id: 'bottom-door', enabled: true, hinge: 'left', xNorm: 0.5, yNorm: 0.25 },
        { id: 'top-door', enabled: true, hinge: 'left', xNorm: 0.5, yNorm: 0.75 },
      ],
    },
  });

  const placements = [
    {
      door: { id: 'bottom-door', enabled: true, hinge: 'left', xNorm: 0.5, yNorm: 0.25 },
      index: 0,
      segment: null,
      verticalSegment: {
        index: 0,
        bottomY: 0.4,
        topY: 0.99,
        centerY: 0.695,
        height: 0.59,
        yNorm: 0.25,
      },
    },
    {
      door: { id: 'top-door', enabled: true, hinge: 'left', xNorm: 0.5, yNorm: 0.75 },
      index: 1,
      segment: null,
      verticalSegment: {
        index: 1,
        bottomY: 1.01,
        topY: 1.6,
        centerY: 1.305,
        height: 0.59,
        yNorm: 0.75,
      },
    },
  ] as any[];

  const bottomLayout = resolveSketchBoxDoorLayout({
    renderArgs,
    placement: placements[0],
    placementsBySegment: new Map(),
    sharedHandleAbsY: null,
  });
  const topLayout = resolveSketchBoxDoorLayout({
    renderArgs,
    placement: placements[1],
    placementsBySegment: new Map(),
    sharedHandleAbsY: null,
  });

  assert.ok(Math.abs(Number(bottomLayout?.groupUserData.__handleAbsY) - 0.89) < 1e-9);
  assert.ok(Math.abs(Number(topLayout?.groupUserData.__handleAbsY) - 1.11) < 1e-9);
  assert.notEqual(bottomLayout?.groupUserData.__handleAbsY, bottomLayout?.doorCenterY);
  assert.notEqual(topLayout?.groupUserData.__handleAbsY, topLayout?.doorCenterY);
});

test('free-placement sketch-box doors do not lift handles from sketch-cut external drawers', () => {
  const renderArgs = createRenderArgs({
    freePlacement: true,
    cfg: {
      globalHandleType: 'edge',
      handlesMap: { __wp_edge_handle_variant_global: 'long' },
    },
    box: {
      doors: [
        { id: 'left', enabled: true, hinge: 'left' },
        { id: 'right', enabled: true, hinge: 'right' },
      ],
      extDrawers: [{ id: 'sketch-stack', count: 4, yNormC: 0.5 }],
    },
  });

  assert.equal(resolveSketchFreeBoxSharedHandleAbsY(renderArgs), null);
});

test('non-free sketch boxes do not opt into free-box handle-height sharing', () => {
  const renderArgs = createRenderArgs({ freePlacement: false });

  assert.equal(resolveSketchFreeBoxSharedHandleAbsY(renderArgs), null);
});
