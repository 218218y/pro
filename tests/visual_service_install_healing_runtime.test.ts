import test from 'node:test';
import assert from 'node:assert/strict';

import { installEditStateService } from '../esm/native/services/edit_state.ts';
import { installSceneViewService } from '../esm/native/services/scene_view.ts';
import { installDoorsRuntimeService } from '../esm/native/services/doors_runtime.ts';

function makeNullRecord<T extends Record<string, unknown>>(seed?: T): T {
  return Object.assign(Object.create(null), seed || {}) as T;
}

test('edit_state install keeps canonical method refs stable and heals partial public drift', () => {
  const existingSlot = makeNullRecord({ keep: 'editState' }) as Record<string, unknown>;
  const App: any = {
    services: makeNullRecord({ editState: existingSlot }),
  };

  const first = installEditStateService(App).editState as Record<string, unknown>;
  const canonicalReset = first.resetAllEditModes;

  first.resetAllEditModes = null;

  const second = installEditStateService(App).editState as Record<string, unknown>;

  assert.equal(second, existingSlot);
  assert.equal(second.keep, 'editState');
  assert.equal(second.resetAllEditModes, canonicalReset);
  assert.equal(second.__wpResetAllEditModes, canonicalReset);
});

test('scene_view install keeps canonical method refs stable and heals partial public drift', () => {
  const existingSlot = makeNullRecord({ keep: 'sceneView' }) as Record<string, unknown>;
  const App: any = {
    services: makeNullRecord({ sceneView: existingSlot }),
    store: {
      getState: () => ({ ui: {}, runtime: {}, config: {}, mode: {}, meta: {} }),
      subscribeSelector: () => () => {},
    },
    render: {},
    platform: {},
  };

  const first = installSceneViewService(App) as Record<string, unknown>;
  const syncFromStoreRef = first.syncFromStore;
  const installStoreSyncRef = first.installStoreSync;

  first.scheduleSyncFromStore = undefined;
  first.installStoreSync = undefined;

  const second = installSceneViewService(App) as Record<string, unknown>;

  assert.equal(second, existingSlot);
  assert.equal(second.keep, 'sceneView');
  assert.equal(second.syncFromStore, syncFromStoreRef);
  assert.equal(second.installStoreSync, installStoreSyncRef);
  assert.equal(typeof second.scheduleSyncFromStore, 'function');
  assert.equal(second.__wpSyncFromStore, syncFromStoreRef);
  assert.equal(second.__wpInstallStoreSync, installStoreSyncRef);
});

test('doors runtime install keeps canonical method refs stable and heals partial public drift', () => {
  const existingSlot = makeNullRecord({ keep: 'doors' }) as Record<string, unknown>;
  const cssStates: boolean[] = [];
  const App: any = {
    services: makeNullRecord({ doors: existingSlot }),
    browser: makeNullRecord({
      setDoorStatusCss: (isOpen: boolean) => {
        cssStates.push(!!isOpen);
      },
    }),
    platform: makeNullRecord({ triggerRender() {} }),
  };

  const first = installDoorsRuntimeService(App) as Record<string, unknown>;
  const getOpenRef = first.getOpen;
  const setOpenRef = first.setOpen;
  const syncVisualsNowRef = first.syncVisualsNow;

  first.setOpen = undefined;
  first.syncVisualsNow = undefined;

  const second = installDoorsRuntimeService(App) as Record<string, unknown>;

  assert.equal(second, existingSlot);
  assert.equal(second.keep, 'doors');
  assert.equal(second.getOpen, getOpenRef);
  assert.equal(second.setOpen, setOpenRef);
  assert.equal(second.syncVisualsNow, syncVisualsNowRef);
  assert.equal(second.__wpGetOpen, getOpenRef);
  assert.equal(second.__wpSetOpen, setOpenRef);
  assert.equal(second.__wpSyncVisualsNow, syncVisualsNowRef);
  assert.equal(cssStates.length >= 2, true);
});
