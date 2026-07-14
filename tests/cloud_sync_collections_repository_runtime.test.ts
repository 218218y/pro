import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudCollectionsRepository } from '../esm/native/services/cloud_sync_collections_repository.ts';

const keys = {
  models: 'models',
  colors: 'colors',
  colorOrder: 'colorOrder',
  presetOrder: 'presetOrder',
  hiddenPresets: 'hiddenPresets',
};

function createMapStorage(initial: Record<string, unknown>) {
  const values = new Map<string, string>(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)])
  );
  return {
    values,
    storage: {
      getString(key: unknown) {
        return values.get(String(key)) ?? null;
      },
      setString(key: unknown, value: unknown) {
        values.set(String(key), String(value));
        return true;
      },
    },
  };
}

test('cloud collections repository migrates legacy keys once into a versioned canonical envelope', () => {
  const { values, storage } = createMapStorage({
    models: [{ id: 'm1', name: 'legacy model' }],
    colors: [{ id: 'c1', value: '#fff' }],
    colorOrder: ['c1'],
    presetOrder: ['p1'],
    hiddenPresets: ['h1'],
  });
  const repository = createCloudCollectionsRepository({ storage, keys });

  assert.deepEqual(repository.read(), {
    m: [{ id: 'm1', name: 'legacy model' }],
    c: [{ id: 'c1', value: '#fff' }],
    o: ['c1'],
    p: ['p1'],
    h: ['h1'],
  });
  assert.deepEqual(JSON.parse(values.get(repository.envelopeKey) || '{}'), {
    schemaVersion: 1,
    revision: 0,
    savedModels: [{ id: 'm1', name: 'legacy model' }],
    savedColors: [{ id: 'c1', value: '#fff' }],
    colorOrder: ['c1'],
    presetOrder: ['p1'],
    hiddenPresets: ['h1'],
  });

  values.set('models', JSON.stringify([{ id: 'm2', name: 'new legacy model' }]));
  assert.equal(repository.read().m[0]?.id, 'm1');
  assert.equal(repository.commitPerKeySnapshot().revision, 1);
  assert.equal(repository.read().m[0]?.id, 'm2');
});

test('cloud collections repository does not mirror or publish a revision when the envelope commit fails', () => {
  const { values, storage } = createMapStorage({ models: [{ id: 'm1' }], colors: [] });
  const repository = createCloudCollectionsRepository({
    storage: {
      ...storage,
      setString(key: unknown, value: unknown) {
        if (String(key).includes(':cloudCollections:')) return false;
        return storage.setString(key, value);
      },
    },
    keys,
  });

  assert.throws(() => repository.read(), /atomic commit failed/);
  assert.equal(values.has(repository.envelopeKey), false);
  assert.deepEqual(JSON.parse(values.get('models') || '[]'), [{ id: 'm1' }]);
});

test('cloud collections repository keeps the complete envelope authoritative when a per-key mirror fails', () => {
  const { values, storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  const repository = createCloudCollectionsRepository({ storage, keys });
  repository.read();
  const baseSetString = storage.setString;
  storage.setString = (key: unknown, value: unknown) => {
    if (String(key) === 'colors') return false;
    return baseSetString(key, value);
  };

  const result = repository.commit({
    m: [{ id: 'm2', name: 'model 2' }],
    c: [{ id: 'c2', value: '#222' }],
    o: ['c2'],
    p: ['p2'],
    h: ['h2'],
  });

  assert.deepEqual(result.mirrorFailures, ['colors']);
  assert.equal(result.envelope.revision, 1);
  assert.deepEqual(repository.read(), {
    m: [{ id: 'm2', name: 'model 2' }],
    c: [{ id: 'c2', value: '#222' }],
    o: ['c2'],
    p: ['p2'],
    h: ['h2'],
  });
  assert.deepEqual(JSON.parse(values.get('colors') || '[]'), []);
});
