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

test('library preset rematerialization resets stale regular-grid shelves to the top-library 4-shelf template', () => {
  const expected = createLibraryTopModuleConfig(1);
  const staleRegularGrid = {
    ...expected,
    gridDivisions: 6,
    customData: {
      shelves: [true, true, true, true, true, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
    doors: 1,
  };

  const next = buildNextLibraryModuleCfgList([staleRegularGrid], [expected]);
  const normalized = next?.[0];

  assert.equal(normalized?.gridDivisions, 5);
  assert.deepEqual(
    normalized?.customData?.shelves,
    [true, true, true, true, false],
    'upper library modules should materialize with 4 shelf boards, not a stale 5-board regular-grid shape'
  );
  assert.deepEqual(normalized?.customData?.rods, [false, false, false, false, false]);
  assert.equal(normalized?.customData?.storage, false);
});

test('library preset rematerialization resets stale shelf arrays when gridDivisions was never materialized', () => {
  const expected = createLibraryTopModuleConfig(2);
  const staleImplicitRegularGrid = {
    ...expected,
    gridDivisions: undefined,
    customData: {
      shelves: [true, true, true, true, true],
      rods: [false, false, false, false, false],
      storage: false,
    },
    doors: 2,
  };

  const next = buildNextLibraryModuleCfgList([staleImplicitRegularGrid], [expected]);
  const normalized = next?.[0];

  assert.equal(normalized?.gridDivisions, 5);
  assert.deepEqual(normalized?.customData?.shelves, [true, true, true, true, false]);
  assert.deepEqual(normalized?.customData?.rods, [false, false, false, false, false]);
});

test('library preset ignores stale regular structureSelect when it no longer matches library door count', () => {
  const staleRegularUi = {
    structureSelect: '[2,2]',
    singleDoorPos: 'left',
  };

  assert.deepEqual(
    calcDoorsSignatureFromUi(6, 'hinged', staleRegularUi),
    [2, 2, 2],
    '6-door library must not reuse a stale 4-door structure signature'
  );

  const { topCfgList } = buildLibraryModuleConfigLists(6, 6, 'hinged', staleRegularUi);
  assert.deepEqual(
    topCfgList.map(item => item?.doors),
    [2, 2, 2]
  );
  assert.deepEqual(
    topCfgList.map(item => item?.gridDivisions),
    [5, 5, 5],
    'all 3 upper library cells should use the 4-shelf / 5-space library template'
  );
  assert.deepEqual(
    topCfgList.map(item => item?.customData?.shelves),
    [
      [true, true, true, true, false],
      [true, true, true, true, false],
      [true, true, true, true, false],
    ]
  );
});
