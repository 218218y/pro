import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelApiTestRig } from './cloud_sync_panel_api_runtime_helpers.ts';

test('cloud sync panel api preserves thrown messages for controller-facing commands', async () => {
  const { api } = createCloudSyncPanelApiTestRig({
    getDiagStorageMaybe: () => null,
    getClipboardMaybe: () => ({
      writeText: async () => {
        throw new Error('clipboard exploded');
      },
    }),
    getPromptSinkMaybe: () => ({
      prompt: () => {
        throw new Error('prompt exploded');
      },
    }),
    syncSketchNow: async () => ({ ok: false, reason: 'error', message: 'sync exploded' }),
    getFloatingSketchSyncEnabled: () => false,
    setFloatingSketchSyncEnabledState: () => {
      throw new Error('pin exploded');
    },
    deleteTemporaryModelsInCloud: async () => {
      throw new Error('delete models exploded');
    },
    deleteTemporaryColorsInCloud: async () => {
      throw new Error('delete colors exploded');
    },
    writeSite2TabsGateLocal: () => {},
    patchSite2TabsGateUi: () => {},
    pushTabsGateNow: async () => {
      throw new Error('tabs gate exploded');
    },
  });

  assert.deepEqual(await api.copyShareLink?.(), {
    ok: false,
    reason: 'prompt',
    link: 'https://example.test/',
    message: 'prompt exploded',
  });
  assert.deepEqual(await api.setFloatingSketchSyncEnabled?.(true), {
    ok: false,
    reason: 'error',
    message: 'pin exploded',
  });
  assert.deepEqual(await api.deleteTemporaryModels?.(), {
    ok: false,
    removed: 0,
    reason: 'error',
    message: 'delete models exploded',
  });
  assert.deepEqual(await api.deleteTemporaryColors?.(), {
    ok: false,
    removed: 0,
    reason: 'error',
    message: 'delete colors exploded',
  });
  assert.deepEqual(await api.setSite2TabsGateOpen?.(true), {
    ok: false,
    reason: 'error',
    message: 'tabs gate exploded',
  });
});
