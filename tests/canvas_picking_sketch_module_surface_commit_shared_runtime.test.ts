import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseSketchModuleBoxTool,
  parseSketchShelfTool,
  parseSketchStorageHeight,
} from '../esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts';
import { INTERIOR_STORAGE_BARRIER_POLICY } from '../esm/shared/dimensions/interior_storage_policy.ts';
import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../esm/shared/dimensions/sketch_box_geometry_policy.ts';
import { cmToM } from '../esm/shared/dimensions/units.ts';

test('surface-commit shelf parser preserves variants and positive centimeter depth conversion', () => {
  assert.deepEqual(parseSketchShelfTool('sketch_rod'), { variant: '', shelfDepthM: null });
  assert.deepEqual(parseSketchShelfTool('sketch_shelf:glass'), { variant: 'glass', shelfDepthM: null });
  assert.deepEqual(parseSketchShelfTool('sketch_shelf:glass@35'), {
    variant: 'glass',
    shelfDepthM: cmToM(35),
  });
  for (const tool of [
    'sketch_shelf:regular@',
    'sketch_shelf:regular@0',
    'sketch_shelf:regular@-1',
    'sketch_shelf:regular@NaN',
    'sketch_shelf:regular@Infinity',
  ]) {
    assert.equal(parseSketchShelfTool(tool).shelfDepthM, null);
  }
});

test('surface-commit storage parser preserves default, minimum, maximum, and conversion behavior', () => {
  assert.equal(parseSketchStorageHeight('sketch_rod'), INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);
  assert.equal(
    parseSketchStorageHeight('sketch_storage:not-a-number'),
    INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM
  );
  assert.equal(
    parseSketchStorageHeight('sketch_storage:1'),
    INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMinM
  );
  assert.equal(parseSketchStorageHeight('sketch_storage:60'), cmToM(60));
  assert.equal(
    parseSketchStorageHeight('sketch_storage:500'),
    INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMaxM
  );
  assert.equal(
    parseSketchStorageHeight('sketch_storage:Infinity'),
    INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM
  );
});

test('surface-commit box parser preserves defaults, minimum, ceiling, and positive overrides', () => {
  const parse = (spec: Record<string, unknown> | null) => () => spec;
  assert.deepEqual(parseSketchModuleBoxTool({ tool: 'sketch_box:', parseSketchBoxToolSpec: parse(null) }), {
    boxH: SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterHeightM,
    boxWM: null,
    boxDM: null,
  });

  assert.deepEqual(
    parseSketchModuleBoxTool({
      tool: 'sketch_box:1:45:35',
      parseSketchBoxToolSpec: parse({ heightCm: 1, widthCm: 45, depthCm: 35 }),
    }),
    {
      boxH: SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterHeightM,
      boxWM: cmToM(45),
      boxDM: cmToM(35),
    }
  );

  assert.equal(
    parseSketchModuleBoxTool({
      tool: 'sketch_box:500',
      parseSketchBoxToolSpec: parse({ heightCm: 500 }),
    }).boxH,
    SKETCH_BOX_SHELL_GEOMETRY_POLICY.maxOuterHeightM
  );
  assert.equal(
    parseSketchModuleBoxTool({
      tool: 'sketch_box:500',
      parseSketchBoxToolSpec: parse({ heightCm: 500 }),
      maxHeightM: 0.7,
    }).boxH,
    0.7
  );

  for (const maxHeightM of [undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(
      parseSketchModuleBoxTool({
        tool: 'sketch_box:500',
        parseSketchBoxToolSpec: parse({ heightCm: 500 }),
        maxHeightM,
      }).boxH,
      SKETCH_BOX_SHELL_GEOMETRY_POLICY.maxOuterHeightM
    );
  }
});

test('surface-commit box parser rejects non-number or non-positive optional dimensions', () => {
  const invalidSpecs = [
    { heightCm: '80', widthCm: '45', depthCm: '35' },
    { heightCm: Number.NaN, widthCm: 0, depthCm: -1 },
    { heightCm: Number.POSITIVE_INFINITY, widthCm: Number.POSITIVE_INFINITY, depthCm: Number.NaN },
  ];
  for (const spec of invalidSpecs) {
    const result = parseSketchModuleBoxTool({
      tool: 'sketch_box:',
      parseSketchBoxToolSpec: () => spec,
    });
    assert.equal(result.boxH, SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterHeightM);
    assert.equal(result.boxWM, null);
    assert.equal(result.boxDM, null);
    assert.equal(typeof result.boxH, 'number');
  }
});
