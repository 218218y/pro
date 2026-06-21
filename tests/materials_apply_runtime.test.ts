import test from 'node:test';
import assert from 'node:assert/strict';

import { applyMaterials } from '../esm/native/builder/materials_apply.ts';
import { makeDrawerBoxPartId } from '../esm/native/features/drawer_box_identity.ts';
import { readPartColorEntry } from '../esm/native/builder/material_color_lookup.ts';

function applyMaterialsFromState(App: any) {
  const state = App.store.getState();
  const ui = state.ui || {};
  const cfg = state.config || {};
  return applyMaterials(App, {
    ui,
    cfg,
    materialSnapshot: { cfgSnapshot: cfg, sketchMode: state.runtime?.sketchMode === true },
    removeDoorsEnabled: state.ui?.removeDoorsEnabled === true || state.mode?.primary === 'remove_door',
  });
}
function createApp(triggerRenderAvailable = true) {
  const calls: unknown[] = [];
  const addOutlines = () => undefined;
  const appliedMaterial = { id: 'front:white' };
  const targetMesh = {
    isMesh: true,
    userData: { partId: 'front_panel' },
    material: { id: 'old' },
    children: [],
  };
  const App: any = {
    services: {
      builder: {
        renderOps: {
          createOutlineBinding() {
            return addOutlines;
          },
        },
        materials: {
          getMaterial(color: string) {
            calls.push(['getMaterial', color]);
            return appliedMaterial;
          },
        },
        handles: {
          applyHandles(opts?: { triggerRender?: boolean; cfgSnapshot?: Record<string, unknown> }) {
            calls.push(['handles', opts ?? null]);
          },
        },
      },
      platform: {
        ...(triggerRenderAvailable
          ? {
              triggerRender(updateShadows?: boolean) {
                calls.push(['platform-render', !!updateShadows]);
                return true;
              },
            }
          : {}),
        ensureRenderLoop() {
          calls.push(['ensureRenderLoop']);
          return true;
        },
      },
    },
    store: {
      getState() {
        return {
          ui: { colorChoice: 'white', customColor: '#ffffff', raw: {} },
          config: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    render: {
      wardrobeGroup: {
        children: [targetMesh],
      },
    },
  };
  return { App, calls, targetMesh, appliedMaterial, addOutlines };
}

test('materials apply runtime: changed materials route handle/render follow-through through the canonical refresh seam', () => {
  const { App, calls, targetMesh, appliedMaterial, addOutlines } = createApp(true);

  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(targetMesh.material, appliedMaterial);
  assert.deepEqual(calls, [
    ['getMaterial', 'white'],
    ['handles', { triggerRender: false, cfgSnapshot: {}, addOutlines, removeDoorsEnabled: false }],
    ['platform-render', false],
  ]);
});

test('materials apply runtime: changed materials fall back to ensureRenderLoop when platform triggerRender is unavailable', () => {
  const { App, calls, targetMesh, appliedMaterial, addOutlines } = createApp(false);

  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(targetMesh.material, appliedMaterial);
  assert.deepEqual(calls, [
    ['getMaterial', 'white'],
    ['handles', { triggerRender: false, cfgSnapshot: {}, addOutlines, removeDoorsEnabled: false }],
    ['ensureRenderLoop'],
  ]);
});

test('materials apply runtime forwards captured remove-door policy to handle refresh', () => {
  const { App, calls, addOutlines } = createApp(true);
  App.store.getState = () => ({
    ui: { colorChoice: 'white', customColor: '#ffffff', removeDoorsEnabled: true, raw: {} },
    config: { removedDoorsMap: { removed_d1_full: true } },
    runtime: {},
    mode: { primary: 'none' },
    meta: {},
  });

  assert.equal(applyMaterialsFromState(App), true);
  assert.deepEqual(calls[1], [
    'handles',
    {
      triggerRender: false,
      cfgSnapshot: { removedDoorsMap: { removed_d1_full: true } },
      addOutlines,
      removeDoorsEnabled: true,
    },
  ]);
});

test('materials apply runtime: drawer boxes keep independent white material unless directly painted', () => {
  const calls: unknown[] = [];
  const frontPaint = { id: 'front-paint' };
  const whiteBox = { id: 'drawer-box-white' };
  const boxPaint = { id: 'drawer-box-paint' };
  const frontMesh = {
    isMesh: true,
    userData: { partId: 'drawer_1' },
    material: { id: 'old-front' },
    children: [],
  };
  const drawerBoxPartId = makeDrawerBoxPartId('drawer_1');
  const drawerBoxChild = {
    isMesh: true,
    userData: {},
    material: { id: 'old-box' },
    children: [],
  };
  const drawerBoxGroup = {
    isMesh: false,
    userData: { partId: drawerBoxPartId },
    children: [drawerBoxChild],
  };
  const App: any = {
    services: {
      builder: {
        renderOps: {
          createOutlineBinding() {
            return () => undefined;
          },
        },
        materials: {
          getMaterial(color: string, part: string) {
            calls.push(['getMaterial', color, part]);
            if (color === '#884422') return frontPaint;
            if (color === '#226688') return boxPaint;
            if (color === '#ffffff' && part === 'body') return whiteBox;
            return { id: `global:${color}:${part}` };
          },
        },
        handles: { applyHandles() {} },
      },
      platform: { triggerRender() {} },
    },
    store: {
      getState() {
        return {
          ui: { colorChoice: '#445566', customColor: '#ffffff', raw: {} },
          config: {
            isMultiColorMode: true,
            individualColors: { drawer_1: '#884422' },
          },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    render: { wardrobeGroup: { children: [frontMesh, drawerBoxGroup] } },
  };

  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(frontMesh.material, frontPaint);
  assert.equal(drawerBoxChild.material, whiteBox);
  assert.deepEqual(
    calls.filter(call => Array.isArray(call) && call[1] === '#226688'),
    []
  );

  App.store.getState = () => ({
    ui: { colorChoice: '#445566', customColor: '#ffffff', raw: {} },
    config: {
      isMultiColorMode: true,
      individualColors: { drawer_1: '#884422', [drawerBoxPartId]: '#226688' },
    },
    runtime: {},
    mode: {},
    meta: {},
  });
  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(drawerBoxChild.material, boxPaint);
});

test('materials apply runtime resolves global custom texture from canonical cfg only', () => {
  const calls: unknown[][] = [];
  const textureMat = { id: 'front:texture' };
  const colorMat = { id: 'front:custom-color' };
  const targetMesh = {
    isMesh: true,
    userData: { partId: 'front_panel' },
    material: { id: 'old' },
    children: [],
  };
  const App: any = {
    services: {
      builder: {
        materials: {
          getMaterial(color: string, part: string, useTexture?: boolean, textureDataURL?: string | null) {
            calls.push(['getMaterial', color, part, !!useTexture, textureDataURL ?? null]);
            return useTexture ? textureMat : colorMat;
          },
        },
        handles: { applyHandles() {} },
      },
      platform: { triggerRender() {} },
      texturesCache: {
        customUploadedTexture: { uuid: 'stale-live-cache-texture' },
      },
    },
    store: {
      getState() {
        return {
          ui: { colorChoice: 'custom', customColor: '#123456', raw: {} },
          config: { customUploadedDataURL: 'data:cfg-texture' },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    render: { wardrobeGroup: { children: [targetMesh] } },
  };

  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(targetMesh.material, textureMat);
  assert.deepEqual(calls[0], ['getMaterial', 'custom', 'front', true, 'data:cfg-texture']);
});

test('materials apply runtime does not promote stale live custom texture cache without cfg data URL', () => {
  const calls: unknown[][] = [];
  const colorMat = { id: 'front:custom-color' };
  const targetMesh = {
    isMesh: true,
    userData: { partId: 'front_panel' },
    material: { id: 'old' },
    children: [],
  };
  const App: any = {
    services: {
      builder: {
        materials: {
          getMaterial(color: string, part: string, useTexture?: boolean, textureDataURL?: string | null) {
            calls.push(['getMaterial', color, part, !!useTexture, textureDataURL ?? null]);
            return colorMat;
          },
        },
        handles: { applyHandles() {} },
      },
      platform: { triggerRender() {} },
      texturesCache: {
        customUploadedTexture: { uuid: 'stale-live-cache-texture' },
      },
    },
    store: {
      getState() {
        return {
          ui: { colorChoice: 'custom', customColor: '#123456', raw: {} },
          config: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    render: { wardrobeGroup: { children: [targetMesh] } },
  };

  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(targetMesh.material, colorMat);
  assert.deepEqual(calls[0], ['getMaterial', '#123456', 'front', false, null]);
});

test('materials apply color policy inherits full-door paint for split door segments during no-build refresh', () => {
  const colors = { d1_full: 'oak', d2_full: 'walnut' };

  assert.equal(
    readPartColorEntry({ individualColors: colors, isMulti: true, partId: 'd1_top', stackKey: null }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({ individualColors: colors, isMulti: true, partId: 'd1_mid2', stackKey: null }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({ individualColors: colors, isMulti: true, partId: 'd2_bot', stackKey: null }),
    'walnut'
  );
});

test('materials apply color policy inherits free-box full-door paint for split segments', () => {
  const basePartId = 'sketch_box_free_0_boxColor_door_main';
  const colors = { [basePartId]: 'oak', [`${basePartId}_full`]: 'walnut' };

  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: `${basePartId}_top`,
      stackKey: null,
    }),
    'walnut'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: { [basePartId]: 'oak' },
      isMulti: true,
      partId: `${basePartId}_bot`,
      stackKey: null,
    }),
    'oak'
  );
});

test('materials apply color policy maps corner wing roof meshes to the canonical wing ceiling color only', () => {
  const colors = {
    corner_ceil: 'oak',
    lower_corner_ceil: 'walnut',
    corner_pent_ceil: 'pentagon-red',
  };

  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_wing_ceil',
      stackKey: 'top',
    }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_cell_top_c1',
      stackKey: 'top',
    }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_wing_ceil',
      stackKey: 'bottom',
    }),
    'walnut'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_pent_ceil',
      stackKey: 'top',
    }),
    'pentagon-red'
  );
});

test('materials apply color policy keeps unified corner frame paint canonical while previewing lower outer boards', () => {
  const colors = {
    corner_ceil: 'oak',
    corner_wing_side_left: 'oak',
    corner_wing_side_right: 'oak',
    corner_floor: 'oak',
    lower_corner_wing_side_left: 'wrong',
    lower_corner_floor: 'wrong',
  };

  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_wing_side_left',
      stackKey: 'bottom',
      stackSplitUnifiedFrame: true,
    }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_floor',
      stackKey: 'bottom',
      stackSplitUnifiedFrame: true,
    }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_floor',
      stackKey: 'top',
      stackSplitUnifiedFrame: true,
    }),
    undefined
  );
});

test('materials apply color policy treats legacy unified corner paint as upper split-frame paint after frame split', () => {
  const colors = {
    corner_ceil: 'oak',
    corner_wing_side_left: 'oak',
    corner_wing_side_right: 'oak',
    lower_corner_wing_side_left: 'oak',
    lower_corner_wing_side_right: 'oak',
    lower_corner_floor: 'oak',
  };

  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_floor',
      stackKey: 'top',
      stackSplitUnifiedFrame: false,
    }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_wing_side_left',
      stackKey: 'bottom',
      stackSplitUnifiedFrame: false,
    }),
    undefined
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_floor',
      stackKey: 'bottom',
      stackSplitUnifiedFrame: false,
    }),
    undefined
  );
});

test('materials apply color policy treats legacy unified pentagon paint as upper split-frame paint after frame split', () => {
  const colors = {
    corner_pent_ceil: 'oak',
    corner_pent_attach_main: 'oak',
    corner_pent_attach_wing: 'oak',
    lower_corner_pent_attach_main: 'oak',
    lower_corner_pent_attach_wing: 'oak',
    lower_corner_pent_floor: 'oak',
  };

  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_pent_floor',
      stackKey: 'top',
      stackSplitUnifiedFrame: false,
    }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_pent_attach_main',
      stackKey: 'bottom',
      stackSplitUnifiedFrame: false,
    }),
    undefined
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_pent_floor',
      stackKey: 'bottom',
      stackSplitUnifiedFrame: false,
    }),
    undefined
  );
});

test('materials apply runtime refreshes the visible corner wing roof from corner_ceil without painting the pentagon roof', () => {
  const calls: unknown[] = [];
  const wingRoofMat = { id: 'front:wing-roof' };
  const pentagonRoofMat = { id: 'front:pentagon-roof' };
  const globalMat = { id: 'front:white' };
  const wingRoofMesh = {
    isMesh: true,
    userData: { partId: 'corner_wing_ceil' },
    material: { id: 'old-wing-roof' },
    children: [],
  };
  const pentagonRoofMesh = {
    isMesh: true,
    userData: { partId: 'corner_pent_ceil' },
    material: { id: 'old-pentagon-roof' },
    children: [],
  };
  const App: any = {
    services: {
      builder: {
        materials: {
          getMaterial(color: string) {
            calls.push(['getMaterial', color]);
            if (color === '#aa5500') return wingRoofMat;
            if (color === '#cc0000') return pentagonRoofMat;
            return globalMat;
          },
        },
        handles: { applyHandles() {} },
      },
      platform: { triggerRender() {} },
    },
    store: {
      getState() {
        return {
          ui: { colorChoice: 'white', customColor: '#ffffff', raw: {} },
          config: {
            isMultiColorMode: true,
            individualColors: {
              corner_ceil: '#aa5500',
              corner_pent_ceil: '#cc0000',
            },
          },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    render: { wardrobeGroup: { children: [wingRoofMesh, pentagonRoofMesh] } },
  };

  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(wingRoofMesh.material, wingRoofMat);
  assert.equal(pentagonRoofMesh.material, pentagonRoofMat);
  assert.equal(
    calls.some(call => Array.isArray(call) && call[0] === 'getMaterial' && call[1] === '#aa5500'),
    true
  );
});

test('materials apply runtime keeps inherited full-door paint on split segment meshes after another color refresh', () => {
  const calls: unknown[] = [];
  const oakMat = { id: 'front:oak' };
  const globalMat = { id: 'front:white' };
  const splitDoorMesh = {
    isMesh: true,
    userData: { partId: 'd1_top' },
    material: { id: 'old' },
    children: [],
  };
  const App: any = {
    services: {
      builder: {
        materials: {
          getMaterial(color: string) {
            calls.push(['getMaterial', color]);
            return color === 'oak' ? oakMat : globalMat;
          },
        },
        handles: { applyHandles() {} },
      },
      platform: { triggerRender() {} },
    },
    store: {
      getState() {
        return {
          ui: { colorChoice: 'white', customColor: '#ffffff', raw: {} },
          config: {
            isMultiColorMode: true,
            individualColors: { d1_full: 'oak', d2_top: 'walnut' },
          },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    render: { wardrobeGroup: { children: [splitDoorMesh] } },
  };

  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(splitDoorMesh.material, oakMat);
  assert.equal(
    calls.some(call => Array.isArray(call) && call[0] === 'getMaterial' && call[1] === 'oak'),
    true
  );
});

test('materials apply runtime reads individual colors from canonical config instead of legacy maps', () => {
  const calls: unknown[] = [];
  const canonicalMat = { id: 'front:canonical' };
  const legacyMat = { id: 'front:legacy' };
  const globalMat = { id: 'front:white' };
  const targetMesh = {
    isMesh: true,
    userData: { partId: 'front_panel' },
    material: { id: 'old' },
    children: [],
  };
  const App: any = {
    services: {
      builder: {
        materials: {
          getMaterial(color: string) {
            calls.push(['getMaterial', color]);
            if (color === '#123456') return canonicalMat;
            if (color === '#654321') return legacyMat;
            return globalMat;
          },
        },
        handles: { applyHandles() {} },
      },
      platform: { triggerRender() {} },
    },
    maps: {
      getMap(name: string) {
        return name === 'individualColors' ? { front_panel: '#654321' } : {};
      },
    },
    store: {
      getState() {
        return {
          ui: { colorChoice: '#ffffff', customColor: '#ffffff', raw: {} },
          config: {
            isMultiColorMode: true,
            individualColors: { front_panel: '#123456' },
          },
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
    render: { wardrobeGroup: { children: [targetMesh] } },
  };

  assert.equal(applyMaterialsFromState(App), true);
  assert.equal(targetMesh.material, canonicalMat);
  assert.equal(
    calls.some(call => Array.isArray(call) && call[0] === 'getMaterial' && call[1] === '#654321'),
    false
  );
});
