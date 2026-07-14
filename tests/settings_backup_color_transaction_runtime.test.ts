import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCloudCollectionsRepository,
  createInProcessCloudCollectionsMutationLock,
} from '../esm/native/services/cloud_sync_collections_repository.ts';
import { mergeImportedSavedColors } from '../esm/native/ui/settings_backup_import_support.ts';

const COLLECTION_KEYS = {
  models: 'saved-models',
  colors: 'saved-colors',
  colorOrder: 'saved-colors:order',
  presetOrder: 'saved-models:preset-order',
  hiddenPresets: 'saved-models:hidden-presets',
};

test('settings saved-color imports rebase inside the shared mutation lock', async () => {
  const values = new Map<string, unknown>();
  const makeStorage = () => ({
    getJSON(key: string, fallback: unknown) {
      return values.has(key) ? values.get(key) : fallback;
    },
    setJSON(key: string, value: unknown) {
      values.set(key, value);
      return true;
    },
  });
  const mutationLock = createInProcessCloudCollectionsMutationLock();
  const repositoryA = createCloudCollectionsRepository({
    storage: makeStorage(),
    keys: COLLECTION_KEYS,
    mutationLock,
  });
  const repositoryB = createCloudCollectionsRepository({
    storage: makeStorage(),
    keys: COLLECTION_KEYS,
    mutationLock,
  });

  const makeApp = (repository: typeof repositoryA) => {
    const config: Record<string, unknown> = { savedColors: [], colorSwatchesOrder: [] };
    return {
      store: {
        getState: () => ({ config, ui: {}, runtime: {}, mode: {}, meta: {} }),
      },
      maps: {
        setSavedColors(next: unknown[]) {
          config.savedColors = next.slice();
          return true;
        },
        setColorSwatchesOrder(next: unknown[]) {
          config.colorSwatchesOrder = next.slice();
          return true;
        },
      },
      services: { cloudCollections: { repository } },
    };
  };

  const [addedA, addedB] = await Promise.all([
    mergeImportedSavedColors(makeApp(repositoryA) as never, [{ id: 'color-a', value: '#aaa' }]),
    mergeImportedSavedColors(makeApp(repositoryB) as never, [{ id: 'color-b', value: '#bbb' }]),
  ]);

  assert.deepEqual([addedA, addedB], [1, 1]);
  const envelope = repositoryA.readEnvelope();
  assert.equal(envelope.revision, 2);
  assert.deepEqual(
    envelope.savedColors.map(color => color.id),
    ['color-a', 'color-b']
  );
});
