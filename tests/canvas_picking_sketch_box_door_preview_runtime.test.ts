import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeSketchBoxContentCommandHover } from '../esm/native/services/canvas_picking_sketch_box_content_command.ts';
import { resolveSketchBoxDoorPreview } from '../esm/native/services/canvas_picking_sketch_box_door_preview.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../esm/shared/dimensions/sketch_box_preview_policy.ts';

type Segment = {
  index: number;
  centerX: number;
  width: number;
  xNorm: number;
  leftX: number;
  rightX: number;
};

const fullSegment: Segment = {
  index: 0,
  centerX: 0,
  width: 1,
  xNorm: 0.5,
  leftX: -0.5,
  rightX: 0.5,
};

const targetGeo = {
  centerX: 0,
  centerZ: 0,
  innerW: 1,
  outerD: 0.6,
};

function readSketchBoxDividers() {
  return [];
}

function resolveSketchBoxSegments(): Segment[] {
  return [fullSegment];
}

function pickSketchBoxSegment(): Segment {
  return fullSegment;
}

function requireSketchBoxCommandHover(value: unknown) {
  const decoded = decodeSketchBoxContentCommandHover(value);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) throw new Error(decoded.reason);
  return decoded.value;
}

test('sketch-box door preview stays inert for hinge toggles when the active segment has no door', () => {
  const result = resolveSketchBoxDoorPreview({
    host: { tool: 'door_hinge', moduleKey: 2, isBottom: false },
    contentKind: 'door_hinge',
    boxId: 'box-1',
    freePlacement: false,
    targetBox: { doors: [] },
    targetGeo,
    targetCenterY: 1,
    targetHeight: 2,
    pointerX: 0,
    woodThick: 0.018,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  });

  assert.equal(result, null);
});

test('sketch-box door preview resolves canonical remove metadata for an existing double-door pair', () => {
  const result = resolveSketchBoxDoorPreview({
    host: { tool: 'double_door', moduleKey: 'corner', isBottom: true },
    contentKind: 'double_door',
    boxId: 'box-2',
    freePlacement: true,
    targetBox: {
      doors: [
        { id: 'left-door', xNorm: 0.5, hinge: 'left', enabled: true },
        { id: 'right-door', xNorm: 0.5, hinge: 'right', enabled: true },
      ],
    },
    targetGeo,
    targetCenterY: 0.8,
    targetHeight: 1.6,
    pointerX: 0,
    woodThick: 0.02,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  });

  assert.ok(result);
  const hover = requireSketchBoxCommandHover(result.hoverRecord);
  assert.equal(hover.contentKind, 'double_door');
  assert.equal(hover.command.kind, 'double-door');
  assert.equal(hover.command.op, 'remove');
  assert.equal(hover.command.freePlacement, true);
  assert.equal(hover.command.boxId, 'box-2');
  assert.equal(result.hoverRecord.hostModuleKey, 'corner');
  assert.equal('moduleKey' in result.hoverRecord, false);
  assert.equal(result.preview.kind, 'storage');
  assert.equal(result.preview.op, 'remove');
  assert.ok(Number(result.preview.z) > targetGeo.centerZ + targetGeo.outerD / 2);
});

test('sketch-box door preview keeps explicit hinge/remove metadata for a single existing door', () => {
  const result = resolveSketchBoxDoorPreview({
    host: { tool: 'door', moduleKey: 4, isBottom: false },
    contentKind: 'door',
    boxId: 'box-3',
    freePlacement: false,
    targetBox: {
      doors: [{ id: 'door-1', xNorm: 0.5, hinge: 'right', enabled: true }],
    },
    targetGeo,
    targetCenterY: 1.25,
    targetHeight: 1.4,
    pointerX: 0,
    woodThick: 0.018,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  });

  assert.ok(result);
  const hover = requireSketchBoxCommandHover(result.hoverRecord);
  assert.equal(hover.contentKind, 'door');
  assert.equal(hover.command.kind, 'single-door');
  assert.equal(hover.command.op, 'remove');
  assert.equal(hover.command.doorId, 'door-1');
  assert.equal(hover.command.hinge, 'right');
  assert.equal(hover.command.contentXNorm, 0.5);
  assert.equal(result.preview.op, 'remove');
});

function resolveDoorPreviewForPolicy(args: {
  segment?: Segment;
  woodThick?: number;
  contentKind?: 'door' | 'double_door' | 'door_hinge';
  targetBox?: unknown;
  geo?: typeof targetGeo;
}) {
  const segment = args.segment ?? fullSegment;
  return resolveSketchBoxDoorPreview({
    host: { tool: args.contentKind ?? 'door', moduleKey: 1, isBottom: false },
    contentKind: args.contentKind ?? 'door',
    boxId: 'policy-box',
    freePlacement: true,
    targetBox: args.targetBox ?? { doors: [] },
    targetGeo: args.geo ?? targetGeo,
    targetCenterY: 1,
    targetHeight: 2,
    pointerX: segment.centerX,
    pointerY: 1,
    woodThick: args.woodThick ?? 0.018,
    readSketchBoxDividers,
    resolveSketchBoxSegments: () => [segment],
    pickSketchBoxSegment: () => segment,
  });
}

test('sketch-box door preview preserves material fallback and edge-extension boundaries', () => {
  for (const invalidThickness of [0, -0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = resolveDoorPreviewForPolicy({ woodThick: invalidThickness });
    assert.ok(result);
    assert.equal(result.preview.woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
    assert.equal(result.preview.d, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  }

  const epsilon = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM;
  const cases = [
    { leftX: -0.5, rightX: 0.5, expectedW: 1 + 0.036 },
    { leftX: -0.5, rightX: 0.2, expectedW: 0.7 + 0.027 },
    { leftX: -0.2, rightX: 0.5, expectedW: 0.7 + 0.027 },
    { leftX: -0.2, rightX: 0.2, expectedW: 0.4 + 0.018 },
  ];
  for (const [index, current] of cases.entries()) {
    const segment: Segment = {
      index,
      centerX: (current.leftX + current.rightX) / 2,
      width: current.rightX - current.leftX,
      xNorm: 0.5,
      leftX: current.leftX,
      rightX: current.rightX,
    };
    const result = resolveDoorPreviewForPolicy({ segment });
    assert.ok(result);
    const rawWidth = current.expectedW - SKETCH_BOX_DOOR_PREVIEW_POLICY.doorPreviewClearanceM;
    assert.ok(
      Math.abs(
        Number(result.preview.w) - Math.max(SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM, rawWidth)
      ) < 1e-12
    );
  }

  const boundaryGeo = { ...targetGeo, centerX: 0.5 };
  for (const [index, distance] of [epsilon, epsilon - 1e-9, epsilon + 1e-9].entries()) {
    const segment: Segment = {
      index: cases.length + index,
      centerX: (distance + 0.7) / 2,
      width: 0.7 - distance,
      xNorm: 0.5,
      leftX: distance,
      rightX: 0.7,
    };
    const result = resolveDoorPreviewForPolicy({ segment, geo: boundaryGeo });
    assert.ok(result);
    const leftExtension = distance <= epsilon ? 0.018 : 0.009;
    const rawWidth =
      segment.width + leftExtension + 0.009 - SKETCH_BOX_DOOR_PREVIEW_POLICY.doorPreviewClearanceM;
    assert.ok(
      Math.abs(
        Number(result.preview.w) - Math.max(SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM, rawWidth)
      ) < 1e-12
    );
  }
});

test('sketch-box door preview preserves focused depth, back-clearance, remove-offset, and command payloads', () => {
  const minDepth = resolveDoorPreviewForPolicy({ woodThick: 0.00001 });
  assert.ok(minDepth);
  assert.equal(minDepth.preview.d, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDepthM);

  for (const woodThick of [0.001, 0.01, 0.05]) {
    const add = resolveDoorPreviewForPolicy({ woodThick });
    assert.ok(add);
    const doorDepth = Math.max(SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDepthM, woodThick);
    const clearance = Math.max(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceMinM,
      Math.min(
        SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceMaxM,
        doorDepth * SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceDepthRatio
      )
    );
    assert.ok(Math.abs(Number(add.preview.z) - (targetGeo.outerD / 2 + doorDepth / 2 + clearance)) < 1e-12);
    assert.equal(requireSketchBoxCommandHover(add.hoverRecord).command.kind, 'single-door');

    const remove = resolveDoorPreviewForPolicy({
      woodThick,
      targetBox: { doors: [{ id: 'existing', xNorm: 0.5, hinge: 'right', enabled: true }] },
    });
    assert.ok(remove);
    const removeOffset = Math.max(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorRemoveOffsetMinM,
      woodThick * SKETCH_BOX_DOOR_PREVIEW_POLICY.doorRemoveOffsetWoodRatio
    );
    const renderedCenter = targetGeo.outerD / 2 + doorDepth / 2 + clearance;
    const expectedRemoveZ = renderedCenter + doorDepth + removeOffset;
    assert.ok(Math.abs(Number(remove.preview.z) - expectedRemoveZ) < 1e-12);
    const hover = requireSketchBoxCommandHover(remove.hoverRecord);
    assert.equal(hover.command.kind, 'single-door');
    assert.equal(hover.command.op, 'remove');
    assert.equal(hover.command.hinge, 'right');
    assert.equal(hover.command.doorId, 'existing');
  }
});
