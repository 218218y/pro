import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchBoxVerticalContentPreview } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview.ts';
import {
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';

test('box shelf preview includes vertical clearance labels to the compartment top and bottom', () => {
  const result = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 2, isBottom: false, ts: 1 },
    contentKind: 'shelf',
    boxId: 'box-1',
    freePlacement: false,
    targetBox: { id: 'box-1', shelves: [] },
    targetGeo: {
      centerX: 0,
      innerW: 0.8,
      innerD: 0.5,
      innerBackZ: -0.25,
    },
    targetCenterY: 1,
    targetHeight: 0.9,
    pointerX: 0,
    pointerY: 1.08,
    woodThick: 0.02,
    shelfVariant: 'regular',
    shelfDepthOverrideM: null,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [{ index: 0, centerX: 0, width: 0.8, xNorm: 0.5 }],
    pickSketchBoxSegment: ({ segments }) => segments[0] ?? null,
  });

  assert.ok(result);
  assert.equal(result?.preview.kind, 'shelf');
  assert.deepEqual(
    (result?.preview.clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['34 ס"מ', '50 ס"מ']
  );
});

test('box shelf preview keeps shallow shelf clearance labels front-facing at 25cm depth and below', () => {
  const result = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 2, isBottom: false, ts: 1 },
    contentKind: 'shelf',
    boxId: 'box-1',
    freePlacement: false,
    targetBox: { id: 'box-1', shelves: [] },
    targetGeo: {
      centerX: 0,
      innerW: 0.8,
      innerD: 0.55,
      innerBackZ: -0.275,
    },
    targetCenterY: 1,
    targetHeight: 0.9,
    pointerX: 0,
    pointerY: 1.08,
    woodThick: 0.02,
    shelfVariant: 'regular',
    shelfDepthOverrideM: 0.25,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [{ index: 0, centerX: 0, width: 0.8, xNorm: 0.5 }],
    pickSketchBoxSegment: ({ segments }) => segments[0] ?? null,
  });

  const measurements = result?.preview.clearanceMeasurements as { z?: number; labelFaceSign?: number }[];
  assert.ok(measurements.every(entry => typeof entry.z === 'number' && entry.z < 0));
  assert.ok(measurements.every(entry => entry.labelFaceSign === 1));
});

test('box shelf preview adds nearest shelf spacing on a separate inner measurement line', () => {
  const result = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 2, isBottom: false, ts: 1 },
    contentKind: 'shelf',
    boxId: 'box-1',
    freePlacement: false,
    targetBox: { id: 'box-1', shelves: [{ yNorm: 8 / 9, variant: 'regular' }] },
    targetGeo: {
      centerX: 0,
      innerW: 0.8,
      innerD: 0.5,
      innerBackZ: -0.25,
    },
    targetCenterY: 1,
    targetHeight: 0.9,
    pointerX: 0,
    pointerY: 1.08,
    woodThick: 0.02,
    shelfVariant: 'regular',
    shelfDepthOverrideM: null,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [{ index: 0, centerX: 0, width: 0.8, xNorm: 0.5 }],
    pickSketchBoxSegment: ({ segments }) => segments[0] ?? null,
  });

  const measurements = result?.preview.clearanceMeasurements as {
    label: string;
    startX: number;
    role?: string;
    labelY?: number;
    styleKey?: string;
  }[];
  assert.deepEqual(
    measurements.map(entry => entry.label),
    ['34 ס"מ', '50 ס"מ', '25 ס"מ']
  );
  const cellLineX = measurements.find(entry => entry.role === 'cell')?.startX ?? 0;
  const neighborLineX = measurements.find(entry => entry.role === 'neighbor')?.startX ?? 0;
  assert.ok(neighborLineX < cellLineX);
  assert.ok(Math.abs(cellLineX) < 0.05);
  assert.ok(Math.abs(neighborLineX) < 0.05);
  assert.ok(
    Math.abs(
      (measurements.find(entry => entry.role === 'cell' && entry.label === '34 ס"מ')?.labelY ?? 0) - 1.43
    ) < 1e-9
  );
  assert.ok(
    Math.abs(
      (measurements.find(entry => entry.role === 'cell' && entry.label === '50 ס"מ')?.labelY ?? 0) - 0.57
    ) < 1e-9
  );
  const neighbor = measurements.find(entry => entry.role === 'neighbor' && entry.label === '25 ס"מ');
  assert.ok(neighbor);
  assert.ok(Math.abs((neighbor?.labelY ?? 0) - 1.34) < 1e-9);
  assert.equal(neighbor?.styleKey, 'neighbor');
});

test('box shelf preview scopes hover to the active split cell after vertical and horizontal dividers', () => {
  const targetBox = {
    id: 'box-split',
    shelves: [],
    dividers: [{ id: 'v1', xNorm: 0.5 }],
    horizontalDividers: [{ id: 'h1', yNorm: 0.5 }],
  };
  const result = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 2, isBottom: false, ts: 1 },
    contentKind: 'shelf',
    boxId: 'box-split',
    freePlacement: true,
    targetBox,
    targetGeo: {
      centerX: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
    },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0.25,
    pointerY: 1.25,
    woodThick: 0.02,
    shelfVariant: 'regular',
    shelfDepthOverrideM: null,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.ok(result);
  assert.equal(result?.preview.kind, 'shelf');
  assert.equal(result?.hoverRecord.freePlacement, true);
  assert.ok(Number(result?.preview.x) > 0);
  assert.ok(Number(result?.preview.y) > 1);
  assert.ok(Number(result?.preview.y) < 1.49);
  assert.ok(Number(result?.hoverRecord.contentXNorm) > 0.5);
  assert.ok(Number(result?.hoverRecord.boxYNorm) > 0.7);
  const measurements = result?.preview.clearanceMeasurements as { labelY?: number; role?: string }[];
  assert.ok(measurements.filter(entry => entry.role === 'cell').every(entry => Number(entry.labelY) > 1));
});

test('box shelf preview marks a too-short active cell as blocked with no-room metadata', () => {
  const result = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 2, isBottom: false, ts: 1 },
    contentKind: 'shelf',
    boxId: 'box-short',
    freePlacement: true,
    targetBox: { id: 'box-short', shelves: [] },
    targetGeo: {
      centerX: 0,
      innerW: 0.8,
      innerD: 0.5,
      innerBackZ: -0.25,
    },
    targetCenterY: 1,
    targetHeight: 0.05,
    pointerX: 0,
    pointerY: 1,
    woodThick: 0.02,
    shelfVariant: 'regular',
    shelfDepthOverrideM: null,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.ok(result);
  assert.equal(result?.preview.kind, 'shelf');
  assert.equal(result?.preview.op, 'blocked');
  assert.equal(result?.preview.blockedReason, 'no-room');
  assert.equal(result?.hoverRecord.__wpBlockedReason, 'no-room');
});
