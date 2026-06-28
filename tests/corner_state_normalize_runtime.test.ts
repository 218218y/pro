import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCornerWingState } from '../esm/native/builder/corner_state_normalize.js';
import { resolveCornerWingFlags } from '../esm/native/builder/corner_state_normalize_layout.ts';
import { createCornerWingEmitContext } from '../esm/native/builder/corner_wing_context.js';
import { CARCASS_BASE_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

const normalRenderPolicy = { sketchMode: false, addOutlines: () => undefined };
const sketchRenderPolicy = { sketchMode: true, addOutlines: () => undefined };

test('corner flags reject the retired removeDoors alias and use canonical UI/mode snapshots', () => {
  const legacyOnly = resolveCornerWingFlags({
    uiAny: { removeDoors: true } as any,
    primaryMode: 'none',
    __stackKey: 'top',
    __stackSplitEnabled: false,
  });
  const canonical = resolveCornerWingFlags({
    uiAny: { removeDoorsEnabled: true },
    primaryMode: 'none',
    __stackKey: 'top',
    __stackSplitEnabled: false,
  });
  const legacyStringToggle = resolveCornerWingFlags({
    uiAny: { removeDoorsEnabled: '1' as any },
    primaryMode: 'none',
    __stackKey: 'top',
    __stackSplitEnabled: false,
  });

  assert.equal(legacyOnly.removeDoorsEnabled, false);
  assert.equal(canonical.removeDoorsEnabled, true);
  assert.equal(legacyStringToggle.removeDoorsEnabled, false);
});

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
    mainW: 2.4,
    mainH: 2.2,
    mainD: 0.6,
    woodThick: 0.018,
    startY: 1.05,
    meta: {
      stackKey: 'bottom',
      stackSplitEnabled: true,
      stackOffsetZ: 0.11,
      snapshot: {
        ui: {
          cornerWidth: '140',
          cornerHeight: '230',
          cornerDepth: '65',
          cornerSide: 'right',
          baseType: 'legs',
          cornerCabinetWallLenCm: 120,
        },
        cfg: {
          removedDoorsMap: {
            removed_corner_pent_door_1_full: true,
            removed_lower_corner_pent_door_2_full: true,
          },
          corner: {
            layout: 'storage',
            customData: { shelves: [true], rods: [true], storage: true },
          },
        },
        primaryMode: 'none',
        renderPolicy: normalRenderPolicy,
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
    mainW: 1.6,
    mainH: 0.8,
    mainD: 0.55,
    woodThick: 0.017,
    startY: 0,
    meta: {
      stackKey: 'bottom',
      stackSplitEnabled: true,
      snapshot: {
        ui: {
          cornerWidth: 140,
          cornerHeight: 220,
          cornerDepth: 65,
          cornerDoors: 3,
          cornerConnectorEnabled: true,
          raw: { cornerDoors: 3, stackSplitLowerDepth: 55, stackSplitLowerWidth: 160 },
        },
        cfg: {
          cornerConfiguration: {
            layout: 'shelves',
            specialDims: { baseWidthCm: 140, widthCm: 140, depthCm: 70 },
            connectorSpecialDims: { widthCm: 115 },
            modulesConfiguration: [{ specialDims: { baseWidthCm: 80, widthCm: 80 } }],
          },
        },
        primaryMode: 'none',
        renderPolicy: normalRenderPolicy,
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
    mainW: 1.8,
    mainH: 1.0,
    mainD: 0.6,
    woodThick: 0.018,
    startY: 0,
    meta: {
      stackKey: 'bottom',
      stackSplitEnabled: true,
      snapshot: {
        ui: {
          cornerWidth: 180,
          cornerHeight: 225,
          cornerDepth: 70,
          cornerDoors: 2,
          cornerConnectorEnabled: true,
        },
        cfg: {
          removedDoorsMap: {},
          cornerConfiguration: {
            stackSplitLower: {
              layout: 'shelves',
              specialDims: { widthCm: 130, depthCm: 55 },
            },
          },
        },
        primaryMode: 'none',
        renderPolicy: normalRenderPolicy,
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
    mainW: 2.0,
    mainH: 1.4,
    mainD: 0.55,
    woodThick: 0.018,
    startY: 1.2,
    meta: {
      stackKey: 'top',
      stackSplitEnabled: true,
      snapshot: {
        ui: {
          cornerWidth: 160,
          cornerHeight: 240,
          cornerDepth: 70,
          cornerSide: 'left',
          baseType: 'plinth',
          groovesEnabled: false,
          removeDoorsEnabled: false,
          hasCornice: true,
        },
        cfg: {},
        primaryMode: 'remove_door',
        renderPolicy: sketchRenderPolicy,
      },
    },
  });

  assert.equal(state.__sketchMode, true);
  assert.equal(state.cornerSide, 'left');
  assert.equal(state.__mirrorX, -1);
  assert.equal(state.baseType, 'none');
  assert.equal(state.baseH, 0);
  assert.equal(state.removeDoorsEnabled, true);
  assert.equal(state.__corniceAllowedForThisStack, true);
  assert.ok(state.wingH >= 1.19);
  assert.equal((App as any).render, undefined);
});

test('corner wing keeps the internal-drawers UI flag through normalize and emit context', () => {
  const state = normalizeCornerWingState({
    mainW: 2.0,
    mainH: 2.2,
    mainD: 0.6,
    woodThick: 0.018,
    startY: 0,
    meta: {
      snapshot: {
        ui: {
          cornerWidth: 160,
          cornerHeight: 230,
          cornerDepth: 60,
          internalDrawersEnabled: true,
        },
        cfg: {},
        primaryMode: 'none',
        renderPolicy: sketchRenderPolicy,
      },
    },
  });

  assert.equal(state.internalDrawersEnabled, true);

  const context = createCornerWingEmitContext({
    App: {},
    THREE: {},
    mainW: 2.0,
    mainH: 2.2,
    mainD: 0.6,
    woodThick: 0.018,
    startY: 0,
    state,
    mats: {
      masoniteMat: {},
      whiteMat: {},
      shadowMat: {},
      backPanelMaterialArray: [],
      ghostDoorMat: {},
      individualColors: {},
      handlesMap: {},
      doorSpecialMap: {},
      readScopedMapVal: () => undefined,
      readScopedReader: () => undefined,
      getMirrorMat: () => null,
      resolveSpecial: () => null,
      getCornerMat: (_partId: string, material: unknown) => material,
      getCornerShelfMat: (_partId: string, _isBrace: boolean, material: unknown) => material,
      defaultShelfMat: {},
      braceShelfMat: {},
      bodyMat: {},
      frontMat: {},
    } as any,
    services: {
      addOutlines: () => undefined,
      createDoorVisual: () => ({}),
      getMaterial: () => ({}),
      createInternalDrawerBox: () => ({}),
      addRealisticHanger: () => undefined,
      addHangingClothes: () => undefined,
      addFoldedClothes: () => undefined,
      __applyStableShadowsToModule: () => undefined,
    } as any,
    readers: {
      getMap: () => null,
      getGroove: () => null,
      getCurtain: () => null,
    } as any,
    wingGroup: {},
  });

  assert.equal(context.internalDrawersEnabled, true);
});

test('normalizeCornerWingState rejects a missing config snapshot instead of reading App.store', () => {
  const App = createApp({ config: { cornerConfiguration: { layout: 'storage' } } });

  assert.throws(
    () =>
      normalizeCornerWingState({
        mainW: 2,
        mainH: 2.2,
        mainD: 0.6,
        woodThick: 0.018,
        startY: 0,
        meta: {
          snapshot: {
            ui: {},
            cfg: null as never,
            primaryMode: 'none',
            renderPolicy: normalRenderPolicy,
          },
        },
      }),
    /cfgSnapshot is required/
  );
});

test('normalizeCornerWingState carries leg platform stage dimensions for corner wardrobes', () => {
  const platformH = CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  const state = normalizeCornerWingState({
    mainW: 2.0,
    mainH: 2.2,
    mainD: 0.6,
    woodThick: 0.018,
    startY: 0.12 + platformH,
    meta: {
      snapshot: {
        ui: {
          cornerWidth: 160,
          cornerHeight: 230,
          cornerDepth: 60,
          baseType: 'legs',
          baseLegHeightCm: 12,
          baseLegPlatformMode: 'stage',
          baseLegPlatformSideMode: 'flush',
          baseLegPlatformFrontOverhangCm: 4,
        },
        cfg: {},
        primaryMode: 'none',
        renderPolicy: normalRenderPolicy,
      },
    },
  });

  assert.equal(state.baseType, 'legs');
  assert.equal(state.baseLegPlatformMode, 'stage');
  assert.equal(state.baseLegPlatformSideMode, 'flush');
  assert.equal(state.baseH, 0.12 + platformH);
  assert.equal(state.stackOffsetY, 0);
  assert.equal(state.baseLegHeightM, 0.12);
  assert.equal(state.baseLegBottomPlatformHeightM, platformH);
  assert.equal(state.baseLegTopPlatformHeightM, platformH);
  assert.ok(Math.abs(state.baseLegPlatformFrontOverhangM - 0.04) < 1e-9);
});
