import test from 'node:test';
import assert from 'node:assert/strict';

import { SKETCH_BOX_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import {
  buildRectClearanceMeasurementEntries,
  buildStackAwareHorizontalClearanceMeasurementEntries,
  buildStackAwareVerticalClearanceMeasurementEntries,
  buildVerticalClearanceMeasurementEntries,
  markCenteredRectClearanceMeasurements,
  resolveCellMeasurementLabelOutsets,
} from '../esm/native/services/canvas_picking_hover_clearance_measurements.ts';

function isHorizontalMeasurement(entry: { startY: number; endY: number }): boolean {
  return Math.abs(entry.startY - entry.endY) <= 1e-9;
}

function isVerticalMeasurement(entry: { startX: number; endX: number }): boolean {
  return Math.abs(entry.startX - entry.endX) <= 1e-9;
}

function assertLabelFullyOutsideLeft(
  entry: { labelX?: number; textScale?: number; styleKey?: string },
  outsideEdgeX: number,
  widthScale: number
): void {
  const textScale = typeof entry.textScale === 'number' ? entry.textScale : 1;
  const halfWidth = (widthScale * textScale) / 2;
  assert.ok(
    Number(entry.labelX) + halfWidth <=
      outsideEdgeX - SKETCH_BOX_DIMENSIONS.preview.measurementHorizontalLabelOutsideGapM + 1e-9
  );
}

function assertLabelFullyOutsideRight(
  entry: { labelX?: number; textScale?: number; styleKey?: string },
  outsideEdgeX: number,
  widthScale: number
): void {
  const textScale = typeof entry.textScale === 'number' ? entry.textScale : 1;
  const halfWidth = (widthScale * textScale) / 2;
  assert.ok(
    Number(entry.labelX) - halfWidth >=
      outsideEdgeX + SKETCH_BOX_DIMENSIONS.preview.measurementHorizontalLabelOutsideGapM - 1e-9
  );
}

test('rect clearance builder emits vertical and horizontal cm labels in local coordinates', () => {
  const entries = buildRectClearanceMeasurementEntries({
    containerMinX: -0.5,
    containerMaxX: 0.5,
    containerMinY: -1,
    containerMaxY: 1,
    targetCenterX: 0.25,
    targetCenterY: 0,
    targetWidth: 0.04,
    targetHeight: 0.4,
    z: 0.02,
    showTop: true,
    showBottom: true,
    showLeft: true,
    showRight: true,
    minHorizontalCm: 0.5,
    horizontalLabelPlacement: 'outside',
    styleKey: 'cell',
    textScale: 0.9,
  });

  assert.equal(entries.length, 4);
  assert.deepEqual(
    entries.map(entry => entry.label),
    ['80 ס"מ', '80 ס"מ', '73 ס"מ', '23 ס"מ']
  );
  assert.equal(entries[0].startX, 0.25);
  assert.equal(entries[0].startY, 0.2);
  assert.equal(entries[0].endY, 1);
  assert.equal(entries[2].startX, -0.5);
  assert.equal(entries[2].endX, 0.23);
  assert.equal(entries[2].labelX, -0.56);
  assert.equal(entries[2].labelY, 0);
  assert.equal(entries[3].labelX, 0.56);
  assert.equal(entries[3].labelY, 0);
  assert.equal(entries[0].styleKey, 'cell');
});

test('rect clearance builder suppresses zero-clearance labels that would round to 0 cm', () => {
  const entries = buildRectClearanceMeasurementEntries({
    containerMinX: -0.5,
    containerMaxX: 0.5,
    containerMinY: -1,
    containerMaxY: 1,
    targetCenterX: 0,
    targetCenterY: 0,
    targetWidth: 1,
    targetHeight: 2,
    showTop: true,
    showBottom: true,
    showLeft: true,
    showRight: true,
  });

  assert.deepEqual(entries, []);
});

test('rect clearance builder can push width labels outward and height labels beyond the top and bottom edges', () => {
  const { horizontalLabelOutset, verticalLabelOutset } = resolveCellMeasurementLabelOutsets(0.9);
  const entries = buildRectClearanceMeasurementEntries({
    containerMinX: -0.5,
    containerMaxX: 0.5,
    containerMinY: -1,
    containerMaxY: 1,
    targetCenterX: 0.25,
    targetCenterY: 0,
    targetWidth: 0.04,
    targetHeight: 0.4,
    showTop: true,
    showBottom: true,
    showLeft: true,
    showRight: true,
    horizontalLabelPlacement: 'outside',
    horizontalLabelOutset,
    verticalLabelOutset,
  });

  assert.equal(entries[0].labelY, 1 + verticalLabelOutset);
  assert.equal(entries[1].labelY, -1 - verticalLabelOutset);
  assert.equal(entries[2].labelX, -0.5 - horizontalLabelOutset);
  assert.equal(entries[3].labelX, 0.5 + horizontalLabelOutset);
});

test('centered rect clearance marks width and height measurement axes independently', () => {
  const entries = buildRectClearanceMeasurementEntries({
    containerMinX: -0.5,
    containerMaxX: 0.5,
    containerMinY: -1,
    containerMaxY: 1,
    targetCenterX: 0,
    targetCenterY: 0,
    targetWidth: 0.2,
    targetHeight: 0.4,
    showTop: true,
    showBottom: true,
    showLeft: true,
    showRight: true,
    styleKey: 'cell',
  });

  const widthCentered = markCenteredRectClearanceMeasurements(entries, { centerX: true });
  assert.equal(widthCentered.length, 4);
  assert.ok(widthCentered.filter(isHorizontalMeasurement).every(entry => entry.styleKey === 'center'));
  assert.ok(widthCentered.filter(isVerticalMeasurement).every(entry => entry.styleKey === 'cell'));

  const heightCentered = markCenteredRectClearanceMeasurements(entries, { centerY: true });
  assert.ok(heightCentered.filter(isHorizontalMeasurement).every(entry => entry.styleKey === 'cell'));
  assert.ok(heightCentered.filter(isVerticalMeasurement).every(entry => entry.styleKey === 'center'));

  const bothCentered = markCenteredRectClearanceMeasurements(entries, { centerX: true, centerY: true });
  assert.ok(bothCentered.every(entry => entry.styleKey === 'center'));
  assert.ok(entries.every(entry => entry.styleKey === 'cell'));
});

test('vertical clearance builder emits only top and bottom cm labels for stacked previews', () => {
  const entries = buildVerticalClearanceMeasurementEntries({
    containerMinY: 0,
    containerMaxY: 2.4,
    targetCenterX: 0,
    targetCenterY: 0.62,
    targetWidth: 0.87,
    targetHeight: 0.39,
    z: 0.33,
    styleKey: 'cell',
    textScale: 0.82,
  });

  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map(entry => entry.label),
    ['159 ס"מ', '43 ס"מ']
  );
  assert.equal(entries[0].startX, 0);
  assert.equal(entries[0].endX, 0);
  assert.equal(entries[0].styleKey, 'cell');
  assert.equal(entries[0].textScale, 0.82);
});

test('vertical clearance builder keeps front-facing labels even when drawn behind the cabinet center', () => {
  const entries = buildVerticalClearanceMeasurementEntries({
    containerMinY: 0,
    containerMaxY: 2.4,
    targetCenterX: 0,
    targetCenterY: 1.2,
    targetWidth: 0.87,
    targetHeight: 0.02,
    z: -0.005,
    styleKey: 'cell',
    textScale: 0.82,
  });

  assert.equal(entries.length, 2);
  assert.equal(entries[0].z, -0.005);
  assert.equal(entries[0].labelFaceSign, 1);
  assert.equal(entries[1].labelFaceSign, 1);
});

test('stack-aware vertical clearance builder centers both cell and neighbor measurement lines inside the active opening width', () => {
  const entries = buildStackAwareVerticalClearanceMeasurementEntries({
    containerMinY: 0,
    containerMaxY: 2.2,
    targetCenterX: -0.36,
    targetCenterY: 0.9,
    targetWidth: 0.72,
    targetHeight: 0.02,
    neighbors: [
      { minY: 1.28, maxY: 1.3, kind: 'shelf' },
      { minY: 0.42, maxY: 0.58, kind: 'drawer' },
    ],
    styleKey: 'cell',
    textScale: 0.82,
  });

  const cellEntries = entries.filter(entry => entry.role === 'cell');
  const neighborEntries = entries.filter(entry => entry.role === 'neighbor');
  assert.equal(cellEntries.length, 2);
  assert.equal(neighborEntries.length, 2);
  assert.ok(
    cellEntries.every(
      entry => typeof entry.startX === 'number' && Math.abs(Number(entry.startX) + 0.36) < 0.05
    )
  );
  assert.ok(
    neighborEntries.every(
      entry => typeof entry.startX === 'number' && Math.abs(Number(entry.startX) + 0.36) < 0.05
    )
  );
  assert.ok((neighborEntries[0]?.startX ?? 0) < (cellEntries[0]?.startX ?? 0));
  assert.ok(cellEntries.every(entry => entry.styleKey === 'cell'));
  assert.ok(neighborEntries.every(entry => entry.styleKey === 'neighbor'));
});

test('stack-aware horizontal clearance builder emits side and divider-neighbor measurements', () => {
  const entries = buildStackAwareHorizontalClearanceMeasurementEntries({
    containerMinX: -0.5,
    containerMaxX: 0.5,
    targetCenterX: 0,
    targetCenterY: 1,
    targetWidth: 0.02,
    targetHeight: 0.8,
    neighbors: [
      { minX: -0.26, maxX: -0.24, kind: 'divider' },
      { minX: 0.29, maxX: 0.31, kind: 'divider' },
    ],
    styleKey: 'cell',
    textScale: 0.82,
    overallLabelOutsetX: 0.06,
    neighborLabelOutsetX: 0.04,
  });

  const cellEntries = entries.filter(entry => entry.role === 'cell');
  const neighborEntries = entries.filter(entry => entry.role === 'neighbor');
  assert.equal(cellEntries.length, 2);
  assert.equal(neighborEntries.length, 2);
  assert.deepEqual(
    cellEntries.map(entry => entry.label),
    ['49 ס"מ', '49 ס"מ']
  );
  assert.deepEqual(
    neighborEntries.map(entry => entry.label),
    ['23 ס"מ', '28 ס"מ']
  );
  assert.ok(cellEntries.every(entry => entry.styleKey === 'cell'));
  assert.ok(neighborEntries.every(entry => entry.styleKey === 'neighbor'));
  assert.ok(neighborEntries.every(isHorizontalMeasurement));
  assertLabelFullyOutsideLeft(cellEntries[0], -0.5, SKETCH_BOX_DIMENSIONS.preview.measurementScaleCellX);
  assertLabelFullyOutsideRight(cellEntries[1], 0.5, SKETCH_BOX_DIMENSIONS.preview.measurementScaleCellX);
  assertLabelFullyOutsideLeft(
    neighborEntries[0],
    -0.24,
    SKETCH_BOX_DIMENSIONS.preview.measurementScaleNeighborX
  );
  assertLabelFullyOutsideRight(
    neighborEntries[1],
    0.29,
    SKETCH_BOX_DIMENSIONS.preview.measurementScaleNeighborX
  );
});
