import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderSketchFreeBoxDimensions,
  renderSketchFreeBoxDimensionOverlays,
} from '../esm/native/builder/render_interior_sketch_layout_dimensions.js';

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
  const lines: Array<{ start: Vector3; end: Vector3; label: string; textOffset: Vector3; extra?: Vector3 }> =
    [];
  return {
    lines,
    addDimensionLine(
      start: Vector3,
      end: Vector3,
      textOffset: Vector3,
      label: string,
      _scale: number,
      extra?: Vector3
    ) {
      lines.push({ start, end, label, textOffset, extra });
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
