import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderSketchFreeBoxDimensions,
  renderSketchFreeBoxDimensionOverlays,
} from '../esm/native/builder/render_interior_sketch_layout_dimensions.js';
import {
  areSketchFreeBoxDimensionSegmentsAdjacent,
  groupSketchFreeBoxDimensionEntries,
  mergeSketchFreeBoxDimensionSpans,
} from '../esm/native/builder/render_interior_sketch_layout_dimensions_grouping.js';
import {
  SKETCH_BOX_DIMENSION_GROUPING_POLICY,
  SKETCH_BOX_DIMENSION_RENDER_POLICY,
} from '../esm/shared/dimensions/sketch_box_dimension_overlay_policy.js';

class Vector3 {
  x: number;
  y: number;
  z: number;
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

function createRecorder() {
  const lines: Array<{
    start: Vector3;
    end: Vector3;
    label: string;
    textOffset: Vector3;
    scale: number;
    extra?: Vector3;
  }> = [];
  return {
    lines,
    addDimensionLine(
      start: Vector3,
      end: Vector3,
      textOffset: Vector3,
      label: string,
      scale: number,
      extra?: Vector3
    ) {
      lines.push({ start, end, label, textOffset, scale, extra });
    },
  };
}

test('renderSketchFreeBoxDimensions keeps height on the right and depth on the left', () => {
  const recorder = createRecorder();
  renderSketchFreeBoxDimensions({
    THREE: { Vector3 } as never,
    addDimensionLine: recorder.addDimensionLine,
    centerX: 1,
    centerY: 2,
    centerZ: 3,
    width: 0.8,
    height: 1.2,
    depth: 0.5,
  });

  assert.equal(recorder.lines.length, 3);
  const [widthLine, heightLine, depthLine] = recorder.lines;
  assert.equal(widthLine.label, '80');
  assert.equal(heightLine.label, '120');
  assert.equal(depthLine.label, '50');
  assert.ok(heightLine.start.x > 1 + 0.4);
  assert.ok(depthLine.start.x < 1 - 0.4);
  assert.ok(depthLine.textOffset.x < 0);
});

test('renderSketchFreeBoxDimensions rejects string-encoded runtime dimensions', () => {
  const recorder = createRecorder();
  renderSketchFreeBoxDimensions({
    THREE: { Vector3 } as never,
    addDimensionLine: recorder.addDimensionLine,
    centerX: 1,
    centerY: 2,
    centerZ: 3,
    width: '0.8',
    height: 1.2,
    depth: 0.5,
  } as any);

  assert.equal(recorder.lines.length, 0);
});

test('renderSketchFreeBoxDimensionOverlays rejects string-encoded grouped dimension entries', () => {
  const recorder = createRecorder();
  renderSketchFreeBoxDimensionOverlays({
    THREE: { Vector3 } as never,
    addDimensionLine: recorder.addDimensionLine,
    entries: [
      { centerX: 0.3, centerY: 0.5, centerZ: 0, width: 0.6, height: 1, depth: 0.5 },
      { centerX: '0.9', centerY: 0.5, centerZ: 0, width: 0.6, height: 1, depth: 0.5 },
    ],
  } as any);

  assert.deepEqual(
    recorder.lines.map(line => line.label),
    ['60', '100', '50']
  );
});

test('renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths', () => {
  const recorder = createRecorder();
  renderSketchFreeBoxDimensionOverlays({
    THREE: { Vector3 } as never,
    addDimensionLine: recorder.addDimensionLine,
    entries: [
      { centerX: 0.3, centerY: 0.5, centerZ: 0, width: 0.6, height: 1, depth: 0.5 },
      { centerX: 0.9, centerY: 0.5, centerZ: 0, width: 0.6, height: 1, depth: 0.5 },
      { centerX: 3, centerY: 0.5, centerZ: 0, width: 0.5, height: 1, depth: 0.5 },
    ],
  });

  const labels = recorder.lines.map(line => line.label);
  assert.deepEqual(labels, ['120', '60', '60', '100', '50', '50', '100', '50']);
  const mergedWidthLine = recorder.lines[0];
  assert.equal(mergedWidthLine.start.x, 0);
  assert.equal(mergedWidthLine.end.x, 1.2);
});

test('renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label', () => {
  const recorder = createRecorder();
  renderSketchFreeBoxDimensionOverlays({
    THREE: { Vector3 } as never,
    addDimensionLine: recorder.addDimensionLine,
    entries: [
      { centerX: 0.3, centerY: 0.5, centerZ: 0, width: 0.6, height: 1, depth: 0.5 },
      { centerX: 0.902, centerY: 0.5, centerZ: 0, width: 0.6, height: 1, depth: 0.5 },
    ],
  });

  const labels = recorder.lines.map(line => line.label);
  assert.equal(labels[0], '120');
  assert.deepEqual(labels.slice(0, 3), ['120', '60', '60']);
});

test('dimension grouping applies focused X/Y adjacency and span-merge tolerance boundaries', () => {
  const makeSegment = (centerX: number, centerY: number, width = 0.4, height = 0.4) => ({
    centerX,
    centerY,
    centerZ: 0,
    width,
    height,
    depth: 0.3,
    minX: centerX - width / 2,
    maxX: centerX + width / 2,
    bottomY: centerY - height / 2,
    topY: centerY + height / 2,
    backZ: -0.15,
    frontZ: 0.15,
  });

  const xTolerance = Math.min(
    SKETCH_BOX_DIMENSION_GROUPING_POLICY.groupAdjacentToleranceXMaxM,
    Math.max(SKETCH_BOX_DIMENSION_GROUPING_POLICY.groupAdjacentToleranceXMinM, 0.4 * 0.08)
  );
  const yTolerance = Math.min(
    SKETCH_BOX_DIMENSION_GROUPING_POLICY.groupAdjacentToleranceYMaxM,
    Math.max(SKETCH_BOX_DIMENSION_GROUPING_POLICY.groupAdjacentToleranceYMinM, 0.4 * 0.08)
  );
  const left = makeSegment(0, 0);
  assert.equal(
    areSketchFreeBoxDimensionSegmentsAdjacent(left, makeSegment(0.4 + xTolerance - 1e-6, 0)),
    true
  );
  assert.equal(
    areSketchFreeBoxDimensionSegmentsAdjacent(left, makeSegment(0.4 + xTolerance + 1e-6, 0)),
    false
  );
  assert.equal(
    areSketchFreeBoxDimensionSegmentsAdjacent(left, makeSegment(0, 0.4 + yTolerance - 1e-6)),
    true
  );
  assert.equal(
    areSketchFreeBoxDimensionSegmentsAdjacent(left, makeSegment(0, 0.4 + yTolerance + 1e-6)),
    false
  );

  const groups = groupSketchFreeBoxDimensionEntries([
    { centerX: 2, centerY: 0, centerZ: 0, width: 0.4, height: 0.4, depth: 0.3 },
    { centerX: 0, centerY: 0, centerZ: 0, width: 0.4, height: 0.4, depth: 0.3 },
    { centerX: 0.4 + xTolerance - 1e-6, centerY: 0, centerZ: 0, width: 0.4, height: 0.4, depth: 0.3 },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map(group => group.map(entry => entry.centerX)),
    [[0, 0.4 + xTolerance - 1e-6], [2]]
  );

  const mergeTolerance = SKETCH_BOX_DIMENSION_GROUPING_POLICY.groupSpanMergeToleranceMaxM;
  assert.deepEqual(
    mergeSketchFreeBoxDimensionSpans([
      { min: 0, max: 0.4 },
      { min: mergeTolerance - 1e-6, max: 0.4 + mergeTolerance - 1e-6 },
    ]).length,
    1
  );
  assert.equal(
    mergeSketchFreeBoxDimensionSpans([
      { min: 0, max: 0.4 },
      { min: mergeTolerance + 1e-6, max: 0.4 + mergeTolerance + 1e-6 },
    ]).length,
    2
  );
});

test('grouped dimension rendering preserves call order, focused text scale and negative min-height label shift', () => {
  const recorder = createRecorder();
  renderSketchFreeBoxDimensionOverlays({
    THREE: { Vector3 } as never,
    addDimensionLine: recorder.addDimensionLine,
    entries: [
      { centerX: 0.25, centerY: 0.4, centerZ: 0, width: 0.5, height: 0.8, depth: 0.3 },
      { centerX: 0.75, centerY: 0.5, centerZ: 0, width: 0.5, height: 1, depth: 0.5 },
    ],
  });

  assert.deepEqual(
    recorder.lines.map(line => line.label),
    ['100', '50', '50', '100', '80', '50', '30']
  );
  assert.ok(recorder.lines.every(line => line.scale === SKETCH_BOX_DIMENSION_RENDER_POLICY.textScale));
  const minHeightLine = recorder.lines.find(line => line.label === '80');
  assert.equal(minHeightLine?.extra?.y, SKETCH_BOX_DIMENSION_RENDER_POLICY.groupMinHeightLabelShiftYM);
  assert.ok(Number(minHeightLine?.extra?.y) < 0);
});
