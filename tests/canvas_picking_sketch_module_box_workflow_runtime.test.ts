import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSketchModuleBoxConfigItem,
  resolveSketchModuleBoxAction,
} from '../esm/native/services/canvas_picking_sketch_module_box_workflow.ts';

type ResolveArgs = Parameters<typeof resolveSketchModuleBoxAction>[0];

function resolveSketchBoxGeometry(args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
  centerXHint?: number | null;
  enableCenterSnap?: boolean;
}) {
  const outerW = args.widthM != null && args.widthM > 0 ? args.widthM : args.innerW;
  const outerD = args.depthM != null && args.depthM > 0 ? args.depthM : 0.5;
  const leftX = args.internalCenterX - args.innerW / 2;
  const hintedX = args.centerXHint;
  const xNorm =
    args.xNorm != null
      ? args.xNorm
      : hintedX != null && Number.isFinite(hintedX)
        ? (hintedX - leftX) / args.innerW
        : 0.5;
  const rawCenterX = args.xNorm != null ? leftX + xNorm * args.innerW : (hintedX ?? args.internalCenterX);
  return {
    outerW,
    innerW: Math.max(0.01, outerW - 0.036),
    centerX: rawCenterX,
    xNorm,
    centered: Math.abs(rawCenterX - args.internalCenterX) <= 1e-9,
    outerD,
    innerD: Math.max(0.01, outerD - 0.036),
    centerZ: args.internalZ,
    innerCenterZ: args.internalZ,
    innerBackZ: args.internalZ - outerD / 2,
  };
}

function makeArgs(overrides: Partial<ResolveArgs> = {}): ResolveArgs {
  return {
    boxes: [],
    cursorXHint: 0.18,
    cursorY: 0.12,
    boxH: 0.4,
    widthM: 0.36,
    depthM: 0.32,
    bottomY: -1,
    topY: 1,
    spanH: 2,
    pad: 0.02,
    innerW: 1.2,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    woodThick: 0.018,
    resolveSketchBoxGeometry,
    enableCenterSnap: false,
    removeIdHint: null,
    ...overrides,
  };
}

test('resolveSketchModuleBoxAction rebuilds remove state from removeIdHint before probing placement', () => {
  const action = resolveSketchModuleBoxAction(
    makeArgs({
      boxes: [
        {
          id: 'box_keep',
          yNorm: 0.7,
          heightM: 0.55,
          widthM: 0.36,
          depthM: 0.3,
          xNorm: 0.8,
        },
      ],
      removeIdHint: 'box_keep',
      cursorXHint: -0.3,
      cursorY: -0.6,
    })
  );

  assert.equal(action.op, 'remove');
  assert.equal(action.removeId, 'box_keep');
  assert.equal(action.boxH, 0.55);
  assert.equal(action.widthM, 0.36);
  assert.equal(action.depthM, 0.3);
  assert.equal(action.xNorm, 0.8);
  assert.ok(action.sourceBox);
});

test('resolveSketchModuleBoxAction rejects string-encoded existing box geometry', () => {
  const action = resolveSketchModuleBoxAction(
    makeArgs({
      boxes: [
        {
          id: 'legacy_box',
          yNorm: '0.7',
          heightM: '0.55',
          widthM: '0.36',
          depthM: '0.3',
          xNorm: '0.8',
        },
      ],
      removeIdHint: 'legacy_box',
    })
  );

  assert.equal(action.op, 'add');
  assert.notEqual(action.removeId, 'legacy_box');
  assert.equal(action.sourceBox, null);
});

test('createSketchModuleBoxConfigItem persists normalized y/width/depth/x position for added boxes', () => {
  const action = resolveSketchModuleBoxAction(makeArgs());
  assert.equal(action.op, 'add');

  const item = createSketchModuleBoxConfigItem({
    idFactory: () => 'sb_fixed',
    state: action,
    bottomY: -1,
    spanH: 2,
  });

  assert.equal(item.id, 'sb_fixed');
  assert.equal(item.heightM, 0.4);
  assert.equal(item.widthM, 0.36);
  assert.equal(item.depthM, 0.32);
  assert.ok(typeof item.xNorm === 'number');
  assert.ok(typeof item.yNorm === 'number');
});

test('automatic box height fills the pointed slot and follows floor, roof and content boundaries', () => {
  const placementBlockers = [
    { minY: -0.6, maxY: -0.4 },
    { minY: 0.2, maxY: 0.22 },
  ];
  for (const [cursorY, bottom, top] of [
    [-0.9, -0.98, -0.6],
    [-0.1, -0.4, 0.2],
    [0.9, 0.22, 0.98],
  ]) {
    const action = resolveSketchModuleBoxAction(makeArgs({ boxH: null, cursorY, placementBlockers }));
    assert.equal(action.op, 'add');
    assert.ok(Math.abs(action.boxH - (top - bottom)) < 1e-9);
    assert.ok(Math.abs(action.centerY - (top + bottom) / 2) < 1e-9);
  }
});

test('automatic box height blocks occupied or unusably short slots instead of jumping to a neighbor', () => {
  for (const cursorY of [0, 0.225]) {
    const action = resolveSketchModuleBoxAction(
      makeArgs({
        boxH: null,
        cursorY,
        placementBlockers: [
          { minY: -0.2, maxY: 0.2 },
          { minY: 0.25, maxY: 0.4 },
        ],
      })
    );
    assert.equal(action.op, 'blocked');
  }
});

test('automatic height considers existing boxes only when their horizontal span overlaps', () => {
  const boxes = [{ id: 'left', xNorm: 0.15, yNorm: 0.5, widthM: 0.3, heightM: 0.4 }];
  const beside = resolveSketchModuleBoxAction(makeArgs({ boxH: null, boxes, cursorXHint: 0.4 }));
  assert.equal(beside.op, 'add');
  assert.equal(beside.boxH, 1.96);
  const above = resolveSketchModuleBoxAction(
    makeArgs({
      boxH: null,
      boxes,
      cursorXHint: -0.4,
      cursorY: 0.7,
    })
  );
  assert.equal(above.op, 'add');
  assert.ok(Math.abs(above.boxH - 0.78) < 1e-9);
});
