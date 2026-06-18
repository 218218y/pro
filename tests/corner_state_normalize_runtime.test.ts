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
    meta: {
      stackKey: 'bottom',
      stackSplitEnabled: true,
      stackOffsetZ: 0.11,
      cfgSnapshot: {
        removedDoorsMap: {
          removed_corner_pent_door_1_full: true,
          removed_lower_corner_pent_door_2_full: true,
        },
        corner: {
          layout: 'storage',
          customData: { shelves: [true], rods: [true], storage: true },
        },
      },
    },
  });

  assert.equal(state.__stackKey, 'bottom');
  assert.equal(state.__stackSplitEnabled, true);
  assert.equal(state.__stackOffsetZ, 0.11);
  assert.equal(state.baseType, 'legs');
  assert.equal(state.__stackScopePartKey('corner_pent_door_2'), 'lower_corner_pent_door_2');
  assert.equal(state.__isDoorRemoved('corner_pent_door_2'), true);
  assert.equal(state.__isDoorRemoved('corner_pent_door_1'), false);
  assert.equal(state.config.customData?.storage, false);
});

test('normalizeCornerWingState does not let top corner special width seed a missing lower split shell', () => {
  const App = createApp({
    buildUi: {
      cornerWidth: 140,
      cornerHeight: 220,
      cornerDepth: 65,
      cornerDoors: 3,
      cornerConnectorEnabled: true,
      raw: {
        cornerDoors: 3,
        stackSplitLowerDepth: 55,
        stackSplitLowerWidth: 160,
      },
    },
    config: {
      cornerConfiguration: {
        layout: 'shelves',
        specialDims: { baseWidthCm: 140, widthCm: 140, depthCm: 70 },
        connectorSpecialDims: { widthCm: 115 },
        modulesConfiguration: [{ specialDims: { baseWidthCm: 80, widthCm: 80 } }],
      },
    },
  });

  const state = normalizeCornerWingState({
    App,
    mainW: 1.6,
    mainH: 0.8,
    mainD: 0.55,
    woodThick: 0.017,
    startY: 0,
    meta: {
      stackKey: 'bottom',
      stackSplitEnabled: true,
      cfgSnapshot: {
        cornerConfiguration: {
          layout: 'shelves',
          specialDims: { baseWidthCm: 140, widthCm: 140, depthCm: 70 },
          connectorSpecialDims: { widthCm: 115 },
          modulesConfiguration: [{ specialDims: { baseWidthCm: 80, widthCm: 80 } }],
        },
      },
    },
  });

  assert.equal(state.wingLengthCM, 120);
  assert.equal(state.wingW, 1.2);
  assert.equal(state.wingD, 0.55);
  assert.equal((state.config as Record<string, unknown>).specialDims, undefined);
  assert.equal((state.config as Record<string, unknown>).connectorSpecialDims, undefined);
});

test('normalizeCornerWingState reads corner config and removed doors from meta snapshot, not stale App maps', () => {
  const App = createApp({
    buildUi: {
      cornerWidth: 180,
      cornerHeight: 225,
      cornerDepth: 70,
      cornerDoors: 2,
      cornerConnectorEnabled: true,
    },
    config: {
      removedDoorsMap: {
        removed_lower_corner_pent_door_2_full: true,
      },
      cornerConfiguration: {
        stackSplitLower: {
          layout: 'hanging_top2',
          specialDims: { widthCm: 190, depthCm: 80 },
        },
      },
    },
    maps: {
      removedDoorsMap: {
        removed_lower_corner_pent_door_2_full: true,
      },
    },
  });

  const state = normalizeCornerWingState({
    App,
    mainW: 1.8,
    mainH: 1.0,
    mainD: 0.6,
    woodThick: 0.018,
    startY: 0,
    meta: {
      stackKey: 'bottom',
      stackSplitEnabled: true,
      cfgSnapshot: {
        removedDoorsMap: {},
        cornerConfiguration: {
          stackSplitLower: {
            layout: 'shelves',
            specialDims: { widthCm: 130, depthCm: 55 },
          },
        },
      },
    },
  });

  assert.equal(state.config.layout, 'shelves');
  assert.equal(state.wingLengthCM, 130);
  assert.equal(state.wingD, 0.55);
  assert.equal(state.__isDoorRemoved('corner_pent_door_2'), false);
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
    meta: { stackKey: 'top', stackSplitEnabled: true, cfgSnapshot: {} },
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

test('normalizeCornerWingState rejects a missing config snapshot instead of reading App.store', () => {
  const App = createApp({ config: { cornerConfiguration: { layout: 'storage' } } });

  assert.throws(
    () =>
      normalizeCornerWingState({
        App,
        mainW: 2,
        mainH: 2.2,
        mainD: 0.6,
        woodThick: 0.018,
        startY: 0,
        meta: null,
      }),
    /cfgSnapshot is required/
  );
});
