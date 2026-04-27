import test from 'node:test';
import assert from 'node:assert/strict';

import { installStorage } from '../esm/native/platform/storage.ts';
import { installAutosaveService } from '../esm/native/services/autosave.ts';
import { installCameraService } from '../esm/native/services/camera.ts';
import { installEditStateService } from '../esm/native/services/edit_state.ts';
import { ensureServiceSlot, getServiceSlotMaybe } from '../esm/native/runtime/services_root_access.ts';

function createApp() {
  return {
    services: Object.create(null),
    actions: Object.create(null),
    store: { getState: () => ({ ui: {}, runtime: {}, mode: {}, config: {} }) },
    state: { get: () => ({}) },
    THREE: {
      Vector3: class Vector3 {
        x: number;
        y: number;
        z: number;
        constructor(x = 0, y = 0, z = 0) {
          this.x = x;
          this.y = y;
          this.z = z;
        }
        clone() {
          return new Vector3(this.x, this.y, this.z);
        }
        set(x = 0, y = 0, z = 0) {
          this.x = x;
          this.y = y;
          this.z = z;
          return this;
        }
      },
    },
  } as Record<string, unknown>;
}

test('service-slot installers hydrate pre-created canonical service slots in place', () => {
  const App = createApp();

  const storage = ensureServiceSlot(App, 'storage');
  const autosave = ensureServiceSlot(App, 'autosave');
  const camera = ensureServiceSlot(App, 'camera');
  const editState = ensureServiceSlot(App, 'editState');

  installStorage(App);
  installAutosaveService(App as never);
  installCameraService(App as never);
  installEditStateService(App as never);

  assert.strictEqual(getServiceSlotMaybe(App, 'storage'), storage);
  assert.strictEqual(getServiceSlotMaybe(App, 'autosave'), autosave);
  assert.strictEqual(getServiceSlotMaybe(App, 'camera'), camera);
  assert.strictEqual(getServiceSlotMaybe(App, 'editState'), editState);

  assert.equal(typeof (storage as Record<string, unknown>).getString, 'function');
  assert.equal(typeof (autosave as Record<string, unknown>).schedule, 'function');
  assert.equal(typeof (autosave as Record<string, unknown>).flushPending, 'function');
  assert.equal(typeof (camera as Record<string, unknown>).moveTo, 'function');
  assert.equal(typeof (editState as Record<string, unknown>).resetAllEditModes, 'function');
});

test('service-slot installers keep canonical slot ownership isolated per App container', () => {
  const firstApp = createApp();
  const secondApp = createApp();

  installStorage(firstApp);
  installAutosaveService(firstApp as never);
  installCameraService(firstApp as never);
  installEditStateService(firstApp as never);

  installStorage(secondApp);
  installAutosaveService(secondApp as never);
  installCameraService(secondApp as never);
  installEditStateService(secondApp as never);

  assert.notStrictEqual(firstApp.services, secondApp.services);
  assert.notStrictEqual(getServiceSlotMaybe(firstApp, 'storage'), getServiceSlotMaybe(secondApp, 'storage'));
  assert.notStrictEqual(
    getServiceSlotMaybe(firstApp, 'autosave'),
    getServiceSlotMaybe(secondApp, 'autosave')
  );
  assert.notStrictEqual(getServiceSlotMaybe(firstApp, 'camera'), getServiceSlotMaybe(secondApp, 'camera'));
  assert.notStrictEqual(
    getServiceSlotMaybe(firstApp, 'editState'),
    getServiceSlotMaybe(secondApp, 'editState')
  );

  const firstAutosave = getServiceSlotMaybe(firstApp, 'autosave') as Record<string, unknown>;
  const secondAutosave = getServiceSlotMaybe(secondApp, 'autosave') as Record<string, unknown>;
  assert.equal(typeof firstAutosave.schedule, 'function');
  assert.equal(typeof secondAutosave.schedule, 'function');
  assert.notStrictEqual(firstAutosave.schedule, secondAutosave.schedule);
});
