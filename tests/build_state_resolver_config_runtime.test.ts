import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBuildStateOrThrow } from '../esm/native/builder/build_state_resolver.ts';

test('build_state_resolver normalizes config maps and persisted color arrays from snapshot overrides', () => {
  const App: any = {};
  const result = resolveBuildStateOrThrow({
    App,
    stateOrOverride: {
      ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
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
        groovesMap: { groove_d1: 'on', groove_d2: 'off', drop: 'wat' },
        grooveLinesCountMap: { d1: '3', d2: null, drop: 'bad' },
        doorSpecialMap: { d1: 'mirror', d2: null, drop: 7 },
        mirrorLayoutMap: {
          d1: [{ widthCm: 40, heightCm: 80, faceSign: -1 }, { widthCm: 0 }],
          d3: [{ faceSign: -1 }],
          drop: 'bad',
        },
        doorTrimMap: {
          d1: [
            {
              axis: 'vertical',
              color: 'gold',
              span: 'custom',
              sizeCm: '12',
              centerXNorm: '0.2',
              centerYNorm: '0.6',
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
      d1: [{ widthCm: 40, heightCm: 80, faceSign: -1 }],
      d3: [{ faceSign: -1 }],
    }
  );
  assert.equal(result.cfgSnapshot.doorTrimMap?.d1?.[0]?.axis, 'vertical');
  assert.equal(result.cfgSnapshot.doorTrimMap?.d1?.[0]?.sizeCm, 12);
  assert.equal('drop' in (result.cfgSnapshot.doorTrimMap || {}), false);
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
