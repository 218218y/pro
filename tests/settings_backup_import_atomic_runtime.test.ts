import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSettingsImportPlan,
  commitSettingsImportPlan,
} from '../esm/native/ui/settings_backup_import_support.ts';
import { installCloudCollectionsForTestApp } from './cloud_collections_test_support.ts';

test('settings import leaves all five collections unchanged when its single canonical commit fails', async () => {
  const values = new Map<string, string>();
  let failCanonicalWrite = false;
  let uiPublishes = 0;
  const app: any = {
    store: {
      getState: () => ({ config: {}, ui: {}, runtime: {}, mode: {}, meta: {} }),
    },
    maps: {
      setSavedColors() {
        uiPublishes += 1;
        return true;
      },
      setColorSwatchesOrder() {
        uiPublishes += 1;
        return true;
      },
    },
    actions: {
      models: {
        renderModelUI() {
          uiPublishes += 1;
        },
      },
    },
    services: {
      models: {
        ensureLoaded() {},
      },
      storage: {
        KEYS: { SAVED_MODELS: 'models', SAVED_COLORS: 'colors' },
        getString(key: string) {
          return values.get(key) ?? null;
        },
        setString(key: string, value: string) {
          if (failCanonicalWrite && key.includes(':cloudCollections:v1')) return false;
          values.set(key, value);
          return true;
        },
      },
    },
  };
  await installCloudCollectionsForTestApp(app);
  const repository = app.services.cloudCollections.repository;
  const before = repository.readEnvelope();
  failCanonicalWrite = true;
  const plan = buildSettingsImportPlan(app, {
    savedModels: [{ id: 'model-1', name: 'Imported model' }],
    savedColors: [{ id: 'color-1', value: '#123456' }],
    colorSwatchesOrder: ['color-1'],
    presetOrder: ['preset-1'],
    hiddenPresets: ['preset-2'],
  });

  await assert.rejects(commitSettingsImportPlan(app, plan), /atomic commit failed/i);

  assert.deepEqual(repository.readEnvelope(), before);
  assert.equal(uiPublishes, 0);
});
