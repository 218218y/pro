import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCornerWingState } from '../esm/native/builder/corner_state_normalize.js';

function createApp(args: {
  buildUi?: Record<string, unknown>;
  config?: Record<string, unknown>;
  modePrimary?: string;
  runtime?: Record<string, unknown>;
  maps?: Record<string, Record<string, unknown>>;
}) {
  const maps = args.maps || {};
  return {
    services: {
      platform: {
        getBuildUI: () => ({ ...(args.buildUi || {}) }),
      },
    },
    store: {
      getState() {
        return {
          ui: {},
          config: { ...(args.config || {}) },
          runtime: { ...(args.runtime || {}) },
          mode: { primary: args.modePrimary || 'none' },
          meta: {},
        };
      },
    },
    maps: {
      getMap(name: string) {
        return maps[name] || null;
      },
    },
  } as any;
}

test('normalizeCornerWingState seeds lower split config and scopes bottom removal without leaking upper removals', () => {
  const App = createApp({
    buildUi: {
      cornerWidth: '140',
      cornerHeight: '230',
      cornerDepth: '65',
      cornerSide: 'right',
      baseType: 'legs',
      cornerCabinetWallLenCm: 120,
    },
    config: {
      removedDoorsMap: {
        removed_corner_pent_door_1_full: true,
        removed_lower_corner_pent_door_2_full: true,
      },
      corner: {
        layout: 'storage',
        customData: { shelves: [true], rods: [true], storage: true },
        intDrawersList: [{ id: 1 }],
      },
    },
  });

  const state = normalizeCornerWingState({
    App,
    mainW: 2.4,
    mainH: 2.2,
    mainD: 0.6,
    woodThick: 0.018,
    startY: 1.05,
    meta: { stackKey: 'bottom', stackSplitEnabled: true, stackOffsetZ: 0.11 },
  });

  assert.equal(state.__stackKey, 'bottom');
  assert.equal(state.__stackSplitEnabled, true);
  assert.equal(state.__stackOffsetZ, 0.11);
  assert.equal(state.baseType, 'legs');
  assert.equal(state.__stackScopePartKey('corner_pent_door_2'), 'lower_corner_pent_door_2');
  assert.equal(state.__isDoorRemoved('corner_pent_door_2'), true);
  assert.equal(state.__isDoorRemoved('corner_pent_door_1'), false);
  assert.deepEqual(state.config.intDrawersList, []);
  assert.equal(state.config.customData?.storage, false);
});

test('normalizeCornerWingState forces top split stack to drop the base and honor remove-door mode', () => {
  const App = createApp({
    buildUi: {
      cornerWidth: 160,
      cornerHeight: 240,
      cornerDepth: 70,
      cornerSide: 'left',
      baseType: 'plinth',
      groovesEnabled: false,
      removeDoorsEnabled: false,
      hasCornice: true,
    },
    modePrimary: 'remove_door',
    runtime: { sketchMode: true },
  });

  const state = normalizeCornerWingState({
    App,
    mainW: 2.0,
    mainH: 1.4,
    mainD: 0.55,
    woodThick: 0.018,
    startY: 1.2,
    meta: { stackKey: 'top', stackSplitEnabled: true },
  });

  assert.equal(state.__sketchMode, true);
  assert.equal(state.cornerSide, 'left');
  assert.equal(state.__mirrorX, -1);
  assert.equal(state.baseType, 'none');
  assert.equal(state.baseH, 0);
  assert.equal(state.removeDoorsEnabled, true);
  assert.equal(state.__corniceAllowedForThisStack, true);
  assert.ok(state.wingH >= 1.19);
  assert.equal(Array.isArray((App as any).render?.doorsArray), true);
  assert.equal(Array.isArray((App as any).render?.drawersArray), true);
});
