import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBuildStateOrThrow } from '../esm/native/builder/build_state_resolver.ts';
import { setDrawerRebuildIntent } from '../esm/native/runtime/doors_access.ts';

test('build_state_resolver captures one coherent drawer rebuild mode/runtime/intent snapshot', () => {
  const App: any = { services: {} };
  setDrawerRebuildIntent(App, 'int_4');

  const result = resolveBuildStateOrThrow({
    App,
    stateOrOverride: {
      ui: {},
      mode: { primary: 'divider' },
      runtime: { drawersOpenId: 'int_4' },
      config: { __snapshot: true },
    },
  });

  assert.deepEqual(result.drawerRebuildSnapshot, {
    primaryMode: 'divider',
    forcedOpenDrawerId: 'int_4',
    intent: { targetId: 'int_4', version: 1 },
  });
  assert.equal(Object.isFrozen(result.drawerRebuildSnapshot), true);
  assert.equal(Object.isFrozen(result.drawerRebuildSnapshot.intent), true);
});

test('build_state_resolver normalizes config maps and persisted color arrays from snapshot overrides', () => {
  const App: any = {};
  const result = resolveBuildStateOrThrow({
    App,
    stateOrOverride: {
      ui: {
        groovesEnabled: true,
        splitDoors: true,
        removeDoorsEnabled: true,
        hingeDirection: true,
        raw: { width: 160, height: 240, depth: 55, doors: 4 },
      },
      runtime: {},
      config: {
        __snapshot: true,
        savedColors: [
          'oak',
          {
            id: 'c1',
            name: 'Profile Texture',
            type: 'texture',
            value: 'c1',
            textureData: 'data:image/png;base64,AAA=',
            locked: true,
          },
          { id: '' },
          17,
        ],
        colorSwatchesOrder: [' c1 ', null, '', 9],
        individualColors: { d1: 'oak', d2: null, drop: 9 },
        groovesMap: { groove_d1: true, groove_d2: false, drop: 'wat' },
        grooveLinesCountMap: { d1: 3.9, d2: null, legacy: '3', drop: 'bad' },
        splitDoorsMap: { split_d1: true, split_d2: false, splitpos_d3: [0.25, 'bad', 0.75] },
        splitDoorsBottomMap: { splitb_d1: true, splitb_d2: false, drop: 'wat' },
        removedDoorsMap: {
          removed_d1_full: true,
          removed_d2_full: false,
          removed_d3: true,
          removed_d4_full: 'on',
          drop: 'wat',
        },
        roundedFrameSideShelvesMap: { body_left: true, body_right: false, body_legacy: 1, drop: 'wat' },
        doorSpecialMap: { d1: 'mirror', d2: null, drop: 7 },
        mirrorLayoutMap: {
          d1: [{ widthCm: 99, heightCm: 99 }],
          d1_full: [{ widthCm: 40, heightCm: 80, faceSign: -1 }, { widthCm: 0 }],
          d3_full: [{ faceSign: -1 }],
          d4_mid2_accent_top: [{ widthCm: 22 }],
          drop: 'bad',
        },
        doorTrimMap: {
          d1: [
            {
              axis: 'horizontal',
              color: 'black',
            },
          ],
          d1_full: [
            {
              axis: 'vertical',
              color: 'gold',
              span: 'custom',
              sizeCm: '12',
              centerXNorm: '0.2',
              centerYNorm: '0.6',
            },
          ],
          d1_mid2_accent_top: [
            {
              axis: 'horizontal',
              color: 'silver',
            },
          ],
          drop: 'bad',
        },
        handlesMap: { d1: 'bar', d2: null, drop: 7 },
        hingeMap: { d1: 'left', d2: { dir: 'right' }, drop: 5 },
        curtainMap: { d1: 'linen', d2: null, drop: false },
      },
    },
  });

  assert.deepEqual(result.cfgSnapshot.savedColors, [
    {
      id: 'c1',
      name: 'Profile Texture',
      type: 'texture',
      value: 'c1',
      textureData: 'data:image/png;base64,AAA=',
      locked: true,
    },
  ]);
  assert.deepEqual(result.cfgSnapshot.colorSwatchesOrder, ['c1', '9']);
  assert.deepEqual({ ...result.cfgSnapshot.individualColors }, { d1: 'oak', d2: null });
  assert.deepEqual({ ...result.cfgSnapshot.groovesMap }, { groove_d1: true, groove_d2: false });
  assert.deepEqual({ ...result.cfgSnapshot.grooveLinesCountMap }, { d1: 3, d2: null });
  assert.deepEqual(
    { ...result.cfgSnapshot.splitDoorsMap },
    {
      split_d1: true,
      split_d2: false,
      splitpos_d3: [0.25, 0.75],
    }
  );
  assert.deepEqual({ ...result.cfgSnapshot.splitDoorsBottomMap }, { splitb_d1: true, splitb_d2: false });
  assert.deepEqual(
    { ...result.cfgSnapshot.removedDoorsMap },
    { removed_d1_full: true, removed_d2_full: false }
  );
  assert.deepEqual(
    { ...result.cfgSnapshot.roundedFrameSideShelvesMap },
    {
      body_left: true,
      body_right: false,
    }
  );
  assert.deepEqual({ ...result.cfgSnapshot.doorSpecialMap }, { d1: 'mirror', d2: null });
  assert.deepEqual({ ...result.cfgSnapshot.handlesMap }, { d1: 'bar', d2: null });
  assert.deepEqual({ ...result.cfgSnapshot.hingeMap }, { d1: 'left', d2: { dir: 'right' } });
  assert.deepEqual({ ...result.cfgSnapshot.curtainMap }, { d1: 'linen', d2: null });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(result.cfgSnapshot.mirrorLayoutMap || {}).map(([key, list]) => [
        key,
        Array.isArray(list) ? list.map(entry => ({ ...entry })) : list,
      ])
    ),
    {
      d1_full: [{ widthCm: 40, heightCm: 80, faceSign: -1 }],
      d3_full: [{ faceSign: -1 }],
    }
  );
  assert.equal('d1' in (result.cfgSnapshot.mirrorLayoutMap || {}), false);
  assert.equal('d4_mid2_accent_top' in (result.cfgSnapshot.mirrorLayoutMap || {}), false);
  assert.equal(result.cfgSnapshot.doorTrimMap?.d1_full?.[0]?.axis, 'vertical');
  assert.equal(result.cfgSnapshot.doorTrimMap?.d1_full?.[0]?.sizeCm, 12);
  assert.equal('d1' in (result.cfgSnapshot.doorTrimMap || {}), false);
  assert.equal('d1_mid2_accent_top' in (result.cfgSnapshot.doorTrimMap || {}), false);
  assert.equal('drop' in (result.cfgSnapshot.doorTrimMap || {}), false);
});

test('build_state_resolver gates door authoring maps behind their build-visible UI toggles', () => {
  const baseState = {
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    runtime: {},
    config: {
      __snapshot: true,
      groovesMap: { groove_d1_full: true },
      grooveLinesCountMap: { d1_full: 8 },
      splitDoorsMap: { split_d1: true, splitpos_d1: [0.5] },
      splitDoorsBottomMap: { splitb_d1: true },
      removedDoorsMap: { removed_d2_full: true },
      roundedFrameSideShelvesMap: { body_left: true },
      hingeMap: { door_hinge_1: 'right' },
    },
  };

  const disabled = resolveBuildStateOrThrow({
    App: {},
    stateOrOverride: baseState,
  });

  assert.deepEqual({ ...disabled.cfgSnapshot.groovesMap }, {});
  assert.deepEqual({ ...disabled.cfgSnapshot.grooveLinesCountMap }, {});
  assert.deepEqual({ ...disabled.cfgSnapshot.splitDoorsMap }, {});
  assert.deepEqual({ ...disabled.cfgSnapshot.splitDoorsBottomMap }, {});
  assert.deepEqual({ ...disabled.cfgSnapshot.removedDoorsMap }, {});
  assert.deepEqual({ ...disabled.cfgSnapshot.roundedFrameSideShelvesMap }, {});
  assert.deepEqual({ ...disabled.cfgSnapshot.hingeMap }, {});

  const enabled = resolveBuildStateOrThrow({
    App: {},
    stateOrOverride: {
      ...baseState,
      ui: {
        ...baseState.ui,
        groovesEnabled: true,
        splitDoors: true,
        removeDoorsEnabled: true,
        hingeDirection: true,
      },
    },
  });

  assert.deepEqual({ ...enabled.cfgSnapshot.groovesMap }, { groove_d1_full: true });
  assert.deepEqual({ ...enabled.cfgSnapshot.grooveLinesCountMap }, { d1_full: 8 });
  assert.deepEqual(
    { ...enabled.cfgSnapshot.splitDoorsMap },
    {
      split_d1: true,
      splitpos_d1: [0.5],
    }
  );
  assert.deepEqual({ ...enabled.cfgSnapshot.splitDoorsBottomMap }, { splitb_d1: true });
  assert.deepEqual({ ...enabled.cfgSnapshot.removedDoorsMap }, { removed_d2_full: true });
  assert.deepEqual({ ...enabled.cfgSnapshot.roundedFrameSideShelvesMap }, { body_left: true });
  assert.deepEqual({ ...enabled.cfgSnapshot.hingeMap }, { door_hinge_1: 'right' });
});

test('build_state_resolver keeps remove-door maps build-visible while remove-door edit mode is active', () => {
  const result = resolveBuildStateOrThrow({
    App: {},
    stateOrOverride: {
      ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
      mode: { primary: 'remove_door' },
      runtime: {},
      config: {
        __snapshot: true,
        removedDoorsMap: { removed_d2_full: true },
        roundedFrameSideShelvesMap: { body_left: true },
      },
    },
  });

  assert.deepEqual({ ...result.cfgSnapshot.removedDoorsMap }, { removed_d2_full: true });
  assert.deepEqual({ ...result.cfgSnapshot.roundedFrameSideShelvesMap }, { body_left: true });
});

test('build_state_resolver canonicalizes builder module snapshots against the live structure and detaches mutable config lists', () => {
  const App: any = {};
  const sourceModules = [
    { layout: 'drawers', doors: '9' },
    null,
    { customData: { storage: true }, doors: '9' },
  ];
  const sourceLower = [{ extDrawersCount: '4' }, null];
  const sourceCorner = {
    modulesConfiguration: [{ doors: '5', customData: { storage: true } }],
    stackSplitLower: { modulesConfiguration: [{ extDrawersCount: '3' }, null] },
  };

  const result = resolveBuildStateOrThrow({
    App,
    stateOrOverride: {
      ui: {
        doors: 5,
        singleDoorPos: 'right',
        structureSelect: '',
        raw: { doors: 5, singleDoorPos: 'right', structureSelect: '' },
      },
      runtime: {},
      config: {
        __snapshot: true,
        wardrobeType: 'hinged',
        modulesConfiguration: sourceModules,
        stackSplitLowerModulesConfiguration: sourceLower,
        cornerConfiguration: sourceCorner,
      },
    },
  });

  assert.deepEqual(
    result.cfgSnapshot.modulesConfiguration.map((entry: any) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(result.cfgSnapshot.modulesConfiguration[2].customData.storage, true);
  assert.equal(result.cfgSnapshot.stackSplitLowerModulesConfiguration[0].extDrawersCount, 4);
  assert.equal(result.cfgSnapshot.stackSplitLowerModulesConfiguration[1].extDrawersCount, 0);
  assert.equal(result.cfgSnapshot.cornerConfiguration.modulesConfiguration[0].doors, '5');
  assert.equal(
    result.cfgSnapshot.cornerConfiguration.stackSplitLower.modulesConfiguration[0].extDrawersCount,
    3
  );
  assert.equal(
    result.cfgSnapshot.cornerConfiguration.stackSplitLower.modulesConfiguration[1].extDrawersCount,
    0
  );

  sourceModules[0].doors = 77;
  (sourceLower[0] as any).extDrawersCount = 99;
  (sourceCorner.modulesConfiguration[0] as any).doors = 44;
  ((sourceCorner.stackSplitLower.modulesConfiguration as any[])[0] as any).extDrawersCount = 88;

  assert.deepEqual(
    result.cfgSnapshot.modulesConfiguration.map((entry: any) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(result.cfgSnapshot.stackSplitLowerModulesConfiguration[0].extDrawersCount, 4);
  assert.equal(result.cfgSnapshot.cornerConfiguration.modulesConfiguration[0].doors, '5');
  assert.equal(
    result.cfgSnapshot.cornerConfiguration.stackSplitLower.modulesConfiguration[0].extDrawersCount,
    3
  );
});

test('build_state_resolver seeds missing top modules from the live UI structure for builder consumers', () => {
  const result = resolveBuildStateOrThrow({
    App: {},
    stateOrOverride: {
      ui: {
        doors: 5,
        singleDoorPos: 'right',
        structureSelect: '',
        raw: { doors: 5, singleDoorPos: 'right', structureSelect: '' },
      },
      runtime: {},
      config: {
        __snapshot: true,
        wardrobeType: 'hinged',
      },
    },
  });

  assert.deepEqual(
    result.cfgSnapshot.modulesConfiguration.map((entry: any) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(result.cfgSnapshot.modulesConfiguration[0].layout, 'hanging_top2');
  assert.equal(result.cfgSnapshot.modulesConfiguration[2].layout, 'shelves');
});
