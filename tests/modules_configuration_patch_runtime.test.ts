import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureModulesConfigurationItemFromConfigSnapshot,
  materializeTopModulesConfigurationForStructure,
  materializeTopModulesConfigurationFromUiConfig,
  patchModulesConfigurationListAtForPatch,
  resolveTopModuleDoorsFromUiConfigAt,
} from '../esm/native/features/modules_configuration/modules_config_api.ts';
import {
  calculateModuleStructure,
  normalizeModuleStructureSelectForDoors,
  readModuleStructureSelectSignature,
} from '../esm/native/features/modules_configuration/calc_module_structure.ts';

function createNormalizedModuleList() {
  return [
    {
      layout: 'shelves',
      doors: 2,
      extDrawersCount: 0,
      hasShoeDrawer: false,
      intDrawersSlot: 0,
      intDrawersList: [],
      isCustom: false,
      customData: { shelves: [], rods: [], storage: false },
    },
  ];
}

test('module-config patch preserves list and item references for no-op patch callbacks', () => {
  const prev = createNormalizedModuleList();
  const next = patchModulesConfigurationListAtForPatch(
    'modulesConfiguration',
    prev,
    prev,
    0,
    () => undefined
  );

  assert.equal(next, prev);
  assert.equal(next[0], prev[0]);
});

test('module-config patch still returns a new item when the patch mutates state', () => {
  const prev = createNormalizedModuleList();
  const next = patchModulesConfigurationListAtForPatch('modulesConfiguration', prev, prev, 0, cfg => {
    cfg.layout = 'hanging';
  });

  assert.notEqual(next, prev);
  assert.notEqual(next[0], prev[0]);
  assert.equal(next[0].layout, 'hanging');
});

test('module-config patch isolates nested intDrawersList mutations from the previous snapshot', () => {
  const prev = createNormalizedModuleList();
  const next = patchModulesConfigurationListAtForPatch('modulesConfiguration', prev, prev, 0, cfg => {
    if (!Array.isArray(cfg.intDrawersList)) cfg.intDrawersList = [];
    cfg.intDrawersList.push(4);
    cfg.intDrawersSlot = 0;
  });

  assert.notEqual(next, prev);
  assert.notEqual(next[0], prev[0]);
  assert.deepEqual(next[0].intDrawersList, [4]);
  assert.deepEqual(prev[0].intDrawersList, []);
});

test('module-config patch isolates sketchExtras nested list mutations from the previous snapshot', () => {
  const prev = createNormalizedModuleList();
  (prev[0] as Record<string, unknown>).sketchExtras = { shelves: [{ id: 'a', yNorm: 0.2 }] };

  const next = patchModulesConfigurationListAtForPatch('modulesConfiguration', prev, prev, 0, cfg => {
    const rec = cfg as Record<string, unknown>;
    const extra =
      rec.sketchExtras && typeof rec.sketchExtras === 'object' && !Array.isArray(rec.sketchExtras)
        ? (rec.sketchExtras as Record<string, unknown>)
        : ((rec.sketchExtras = {}) as Record<string, unknown>);
    const shelves = Array.isArray(extra.shelves) ? extra.shelves : ((extra.shelves = []) as unknown[]);
    shelves.push({ id: 'b', yNorm: 0.6 });
  });

  assert.notEqual(next, prev);
  assert.notEqual(next[0], prev[0]);
  assert.deepEqual((next[0] as Record<string, unknown>).sketchExtras, {
    shelves: [
      { id: 'a', yNorm: 0.2 },
      { id: 'b', yNorm: 0.6 },
    ],
  });
  assert.deepEqual((prev[0] as Record<string, unknown>).sketchExtras, {
    shelves: [{ id: 'a', yNorm: 0.2 }],
  });
});

test('module-config patch preserves references for empty patch maps too', () => {
  const prev = createNormalizedModuleList();
  const next = patchModulesConfigurationListAtForPatch('modulesConfiguration', prev, prev, 0, {});

  assert.equal(next, prev);
  assert.equal(next[0], prev[0]);
});

test('module-config ensure materializes top and lower modules through the canonical feature seam', () => {
  const top = ensureModulesConfigurationItemFromConfigSnapshot(
    { modulesConfiguration: [{ doors: '5', customData: { storage: true } }] },
    'modulesConfiguration',
    0
  );
  const lower = ensureModulesConfigurationItemFromConfigSnapshot(
    { stackSplitLowerModulesConfiguration: [{}] },
    'stackSplitLowerModulesConfiguration',
    1
  );

  assert.equal(top?.doors, 5);
  assert.equal(top?.layout, 'hanging_top2');
  assert.equal(top?.customData?.storage, true);
  assert.equal(lower?.layout, 'shelves');
  assert.equal((lower as Record<string, unknown>)?.gridDivisions, 6);
});

test('module-config materialize keeps structure door counts canonical while preserving prior module state', () => {
  const next = materializeTopModulesConfigurationForStructure(
    [
      {
        doors: 2,
        layout: 'drawers',
        customData: { shelves: [true], rods: [false], storage: true },
      },
    ],
    [{ doors: 3 }, { doors: 1 }]
  );

  assert.equal(next.length, 2);
  assert.equal(next[0].doors, 3);
  assert.equal(next[0].layout, 'drawers');
  assert.equal(next[0].customData.storage, true);
  assert.equal(next[1].doors, 1);
  assert.equal(next[1].layout, 'shelves');
});

test('module-config feature helpers resolve top-module doors from UI/config structure canonically', () => {
  const ui = {
    raw: { doors: 5 },
    structureSelect: '[2,2,1]',
  };
  const cfg = { wardrobeType: 'hinged' };

  assert.equal(resolveTopModuleDoorsFromUiConfigAt(ui, cfg, 0), 2);
  assert.equal(resolveTopModuleDoorsFromUiConfigAt(ui, cfg, 1), 2);
  assert.equal(resolveTopModuleDoorsFromUiConfigAt(ui, cfg, 2), 1);
});

test('module-config ensure uses structure-aware top-module doors when UI/config context is supplied', () => {
  const ensured = ensureModulesConfigurationItemFromConfigSnapshot(
    { modulesConfiguration: [{ layout: 'drawers', doors: 2 }] },
    'modulesConfiguration',
    2,
    {
      uiSnapshot: { raw: { doors: 5 }, structureSelect: '[2,2,1]' },
      cfgSnapshot: { wardrobeType: 'hinged' },
    }
  );

  assert.equal(ensured?.doors, 1);
  assert.equal(ensured?.layout, 'shelves');
});

test('module-config patch materializes missing top modules with structure-aware door counts', () => {
  const next = patchModulesConfigurationListAtForPatch(
    'modulesConfiguration',
    [{ layout: 'drawers', doors: 2 }],
    [{ layout: 'drawers', doors: 2 }],
    2,
    { customData: { storage: true } },
    {
      uiSnapshot: { raw: { doors: 5 }, structureSelect: '[2,2,1]' },
      cfgSnapshot: { wardrobeType: 'hinged' },
    }
  );

  assert.equal(next.length, 3);
  assert.equal(next[2].doors, 1);
  assert.equal(next[2].layout, 'shelves');
  assert.equal(next[2].customData?.storage, true);
});

test('module-config materialize from UI/config context uses canonical structure signature for missing items', () => {
  const next = materializeTopModulesConfigurationFromUiConfig(
    [{ layout: 'drawers', doors: 2, customData: { storage: true } }, null],
    { raw: { doors: 5 }, structureSelect: '[2,2,1]', singleDoorPos: 'left' },
    { wardrobeType: 'hinged' }
  );

  assert.equal(next.length, 3);
  assert.equal(next[0].doors, 2);
  assert.equal(next[0].layout, 'drawers');
  assert.equal(next[0].customData.storage, true);
  assert.equal(next[1].doors, 2);
  assert.equal(next[2].doors, 1);
});

test('module-structure calculator ignores stale explicit signatures that no longer match door count', () => {
  assert.deepEqual(readModuleStructureSelectSignature('[2,2,1]'), [2, 2, 1]);
  assert.equal(normalizeModuleStructureSelectForDoors(5, 'hinged', '[2,2,1]'), '[2,2,1]');
  assert.equal(normalizeModuleStructureSelectForDoors(6, 'hinged', '[2,2,1]'), '');

  assert.deepEqual(
    calculateModuleStructure(6, 'left', '[2,2,1]', 'hinged').map(item => item.doors),
    [2, 2, 2]
  );
  assert.deepEqual(
    calculateModuleStructure(5, 'right', '[2,2,1]', 'hinged').map(item => item.doors),
    [2, 2, 1]
  );
});
