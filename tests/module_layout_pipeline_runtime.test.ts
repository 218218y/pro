import test from 'node:test';
import assert from 'node:assert/strict';

import { computeModulesAndLayout } from '../esm/native/builder/module_layout_pipeline.ts';

function createArgs(overrides: Record<string, unknown> = {}) {
  return {
    App: {},
    cfg: {
      wardrobeType: 'hinged',
      modulesConfiguration: [],
    },
    ui: {
      singleDoorPos: 'left',
      structureSelect: '',
    },
    totalW: 2.4,
    woodThick: 0.018,
    doorsCount: 4,
    ...overrides,
  } as any;
}

test('module layout pipeline ignores stale precomputed build structure and recomputes by active door count', () => {
  let calculateCalls = 0;

  const result = computeModulesAndLayout(
    createArgs({
      state: {
        build: {
          modulesStructure: [{ doors: 2 }, { doors: 2 }, { doors: 2 }],
        },
      },
      calculateModuleStructure(
        doorsCount: unknown,
        singleDoorPos: unknown,
        structureSelect: unknown,
        wardrobeType: unknown
      ) {
        calculateCalls += 1;
        assert.equal(doorsCount, 4);
        assert.equal(singleDoorPos, 'left');
        assert.equal(structureSelect, '');
        assert.equal(wardrobeType, 'hinged');
        return [{ doors: 2 }, { doors: 2 }];
      },
    })
  );

  assert.equal(calculateCalls, 1);
  assert.deepEqual(
    result.modules.map(item => item.doors),
    [2, 2]
  );
  assert.equal(result.moduleCfgList.length, 2);
});

test('module layout pipeline validates and keeps a current precomputed build structure', () => {
  let calculateCalls = 0;
  const result = computeModulesAndLayout(
    createArgs({
      state: {
        build: {
          modulesStructure: [{ doors: 1 }, { doors: 2 }, { doors: 1 }],
        },
      },
      calculateModuleStructure() {
        calculateCalls += 1;
        return [{ doors: 1 }, { doors: 2 }, { doors: 1 }];
      },
    })
  );

  assert.equal(calculateCalls, 1);
  assert.deepEqual(
    result.modules.map(item => item.doors),
    [1, 2, 1]
  );
});

test('module layout pipeline rejects stale same-door-sum structure from a previous wardrobe type', () => {
  const result = computeModulesAndLayout(
    createArgs({
      doorsCount: 2,
      state: {
        build: {
          modulesStructure: [{ doors: 1 }, { doors: 1 }],
        },
      },
      calculateModuleStructure(
        doorsCount: unknown,
        singleDoorPos: unknown,
        structureSelect: unknown,
        wardrobeType: unknown
      ) {
        assert.equal(doorsCount, 2);
        assert.equal(singleDoorPos, 'left');
        assert.equal(structureSelect, '');
        assert.equal(wardrobeType, 'hinged');
        return [{ doors: 2 }];
      },
    })
  );

  assert.deepEqual(
    result.modules.map(item => item.doors),
    [2]
  );
  assert.equal(result.moduleCfgList.length, 1);
});

test('module layout pipeline reads structure controls from ui.raw before stale mirrored ui fields', () => {
  const result = computeModulesAndLayout(
    createArgs({
      doorsCount: 3,
      ui: {
        singleDoorPos: 'left',
        structureSelect: '[1,1,1]',
        raw: {
          singleDoorPos: 'right',
          structureSelect: '[2,1]',
        },
      },
      calculateModuleStructure(doorsCount: unknown, singleDoorPos: unknown, structureSelect: unknown) {
        assert.equal(doorsCount, 3);
        assert.equal(singleDoorPos, 'right');
        assert.equal(structureSelect, '[2,1]');
        return [{ doors: 2 }, { doors: 1 }];
      },
    })
  );

  assert.deepEqual(
    result.modules.map(item => item.doors),
    [2, 1]
  );
});

test('module layout pipeline supports inset hinged doors with thick frame and reveal instead of overlay', () => {
  const result = computeModulesAndLayout(
    createArgs({
      cfg: {
        wardrobeType: 'hinged',
        modulesConfiguration: [],
        doorMountMode: 'inset',
      },
      totalW: 1,
      woodThick: 0.036,
      doorsCount: 1,
      calculateModuleStructure() {
        return [{ doors: 1 }];
      },
    })
  ) as any;

  const spec = result.hingedDoorPivotMap?.['1'];
  assert.ok(spec, 'expected first hinged door pivot spec');
  assert.equal(result.moduleInternalWidths.length, 1);
  assert.ok(Math.abs(result.moduleInternalWidths[0] - 0.928) < 1e-9);
  assert.ok(Math.abs(spec.doorWidth - 0.922) < 1e-9);
  assert.ok(Math.abs(spec.doorLeftEdge - -0.461) < 1e-9);
});

test('module layout pipeline keeps overlay hinged doors on the existing external-door geometry', () => {
  const result = computeModulesAndLayout(
    createArgs({
      cfg: {
        wardrobeType: 'hinged',
        modulesConfiguration: [],
        doorMountMode: 'overlay',
      },
      totalW: 1,
      woodThick: 0.018,
      doorsCount: 1,
      calculateModuleStructure() {
        return [{ doors: 1 }];
      },
    })
  ) as any;

  const spec = result.hingedDoorPivotMap?.['1'];
  assert.ok(spec, 'expected first hinged door pivot spec');
  assert.ok(Math.abs(result.moduleInternalWidths[0] - 0.964) < 1e-9);
  assert.ok(Math.abs(spec.doorWidth - 0.982) < 1e-9);
  assert.ok(Math.abs(spec.doorLeftEdge - -0.491) < 1e-9);
});
