import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchBoxDoorPreview } from '../esm/native/services/canvas_picking_sketch_box_door_preview.ts';

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
  assert.equal(result.hoverRecord.kind, 'box_content');
  assert.equal(result.hoverRecord.contentKind, 'double_door');
  assert.equal(result.hoverRecord.op, 'remove');
  assert.equal(result.hoverRecord.freePlacement, true);
  assert.equal(result.hoverRecord.moduleKey, 'corner');
  assert.equal(result.hoverRecord.doorLeftId, 'left-door');
  assert.equal(result.hoverRecord.doorRightId, 'right-door');
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
  assert.equal(result.hoverRecord.contentKind, 'door');
  assert.equal(result.hoverRecord.op, 'remove');
  assert.equal(result.hoverRecord.doorId, 'door-1');
  assert.equal(result.hoverRecord.hinge, 'right');
  assert.equal(result.hoverRecord.contentXNorm, 0.5);
  assert.equal(result.preview.op, 'remove');
});
