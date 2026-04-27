import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureCornerConfigurationForStack,
  patchCornerConfigurationCellForStack,
  patchCornerConfigurationForStack,
} from '../esm/native/features/modules_configuration/corner_cells_api.ts';

type AnyRecord = Record<string, any>;

test('corner lower stack cell patch seeds missing lower shell from the base corner snapshot before applying the patch', () => {
  const base: AnyRecord = {
    layout: 'top-layout',
    specialDims: { widthCm: 333 },
    legacyHint: 'keep-me',
  };

  const patched = patchCornerConfigurationCellForStack(base, base, 'bottom', 1, {
    layout: 'bottom-cell',
  }) as AnyRecord;
  const lower = patched.stackSplitLower as AnyRecord;
  const modules = lower.modulesConfiguration as AnyRecord[];

  assert.equal(lower.legacyHint, 'keep-me');
  assert.equal((lower.specialDims as AnyRecord).widthCm, 333);
  assert.equal(modules[1].layout, 'bottom-cell');

  (lower.specialDims as AnyRecord).widthCm = 999;
  assert.equal((base.specialDims as AnyRecord).widthCm, 333);
});

test('corner lower stack record patch seeds missing lower shell from the base corner snapshot before sanitizing the patch', () => {
  const base: AnyRecord = {
    specialDims: { depthCm: 55 },
    preserveMe: true,
  };

  const patched = patchCornerConfigurationForStack(base, base, 'bottom', {
    extDrawersCount: '3',
  }) as AnyRecord;
  const lower = patched.stackSplitLower as AnyRecord;

  assert.equal(lower.preserveMe, true);
  assert.equal((lower.specialDims as AnyRecord).depthCm, 55);
  assert.equal(lower.extDrawersCount, 3);

  (lower.specialDims as AnyRecord).depthCm = 999;
  assert.equal((base.specialDims as AnyRecord).depthCm, 55);
});

test('corner top stack cell patch preserves the original corner snapshot reference for semantic no-op patches', () => {
  const base: AnyRecord = {
    layout: 'corner-shell',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    intDrawersList: [],
    intDrawersSlot: 0,
    isCustom: false,
    gridDivisions: 6,
    customData: {
      shelves: [false, false, false, false, false, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
    modulesConfiguration: [
      {
        layout: 'left-top',
        doors: 2,
        extDrawersCount: 0,
        hasShoeDrawer: false,
        intDrawersList: [],
        intDrawersSlot: 0,
        isCustom: false,
        customData: {
          shelves: [false, false, false, false, false, false],
          rods: [false, false, false, false, false, false],
          storage: true,
        },
      },
    ],
  };

  const patched = patchCornerConfigurationCellForStack(base, base, 'top', 0, current => ({
    layout: current.layout,
    doors: current.doors,
    customData: current.customData,
  })) as AnyRecord;

  assert.equal(patched, base);
  assert.equal(patched.modulesConfiguration, base.modulesConfiguration);
  assert.equal(
    (patched.modulesConfiguration as AnyRecord[])[0],
    (base.modulesConfiguration as AnyRecord[])[0]
  );
});

test('corner lower stack record patch preserves the original corner snapshot reference for semantic no-op patches', () => {
  const lowerModules = [
    {
      layout: 'drawers',
      extDrawersCount: 2,
      hasShoeDrawer: false,
      intDrawersList: [],
      isCustom: false,
      gridDivisions: 6,
      customData: {
        shelves: [false, true, false, true, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
    },
  ];
  const base: AnyRecord = {
    stackSplitLower: {
      layout: 'drawers',
      extDrawersCount: 1,
      hasShoeDrawer: false,
      intDrawersList: [],
      intDrawersSlot: 0,
      isCustom: true,
      gridDivisions: 6,
      customData: {
        shelves: [false, true, false, true, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
      modulesConfiguration: lowerModules,
    },
  };

  const patched = patchCornerConfigurationForStack(base, base, 'bottom', current => ({
    layout: current.layout,
    extDrawersCount: current.extDrawersCount,
    customData: current.customData,
    modulesConfiguration: current.modulesConfiguration,
  })) as AnyRecord;

  assert.equal(patched, base);
  assert.equal((patched.stackSplitLower as AnyRecord).modulesConfiguration, lowerModules);
});

test('corner ensure reuses the previous canonical bottom snapshot when the lower shell is already materialized', () => {
  const lowerModules = [
    {
      layout: 'shelves',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      intDrawersList: [],
      intDrawersSlot: 0,
      isCustom: true,
      gridDivisions: 6,
      customData: {
        shelves: [false, true, false, true, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
    },
  ];
  const base: AnyRecord = {
    layout: 'shelves',
    modulesConfiguration: [{}],
    stackSplitLower: {
      layout: 'shelves',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      intDrawersList: [],
      intDrawersSlot: 0,
      isCustom: true,
      gridDivisions: 6,
      customData: {
        shelves: [false, false, false, false, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
      modulesConfiguration: lowerModules,
    },
  };

  const ensured = ensureCornerConfigurationForStack(base, base, 'bottom') as AnyRecord;

  assert.equal(ensured, base);
  assert.equal((ensured.stackSplitLower as AnyRecord).modulesConfiguration, lowerModules);
});
