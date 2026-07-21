import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_LAYOUT_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.ts';
import {
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
  SKETCH_BOX_STORAGE_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.ts';
import { renderSketchBoxContentStorageBarriers } from '../esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts';
import {
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';
import { resolveSketchBoxVerticalContentPreview } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview.ts';
import { decodeSketchStructuralCommandHover } from '../esm/native/services/canvas_picking_sketch_structural_command.ts';

const EPS = 1e-12;
const closeTo = (actual: unknown, expected: number) => {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(Number(actual) - expected) <= EPS, `${String(actual)} != ${expected}`);
};

function renderBarriers(options: {
  storageBarriers?: unknown;
  woodThick?: number;
  sideH?: number;
  innerW?: number;
  innerD?: number;
  innerBackZ?: number;
  frontZ?: number;
  dividers?: unknown[];
  horizontalDividers?: unknown[];
  yFromBoxNorm?: (value: unknown, halfH: number) => number | null;
  getPartMaterial?: (partId: unknown) => unknown;
}) {
  const calls: unknown[][] = [];
  const bodyMat = { name: 'body' };
  renderSketchBoxContentStorageBarriers({
    shell: {
      box: { storageBarriers: options.storageBarriers ?? [] },
      boxId: 'box-a',
      boxPid: 'module_2_box_box-a',
      isFreePlacement: false,
      height: options.sideH ?? 1,
      halfH: (options.sideH ?? 1) / 2,
      centerY: 1,
      sideH: options.sideH ?? 1,
      boxMat: bodyMat,
      geometry: {
        outerW: options.innerW ?? 1,
        innerW: options.innerW ?? 1,
        centerX: 0,
        outerD: options.innerD ?? 0.5,
        centerZ: 0,
        innerBackZ: options.innerBackZ ?? -0.25,
        innerD: options.innerD ?? 0.5,
      },
      hexGeometry: null,
      fullDepth: options.innerD ?? 0.5,
      backZ: options.innerBackZ ?? -0.25,
      innerBottomY: 0.5,
      innerTopY: 1.5,
      regularDepth: options.innerD ?? 0.5,
      frontZ: options.frontZ ?? 0.25,
    },
    boxDividers: (options.dividers ?? []) as never[],
    boxHorizontalDividers: (options.horizontalDividers ?? []) as never[],
    yFromBoxNorm: options.yFromBoxNorm ?? ((value, halfH) => 0.5 + Number(value) + halfH),
    resolveBoxDrawerSpan: () => {
      throw new Error('unused');
    },
    args: {
      createBoard: (...args: unknown[]) => {
        calls.push(args);
        return null;
      },
      woodThick: options.woodThick ?? 0.02,
      bodyMat,
      getPartMaterial: options.getPartMaterial,
      isFn: (value: unknown): value is (...args: unknown[]) => unknown => typeof value === 'function',
    },
  } as never);
  return { calls, bodyMat };
}

function storagePreview(options: {
  targetBox?: unknown;
  storageHeight?: number | null;
  targetHeight?: number;
  pointerX?: number;
  pointerY?: number;
  innerW?: number;
  innerD?: number;
  innerBackZ?: number;
  woodThick?: number;
  removeEpsBox?: number;
}) {
  return resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_storage', moduleKey: 2, isBottom: false, ts: 7 },
    contentKind: 'storage',
    boxId: 'box-a',
    freePlacement: true,
    targetBox: options.targetBox ?? { id: 'box-a', storageBarriers: [] },
    targetGeo: {
      centerX: 0,
      innerW: options.innerW ?? 1,
      innerD: options.innerD ?? 0.5,
      innerBackZ: options.innerBackZ ?? -0.25,
    },
    targetCenterY: 1,
    targetHeight: options.targetHeight ?? 1,
    pointerX: options.pointerX ?? 0,
    pointerY: options.pointerY ?? 1,
    woodThick: options.woodThick ?? 0.02,
    storageHeight: options.storageHeight,
    removeEpsBox: options.removeEpsBox,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });
}

function structuralCommand(record: unknown) {
  const decoded = decodeSketchStructuralCommandHover(record);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) assert.fail(decoded.reason);
  return decoded.value.command;
}

test('storage barrier renderer preserves validation, height precedence, clamps, material and board arguments', () => {
  const material = { name: 'storage-material' };
  const woodThick = 0.03;
  const minHeight =
    woodThick * INTERIOR_STORAGE_LAYOUT_POLICY.minHeightWoodMultiplier +
    INTERIOR_STORAGE_LAYOUT_POLICY.minHeightExtraM;
  const { calls } = renderBarriers({
    woodThick,
    sideH: 0.4,
    storageBarriers: [
      null,
      { id: 'invalid', heightM: 0, hM: -1, yNorm: 0.2 },
      { id: 'height-first', heightM: 0.08, hM: 0.3, yNorm: 0.2 },
      { id: 'fallback', heightM: Number.NaN, hM: 0.9, yNorm: 0.4 },
      { id: 'skip-y', heightM: 0.2, yNorm: 0.9 },
    ],
    yFromBoxNorm: (value, halfH) => (value === 0.9 ? null : 1 + Number(value) + halfH),
    getPartMaterial: partId => (partId === 'module_2_box_box-a_storage_height-first' ? material : null),
  });

  assert.equal(calls.length, 2);
  closeTo(calls[0][1], minHeight);
  closeTo(calls[1][1], 0.4);
  assert.equal(calls[0][6], material);
  assert.equal(calls[1][6]?.name, 'body');
  assert.equal(calls[0][7], 'module_2_box_box-a_storage_height-first');
  assert.equal(calls[1][7], 'module_2_box_box-a_storage_fallback');
});

test('storage barrier renderer preserves scoped width, minimums, thickness and depth-clearance branches', () => {
  const scoped = renderBarriers({
    storageBarriers: [{ id: 'scoped', heightM: 0.2, yNorm: 0.5, xNorm: 0.25 }],
    dividers: [{ id: 'v', xNorm: 0.5 }],
    innerW: 1,
    innerD: 0.1,
    innerBackZ: -0.1,
    frontZ: 0.1,
    woodThick: 0.02,
  }).calls[0];
  assert.ok(Number(scoped[0]) < 0.5);
  assert.ok(Number(scoped[3]) < 0);
  closeTo(scoped[2], 0.02);
  closeTo(
    scoped[5],
    Math.max(
      -0.1 + 0.02 / 2,
      0.1 -
        Math.min(
          SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMaxM,
          Math.max(
            SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMinM,
            0.1 * SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceRatio
          )
        )
    )
  );

  const tiny = renderBarriers({
    storageBarriers: [{ heightM: 0.2, yNorm: 0.5 }],
    innerW: 0.01,
    innerD: 0.01,
    innerBackZ: -0.2,
    frontZ: -0.2,
    woodThick: 0,
  }).calls[0];
  closeTo(tiny[0], INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM);
  closeTo(tiny[2], INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM);
  closeTo(tiny[5], -0.2 + INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM / 2);

  for (const [innerD, expectedClearance] of [
    [0.05, SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMinM],
    [0.1, 0.1 * SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceRatio],
    [0.3, SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMaxM],
  ] as const) {
    const call = renderBarriers({
      storageBarriers: [{ heightM: 0.2, yNorm: 0.5 }],
      innerD,
      innerBackZ: -1,
      frontZ: 1,
      woodThick: 0.02,
    }).calls[0];
    closeTo(call[5], 1 - expectedClearance);
  }
});

test('storage preview preserves explicit and default height, scoped sizing, hover fields and depth branches', () => {
  const explicit = storagePreview({
    storageHeight: 0.22,
    targetBox: { id: 'box-a', storageBarriers: [], dividers: [{ id: 'v', xNorm: 0.5 }] },
    pointerX: -0.25,
    innerW: 1,
    innerD: 0.1,
    innerBackZ: -0.1,
    woodThick: 0.03,
  });
  assert.ok(explicit);
  assert.equal(explicit?.preview.kind, 'storage');
  closeTo(explicit?.preview.h, 0.22);
  closeTo(explicit?.preview.d, 0.03);
  assert.ok(Number(explicit?.preview.x) < 0);
  assert.ok(Number(explicit?.preview.w) < 0.5);
  const command = structuralCommand(explicit?.hoverRecord);
  assert.equal(command.kind, 'add-storage');
  if (command.kind !== 'add-storage') assert.fail('expected add-storage');
  assert.equal(command.op, 'add');
  assert.equal(command.boxId, 'box-a');
  assert.equal(command.freePlacement, true);
  assert.ok(command.contentXNorm < 0.5);
  closeTo(command.heightM, 0.22);

  const fallback = storagePreview({ storageHeight: 0, woodThick: 0 });
  closeTo(fallback?.preview.h, INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);
  closeTo(fallback?.preview.d, INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM);

  for (const [innerD, expectedClearance] of [
    [0.05, SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMinM],
    [0.1, 0.1 * SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceRatio],
    [0.3, SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMaxM],
  ] as const) {
    const result = storagePreview({ innerD, innerBackZ: -1 });
    closeTo(result?.preview.z, -1 + innerD - expectedClearance);
  }
  const backInset = storagePreview({ innerD: 0.01, innerBackZ: -1 });
  closeTo(backInset?.preview.z, -1 + SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierBackInsetM);
});

test('storage preview preserves local nearest removal and rejects string scoped positions', () => {
  const removed = storagePreview({
    targetBox: {
      id: 'box-a',
      storageBarriers: [
        { id: 'far', yNorm: 0.2, xNorm: 0.5, heightM: 0.12 },
        { id: 'near', yNorm: 0.55, xNorm: 0.5, heightM: 0.18 },
      ],
    },
    pointerY: 1.05,
    removeEpsBox: SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM,
  });
  assert.equal(removed?.preview.op, 'remove');
  const removeCommand = structuralCommand(removed?.hoverRecord);
  assert.equal(removeCommand.kind, 'remove-storage');
  if (removeCommand.kind !== 'remove-storage') assert.fail('expected remove-storage');
  assert.equal(removeCommand.removeId, 'near');
  assert.equal(removeCommand.removeIdx, 1);
  closeTo(removed?.preview.h, INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);

  const stringScoped = storagePreview({
    targetBox: {
      id: 'box-a',
      storageBarriers: [{ id: 'legacy', yNorm: 0.5, xNorm: '0.5', heightM: 0.2 }],
    },
    pointerY: 1,
  });
  assert.equal(stringScoped?.preview.op, 'add');
  const addCommand = structuralCommand(stringScoped?.hoverRecord);
  assert.equal(addCommand.kind, 'add-storage');
});

test('storage preview preserves removal-blocker, no-room, collision and minimum width behavior', () => {
  const removalBlocker = storagePreview({
    targetBox: { id: 'box-a', storageBarriers: [{ id: 'existing', yNorm: 0.5, heightM: 0.2 }] },
    pointerY: 1.125,
    removeEpsBox: 0.01,
  });
  assert.equal(removalBlocker?.preview.op, 'remove');

  const noRoom = storagePreview({ storageHeight: 0.2, targetHeight: 0.1 });
  assert.equal(noRoom?.preview.op, 'blocked');
  assert.equal(noRoom?.preview.blockedReason, 'no-room');
  const noRoomCommand = structuralCommand(noRoom?.hoverRecord);
  assert.equal(noRoomCommand.blockedReason, 'no-room');

  const collision = storagePreview({
    targetBox: { id: 'box-a', storageBarriers: [{ id: 'existing', yNorm: 0.5, heightM: 0.3 }] },
    pointerY: 1.2,
    removeEpsBox: 0,
    storageHeight: 0.3,
  });
  assert.equal(collision?.preview.op, 'blocked');
  assert.equal(collision?.preview.blockedReason, 'collision');

  const minimumWidth = storagePreview({ innerW: 0.01 });
  closeTo(minimumWidth?.preview.w, SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM);
});
