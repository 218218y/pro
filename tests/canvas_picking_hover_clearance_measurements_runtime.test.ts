import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRectClearanceMeasurementEntries,
  buildStackAwareVerticalClearanceMeasurementEntries,
  buildVerticalClearanceMeasurementEntries,
} from '../esm/native/services/canvas_picking_hover_clearance_measurements.ts';

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
