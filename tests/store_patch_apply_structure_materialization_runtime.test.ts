import test from 'node:test';
import assert from 'node:assert/strict';

import { applyStoreConfigPatch } from '../esm/native/platform/store_patch_apply.ts';

test('store patch apply materializes top modules with structure-aware door counts', () => {
  const prevConfig = {
    wardrobeType: 'hinged',
    modulesConfiguration: [{ layout: 'drawers', doors: 2 }],
  };
  const patch = {
    modulesConfiguration: [{ layout: 'drawers' }, {}, {}],
  };
  const ui = {
    doors: 5,
    structureSelect: '[2,2,1]',
    singleDoorPos: 'left',
    raw: {
      doors: 5,
      structureSelect: '[2,2,1]',
      singleDoorPos: 'left',
    },
  };

  const next = applyStoreConfigPatch(prevConfig, patch, { source: 't:store-patch' }, ui);
  const modules = Array.isArray(next.modulesConfiguration) ? next.modulesConfiguration : [];

  assert.equal(modules.length, 3);
  assert.equal(modules[0].doors, 2);
  assert.equal(modules[0].layout, 'drawers');
  assert.equal(modules[1].doors, 2);
  assert.equal(modules[2].doors, 1);
  assert.equal(modules[2].layout, 'shelves');
});

test('store patch apply keeps lower-module sanitization canonical without structure context changes', () => {
  const next = applyStoreConfigPatch(
    { stackSplitLowerModulesConfiguration: [] },
    { stackSplitLowerModulesConfiguration: [{}] },
    { source: 't:store-patch' },
    { raw: { doors: 5 }, structureSelect: '[2,2,1]' }
  );
  const lower = Array.isArray(next.stackSplitLowerModulesConfiguration)
    ? next.stackSplitLowerModulesConfiguration
    : [];

  assert.equal(lower.length, 1);
  assert.equal(lower[0].layout, 'shelves');
  assert.equal(lower[0].gridDivisions, 6);
});

test('store patch apply replace-owned corner snapshot clears stale lower corner stack state', () => {
  const prevConfig = {
    cornerConfiguration: {
      layout: 'shelves',
      modulesConfiguration: [{ layout: 'top-cell' }],
      stackSplitLower: {
        specialDims: { baseWidthCm: 170, widthCm: 170 },
        modulesConfiguration: [
          { specialDims: { baseWidthCm: 80, widthCm: 80 } },
          { specialDims: { baseWidthCm: 80, widthCm: 90 } },
        ],
      },
    },
  };

  const next = applyStoreConfigPatch(
    prevConfig,
    {
      cornerConfiguration: {
        layout: 'shelves',
        modulesConfiguration: [{ layout: 'top-cell' }],
      },
      __replace: { cornerConfiguration: true },
    },
    { source: 'history.undoRedo' },
    { raw: { doors: 4 }, cornerDoors: 4 }
  );

  assert.equal(Object.prototype.hasOwnProperty.call(next.cornerConfiguration, 'stackSplitLower'), false);
});

test('store patch apply merge-owned corner patch preserves existing lower corner stack state', () => {
  const prevConfig = {
    cornerConfiguration: {
      layout: 'shelves',
      modulesConfiguration: [{ layout: 'top-cell' }],
      stackSplitLower: {
        specialDims: { baseWidthCm: 170, widthCm: 170 },
        modulesConfiguration: [{ specialDims: { baseWidthCm: 80, widthCm: 80 } }],
      },
    },
  };

  const next = applyStoreConfigPatch(
    prevConfig,
    {
      cornerConfiguration: {
        layout: 'drawers',
        modulesConfiguration: [{ layout: 'top-cell' }],
      },
    },
    { source: 'regular.patch' },
    { raw: { doors: 4 }, cornerDoors: 4 }
  );

  assert.equal(next.cornerConfiguration.layout, 'drawers');
  assert.deepEqual(next.cornerConfiguration.stackSplitLower.specialDims, {
    baseWidthCm: 170,
    widthCm: 170,
  });
});

test('store patch apply replace-owned lower modules list can clear stale lower linear cells', () => {
  const next = applyStoreConfigPatch(
    {
      stackSplitLowerModulesConfiguration: [
        { layout: 'shelves', specialDims: { baseWidthCm: 60, widthCm: 90 } },
      ],
    },
    {
      stackSplitLowerModulesConfiguration: [],
      __replace: { stackSplitLowerModulesConfiguration: true },
    },
    { source: 'history.undoRedo' },
    { raw: { doors: 4 } }
  );

  assert.deepEqual(next.stackSplitLowerModulesConfiguration, []);
});
