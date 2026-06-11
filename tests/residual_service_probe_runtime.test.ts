import test from 'node:test';
import assert from 'node:assert/strict';

import { buildChestModeIfNeeded } from '../esm/native/builder/chest_mode_pipeline.ts';
import { applyMaterials } from '../esm/native/builder/materials_apply.ts';
import { finalizeBuildBestEffort } from '../esm/native/builder/post_build_finalize.ts';
import {
  applyBuilderHandles,
  finalizeBuilderRegistry,
} from '../esm/native/runtime/builder_service_access.ts';
import { getProjectIoServiceMaybe } from '../esm/native/runtime/project_io_access.ts';
import { getSceneViewServiceMaybe } from '../esm/native/services/scene_view_access.ts';

test('residual slot access runtime: scene/project seams and chest-mode builder helpers stay canonical', () => {
  const calls: unknown[] = [];
  const sceneView = { updateSceneMode: () => void 0 };
  const projectIO = { loadProjectData: () => 'loaded' };
  const App: any = {
    services: Object.assign(Object.create(null), {
      sceneView,
      projectIO,
      builder: {
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(['handles', opts ?? null]);
          },
        },
        registry: {
          finalize() {
            calls.push('finalize');
          },
        },
      },
    }),
    render: {
      renderer: {
        render(scene: unknown, camera: unknown) {
          calls.push(['render', !!scene, !!camera]);
        },
      },
      scene: {},
      camera: {},
      controls: {
        update() {
          calls.push('controls');
        },
      },
    },
  };

  assert.equal(getSceneViewServiceMaybe(App), sceneView);
  assert.equal(getProjectIoServiceMaybe(App), projectIO);
  assert.equal(applyBuilderHandles(App), true);
  assert.equal(finalizeBuilderRegistry(App), true);
  assert.deepEqual(calls, [['handles', null], 'finalize']);

  calls.length = 0;
  const built: unknown[] = [];
  assert.equal(
    buildChestModeIfNeeded({
      App,
      ui: { isChestMode: true, baseType: 'floor', colorChoice: 'white', customColor: '' },
      widthCm: 100,
      heightCm: 120,
      depthCm: 50,
      drawersCount: 4,
      buildChestOnly(args) {
        built.push(args);
      },
    }),
    true
  );

  assert.equal(built.length, 1);
  assert.deepEqual(calls, [
    ['handles', { triggerRender: false }],
    ['render', true, true],
    'controls',
    'finalize',
  ]);
});

test('residual slot access runtime: applyBuilderHandles forwards render suppression opts to the canonical handles service', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(opts ?? null);
          },
        },
      },
    },
  };

  assert.equal(applyBuilderHandles(App, { triggerRender: false }), true);
  assert.deepEqual(calls, [{ triggerRender: false }]);
});

test('residual slot access runtime: post-build finalize uses canonical builder/platform seams and ignores legacy builder root aliases', () => {
  const calls: unknown[] = [];
  const scene = { tag: 'scene' };
  const App: any = {
    services: {
      builder: {
        buildUi: { raw: { busy: true } },
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(['handles', opts ?? null]);
          },
        },
        registry: {
          finalize() {
            calls.push('finalize');
          },
        },
      },
    },
    builder: {
      handles: {
        applyHandles(opts?: { triggerRender?: boolean }) {
          calls.push(['legacy-handles', opts ?? null]);
        },
      },
      registry: {
        finalize() {
          calls.push('legacy-finalize');
        },
      },
    },
    render: { scene },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.push(['platform-render', !!updateShadows]);
      },
    },
  };

  finalizeBuildBestEffort({
    App,
    pruneCachesSafe(root) {
      calls.push(['prune', root]);
    },
    rebuildDrawerMeta() {
      calls.push('rebuildDrawerMeta');
    },
  });

  assert.equal(App.services.builder.buildUi, null);
  assert.deepEqual(calls, [
    'finalize',
    'rebuildDrawerMeta',
    ['handles', { triggerRender: false }],
    ['prune', scene],
    ['platform-render', true],
  ]);
});

test('residual slot access runtime: materials apply uses canonical builder handles and platform render seams', () => {
  const calls: unknown[] = [];
  const appliedMaterial = { id: 'front:white' };
  const targetMesh = {
    isMesh: true,
    userData: { partId: 'front_panel' },
    material: { id: 'old' },
    children: [],
  };
  const wardrobeGroup = {
    children: [targetMesh],
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
    },
    builder: {
      handles: {
        applyHandles(opts?: { triggerRender?: boolean }) {
          calls.push(['legacy-handles', opts ?? null]);
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
      wardrobeGroup,
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.push(['platform-render', !!updateShadows]);
      },
    },
  };

  assert.equal(applyMaterials(App), true);
  assert.equal(targetMesh.material, appliedMaterial);
  assert.deepEqual(calls, [
    ['getMaterial', 'white'],
    ['handles', { triggerRender: false }],
    ['platform-render', false],
  ]);
});

test('residual slot access runtime: materials apply skips handles/render churn when wardrobe materials are already canonical', () => {
  const calls: unknown[] = [];
  const appliedMaterial = { id: 'front:white' };
  const targetMesh = {
    isMesh: true,
    userData: { partId: 'front_panel' },
    material: appliedMaterial,
    children: [],
  };
  const wardrobeGroup = {
    children: [targetMesh],
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
      wardrobeGroup,
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.push(['platform-render', !!updateShadows]);
      },
    },
  };

  assert.equal(applyMaterials(App), true);
  assert.equal(targetMesh.material, appliedMaterial);
  assert.deepEqual(calls, [['getMaterial', 'white']]);
});
