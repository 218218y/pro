import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/core_pure_compute.ts';
import { parseSketchBoxBaseToolSpec } from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';

test('carcass leg support keeps the tapered default and supports round and square legs', () => {
  const defaultOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    doorsCount: 4,
  }) as any;

  assert.equal(defaultOps.baseHeight, 0.12);
  assert.equal(defaultOps.base.kind, 'legs');
  assert.equal(defaultOps.base.style, 'tapered');
  assert.deepEqual(defaultOps.base.geo, {
    shape: 'round',
    topRadius: 0.02,
    bottomRadius: 0.01,
    radialSegments: 16,
  });

  const roundOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegStyle: 'round',
    baseLegHeightCm: 18,
    baseLegWidthCm: 7,
    doorsCount: 4,
  }) as any;

  assert.equal(roundOps.baseHeight, 0.18);
  assert.equal(roundOps.base.style, 'round');
  assert.equal(roundOps.base.geo.topRadius, roundOps.base.geo.bottomRadius);
  assert.equal(roundOps.base.geo.topRadius, 0.035);

  const squareOps = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegWidthCm: 5.5,
    doorsCount: 4,
  }) as any;

  assert.equal(squareOps.base.style, 'square');
  assert.deepEqual(squareOps.base.geo, { shape: 'square', width: 0.055, depth: 0.055 });
});

test('sketch box base tool parser keeps old legs syntax and reads explicit leg options', () => {
  assert.deepEqual(parseSketchBoxBaseToolSpec('sketch_box_base:legs'), {
    baseType: 'legs',
    baseLegStyle: 'tapered',
    baseLegColor: 'black',
    baseLegHeightCm: 12,
    baseLegWidthCm: 4,
  });

  assert.deepEqual(parseSketchBoxBaseToolSpec('sketch_box_base:legs@round@gold@18'), {
    baseType: 'legs',
    baseLegStyle: 'round',
    baseLegColor: 'gold',
    baseLegHeightCm: 18,
    baseLegWidthCm: 3.5,
  });

  assert.deepEqual(parseSketchBoxBaseToolSpec('sketch_box_base:legs@square@nickel@16@6.5'), {
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 16,
    baseLegWidthCm: 6.5,
  });
});
