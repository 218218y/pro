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

test('module layout pipeline keeps current precomputed build structure without calling the calculator', () => {
  const result = computeModulesAndLayout(
    createArgs({
      state: {
        build: {
          modulesStructure: [{ doors: 1 }, { doors: 2 }, { doors: 1 }],
        },
      },
      calculateModuleStructure() {
        throw new Error('calculator should not be called for a current precomputed structure');
      },
    })
  );

  assert.deepEqual(
    result.modules.map(item => item.doors),
    [1, 2, 1]
  );
});
