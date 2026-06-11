import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDesignTabColorDeleteFlightKey,
  buildDesignTabColorTextureUploadFlightKey,
  DESIGN_TAB_COLOR_ACTION_SAVE_KEY,
  runDesignTabColorActionSingleFlight,
} from '../esm/native/ui/react/tabs/design_tab_color_action_singleflight.ts';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

test('design tab color action family single-flight reuses duplicate same-key work per app and isolates other apps', async () => {
  const appA = {};
  const appB = {};
  const deferredA = createDeferred<any>();
  const deferredB = createDeferred<any>();
  let callsA = 0;
  let callsB = 0;

  const first = runDesignTabColorActionSingleFlight({
    app: appA as never,
    key: DESIGN_TAB_COLOR_ACTION_SAVE_KEY,
    run: async () => {
      callsA += 1;
      return await deferredA.promise;
    },
  });
  const duplicate = runDesignTabColorActionSingleFlight({
    app: appA as never,
    key: DESIGN_TAB_COLOR_ACTION_SAVE_KEY,
    run: async () => {
      callsA += 1;
      return { ok: true, kind: 'save-custom-color', id: 'dup', name: 'dup' } as const;
    },
  });
  const otherApp = runDesignTabColorActionSingleFlight({
    app: appB as never,
    key: DESIGN_TAB_COLOR_ACTION_SAVE_KEY,
    run: async () => {
      callsB += 1;
      return await deferredB.promise;
    },
  });

  assert.equal(first, duplicate);
  await Promise.resolve();
  assert.equal(callsA, 1);
  assert.equal(callsB, 1);

  deferredA.resolve({ ok: true, kind: 'save-custom-color', id: 'saved_1', name: 'חדש' });
  deferredB.resolve({ ok: true, kind: 'save-custom-color', id: 'saved_2', name: 'אחר' });
  assert.deepEqual(await first, { ok: true, kind: 'save-custom-color', id: 'saved_1', name: 'חדש' });
  assert.deepEqual(await otherApp, { ok: true, kind: 'save-custom-color', id: 'saved_2', name: 'אחר' });
});

test('design tab color action family single-flight reports busy for conflicting design color mutations', async () => {
  const app = {};
  const deferred = createDeferred<any>();
  const busySeen: any[] = [];

  const upload = runDesignTabColorActionSingleFlight({
    app: app as never,
    key: buildDesignTabColorTextureUploadFlightKey('wood\u00011\u0001image/png\u00011'),
    run: async () => await deferred.promise,
  });

  const busySave = await runDesignTabColorActionSingleFlight({
    app: app as never,
    key: DESIGN_TAB_COLOR_ACTION_SAVE_KEY,
    run: async () => ({ ok: true, kind: 'save-custom-color', id: 'saved_3', name: 'busy' }) as const,
    onBusy: result => {
      busySeen.push(result);
    },
  });
  const busyDelete = await runDesignTabColorActionSingleFlight({
    app: app as never,
    key: buildDesignTabColorDeleteFlightKey('saved_1'),
    run: async () => ({ ok: true, kind: 'delete-color', id: 'saved_1' }) as const,
    onBusy: result => {
      busySeen.push(result);
    },
  });

  assert.deepEqual(busySave, { ok: false, kind: 'save-custom-color', reason: 'busy' });
  assert.deepEqual(busyDelete, { ok: false, kind: 'delete-color', reason: 'busy' });
  assert.deepEqual(busySeen, [busySave, busyDelete]);

  deferred.resolve({ ok: true, kind: 'upload-texture', dataUrl: 'data:wood', textureName: 'wood.png' });
  assert.deepEqual(await upload, {
    ok: true,
    kind: 'upload-texture',
    dataUrl: 'data:wood',
    textureName: 'wood.png',
  });
});
