import test from 'node:test';
import assert from 'node:assert/strict';

import { installBuildReactionsService } from '../esm/native/services/build_reactions.ts';

type AnyRecord = Record<string, unknown>;

test('build reactions routes lighting refresh through services.sceneView (not App.scene)', () => {
  const calls: AnyRecord[] = [];
  const App: AnyRecord = {
    services: {
      sceneView: {
        syncFromStore: (opts: AnyRecord) => calls.push({ op: 'syncFromStore', opts }),
      },
    },
    store: {
      getState: () => ({
        ui: { cornerMode: false, cornerSide: 'right', raw: {} },
      }),
    },
    render: {},
    scene: {
      updateLights: () => {
        throw new Error('legacy App.scene.updateLights should not be used');
      },
    },
  };

  const svc = installBuildReactionsService(App as any);
  svc.afterBuild?.(true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.op, 'syncFromStore');
  assert.equal(calls[0]?.opts?.reason, 'buildReactions:afterBuild');
  assert.equal(calls[0]?.opts?.force, true);
  assert.equal(calls[0]?.opts?.updateShadows, true);
});

type CameraVector = { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };

type ControlsTarget = { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };

function createVec3(x: number, y: number, z: number): CameraVector {
  return {
    x,
    y,
    z,
    set(nx: number, ny: number, nz: number) {
      this.x = nx;
      this.y = ny;
      this.z = nz;
    },
  };
}

function createCameraApp(ui: AnyRecord) {
  const position = createVec3(99, 99, 99);
  const target = createVec3(88, 88, 88) as ControlsTarget;
  const App: AnyRecord = {
    services: {
      sceneView: {
        syncFromStore: () => true,
      },
    },
    store: {
      getState: () => ({ ui }),
    },
    render: {
      camera: {
        position,
        updateProjectionMatrix: () => void 0,
      },
      controls: {
        target,
        update: () => void 0,
      },
    },
  };
  return { App, position, target };
}

test('build reactions snaps chest mode camera after build using the canonical render surface', () => {
  const { App, position, target } = createCameraApp({ isChestMode: true, cornerMode: false, raw: {} });
  const svc = installBuildReactionsService(App as any);

  svc.afterBuild?.(true);

  assert.deepEqual({ x: position.x, y: position.y, z: position.z }, { x: 0, y: 0.7, z: 2.5 });
  assert.deepEqual({ x: target.x, y: target.y, z: target.z }, { x: 0, y: 0.55, z: 0 });
});

test('build reactions keeps corner side specific camera presets after build', () => {
  const { App, position, target } = createCameraApp({
    cornerMode: true,
    cornerSide: 'left',
    raw: { width: 160 },
  });
  const svc = installBuildReactionsService(App as any);

  svc.afterBuild?.(true);

  assert.equal(position.x > 0, true);
  assert.equal(target.x < 0, true);
});
