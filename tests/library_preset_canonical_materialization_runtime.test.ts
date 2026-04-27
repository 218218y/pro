import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateModuleStructure } from '../esm/native/features/modules_configuration/calc_module_structure.ts';
import {
  buildLibraryModuleConfigLists,
  buildNextLibraryModuleCfgList,
  calcDoorsSignatureFromUi,
} from '../esm/native/features/library_preset/library_preset_shared.ts';
import { createLibraryTopModuleConfig } from '../esm/native/features/library_preset/module_defaults.ts';

test('library preset door signatures follow the canonical module-structure calculator', () => {
  const ui = {
    structureSelect: '',
    singleDoorPos: 'center-right',
  };

  const expectedTopSig = calculateModuleStructure(7, ui.singleDoorPos, ui.structureSelect, 'hinged').map(
    item => item.doors
  );
  const expectedBottomSig = calculateModuleStructure(4, ui.singleDoorPos, ui.structureSelect, 'hinged').map(
    item => item.doors
  );

  assert.deepEqual(calcDoorsSignatureFromUi(7, 'hinged', ui), expectedTopSig);
  assert.deepEqual(calcDoorsSignatureFromUi(4, 'hinged', ui), expectedBottomSig);

  const { topCfgList, bottomCfgList } = buildLibraryModuleConfigLists(7, 4, 'hinged', ui);
  assert.deepEqual(
    topCfgList.map(item => item?.doors),
    expectedTopSig
  );
  assert.deepEqual(
    bottomCfgList.map(item => item?.doors),
    expectedBottomSig
  );
});

test('library preset invariants rematerialize preserved modules against canonical library templates', () => {
  const expected = createLibraryTopModuleConfig(2);
  const malformedCurrent = {
    ...expected,
    layout: 'mixed',
    isCustom: false,
    extDrawersCount: '2',
    intDrawersSlot: '3',
    intDrawersList: null,
    gridDivisions: '5',
    customData: {
      shelves: [1, false],
      rods: [0],
      storage: '1',
    },
    doors: '2',
  };

  const next = buildNextLibraryModuleCfgList([malformedCurrent], [expected]);
  assert.ok(next, 'malformed preserved modules should still rematerialize to a canonical shape');
  const normalized = next?.[0];

  assert.equal(normalized?.layout, 'mixed');
  assert.equal(normalized?.isCustom, false);
  assert.equal(normalized?.doors, 2);
  assert.equal(normalized?.extDrawersCount, 2);
  assert.equal(normalized?.intDrawersSlot, 3);
  assert.deepEqual(normalized?.intDrawersList, []);
  assert.equal(normalized?.gridDivisions, 5);
  assert.deepEqual(normalized?.customData?.shelves, [true, false, true, true, false]);
  assert.deepEqual(normalized?.customData?.rods, [false, false, false, false, false]);
  assert.equal(normalized?.customData?.storage, true);
});
