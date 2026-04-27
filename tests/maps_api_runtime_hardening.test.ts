import test from 'node:test';
import assert from 'node:assert/strict';

import { installMapsApi } from '../esm/native/kernel/maps_api.ts';
import {
  readMapOrEmpty,
  toggleGrooveKey,
  writeHandle,
  writeMapKey,
  writeSplit,
  writeSplitBottom,
} from '../esm/native/runtime/maps_access.ts';

test('maps_api keeps map writes store-backed and mirrors saved colors to storage without stale array reuse', () => {
  const storageWrites: Array<[string, unknown]> = [];
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
  assert.equal(writeMapKey(App, 'groovesMap', 'groove_d2', true, { source: 'test:map-write' }), true);

  const handles = readMapOrEmpty(App, 'handlesMap');
  const grooves = readMapOrEmpty(App, 'groovesMap');
  assert.equal(handles.d2, 'knob');
  assert.equal(grooves.groove_d2, true);
});

test('maps_api and runtime writers canonicalize prefixed map keys and clear legacy raw aliases', () => {
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
      patch: () => undefined,
      subscribe: () => () => undefined,
    },
  };

  installMapsApi(App);

  assert.equal(App.maps.getGroove('groove_d3_full'), true);
  assert.equal(App.maps.getGroove('d3_full'), true);

  App.maps.setSplit('split_d4', true, { source: 'test:maps:setSplit:canonical' });
  App.maps.setSplitBottom('splitb_d5', true, { source: 'test:maps:setSplitBottom:canonical' });

  assert.deepEqual(state.config.splitDoorsMap, { split_d4: true });
  assert.deepEqual(state.config.splitDoorsBottomMap, { splitb_d5: true });

  assert.equal(
    toggleGrooveKey(App, 'groove_d3_full', { source: 'test:runtime:toggleGrooveKey:canonical' }),
    true
  );
  assert.deepEqual(state.config.groovesMap, {});

  state.config.splitDoorsMap = { d6: true } as Record<string, unknown>;
  state.config.splitDoorsBottomMap = { d7: true } as Record<string, unknown>;
  state.config.groovesMap = { d8_full: true } as Record<string, unknown>;

  assert.equal(writeSplit(App, 'split_d6', false, { source: 'test:runtime:writeSplit:canonical' }), true);
  assert.equal(
    writeSplitBottom(App, 'splitb_d7', false, { source: 'test:runtime:writeSplitBottom:canonical' }),
    true
  );
  assert.equal(
    toggleGrooveKey(App, 'groove_d8_full', { source: 'test:runtime:toggleGrooveKey:legacy' }),
    true
  );

  assert.deepEqual(state.config.splitDoorsMap, { split_d6: false });
  assert.deepEqual(state.config.splitDoorsBottomMap, {});
  assert.deepEqual(state.config.groovesMap, {});
});
