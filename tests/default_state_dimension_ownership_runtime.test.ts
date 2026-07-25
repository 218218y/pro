import test from 'node:test';
import assert from 'node:assert/strict';

import { createDefaultState } from '../esm/native/runtime/default_state.ts';
import { BASE_LEG_DIMENSIONS } from '../esm/shared/dimensions/base_leg_policy.ts';
import { BASE_PLINTH_POLICY } from '../esm/shared/dimensions/base_plinth_policy.ts';
import {
  CHEST_MODE_ACTIVE_DEFAULTS_POLICY,
  CHEST_MODE_COMMODE_CONSTRAINTS_POLICY,
} from '../esm/shared/dimensions/chest_mode_policy.ts';
import { DEFAULT_STACK_SPLIT_LOWER_HEIGHT } from '../esm/shared/dimensions/stack_split_policy.ts';
import {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_CORNER_DOORS,
  DEFAULT_CORNER_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
} from '../esm/shared/dimensions/wardrobe_defaults.ts';

import type { RootStateLike } from '../types/index.ts';

test('Default State projects all dimension defaults from focused owners without changing state shape', () => {
  const state: RootStateLike = createDefaultState({ noneMode: 'idle' });

  assert.deepEqual(Object.keys(state), ['ui', 'config', 'mode', 'runtime', 'meta']);
  assert.equal(state.mode.primary, 'idle');
  assert.deepEqual(state.ui.raw, {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    depth: HINGED_DEFAULT_DEPTH,
    doors: DEFAULT_HINGED_DOORS,
    chestDrawersCount: DEFAULT_CHEST_DRAWERS_COUNT,
    chestCommodeMirrorHeightCm: CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.defaultMirrorHeightCm,
    chestCommodeMirrorWidthCm: CHEST_MODE_ACTIVE_DEFAULTS_POLICY.widthCm,
    chestCommodeMirrorWidthManual: false,
    stackSplitLowerHeight: DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
    stackSplitLowerDepth: HINGED_DEFAULT_DEPTH,
    stackSplitLowerWidth: DEFAULT_WIDTH,
    stackSplitLowerDoors: DEFAULT_HINGED_DOORS,
    stackSplitLowerDepthManual: false,
    stackSplitLowerWidthManual: false,
    stackSplitLowerDoorsManual: false,
  });

  assert.equal(state.ui.cornerWidth, DEFAULT_CORNER_WIDTH);
  assert.equal(state.ui.cornerHeight, DEFAULT_HEIGHT);
  assert.equal(state.ui.cornerDepth, HINGED_DEFAULT_DEPTH);
  assert.equal(state.ui.cornerDoors, DEFAULT_CORNER_DOORS);
  assert.equal(state.ui.baseType, 'plinth');
  assert.equal(state.ui.baseLegStyle, 'tapered');
  assert.equal(state.ui.baseLegColor, 'black');
  assert.equal(state.ui.basePlinthHeightCm, BASE_PLINTH_POLICY.heightM * 100);
  assert.equal(state.ui.baseLegHeightCm, BASE_LEG_DIMENSIONS.defaults.heightCm);
  assert.equal(state.ui.baseLegWidthCm, BASE_LEG_DIMENSIONS.defaults.taperedWidthCm);
  assert.equal(state.ui.baseLegPlatformMode, 'stage');
  assert.equal(state.ui.baseLegPlatformSideMode, 'overhang');

  for (const key of [
    'groovesEnabled',
    'splitDoors',
    'internalDrawersEnabled',
    'hasCornice',
    'stackSplitEnabled',
    'stackSplitDecorativeSeparatorEnabled',
    'showContents',
    'darkMode',
    'notesEnabled',
    'sketchMode',
    'multiColorEnabled',
    'handleControl',
    'hingeDirection',
    'removeDoorsEnabled',
    'cornerMode',
    'isChestMode',
    'chestCommodeEnabled',
    'lightingControl',
  ]) {
    assert.equal(state.ui[key], false, key);
  }
  assert.equal(state.ui.showHanger, true);
  assert.equal(state.ui.showDimensions, true);
  assert.equal(state.ui.globalClickMode, true);

  assert.deepEqual(state.config.modulesConfiguration, [
    {
      layout: 'hanging_top2',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      isCustom: false,
      customData: {
        shelves: [false, false, false, false, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
    },
    {
      layout: 'shelves',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      isCustom: false,
      customData: {
        shelves: [false, false, false, false, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
    },
  ]);
  assert.deepEqual(state.config.stackSplitLowerModulesConfiguration, [
    {
      layout: 'shelves',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      isCustom: true,
      gridDivisions: 6,
      customData: {
        shelves: [false, true, false, true, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
    },
    {
      layout: 'shelves',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      isCustom: true,
      gridDivisions: 6,
      customData: {
        shelves: [false, true, false, true, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
    },
  ]);

  for (const key of [
    'cornerConfiguration',
    'groovesMap',
    'grooveLinesCountMap',
    'splitDoorsMap',
    'removedDoorsMap',
    'roundedFrameSideShelvesMap',
    'drawerDividersMap',
    'individualColors',
    'doorStyleMap',
    'handlesMap',
    'hingeMap',
    'curtainMap',
    'mirrorLayoutMap',
    'doorTrimMap',
  ]) {
    assert.deepEqual(state.config[key], {}, key);
  }
  assert.deepEqual(state.config.savedColors, []);
});

test('Default State validates noneMode and falls back to none for missing or empty values', () => {
  assert.equal(createDefaultState().mode.primary, 'none');
  assert.equal(createDefaultState({}).mode.primary, 'none');
  assert.equal(createDefaultState({ noneMode: '' }).mode.primary, 'none');
  assert.equal(createDefaultState({ noneMode: 'draw' }).mode.primary, 'draw');
  assert.equal(createDefaultState({ noneMode: 42 } as unknown as { noneMode?: string }).mode.primary, 'none');
});

test('Default State returns fresh mutable trees without shared nested references', () => {
  const first = createDefaultState();
  const second = createDefaultState();

  assert.notEqual(first, second);
  for (const key of ['ui', 'config', 'mode', 'runtime', 'meta'] as const) {
    assert.notEqual(first[key], second[key], key);
  }
  assert.notEqual(first.ui.raw, second.ui.raw);
  assert.notEqual(first.config.modulesConfiguration, second.config.modulesConfiguration);
  assert.notEqual(
    first.config.stackSplitLowerModulesConfiguration,
    second.config.stackSplitLowerModulesConfiguration
  );
  assert.notEqual(first.config.cornerConfiguration, second.config.cornerConfiguration);
  assert.notEqual(first.config.savedColors, second.config.savedColors);

  const firstModules = first.config.modulesConfiguration;
  const secondModules = second.config.modulesConfiguration;
  assert.ok(firstModules && secondModules);
  assert.notEqual(firstModules[0], secondModules[0]);
  assert.notEqual(firstModules[0].customData, secondModules[0].customData);
  assert.notEqual(firstModules[0].customData?.shelves, secondModules[0].customData?.shelves);
  assert.ok(firstModules[0].customData && secondModules[0].customData);
  firstModules[0].customData.shelves[0] = true;
  assert.equal(secondModules[0].customData.shelves[0], false);

  const firstCorner = first.config.cornerConfiguration;
  const secondCorner = second.config.cornerConfiguration;
  assert.ok(firstCorner && secondCorner);
  firstCorner['probe'] = true;
  assert.equal(secondCorner['probe'], undefined);
});
