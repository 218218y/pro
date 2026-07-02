import test from 'node:test';
import assert from 'node:assert/strict';

import { installMapsApi } from '../esm/native/kernel/maps_api.ts';
import { cfgSetMap, patchConfigMap } from '../esm/native/runtime/cfg_access_maps.ts';
import { setCfgDoorStyleMap } from '../esm/native/runtime/cfg_access.ts';
import {
  isVisualKeyedMapName,
  patchDoorGrooveLinesCountEntries,
  patchDoorGrooveMapEntries,
  readMapOrEmpty,
  replaceCurtainMap,
  replaceDoorSpecialMap,
  replaceDoorGrooveLinesCountMap,
  replaceRoundedFrameSideShelvesMap,
  splitBottomKey,
  splitKey,
  splitPosKey,
  toggleGrooveKey,
  writeHandle,
  writeIndividualColor,
  writeRemoved,
  writeSplit,
  writeSplitBottom,
  writeSplitPositionList,
} from '../esm/native/runtime/maps_access.ts';

test('runtime split key helpers use the door split authoring base for visual surface ids', () => {
  assert.equal(splitKey('d4_top'), 'split_d4');
  assert.equal(splitKey('d4_mid2'), 'split_d4');
  assert.equal(splitKey('d4_mid2_accent_top'), 'split_d4');
  assert.equal(splitKey('d4_mid2_groove_left'), 'split_d4');
  assert.equal(splitPosKey('d4_mid2_accent_top'), 'splitpos_d4');
  assert.equal(splitBottomKey('splitb_d5_bot'), 'splitb_d5');
  assert.equal(splitKey('sketch_box_0_boxA_door_left_mid2_accent_top'), 'split_sketch_box_0_boxA_door_left');
  assert.equal(
    splitKey('sketch_box_free_0_boxA_door_sbdr_1_mid2_groove_left'),
    'split_sketch_box_free_0_boxA_door_sbdr_1'
  );
});

test('maps_api keeps map writes store-backed and mirrors saved colors to storage without stale array reuse', () => {
  const storageWrites: Array<[string, unknown]> = [];
  const configPatchWrites: Array<Record<string, unknown>> = [];
  const state = {
    ui: {},
    runtime: {},
    mode: { primary: 'edit', opts: {} },
    meta: { version: 1 },
    config: {
      savedColors: ['oak'],
      colorSwatchesOrder: ['oak'],
      groovesMap: { groove_d1: true },
      handlesMap: { d1: 'bar' },
    } as Record<string, unknown>,
  };

  const App: any = {
    maps: {},
    actions: {
      config: {
        patch: (patch: Record<string, unknown>) => {
          configPatchWrites.push(patch);
          Object.assign(state.config, patch);
          return patch;
        },
      },
    },
    services: {
      storage: {
        KEYS: { SAVED_COLORS: 'saved-colors' },
        setJSON: (key: string, value: unknown) => {
          storageWrites.push([key, value]);
        },
      },
    },
    store: {
      getState: () => state,
      setConfig: (patch: Record<string, unknown>) => {
        configPatchWrites.push(patch);
        Object.assign(state.config, patch);
        return patch;
      },
      patch: () => undefined,
      subscribe: () => () => undefined,
    },
  };

  installMapsApi(App);

  assert.deepEqual(App.maps.getSavedColors(), ['oak']);
  assert.notEqual(
    App.maps.getSavedColors(),
    state.config.savedColors,
    'savedColors should be cloned on read'
  );

  App.maps.setSavedColors(['walnut', 'white'], { source: 'test:saved-colors' });
  App.maps.setColorSwatchesOrder(['white', 'walnut'], { source: 'test:swatches' });

  assert.deepEqual(state.config.savedColors, ['walnut', 'white']);
  assert.deepEqual(state.config.colorSwatchesOrder, ['white', 'walnut']);
  assert.deepEqual(storageWrites, [
    ['saved-colors', ['walnut', 'white']],
    ['saved-colors:order', ['white', 'walnut']],
  ]);

  App.maps.setSavedColors(
    ['walnut', 'walnut', { id: 'saved_a', value: '#111' }, { id: 'saved_a', value: '#222' }],
    {
      source: 'test:saved-colors:dedupe',
    }
  );
  App.maps.setColorSwatchesOrder(['saved_a', ' saved_a ', 'walnut', 7, '7', '', null], {
    source: 'test:swatches:dedupe',
  });

  assert.deepEqual(state.config.savedColors, ['walnut', { id: 'saved_a', value: '#111' }]);
  assert.deepEqual(state.config.colorSwatchesOrder, ['saved_a', 'walnut', '7']);

  const writesBeforeNoStorage = storageWrites.length;
  App.maps.setSavedColors(['black'], { source: 'test:no-storage', noStorageWrite: true });
  assert.equal(
    storageWrites.length,
    writesBeforeNoStorage,
    'noStorageWrite should skip storage bridge writes'
  );

  assert.equal(App.maps.getGroove('d1'), true);
  assert.equal(App.maps.getHandle('d1'), 'bar');

  assert.equal(writeHandle(App, 'd2', 'knob', { source: 'test:handle' }), true);
  assert.equal(
    patchDoorGrooveMapEntries(App, [{ key: 'groove_d2', value: true }], { source: 'test:map-write' }),
    true
  );
  assert.equal(
    patchDoorGrooveLinesCountEntries(App, [{ key: 'groove_d2_mid2', value: 6 }], {
      source: 'test:map-write:count',
    }),
    true
  );

  const handles = readMapOrEmpty(App, 'handlesMap');
  const grooves = readMapOrEmpty(App, 'groovesMap');
  const grooveLineCounts = readMapOrEmpty(App, 'grooveLinesCountMap');
  assert.equal(handles.d2, 'knob');
  assert.equal(grooves.groove_d2, true);
  assert.equal((state.config.groovesMap as Record<string, unknown>).d2, undefined);
  assert.equal(grooveLineCounts.d2_mid2, 6);
  assert.equal((state.config.grooveLinesCountMap as Record<string, unknown>).groove_d2_mid2, undefined);

  assert.equal(
    replaceDoorGrooveLinesCountMap(
      App,
      { d3_mid2: 6, groove_d3_mid2: 7, invalid: 'bad' },
      { source: 'test:map-replace:count' }
    ),
    true
  );
  assert.deepEqual({ ...(state.config.grooveLinesCountMap as Record<string, unknown>) }, { d3_mid2: 6 });

  assert.equal(
    replaceRoundedFrameSideShelvesMap(
      App,
      { body_left: true, body_right: null, ignored: 'bad' },
      { source: 'test:map-replace:rounded' }
    ),
    true
  );
  assert.deepEqual(
    { ...(state.config.roundedFrameSideShelvesMap as Record<string, unknown>) },
    { body_left: true, body_right: null }
  );

  assert.equal(
    replaceDoorSpecialMap(App, { d4_full: 'glass', d5_full: null }, { source: 'test:map-replace:special' }),
    true
  );
  assert.deepEqual(
    { ...(state.config.doorSpecialMap as Record<string, unknown>) },
    { d4_full: 'glass', d5_full: null }
  );

  assert.equal(
    replaceCurtainMap(App, { d4_full: 'linen', d5_full: null }, { source: 'test:map-replace:curtain' }),
    true
  );
  assert.deepEqual(
    { ...(state.config.curtainMap as Record<string, unknown>) },
    { d4_full: 'linen', d5_full: null }
  );

  assert.equal(writeIndividualColor(App, 'body_left', '#112233', { source: 'test:write:color' }), true);
  assert.equal((state.config.individualColors as Record<string, unknown>).body_left, '#112233');
  const colorWritesBeforeNoop = configPatchWrites.length;
  assert.equal(writeIndividualColor(App, 'body_left', '#112233', { source: 'test:write:color:noop' }), true);
  assert.equal(configPatchWrites.length, colorWritesBeforeNoop);
  assert.equal(writeIndividualColor(App, 'body_left', null, { source: 'test:delete:color' }), true);
  assert.equal(Object.prototype.hasOwnProperty.call(state.config.individualColors, 'body_left'), false);
  const colorWritesBeforeMissingDelete = configPatchWrites.length;
  assert.equal(
    writeIndividualColor(App, 'body_left', undefined, { source: 'test:delete:color:missing' }),
    true
  );
  assert.equal(configPatchWrites.length, colorWritesBeforeMissingDelete);
});

test('maps_api and runtime writers replace groove maps with canonical prefixed keys', () => {
  const state = {
    ui: {},
    runtime: {},
    mode: { primary: 'edit', opts: {} },
    meta: { version: 1 },
    config: {
      groovesMap: { d3_full: true },
      splitDoorsMap: { d4: true },
      splitDoorsBottomMap: { d5: true },
    } as Record<string, unknown>,
  };

  const App: any = {
    maps: {},
    actions: {
      config: {
        patch: (patch: Record<string, unknown>) => {
          Object.assign(state.config, patch);
          return patch;
        },
      },
    },
    services: {
      storage: {
        KEYS: { SAVED_COLORS: 'saved-colors' },
        setJSON: () => undefined,
      },
    },
    store: {
      getState: () => state,
      setConfig: (patch: Record<string, unknown>) => {
        Object.assign(state.config, patch);
        return patch;
      },
      patch: () => undefined,
      subscribe: () => () => undefined,
    },
  };

  installMapsApi(App);

  assert.equal(App.maps.getGroove('groove_d3_full'), false);
  assert.equal(App.maps.getGroove('d3_full'), false);

  App.maps.setSplit('d4_top', true, { source: 'test:maps:setSplit:surface' });
  App.maps.setSplitBottom('splitb_d5_bot', true, { source: 'test:maps:setSplitBottom:surface' });

  assert.deepEqual({ ...state.config.splitDoorsMap }, { split_d4: true });
  assert.deepEqual({ ...state.config.splitDoorsBottomMap }, { splitb_d5: true });
  assert.equal(state.config.splitDoorsMap.split_d4_top, undefined);
  assert.equal(state.config.splitDoorsBottomMap.splitb_d5_bot, undefined);

  assert.equal(
    toggleGrooveKey(App, 'groove_d3_full', { source: 'test:runtime:toggleGrooveKey:canonical' }),
    true
  );
  assert.deepEqual({ ...state.config.groovesMap }, { groove_d3_full: true });

  state.config.splitDoorsMap = { d6: true } as Record<string, unknown>;
  state.config.splitDoorsBottomMap = { d7: true } as Record<string, unknown>;
  state.config.groovesMap = { d8_full: true } as Record<string, unknown>;

  assert.equal(writeSplit(App, 'split_d6_top', false, { source: 'test:runtime:writeSplit:surface' }), true);
  assert.equal(
    writeSplitBottom(App, 'splitb_d7_bot', true, { source: 'test:runtime:writeSplitBottom:surface' }),
    true
  );
  assert.equal(
    toggleGrooveKey(App, 'groove_d8_full', { source: 'test:runtime:toggleGrooveKey:legacy' }),
    true
  );

  assert.deepEqual({ ...state.config.splitDoorsMap }, { split_d6: false });
  assert.deepEqual({ ...state.config.splitDoorsBottomMap }, { splitb_d7: true });
  assert.deepEqual({ ...state.config.groovesMap }, { groove_d8_full: true });
  assert.equal(state.config.splitDoorsMap.split_d6_top, undefined);
  assert.equal(state.config.splitDoorsBottomMap.splitb_d7_bot, undefined);
});

test('generic config and maps API writers reject visual keyed maps unless routed through an owner', () => {
  const state = {
    ui: {},
    runtime: {},
    mode: { primary: 'edit', opts: {} },
    meta: { version: 1 },
    config: {} as Record<string, unknown>,
  };
  const App: any = {
    maps: {
      setKey: () => {
        throw new Error('legacy setKey should be removed');
      },
      toggleKey: () => {
        throw new Error('legacy toggleKey should be removed');
      },
    },
    actions: {
      config: {
        patch: (patch: Record<string, unknown>) => {
          Object.assign(state.config, patch);
          return patch;
        },
      },
    },
    store: {
      getState: () => state,
      setConfig: (patch: Record<string, unknown>) => {
        Object.assign(state.config, patch);
        return patch;
      },
      patch: () => undefined,
      subscribe: () => () => undefined,
    },
  };

  installMapsApi(App);

  assert.equal(App.maps.setKey, undefined);
  assert.equal(App.maps.toggleKey, undefined);
  assert.equal(isVisualKeyedMapName('doorStyleMap'), true);
  assert.equal(isVisualKeyedMapName('handlesMap'), false);

  assert.throws(
    () => cfgSetMap(App, 'doorStyleMap', { d1_full: 'profile' }, { source: 'test:cfgSetMap' }),
    /cfgSetMap cannot write visual\/keyed map "doorStyleMap"/
  );
  assert.throws(
    () => patchConfigMap(App, 'doorTrimMap', { d1_full: [] }, { source: 'test:patchConfigMap' }),
    /patchConfigMap cannot write visual\/keyed map "doorTrimMap"/
  );

  assert.equal(state.config.doorStyleMap, undefined);
  assert.equal(state.config.mirrorLayoutMap, undefined);
  assert.equal(state.config.removedDoorsMap, undefined);
  assert.equal(state.config.splitDoorsMap, undefined);
  assert.equal(state.config.splitDoorsBottomMap, undefined);

  assert.equal(typeof App.maps.setKey, 'undefined');
  assert.equal(state.config.doorStyleMap, undefined);
  assert.equal(state.config.unknownMap, undefined);

  setCfgDoorStyleMap(App, { d1_full: 'PROFILE', d1_mid2_accent_top: 'flat' }, { source: 'test:styleOwner' });
  assert.deepEqual({ ...state.config.doorStyleMap }, { d1_full: 'profile' });

  assert.equal(writeRemoved(App, 'd1_mid2_accent_top', true, { source: 'test:removedOwner' }), true);
  assert.deepEqual({ ...state.config.removedDoorsMap }, { removed_d1_mid2: true });

  assert.equal(writeSplitPositionList(App, 'd1_mid2_accent_top', [0.25, NaN, 0.75]), true);
  assert.deepEqual({ ...state.config.splitDoorsMap }, { splitpos_d1: [0.25, 0.75] });
});
