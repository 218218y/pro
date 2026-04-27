import test from 'node:test';
import assert from 'node:assert/strict';

import { applyMaterials } from '../esm/native/builder/materials_apply.ts';

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
