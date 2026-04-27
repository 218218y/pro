import test from 'node:test';
import assert from 'node:assert/strict';

import { installSceneViewService } from '../esm/native/services/scene_view.ts';

type AnyRecord = Record<string, unknown>;

type StoreSelectorListener<T> = (selected: T, previous: T) => void;

type StoreStub = {
  getState: () => AnyRecord;
  patch: (payload: AnyRecord) => void;
  subscribeSelector: <T>(
    selector: (state: AnyRecord) => T,
    fn: StoreSelectorListener<T>,
    opts?: { equalityFn?: (a: T, b: T) => boolean }
  ) => () => void;
  subscribeState: () => never;
};

function makeStore(state: AnyRecord): StoreStub & { listenerCount: () => number } {
  const listeners: Array<{
    selector: (state: AnyRecord) => unknown;
    fn: StoreSelectorListener<unknown>;
    equalityFn: (a: unknown, b: unknown) => boolean;
    hasValue: boolean;
    value: unknown;
  }> = [];
  return {
    getState: () => state,
    patch: payload => {
      if (payload.runtime && typeof payload.runtime === 'object') {
        Object.assign(state.runtime as AnyRecord, payload.runtime as AnyRecord);
      }
      if (payload.ui && typeof payload.ui === 'object') {
        Object.assign(state.ui as AnyRecord, payload.ui as AnyRecord);
      }
      for (const entry of listeners.slice()) {
        const next = entry.selector(state);
        if (!entry.hasValue) {
          entry.hasValue = true;
          entry.value = next;
          entry.fn(next, next);
          continue;
        }
        if (entry.equalityFn(entry.value, next)) continue;
        const prev = entry.value;
        entry.value = next;
        entry.fn(next, prev);
      }
    },
    subscribeSelector: (selector, fn, opts) => {
      const entry = {
        selector: selector as (state: AnyRecord) => unknown,
        fn: fn as StoreSelectorListener<unknown>,
        equalityFn:
          typeof opts?.equalityFn === 'function'
            ? (opts.equalityFn as (a: unknown, b: unknown) => boolean)
            : Object.is,
        hasValue: true,
        value: selector(state),
      };
      listeners.push(entry);
      return () => {
        const idx = listeners.indexOf(entry);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
    subscribeState: () => {
      throw new Error('subscribeState must not be used when subscribeSelector exists');
    },
    listenerCount: () => listeners.length,
  };
}

function flushMicrotasks(): Promise<void> {
  return Promise.resolve().then(() => undefined);
}

function makeSceneViewApp() {
  const renderCalls: Array<{ updateShadows: boolean }> = [];
  const floor = { visible: true };
  const smartFloor = { visible: true };
  const roomGroup = {
    getObjectByName: (name: string) => (name === 'smartFloor' ? smartFloor : null),
  };
  const scene = {
    getObjectByName: (name: string) => {
      if (name === 'floor') return floor;
      if (name === 'App.render.roomGroup') return roomGroup;
      return null;
    },
  };

  const state = {
    ui: {
      lightingControl: false,
      lightAmb: '0.8',
      lightDir: '1.7',
      lightX: '7',
      lightY: '9',
      lightZ: '10',
      cornerMode: false,
      cornerSide: 'right',
      raw: {},
    },
    runtime: { sketchMode: false },
    config: {},
    mode: {},
    meta: {},
  };

  const store = makeStore(state as AnyRecord);
  const App: AnyRecord = {
    store,
    deps: {
      THREE: {
        SRGBColorSpace: 'srgb',
        NeutralToneMapping: 'neutral',
      },
    },
    render: {
      scene,
      ambLightObj: { intensity: 0 },
      dirLightObj: {
        intensity: 0,
        visible: true,
        position: {
          x: 0,
          y: 0,
          z: 0,
          set(x: number, y: number, z: number) {
            this.x = x;
            this.y = y;
            this.z = z;
          },
        },
      },
      renderer: {
        outputColorSpace: 'initial',
        toneMapping: 'initial',
        toneMappingExposure: 1,
        useLegacyLights: false,
        shadowMap: { autoUpdate: false, needsUpdate: false },
      },
    },
    platform: {
      triggerRender: (updateShadows?: boolean) => {
        renderCalls.push({ updateShadows: !!updateShadows });
        return undefined;
      },
    },
    services: {},
  };

  const svc = installSceneViewService(App as any);
  return { App, store, svc, floor, smartFloor, renderCalls };
}

test('scene view store sync reacts to runtime/ui state without React callers', async () => {
  const { App, store, svc, floor, smartFloor, renderCalls } = makeSceneViewApp();
  assert.equal(typeof svc.installStoreSync, 'function');
  assert.equal(svc.installStoreSync?.(), true);

  assert.equal(App.render.ambLightObj.intensity, 0.7);
  assert.equal(App.render.dirLightObj.intensity, 1.45);
  assert.equal(App.render.dirLightObj.visible, true);
  assert.equal(App.render.renderer.shadowMap.needsUpdate, true);
  assert.equal(floor.visible, true);
  assert.equal(smartFloor.visible, true);
  assert.equal(renderCalls.length, 1);

  App.render.renderer.shadowMap.needsUpdate = false;
  renderCalls.length = 0;
  store.patch({ runtime: { sketchMode: true } });
  assert.equal(renderCalls.length, 0);
  await flushMicrotasks();

  assert.equal(App.render.dirLightObj.visible, false);
  assert.equal(App.render.ambLightObj.intensity, 0.95);
  assert.equal(floor.visible, false);
  assert.equal(smartFloor.visible, false);
  assert.equal(App.render.renderer.shadowMap.needsUpdate, true);
  assert.equal(renderCalls.length, 1);

  App.render.renderer.shadowMap.needsUpdate = false;
  renderCalls.length = 0;
  store.patch({
    runtime: { sketchMode: false },
    ui: {
      lightingControl: true,
      lightAmb: '0.8',
      lightDir: '1.7',
      lightX: '7',
      lightY: '9',
      lightZ: '10',
    },
  });
  assert.equal(renderCalls.length, 0);
  await flushMicrotasks();

  assert.equal(App.render.dirLightObj.visible, true);
  assert.equal(App.render.ambLightObj.intensity, 0.8);
  assert.equal(App.render.dirLightObj.intensity, 1.7);
  assert.equal((App.render.dirLightObj.position as AnyRecord).x, 7);
  assert.equal((App.render.dirLightObj.position as AnyRecord).y, 9);
  assert.equal((App.render.dirLightObj.position as AnyRecord).z, 10);
  assert.equal(App.render.renderer.shadowMap.needsUpdate, true);
  assert.equal(renderCalls.length, 1);
});

test('scene view store sync throws when the store does not expose selector subscriptions', () => {
  const App: AnyRecord = {
    store: {
      getState: () => ({ ui: {}, runtime: {}, config: {}, mode: {}, meta: {} }),
    },
    services: {},
    render: {},
    platform: {},
  };
  const svc = installSceneViewService(App as any);
  assert.throws(() => svc.installStoreSync?.(), /Missing store\.subscribeSelector/);
});

test('scene view scheduled sync preserves force requests across microtask coalescing', async () => {
  const { App, svc, renderCalls } = makeSceneViewApp();
  assert.equal(svc.installStoreSync?.(), true);

  App.render.renderer.shadowMap.needsUpdate = false;
  renderCalls.length = 0;
  svc.scheduleSyncFromStore?.({ reason: 'sceneView:test:first' });
  svc.scheduleSyncFromStore?.({ force: true, updateShadows: true, reason: 'sceneView:test:force' });
  assert.equal(renderCalls.length, 0);
  await flushMicrotasks();

  assert.equal(App.render.renderer.shadowMap.needsUpdate, true);
  assert.equal(renderCalls.length, 1);
});

test('scene view direct sync cancels an older pending scheduled flush', async () => {
  const { App, svc, renderCalls } = makeSceneViewApp();
  assert.equal(svc.installStoreSync?.(), true);

  App.render.renderer.shadowMap.needsUpdate = false;
  renderCalls.length = 0;
  svc.scheduleSyncFromStore?.({
    force: true,
    updateShadows: true,
    reason: 'sceneView:test:pending-before-direct',
  });
  svc.syncFromStore?.({ force: true, updateShadows: true, reason: 'sceneView:test:direct' });

  assert.equal(App.render.renderer.shadowMap.needsUpdate, true);
  assert.equal(renderCalls.length, 1);

  await flushMicrotasks();
  assert.equal(renderCalls.length, 1);
});

test('scene view dispose cancels a pending scheduled sync but later manual schedules still work', async () => {
  const { App, svc, renderCalls } = makeSceneViewApp();
  assert.equal(svc.installStoreSync?.(), true);

  App.render.renderer.shadowMap.needsUpdate = false;
  renderCalls.length = 0;
  svc.scheduleSyncFromStore?.({ force: true, updateShadows: true, reason: 'sceneView:test:dispose-cancel' });
  svc.disposeStoreSync?.();
  await flushMicrotasks();

  assert.equal(App.render.renderer.shadowMap.needsUpdate, false);
  assert.equal(renderCalls.length, 0);

  svc.scheduleSyncFromStore?.({
    force: true,
    updateShadows: true,
    reason: 'sceneView:test:manual-after-dispose',
  });
  await flushMicrotasks();

  assert.equal(App.render.renderer.shadowMap.needsUpdate, true);
  assert.equal(renderCalls.length, 1);
});

test('scene view store selector updates coalesce to a single scheduled render per logical sync', async () => {
  const { store, svc, renderCalls } = makeSceneViewApp();
  assert.equal(svc.installStoreSync?.(), true);

  renderCalls.length = 0;
  store.patch({ runtime: { sketchMode: true } });
  store.patch({ ui: { lightingControl: true, lightDir: '2.2' } });

  assert.equal(renderCalls.length, 0);
  await flushMicrotasks();

  assert.equal(renderCalls.length, 1);
});

test('scene view store sync reinstall heals stale install state without duplicating selector subscriptions', () => {
  const { App, store, svc, renderCalls } = makeSceneViewApp();
  assert.equal(store.listenerCount(), 0);
  assert.equal(svc.installStoreSync?.(), true);
  assert.equal(store.listenerCount(), 2);
  assert.equal(renderCalls.length, 1);

  const syncState = App.services.sceneView.__storeSyncState as Record<string, unknown>;
  assert.equal(syncState.installed, true);
  assert.equal(typeof syncState.unsub, 'function');

  const originalUnsub = syncState.unsub as () => void;
  syncState.unsub = () => {
    originalUnsub();
  };
  syncState.installed = false;

  assert.equal(svc.installStoreSync?.(), true);
  assert.equal(store.listenerCount(), 2);
  assert.equal(syncState.installed, true);
  assert.equal(typeof syncState.unsub, 'function');

  syncState.unsub = null;
  assert.equal(svc.installStoreSync?.(), true);
  assert.equal(store.listenerCount(), 2);
  assert.equal(syncState.installed, true);
  assert.equal(typeof syncState.unsub, 'function');
});
