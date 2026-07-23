import test from 'node:test';
import assert from 'node:assert/strict';

import { INTERIOR_SHELF_GEOMETRY_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';
import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import {
  SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY,
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_ROD_PREVIEW_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
  SKETCH_BOX_STORAGE_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.ts';
import {
  pickSketchBoxSegment,
  readSketchBoxDividers,
  resolveSketchBoxSegments,
} from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';
import {
  doesSketchBoxVerticalCandidateCollide,
  findSketchBoxVerticalRemovalBlocker,
  resolveSketchBoxVerticalRemovalPreview,
} from '../esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts';
import type { SketchBoxVerticalContentBlocker } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_blockers.ts';
import type { ResolveSketchBoxVerticalContentPreviewArgs } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview_contracts.ts';
import { resolveSketchBoxShelfPreview } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts';
import { createSketchBoxVerticalPreviewState } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview_state.ts';
import { decodeSketchStructuralCommandHover } from '../esm/native/services/canvas_picking_sketch_structural_command.ts';

const host = { tool: 'sketch_shelf:regular', moduleKey: 2 as const, isBottom: false, ts: 1 };

function blocker(
  kind: SketchBoxVerticalContentBlocker['kind'],
  minY: number,
  maxY: number,
  overrides: Partial<SketchBoxVerticalContentBlocker> = {}
): SketchBoxVerticalContentBlocker {
  return {
    minY,
    maxY,
    centerY: (minY + maxY) / 2,
    stackH: maxY - minY,
    collisionGapM: 0,
    hardCollision: true,
    id: `${kind}-id`,
    kind,
    source: 'box',
    index: 4,
    heightM: maxY - minY,
    ...overrides,
  };
}

function previewArgs(
  overrides: Partial<ResolveSketchBoxVerticalContentPreviewArgs> = {}
): ResolveSketchBoxVerticalContentPreviewArgs {
  return {
    host,
    contentKind: 'shelf',
    boxId: 'box-vertical',
    freePlacement: true,
    targetBox: { id: 'box-vertical', shelves: [], rods: [], storageBarriers: [] },
    targetGeo: { centerX: 0, innerW: 0.8, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    woodThick: 0.02,
    shelfVariant: 'regular',
    shelfDepthOverrideM: null,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    ...overrides,
  };
}

function structuralCommand(value: unknown) {
  const decoded = decodeSketchStructuralCommandHover(value);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) assert.fail(`Expected canonical structural command hover: ${decoded.reason}`);
  return decoded.value.command;
}

function close(actual: unknown, expected: number, tolerance = 1e-12) {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(Number(actual) - expected) <= tolerance, `${String(actual)} != ${expected}`);
}

type Measurement = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  z?: number;
  textScale?: number;
  styleKey?: string;
  role?: string;
};

function centeredLineOffset(width: number): number {
  const lineGap = Math.max(0.035, Math.min(0.085, width * 0.045));
  return Math.min(lineGap * 0.9, Math.max(0.008, width / 2 - 0.008));
}

function assertVerticalMeasurementTargets(args: {
  measurements: Measurement[];
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  containerMinY: number;
  containerMaxY: number;
  z: number;
  neighborMinY: number;
}) {
  const cellEntries = args.measurements.filter(entry => entry.role === 'cell');
  assert.equal(cellEntries.length, 2);
  const cellLineX = args.centerX + centeredLineOffset(args.width);
  const targetMinY = args.centerY - args.height / 2;
  const targetMaxY = args.centerY + args.height / 2;
  for (const entry of cellEntries) {
    close(entry.startX, cellLineX);
    close(entry.endX, cellLineX);
    close(entry.z, args.z);
    assert.equal(entry.role, 'cell');
    assert.equal(entry.styleKey, 'cell');
    assert.equal(entry.textScale, SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale);
  }
  assert.ok(
    cellEntries.some(
      entry =>
        Math.abs(entry.startY - args.containerMinY) <= 1e-12 && Math.abs(entry.endY - targetMinY) <= 1e-12
    )
  );
  assert.ok(
    cellEntries.some(
      entry =>
        Math.abs(entry.startY - targetMaxY) <= 1e-12 && Math.abs(entry.endY - args.containerMaxY) <= 1e-12
    )
  );

  const neighbor = args.measurements.find(entry => entry.role === 'neighbor');
  assert.ok(neighbor);
  close(neighbor.startX, args.centerX - centeredLineOffset(args.width));
  close(neighbor.endX, neighbor.startX);
  close(neighbor.startY, targetMaxY);
  close(neighbor.endY, args.neighborMinY);
  close(neighbor.z, args.z);
  assert.equal(neighbor.role, 'neighbor');
  assert.equal(neighbor.styleKey, 'neighbor');
  assert.equal(
    neighbor.textScale,
    Math.max(0.74, SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale * 0.94)
  );
}

test('vertical occupancy matching preserves focused tolerances, exact boundaries, nearest selection, and filters', () => {
  const storage = blocker('storage', -0.1, 0, { id: 'storage' });
  const shelf = blocker('shelf', 1.2, 1.22, { id: 'shelf' });
  const rod = blocker('rod', 1.3, 1.32, { id: 'rod' });

  assert.equal(
    findSketchBoxVerticalRemovalBlocker({
      blockers: [storage],
      pointerY: SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM,
      allowedKinds: ['storage'],
    })?.id,
    'storage'
  );
  assert.equal(
    findSketchBoxVerticalRemovalBlocker({
      blockers: [storage],
      pointerY: SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM + 1e-9,
      allowedKinds: ['storage'],
    }),
    null
  );
  for (const kind of ['shelf', 'rod'] as const) {
    const candidate = blocker(kind, -0.02, 0, { id: kind });
    assert.equal(
      findSketchBoxVerticalRemovalBlocker({
        blockers: [candidate],
        pointerY: SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM,
        allowedKinds: [candidate.kind],
      })?.id,
      candidate.id
    );
  }
  assert.equal(
    findSketchBoxVerticalRemovalBlocker({
      blockers: [storage],
      pointerY: 0.04,
      allowedKinds: ['storage'],
      toleranceM: 0.04,
    })?.id,
    'storage'
  );

  const farther = blocker('shelf', 0.9, 0.95, { id: 'farther' });
  const nearer = blocker('shelf', 1.04, 1.08, { id: 'nearer' });
  assert.equal(
    findSketchBoxVerticalRemovalBlocker({
      blockers: [farther, nearer],
      pointerY: 1,
      allowedKinds: ['shelf'],
      toleranceM: 0.1,
    })?.id,
    'nearer'
  );
  const sameRangeFarCenter = blocker('rod', 0.98, 1.02, { id: 'far-center', centerY: 1.03 });
  const sameRangeNearCenter = blocker('rod', 0.98, 1.02, { id: 'near-center', centerY: 1.001 });
  assert.equal(
    findSketchBoxVerticalRemovalBlocker({
      blockers: [sameRangeFarCenter, sameRangeNearCenter],
      pointerY: 1,
      allowedKinds: ['rod'],
    })?.id,
    'near-center'
  );
  assert.equal(
    findSketchBoxVerticalRemovalBlocker({
      blockers: [storage, shelf],
      pointerY: 1.05,
      allowedKinds: ['shelf'],
      toleranceM: 1,
    })?.id,
    'shelf'
  );
});

test('vertical collision preserves strict touch epsilon and blocker-kind filtering', () => {
  const shelf = blocker('shelf', 1, 1.1);
  assert.equal(
    doesSketchBoxVerticalCandidateCollide({
      blockers: [shelf],
      centerY: 0.95,
      heightM: 0.1,
      blockerKinds: ['shelf'],
    }),
    false
  );
  assert.equal(
    doesSketchBoxVerticalCandidateCollide({
      blockers: [shelf],
      centerY: 0.950000002,
      heightM: 0.1,
      blockerKinds: ['shelf'],
    }),
    true
  );
  assert.equal(
    doesSketchBoxVerticalCandidateCollide({
      blockers: [shelf],
      centerY: 1.05,
      heightM: 0.02,
      blockerKinds: ['rod', 'storage'],
    }),
    false
  );
});

test('rod removal preview preserves segment resolution, minimum/clearance widths, geometry, and removal identity', () => {
  for (const scenario of [
    { innerW: 0.04, centerX: 0.2, pointerX: 0.2, targetBox: {}, xNorm: 0.75 },
    {
      innerW: 0.8,
      centerX: 0,
      pointerX: 0.2,
      targetBox: { dividers: [{ id: 'divider', xNorm: 0.5 }] },
      xNorm: 0.25,
    },
  ] as const) {
    const args = previewArgs({
      targetBox: scenario.targetBox,
      targetGeo: {
        centerX: scenario.centerX,
        innerW: scenario.innerW,
        innerD: 0.5,
        innerBackZ: -0.25,
      },
      pointerX: scenario.pointerX,
    });
    const state = createSketchBoxVerticalPreviewState(args);
    const resolvedSegment = args.pickSketchBoxSegment({
      segments: state.boxSegments,
      boxCenterX: state.targetGeo.centerX,
      innerW: state.targetGeo.innerW,
      xNorm: scenario.xNorm,
    });
    assert.ok(resolvedSegment);
    const result = resolveSketchBoxVerticalRemovalPreview({
      previewArgs: args,
      state,
      blocker: blocker('rod', 0.99, 1.01, {
        id: 'rod-remove',
        index: 7,
        xNorm: scenario.xNorm,
      }),
    });
    assert.ok(result);
    assert.equal(result?.preview.kind, 'rod');
    close(
      result?.preview.w,
      Math.max(
        SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM,
        (resolvedSegment?.width ?? 0) - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM
      )
    );
    close(result?.preview.h, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewHeightM);
    close(result?.preview.d, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewDepthM);
    close(result?.preview.x, resolvedSegment?.centerX ?? 0);
    close(result?.preview.y, 1);
    close(result?.preview.z, 0);
    assert.equal(result?.preview.op, 'remove');
    const command = structuralCommand(result?.hoverRecord);
    assert.equal(command.kind, 'remove-rod');
    if (command.kind !== 'remove-rod') assert.fail('Expected remove-rod command');
    assert.equal(command.removeId, 'rod-remove');
    assert.equal(command.removeIdx, 7);
  }

  const fallbackArgs = previewArgs({
    targetBox: { dividers: [{ id: 'divider', xNorm: 0.5 }] },
    pointerX: 0.2,
  });
  const fallbackState = createSketchBoxVerticalPreviewState(fallbackArgs);
  const fallback = resolveSketchBoxVerticalRemovalPreview({
    previewArgs: fallbackArgs,
    state: fallbackState,
    blocker: blocker('rod', 0.99, 1.01, { xNorm: undefined }),
  });
  close(fallback?.preview.x, fallbackState.activeSegment?.centerX ?? 0);
});

test('storage removal preview preserves all depth-clearance branches, sizing precedence, and height fallback', () => {
  const cases = [0.01, 0.04, 0.1, 0.3];
  for (const innerD of cases) {
    const args = previewArgs({
      targetGeo: { centerX: 0, innerW: 0.03, innerD, innerBackZ: -0.2 },
      woodThick: 0.02,
    });
    const state = createSketchBoxVerticalPreviewState(args);
    const item = blocker('storage', 0.9, 1.1, { id: `storage-${innerD}`, heightM: 0.16 });
    const result = resolveSketchBoxVerticalRemovalPreview({ previewArgs: args, state, blocker: item });
    const clearance = Math.min(
      SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMaxM,
      Math.max(
        SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMinM,
        innerD * SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceRatio
      )
    );
    const expectedZ = Math.max(
      args.targetGeo.innerBackZ + SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierBackInsetM,
      args.targetGeo.innerBackZ + innerD - clearance
    );
    close(result?.preview.z, expectedZ);
    close(result?.preview.w, SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM);
    close(result?.preview.h, 0.16);
    close(result?.preview.d, 0.02);
    assert.equal(result?.preview.op, 'remove');
    const command = structuralCommand(result?.hoverRecord);
    assert.equal(command.kind, 'remove-storage');
  }

  const thinArgs = previewArgs({ woodThick: 0.00001 });
  const thinState = createSketchBoxVerticalPreviewState(thinArgs);
  const fallbackHeight = blocker('storage', 0.8, 1.12, { heightM: undefined });
  const thinResult = resolveSketchBoxVerticalRemovalPreview({
    previewArgs: thinArgs,
    state: thinState,
    blocker: fallbackHeight,
  });
  close(thinResult?.preview.h, 0.32);
  close(thinResult?.preview.d, INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM);
  close(
    thinResult?.preview.w,
    Math.max(
      SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
      thinArgs.targetGeo.innerW - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
    )
  );
});

test('shelf removal preview preserves variant depth/height rules, width clearances, and hover identity', () => {
  const cases = [
    {
      variant: 'regular',
      expectedDepth: INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM,
      expectedHeight: 0.02,
    },
    { variant: 'brace', expectedDepth: 0.5, expectedHeight: 0.02 },
    {
      variant: 'glass',
      expectedDepth: INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM,
      expectedHeight: MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM,
    },
    {
      variant: 'double',
      expectedDepth: INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM,
      expectedHeight: 0.04,
    },
  ];
  for (const { variant, expectedDepth, expectedHeight } of cases) {
    const args = previewArgs();
    const state = createSketchBoxVerticalPreviewState(args);
    const result = resolveSketchBoxVerticalRemovalPreview({
      previewArgs: args,
      state,
      blocker: blocker('shelf', 0.99, 1.01, {
        id: `${variant}-shelf`,
        index: 3,
        variant,
        heightM: undefined,
      }),
    });
    close(result?.preview.d, expectedDepth);
    close(result?.preview.h, expectedHeight);
    close(result?.preview.z, args.targetGeo.innerBackZ + expectedDepth / 2);
    close(
      result?.preview.w,
      Math.max(
        SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
        args.targetGeo.innerW -
          (variant === 'brace'
            ? SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM
            : SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM)
      )
    );
    const command = structuralCommand(result?.hoverRecord);
    assert.equal(command.kind, 'remove-shelf');
    if (command.kind !== 'remove-shelf') assert.fail('Expected remove-shelf command');
    assert.equal(command.removeId, `${variant}-shelf`);
    assert.equal(command.removeIdx, 3);
  }

  const overrideArgs = previewArgs();
  const overrideState = createSketchBoxVerticalPreviewState(overrideArgs);
  const overridden = resolveSketchBoxVerticalRemovalPreview({
    previewArgs: overrideArgs,
    state: overrideState,
    blocker: blocker('shelf', 0.99, 1.01, { variant: 'regular', depthM: 0.12 }),
  });
  close(overridden?.preview.d, 0.12);
});

test('shelf preview preserves direct-hit filtering, board boundary, cross-removal, blocking, and measurements', () => {
  const shelfY = 1;
  const shelfBox = {
    id: 'box-vertical',
    shelves: [{ id: 'shelf-existing', yNorm: 0.5, variant: 'regular' }],
    rods: [],
    storageBarriers: [],
  };
  const atBoundary = previewArgs({
    targetBox: shelfBox,
    partPrefix: 'part',
    pointerY: 0.7,
    intersects: [
      { object: { userData: { __kind: 'shelf_pin', partId: 'part_shelf_pin' } }, point: { y: 1.4 } },
      { object: { userData: { __kind: 'brace_seam', partId: 'part_shelf_seam' } }, point: { y: 1.4 } },
      { object: { userData: { partId: 'wrong_shelf_0' } }, point: { y: 1.4 } },
      {
        object: { userData: { partId: 'part_shelf_0' } },
        point: { y: shelfY + SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveBoardToleranceM },
      },
    ],
  });
  const boundaryState = createSketchBoxVerticalPreviewState(atBoundary);
  const removed = resolveSketchBoxShelfPreview(atBoundary, boundaryState);
  assert.equal(removed?.preview.op, 'remove');
  const removeCommand = structuralCommand(removed?.hoverRecord);
  assert.equal(removeCommand.kind, 'remove-shelf');
  if (removeCommand.kind !== 'remove-shelf') assert.fail('Expected remove-shelf command');
  assert.equal(removeCommand.removeId, 'shelf-existing');
  assert.equal(removeCommand.removeIdx, 0);

  const aboveBoundary = previewArgs({
    targetBox: shelfBox,
    partPrefix: 'part',
    intersects: [
      {
        object: { userData: { partId: 'part_shelf_0' } },
        point: { y: shelfY + SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveBoardToleranceM + 1e-9 },
      },
    ],
  });
  const added = resolveSketchBoxShelfPreview(
    aboveBoundary,
    createSketchBoxVerticalPreviewState(aboveBoundary)
  );
  assert.equal(added?.preview.op, 'add');

  for (const [kind, targetBox] of [
    ['rod', { rods: [{ id: 'rod-cross', yNorm: 0.5 }] }],
    ['storage', { storageBarriers: [{ id: 'storage-cross', yNorm: 0.5, heightM: 0.12 }] }],
  ] as const) {
    const args = previewArgs({ targetBox: { id: 'box-vertical', shelves: [], ...targetBox } });
    const result = resolveSketchBoxShelfPreview(args, createSketchBoxVerticalPreviewState(args));
    assert.equal(result?.preview.kind, kind);
    assert.equal(result?.preview.op, 'remove');
    assert.equal(structuralCommand(result?.hoverRecord).kind, `remove-${kind}`);
  }

  const noRoomArgs = previewArgs({ targetHeight: 0.03 });
  const noRoom = resolveSketchBoxShelfPreview(noRoomArgs, createSketchBoxVerticalPreviewState(noRoomArgs));
  assert.equal(noRoom?.preview.op, 'blocked');
  assert.equal(noRoom?.preview.blockedReason, 'no-room');

  const collisionArgs = previewArgs({
    pointerY: 0,
    targetBox: { id: 'box-vertical', shelves: [], rods: [{ id: 'rod-collision', yNorm: 0.03 }] },
  });
  const collision = resolveSketchBoxShelfPreview(
    collisionArgs,
    createSketchBoxVerticalPreviewState(collisionArgs)
  );
  assert.equal(collision?.preview.op, 'blocked');
  assert.equal(collision?.preview.blockedReason, 'collision');

  for (const depth of [0.04, 0.45]) {
    const measurementNeighborYNorm = 0.8;
    const measurementArgs = previewArgs({
      shelfDepthOverrideM: depth,
      targetBox: {
        id: 'box-vertical',
        shelves: [{ id: 'neighbor-shelf', yNorm: measurementNeighborYNorm, variant: 'regular' }],
        rods: [],
        storageBarriers: [],
      },
    });
    const result = resolveSketchBoxShelfPreview(
      measurementArgs,
      createSketchBoxVerticalPreviewState(measurementArgs)
    );
    const expectedDepth = Math.min(
      measurementArgs.targetGeo.innerD,
      Math.max(measurementArgs.woodThick, depth)
    );
    close(result?.preview.d, expectedDepth);
    const expectedWidth = Math.max(
      SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
      measurementArgs.targetGeo.innerW - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM
    );
    close(result?.preview.w, expectedWidth);
    const expectedMeasurementZ =
      measurementArgs.targetGeo.innerBackZ +
      expectedDepth +
      Math.max(
        SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetMinM,
        expectedDepth * SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetDepthRatio
      );
    const measurements = result?.preview.clearanceMeasurements as Measurement[];
    assert.ok(measurements.length >= 2);
    assert.ok(measurements.every(entry => Math.abs(Number(entry.z) - expectedMeasurementZ) <= 1e-12));
    assert.ok(measurements.every(entry => entry.styleKey === 'cell' || entry.styleKey === 'neighbor'));
    const targetBottomY = measurementArgs.targetCenterY - measurementArgs.targetHeight / 2;
    const neighborCenterY = targetBottomY + measurementNeighborYNorm * measurementArgs.targetHeight;
    assertVerticalMeasurementTargets({
      measurements,
      centerX: result?.preview.x as number,
      centerY: result?.preview.y as number,
      width: result?.preview.w as number,
      height: result?.preview.h as number,
      containerMinY: targetBottomY + measurementArgs.woodThick,
      containerMaxY:
        measurementArgs.targetCenterY + measurementArgs.targetHeight / 2 - measurementArgs.woodThick,
      z: expectedMeasurementZ,
      neighborMinY: neighborCenterY - measurementArgs.woodThick / 2,
    });
    const command = structuralCommand(result?.hoverRecord);
    assert.equal(command.kind, 'add-shelf');
    if (command.kind !== 'add-shelf') assert.fail('Expected add-shelf command');
    close(command.depthM, expectedDepth);
  }
});
