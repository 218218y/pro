import test from 'node:test';
import assert from 'node:assert/strict';

import { applyMaterials } from '../esm/native/builder/materials_apply.ts';
import { makeDrawerBoxPartId } from '../esm/native/features/drawer_box_identity.ts';
import { readPartColorEntry } from '../esm/native/builder/materials_apply_color_policy.ts';
function createApp(triggerRenderAvailable = true) {
  const calls: unknown[] = [];
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
        materials: {
          getMaterial(color: string) {
            calls.push(['getMaterial', color]);
            return appliedMaterial;
          },
        },
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
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
  return { App, calls, targetMesh, appliedMaterial };
}

test('materials apply runtime: changed materials route handle/render follow-through through the canonical refresh seam', () => {
  const { App, calls, targetMesh, appliedMaterial } = createApp(true);

  assert.equal(applyMaterials(App), true);
  assert.equal(targetMesh.material, appliedMaterial);
  assert.deepEqual(calls, [
    ['getMaterial', 'white'],
    ['handles', { triggerRender: false }],
    ['platform-render', false],
  ]);
});

test('materials apply runtime: changed materials fall back to ensureRenderLoop when platform triggerRender is unavailable', () => {
  const { App, calls, targetMesh, appliedMaterial } = createApp(false);

  assert.equal(applyMaterials(App), true);
  assert.equal(targetMesh.material, appliedMaterial);
  assert.deepEqual(calls, [
    ['getMaterial', 'white'],
    ['handles', { triggerRender: false }],
    ['ensureRenderLoop'],
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

  assert.equal(applyMaterials(App), true);
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
  assert.equal(applyMaterials(App), true);
  assert.equal(drawerBoxChild.material, boxPaint);
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

  assert.equal(applyMaterials(App), true);
  assert.equal(splitDoorMesh.material, oakMat);
  assert.equal(
    calls.some(call => Array.isArray(call) && call[0] === 'getMaterial' && call[1] === 'oak'),
    true
  );
});
