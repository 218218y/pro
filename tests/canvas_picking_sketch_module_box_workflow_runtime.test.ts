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
