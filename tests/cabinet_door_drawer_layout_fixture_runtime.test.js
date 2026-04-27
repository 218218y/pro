import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCabinetDoorDrawerLayoutFixture,
  createCabinetDoorDrawerLayoutScenarioMatrix,
  readCabinetDoorDrawerLayoutProjectSubset,
} from '../tests/e2e/helpers/cabinet_door_drawer_layout_fixture.js';

test('cabinet door/drawer layout project subset summarizes authored payload branches canonically', () => {
  const { project } = createCabinetDoorDrawerLayoutFixture({}, 'mixed-layout');
  const subset = readCabinetDoorDrawerLayoutProjectSubset(project);
  assert.deepEqual(subset, {
    wardrobeType: 'hinged',
    boardMaterial: 'sandwich',
    doorStyle: 'profile',
    groovesEnabled: true,
    splitDoors: true,
    removeDoorsEnabled: true,
    internalDrawersEnabled: true,
    grooveLinesCount: 12,
    groovesMapKeys: ['groove_d1_full', 'groove_d2_full', 'groove_d3_full'],
    grooveLinesCountEntries: [
      ['groove_d1_full', 12],
      ['groove_d2_full', 8],
    ],
    splitDoorKeys: ['split_d1', 'split_d2'],
    splitDoorBottomKeys: ['splitb_d1'],
    removedDoorKeys: ['removed_d3_full', 'removed_d4_full'],
    drawerDividerKeys: ['div:ext_2', 'div:int_4'],
    doorTrimSummary: [
      { doorKey: 'd1_full', trims: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: 12 }] },
      { doorKey: 'd2_full', trims: [{ axis: 'horizontal', color: 'black', span: 'half', sizeCm: null }] },
    ],
    modulesConfiguration: [
      { index: 0, intDrawersList: [2, 4], intDrawersSlot: 0, extDrawersCount: 3 },
      { index: 1, intDrawersList: [], intDrawersSlot: 3, extDrawersCount: 0 },
    ],
    stackSplitLowerModulesConfiguration: [
      { index: 0, intDrawersList: [1], intDrawersSlot: 0, extDrawersCount: 1 },
    ],
  });
});

test('cabinet door/drawer layout scenario matrix project subset exposes distinct authored payloads per scenario', () => {
  const scenarios = createCabinetDoorDrawerLayoutScenarioMatrix({});
  const subsets = scenarios.map(entry => [
    entry.scenario,
    readCabinetDoorDrawerLayoutProjectSubset(entry.project),
  ]);
  assert.equal(subsets.length >= 4, true);
  const byScenario = Object.fromEntries(subsets);
  assert.deepEqual(byScenario['open-niche-remove'].removedDoorKeys, [
    'removed_d1_full',
    'removed_d2_full',
    'removed_d3_full',
    'removed_d4_full',
  ]);
  assert.deepEqual(byScenario['split-heavy-cut'].splitDoorKeys, [
    'split_d1',
    'split_d2',
    'split_d3',
    'split_d4',
  ]);
  assert.equal(byScenario['drawer-stack-heavy'].modulesConfiguration[0].intDrawersList.length, 3);
  assert.equal(byScenario['mixed-layout'].doorTrimSummary.length, 2);
});
