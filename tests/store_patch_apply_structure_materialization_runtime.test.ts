import test from 'node:test';
import assert from 'node:assert/strict';

import { applyConfigPatch } from '../esm/native/platform/store_patch_apply.ts';

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

  const next = applyConfigPatch(prevConfig, patch, { source: 't:store-patch' }, ui);
  const modules = Array.isArray(next.modulesConfiguration) ? next.modulesConfiguration : [];

  assert.equal(modules.length, 3);
  assert.equal(modules[0].doors, 2);
  assert.equal(modules[0].layout, 'drawers');
  assert.equal(modules[1].doors, 2);
  assert.equal(modules[2].doors, 1);
  assert.equal(modules[2].layout, 'shelves');
});

test('store patch apply keeps lower-module sanitization canonical without structure context changes', () => {
  const next = applyConfigPatch(
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
