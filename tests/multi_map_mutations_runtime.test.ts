import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../esm/native/platform/store.ts';
import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { installMapsApi } from '../esm/native/kernel/maps_api.ts';
import { installDomainApi } from '../esm/native/kernel/domain_api.ts';
import { getCfg } from '../esm/native/kernel/api.ts';

function createApp() {
  const store = createStore({
    initialState: {
      config: {
        individualColors: {},
        doorSpecialMap: {},
        curtainMap: {},
        removedDoorsMap: {},
        splitDoorsMap: {},
        splitDoorsBottomMap: {},
        doorStyleMap: {},
        mirrorLayoutMap: {},
      },
    },
  });
  const App: any = { store, actions: {}, services: {}, maps: {} };
  installStateApi(App);
  installMapsApi(App);
  installDomainApi(App);
  return App;
}

test('sequential multi-part paint preserves existing individual door overrides', () => {
  const App = createApp();

  App.actions.colors.applyPaint({ d1_full: 'oak' }, {}, { source: 'test:paint:first' }, {}, {});
  let cfg = getCfg(App) as Record<string, any>;
  assert.deepEqual(cfg.individualColors, { d1_full: 'oak' });

  App.actions.colors.applyPaint(
    { ...cfg.individualColors, d2_full: 'white' },
    cfg.curtainMap,
    { source: 'test:paint:second' },
    cfg.doorSpecialMap,
    cfg.mirrorLayoutMap
  );

  cfg = getCfg(App) as Record<string, any>;
  assert.deepEqual(cfg.individualColors, {
    d1_full: 'oak',
    d2_full: 'white',
  });
});

test('sequential remove and split commands preserve existing entries across multiple doors', () => {
  const App = createApp();

  App.actions.doors.setRemoved('d1', true, { source: 'test:remove:first' });
  App.actions.doors.setRemoved('d2', true, { source: 'test:remove:second' });
  App.actions.doors.setSplit('d1', true, { source: 'test:split:first' });
  App.actions.doors.setSplit('d2', true, { source: 'test:split:second' });

  const cfg = getCfg(App) as Record<string, any>;
  assert.deepEqual(cfg.removedDoorsMap, {
    removed_d1_full: true,
    removed_d2_full: true,
  });
  assert.deepEqual(cfg.splitDoorsMap, {
    split_d1: true,
    split_d2: true,
  });
});

test('sequential special-door and style overrides preserve prior per-door entries', () => {
  const App = createApp();

  App.actions.colors.applyPaint(
    {},
    {},
    { source: 'test:special:first' },
    { d1_full: 'mirror' },
    { d1_full: [{ widthCm: 40, heightCm: 60, faceSign: -1 }] }
  );

  let cfg = getCfg(App) as Record<string, any>;
  App.actions.colors.applyPaint(
    cfg.individualColors,
    cfg.curtainMap,
    { source: 'test:special:second' },
    { ...cfg.doorSpecialMap, d2_full: 'glass' },
    cfg.mirrorLayoutMap
  );
  cfg = getCfg(App) as Record<string, any>;
  assert.deepEqual(cfg.doorSpecialMap, {
    d1_full: 'mirror',
    d2_full: 'glass',
  });
  assert.deepEqual(cfg.mirrorLayoutMap, {
    d1_full: [{ widthCm: 40, heightCm: 60, faceSign: -1 }],
  });

  App.actions.config.setMap('doorStyleMap', { d1_full: 'profile' }, { source: 'test:style:first' });
  cfg = getCfg(App) as Record<string, any>;
  App.actions.config.setMap(
    'doorStyleMap',
    { ...cfg.doorStyleMap, d2_full: 'tom' },
    { source: 'test:style:second' }
  );
  cfg = getCfg(App) as Record<string, any>;
  assert.deepEqual(cfg.doorStyleMap, {
    d1_full: 'profile',
    d2_full: 'tom',
  });
});
