import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCloudCollectionsRepository,
  createInProcessCloudCollectionsMutationLock,
  createUnavailableCloudCollectionsMutationLock,
} from '../esm/native/services/cloud_sync_collections_repository.ts';
import { createCloudCollectionsWebLock } from '../esm/native/services/cloud_collections_mutation_lock.ts';
import { installCloudCollectionsService } from '../esm/native/services/cloud_collections_service.ts';
import { PRESET_MODELS_RAW } from '../esm/native/data/preset_models_data.ts';

const keys = {
  models: 'models',
  colors: 'colors',
  colorOrder: 'colorOrder',
  presetOrder: 'presetOrder',
  hiddenPresets: 'hiddenPresets',
};
const mutationLock = createInProcessCloudCollectionsMutationLock();

function createRepository(
  args: Omit<Parameters<typeof createCloudCollectionsRepository>[0], 'mutationLock'>
) {
  return createCloudCollectionsRepository({ ...args, mutationLock });
}

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

test('cloud collections repository migrates legacy keys once into a versioned canonical envelope', async () => {
  const { values, storage } = createMapStorage({
    models: [{ id: 'm1', name: 'legacy model' }],
    colors: [{ id: 'c1', value: '#fff' }],
    colorOrder: ['c1'],
    presetOrder: ['p1'],
    hiddenPresets: ['h1'],
  });
  const repository = createRepository({ storage, keys });

  assert.deepEqual(repository.read(), {
    m: [{ id: 'm1', name: 'legacy model' }],
    c: [{ id: 'c1', value: '#fff' }],
    o: ['c1'],
    p: ['p1'],
    h: ['h1'],
  });
  assert.equal(values.has(repository.envelopeKey), false);
  await repository.ensureInitialized();
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
  assert.equal(
    (await repository.transact(() => ({ savedModels: [{ id: 'm3', name: 'canonical model' }] }))).envelope
      .revision,
    1
  );
  assert.equal(repository.read().m[0]?.id, 'm3');
});

test('cloud collections repository does not mirror or publish a revision when the envelope commit fails', async () => {
  const { values, storage } = createMapStorage({
    models: [{ id: 'm1', name: 'Model 1' }],
    colors: [],
  });
  const repository = createRepository({
    storage: {
      ...storage,
      setString(key: unknown, value: unknown) {
        if (String(key).includes(':cloudCollections:')) return false;
        return storage.setString(key, value);
      },
    },
    keys,
  });

  assert.deepEqual(repository.read().m, [{ id: 'm1', name: 'Model 1' }]);
  await assert.rejects(repository.ensureInitialized(), /atomic commit failed/);
  assert.equal(values.has(repository.envelopeKey), false);
  assert.deepEqual(JSON.parse(values.get('models') || '[]'), [{ id: 'm1', name: 'Model 1' }]);
});

test('cloud collections repository keeps the complete envelope authoritative when a per-key mirror fails', async () => {
  const { values, storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  const repository = createRepository({ storage, keys });
  await repository.ensureInitialized();
  const baseSetString = storage.setString;
  storage.setString = (key: unknown, value: unknown) => {
    if (String(key) === 'colors') return false;
    return baseSetString(key, value);
  };

  const result = await repository.commit({
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

  storage.setString = baseSetString;
  await repository.reconcileMirrors();
  assert.deepEqual(JSON.parse(values.get('colors') || '[]'), [{ id: 'c2', value: '#222' }]);
});

test('cloud collections repository commits a multi-collection mutation with one canonical write', async () => {
  const { storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  let canonicalWrites = 0;
  const baseSetString = storage.setString;
  storage.setString = (key: unknown, value: unknown) => {
    if (String(key).includes(':cloudCollections:v1')) canonicalWrites += 1;
    return baseSetString(key, value);
  };
  const repository = createRepository({ storage, keys });
  await repository.ensureInitialized();
  canonicalWrites = 0;

  await repository.transact(() => ({
    savedModels: [{ id: 'm1', name: 'model' }],
    savedColors: [{ id: 'c1', value: '#111' }],
    colorOrder: ['c1'],
  }));

  assert.equal(canonicalWrites, 1);
  assert.deepEqual(repository.read(), {
    m: [{ id: 'm1', name: 'model' }],
    c: [{ id: 'c1', value: '#111' }],
    o: ['c1'],
    p: [],
    h: [],
  });
});

test('cloud collections repository reports corruption without rebuilding from legacy mirrors', async () => {
  const { values, storage } = createMapStorage({
    models: [{ id: 'legacy', name: 'must not be adopted' }],
  });
  const repository = createRepository({ storage, keys });
  values.set(repository.envelopeKey, '{broken-json');

  const result = repository.readResult();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.corruption.kind, 'corrupt');
  assert.equal(result.corruption.repairAvailable, true);
  assert.throws(() => repository.readEnvelope(), /envelope is corrupt/);

  const backupKey = repository.backupCorruptEnvelope();
  assert.equal(backupKey, result.corruption.rawBackupKey);
  assert.equal(JSON.parse(values.get(backupKey) || '{}').raw, '{broken-json');

  await repository.resetCorruptEnvelope({ m: [], c: [], o: [], p: [], h: [] });
  assert.deepEqual(repository.read().m, []);
});

test('cloud collections repository isolates observer failures after the canonical commit', async () => {
  const { values, storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  const reported: Array<{ error: unknown; observerIndex: number }> = [];
  const repository = createRepository({
    storage,
    keys,
    reportObserverFailure: (error, observerIndex) => reported.push({ error, observerIndex }),
  });
  await repository.ensureInitialized();
  repository.subscribe(() => {
    throw new Error('observer failed');
  });

  const result = await repository.transact(() => ({ savedColors: [{ id: 'c1', value: '#111' }] }));

  assert.equal(result.committed, true);
  assert.deepEqual(result.warnings, [
    { kind: 'observer_failure', observerIndex: 0, message: 'observer failed' },
  ]);
  assert.equal(reported.length, 1);
  assert.deepEqual(JSON.parse(values.get(repository.envelopeKey) || '{}').savedColors, [
    { id: 'c1', value: '#111' },
  ]);
});

test('cloud collections repository repairs stale mirrors after repository recreation', async () => {
  const { values, storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  const repository = createRepository({ storage, keys });
  await repository.ensureInitialized();
  await repository.transact(() => ({ savedModels: [{ id: 'm1', name: 'canonical' }] }));
  values.set('models', JSON.stringify([{ id: 'stale', name: 'stale mirror' }]));

  const recreatedStorage = {
    getString: storage.getString.bind(storage),
    setString: storage.setString.bind(storage),
  };
  const recreated = createRepository({ storage: recreatedStorage, keys });
  await recreated.reconcileMirrors();

  assert.deepEqual(JSON.parse(values.get('models') || '[]'), [{ id: 'm1', name: 'canonical' }]);
});

test('cloud collections repository backs up schema-invalid JSON with its raw value', () => {
  const { values, storage } = createMapStorage({});
  const repository = createRepository({ storage, keys });
  const raw = JSON.stringify({ schemaVersion: 2, revision: 0, savedModels: [] });
  values.set(repository.envelopeKey, raw);

  const result = repository.readResult();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.corruption.reason, 'schema');
  assert.equal(result.corruption.raw, raw);

  const backupKey = repository.backupCorruptEnvelope();
  assert.deepEqual(JSON.parse(values.get(backupKey) || '{}'), {
    raw,
    reason: 'schema',
    capturedAt: JSON.parse(values.get(backupKey) || '{}').capturedAt,
  });
});

test('cloud collections repository preserves a valid typed nested model envelope without normalization', () => {
  const { values, storage } = createMapStorage({});
  const repository = createRepository({ storage, keys });
  const model = {
    id: ' model-1 ',
    name: ' Model 1 ',
    isPreset: false,
    settings: {
      width: 180,
      height: 240,
      depth: 60,
      doors: 4,
      isManualWidth: true,
      wardrobeType: 'hinged',
      boardMaterial: 'melamine',
      doorMountMode: 'overlay',
      globalHandleType: 'edge',
      futureSetting: { preserved: true },
    },
    toggles: { showContents: true, lightingControl: true, lightAmb: '0.7' },
    chestSettings: { drawersCount: 4, commodeEnabled: false },
    modulesConfiguration: [
      {
        layout: 'shelves',
        extDrawersCount: 2,
        hasShoeDrawer: false,
        isCustom: true,
        doors: 2,
        customData: { shelves: [true, false], rods: [false, true], storage: false },
        specialDims: { widthCm: 90, isManualWidth: true },
        savedDims: { heightCm: 230 },
        hexCell: { enabled: true, protrusionCm: 2.5 },
      },
    ],
    stackSplitLowerModulesConfiguration: [{ layout: 'hanging', gridDivisions: 2 }],
    cornerConfiguration: {
      layout: 'shelves',
      customData: { shelves: [true], rods: [false], storage: false },
      modulesConfiguration: [{ layout: 'shelves', doors: 1 }],
      stackSplitLower: {
        isCustom: true,
        modulesConfiguration: [{ layout: 'hanging', extDrawersCount: 0 }],
      },
    },
    groovesMap: { groove_d1_full: true },
    grooveLinesCountMap: { groove_lines_d1: 2 },
    splitDoorsMap: { split_d1: true, splitpos_d1: [50] },
    splitDoorsBottomMap: { splitb_d1: false },
    removedDoorsMap: { removed_d2: null },
    roundedFrameSideShelvesMap: { side_d2: true },
    drawerDividersMap: { drawer_d1: false },
    individualColors: { d1: '#ffffff' },
    doorSpecialMap: { d2: null },
    doorStyleMap: { d1: 'double_profile' },
    handlesMap: { d1: 'edge' },
    hingeMap: { d1: { side: 'left' } },
    curtainMap: { d2: 'linen' },
    mirrorLayoutMap: { d1: [{ widthCm: 30, centerXNorm: 0.5, faceSign: null }] },
    doorTrimMap: {
      d1: [
        {
          id: 'trim-1',
          axis: 'vertical',
          color: 'gold',
          span: 'half',
          sizeCm: 40,
          centerXNorm: 0.5,
          centerYNorm: 0.5,
        },
      ],
    },
    isLibraryMode: false,
    preChestState: { settings: { doors: 4 } },
    grooveLinesCount: null,
    savedNotes: [{ id: 'n1', blocks: [{ text: 'preserved' }] }],
    orderPdfEditorZoom: 1.25,
    futureModelField: { preserved: ['as-is'] },
  };
  const color = {
    id: 'texture-1',
    name: 'Oak',
    type: 'texture',
    value: 'texture-1',
    textureData: { nested: { source: 'data:image/png;base64,AAA=' } },
    locked: false,
  };
  const raw = JSON.stringify({
    schemaVersion: 1,
    revision: 7,
    savedModels: [model],
    savedColors: [color],
    colorOrder: ['texture-1'],
    presetOrder: ['model-1'],
    hiddenPresets: [],
  });
  values.set(repository.envelopeKey, raw);

  const result = repository.readResult();

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.envelope.savedModels, [model]);
  assert.deepEqual(result.envelope.savedColors, [color]);
});

test('cloud collections repository accepts every current built-in project model snapshot', () => {
  const { values, storage } = createMapStorage({});
  const repository = createRepository({ storage, keys });
  values.set(
    repository.envelopeKey,
    JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      savedModels: PRESET_MODELS_RAW,
      savedColors: [],
      colorOrder: [],
      presetOrder: [],
      hiddenPresets: [],
    })
  );

  const result = repository.readResult();

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.envelope.savedModels.length, PRESET_MODELS_RAW.length);
});

test('cloud collections repository rejects typed nested fields that canonical consumers would discard', () => {
  const invalidModels: Array<{ label: string; model: Record<string, unknown> }> = [
    { label: 'settings container', model: { id: 'm1', name: 'M1', settings: 'invalid' } },
    { label: 'settings scalar', model: { id: 'm1', name: 'M1', settings: { width: '180' } } },
    { label: 'toggle scalar', model: { id: 'm1', name: 'M1', toggles: { showContents: 1 } } },
    {
      label: 'module custom-data array',
      model: {
        id: 'm1',
        name: 'M1',
        modulesConfiguration: [{ customData: { shelves: [true, 'yes'] } }],
      },
    },
    {
      label: 'corner module list',
      model: { id: 'm1', name: 'M1', cornerConfiguration: { modulesConfiguration: {} } },
    },
    { label: 'toggle map value', model: { id: 'm1', name: 'M1', groovesMap: { d1: 'yes' } } },
    {
      label: 'split-position list',
      model: { id: 'm1', name: 'M1', splitDoorsMap: { splitpos_d1: [40, '60'] } },
    },
    {
      label: 'mirror layout scalar',
      model: { id: 'm1', name: 'M1', mirrorLayoutMap: { d1: [{ widthCm: '30' }] } },
    },
    {
      label: 'door trim required coordinates',
      model: {
        id: 'm1',
        name: 'M1',
        doorTrimMap: {
          d1: [{ id: 't1', axis: 'horizontal', color: 'silver', span: 'full' }],
        },
      },
    },
    { label: 'PDF zoom scalar', model: { id: 'm1', name: 'M1', orderPdfEditorZoom: '1' } },
  ];

  for (const { label, model } of invalidModels) {
    const { values, storage } = createMapStorage({});
    const repository = createRepository({ storage, keys });
    const raw = JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      savedModels: [model],
      savedColors: [],
      colorOrder: [],
      presetOrder: [],
      hiddenPresets: [],
    });
    values.set(repository.envelopeKey, raw);

    const result = repository.readResult();

    assert.equal(result.ok, false, label);
    if (result.ok) continue;
    assert.equal(result.corruption.reason, 'shape', label);
    assert.equal(result.corruption.raw, raw, label);
  }
});

test('cloud collections repository backs up schema-valid JSON with an invalid nested model shape', () => {
  const { values, storage } = createMapStorage({});
  const repository = createRepository({ storage, keys });
  const raw = JSON.stringify({
    schemaVersion: 1,
    revision: 2,
    savedModels: [{ id: 'm1', name: 'M1', settings: { width: '180' } }],
    savedColors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  values.set(repository.envelopeKey, raw);

  const result = repository.readResult();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.corruption.reason, 'shape');
  const backupKey = repository.backupCorruptEnvelope();
  const backup = JSON.parse(values.get(backupKey) || '{}');
  assert.equal(backup.raw, raw);
  assert.equal(backup.reason, 'shape');
});

test('cloud collections repository rejects malformed nested entries and backs up the exact raw envelope', () => {
  const { values, storage } = createMapStorage({});
  const repository = createRepository({ storage, keys });
  const raw = JSON.stringify({
    schemaVersion: 1,
    revision: 4,
    savedModels: [{ id: 'broken-without-name' }],
    savedColors: [{ id: 'c1', locked: 'yes' }],
    colorOrder: [{ invalid: true }],
    presetOrder: [],
    hiddenPresets: [],
  });
  values.set(repository.envelopeKey, raw);

  const result = repository.readResult();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.corruption.reason, 'shape');
  assert.equal(result.corruption.raw, raw);
  const backupKey = repository.backupCorruptEnvelope();
  const backup = JSON.parse(values.get(backupKey) || '{}');
  assert.equal(backup.raw, raw);
  assert.equal(backup.reason, 'shape');
});

test('cloud collections service publishes corruption recovery APIs before install reports the corrupt envelope', async () => {
  const values = new Map<string, string>();
  const raw = JSON.stringify({
    schemaVersion: 1,
    revision: 1,
    savedModels: [{ id: 'broken-without-name' }],
    savedColors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  values.set('wardrobeSavedModels:cloudCollections:v1', raw);
  const App = {
    services: {
      storage: {
        getString(key: unknown) {
          return values.get(String(key)) ?? null;
        },
        setString(key: unknown, value: unknown) {
          values.set(String(key), String(value));
          return true;
        },
      },
    },
  } as any;

  await assert.rejects(installCloudCollectionsService(App), /envelope is corrupt/i);
  const service = App.services.cloudCollections;
  assert.equal(typeof service?.readResult, 'function');
  assert.equal(typeof service?.backupCorruptEnvelope, 'function');
  assert.equal(typeof service?.resetCorruptEnvelope, 'function');
  const readResult = service.readResult();
  assert.equal(readResult.ok, false);
  assert.equal(readResult.corruption.raw, raw);
  assert.equal(typeof service.backupCorruptEnvelope(), 'string');
});

test('cloud collections repository does not publish or advance revision for a canonical no-op', async () => {
  const { storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  const repository = createRepository({ storage, keys });
  const initial = (await repository.ensureInitialized()).envelope;
  let notifications = 0;
  repository.subscribe(() => {
    notifications += 1;
  });

  const result = await repository.transact(() => ({ savedModels: [] }));

  assert.equal(result.committed, false);
  assert.equal(result.reason, 'no-change');
  assert.equal(result.envelope.revision, initial.revision);
  assert.equal(notifications, 0);
});

test('cloud collections Web Lock preserves concurrent mutations from separate repositories', async () => {
  const values = new Map<string, string>();
  const createStorageView = () => ({
    getString(key: unknown) {
      return values.get(String(key)) ?? null;
    },
    setString(key: unknown, value: unknown) {
      values.set(String(key), String(value));
      return true;
    },
  });
  let tail = Promise.resolve();
  const webLock = createCloudCollectionsWebLock({
    request<T>(_name: string, operation: () => Promise<T> | T): Promise<T> {
      const result = tail.then(operation, operation);
      tail = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    },
  });
  const repositoryA = createCloudCollectionsRepository({
    storage: createStorageView(),
    keys,
    mutationLock: webLock,
  });
  const repositoryB = createCloudCollectionsRepository({
    storage: createStorageView(),
    keys,
    mutationLock: webLock,
  });

  await Promise.all([
    repositoryA.transact(() => ({ savedColors: [{ id: 'c1', value: '#111' }] })),
    repositoryB.transact(() => ({ savedModels: [{ id: 'm1', name: 'model' }] })),
  ]);

  const envelope = repositoryA.readEnvelope();
  assert.equal(webLock.isolation, 'cross-tab');
  assert.equal(envelope.revision, 2);
  assert.deepEqual(envelope.savedColors, [{ id: 'c1', value: '#111' }]);
  assert.deepEqual(envelope.savedModels, [{ id: 'm1', name: 'model' }]);
});

test('cloud collections mirror reconciliation cannot overwrite a concurrent committed mirror', async () => {
  const values = new Map<string, string>();
  const createStorageView = () => ({
    getString(key: unknown) {
      return values.get(String(key)) ?? null;
    },
    setString(key: unknown, value: unknown) {
      values.set(String(key), String(value));
      return true;
    },
  });
  let tail = Promise.resolve();
  const webLock = createCloudCollectionsWebLock({
    request<T>(_name: string, operation: () => Promise<T> | T): Promise<T> {
      const result = tail.then(operation, operation);
      tail = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    },
  });
  const repositoryA = createCloudCollectionsRepository({
    storage: createStorageView(),
    keys,
    mutationLock: webLock,
  });
  const repositoryB = createCloudCollectionsRepository({
    storage: createStorageView(),
    keys,
    mutationLock: webLock,
  });
  await repositoryA.ensureInitialized();
  values.set('models', JSON.stringify([{ id: 'stale', name: 'Stale mirror' }]));

  await Promise.all([
    repositoryA.reconcileMirrors(),
    repositoryB.transact(() => ({ savedModels: [{ id: 'new', name: 'New model' }] })),
  ]);

  assert.deepEqual(JSON.parse(values.get('models') || '[]'), [{ id: 'new', name: 'New model' }]);
  assert.deepEqual(repositoryA.readEnvelope().savedModels, [{ id: 'new', name: 'New model' }]);
});

test('cloud collections Web Lock evaluates same-collection entity mutations after the locked reread', async () => {
  const values = new Map<string, string>();
  const createStorageView = () => ({
    getString(key: unknown) {
      return values.get(String(key)) ?? null;
    },
    setString(key: unknown, value: unknown) {
      values.set(String(key), String(value));
      return true;
    },
  });
  let tail = Promise.resolve();
  const webLock = createCloudCollectionsWebLock({
    request<T>(_name: string, operation: () => Promise<T> | T): Promise<T> {
      const result = tail.then(operation, operation);
      tail = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    },
  });
  const repositoryA = createCloudCollectionsRepository({
    storage: createStorageView(),
    keys,
    mutationLock: webLock,
  });
  const repositoryB = createCloudCollectionsRepository({
    storage: createStorageView(),
    keys,
    mutationLock: webLock,
  });

  await Promise.all([
    repositoryA.transact(current => ({
      savedModels: current.savedModels.concat({ id: 'm1', name: 'Model 1' }),
    })),
    repositoryB.transact(current => ({
      savedModels: current.savedModels.concat({ id: 'm2', name: 'Model 2' }),
    })),
  ]);

  assert.deepEqual(
    repositoryA.readEnvelope().savedModels.map(model => model.id),
    ['m1', 'm2']
  );
});

test('cloud collections conditional adoption preserves a mutation committed after the snapshot', async () => {
  const { storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  const repository = createRepository({ storage, keys });
  const snapshotRevision = repository.readEnvelope().revision;
  await repository.transact(() => ({ savedColors: [{ id: 'local-new', value: '#123456' }] }));

  const result = await repository.commitIfRevision(snapshotRevision, {
    m: [{ id: 'remote-model', name: 'Remote model' }],
    c: [],
    o: [],
    p: [],
    h: [],
  });

  assert.equal(result.committed, false);
  assert.equal(result.reason, 'revision-mismatch');
  assert.deepEqual(repository.readEnvelope().savedColors, [{ id: 'local-new', value: '#123456' }]);
  assert.deepEqual(repository.readEnvelope().savedModels, []);
});

test('cloud collections fail closed for mutation when browser cross-tab locking is unavailable', async () => {
  const { storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  const repository = createCloudCollectionsRepository({
    storage,
    keys,
    mutationLock: createUnavailableCloudCollectionsMutationLock(),
  });

  assert.equal(repository.mutationIsolation, 'unavailable');
  assert.deepEqual(repository.readEnvelope().savedModels, []);
  await assert.rejects(
    repository.transact(() => ({ savedModels: [{ id: 'blocked', name: 'Blocked' }] })),
    /requires cross-tab locking/i
  );
});

test('cloud collections repository cache preserves canonical lock ownership', () => {
  const webLock = createCloudCollectionsWebLock({
    request<T>(_name: string, operation: () => Promise<T> | T): Promise<T> {
      return Promise.resolve().then(operation);
    },
  });
  const first = createMapStorage({}).storage;
  const webLocked = createCloudCollectionsRepository({
    storage: first,
    keys,
    mutationLock: webLock,
  });
  const reused = createCloudCollectionsRepository({ storage: first, keys });
  assert.equal(reused, webLocked);
  assert.equal(reused.mutationIsolation, 'cross-tab');

  const second = createMapStorage({}).storage;
  createCloudCollectionsRepository({ storage: second, keys });
  assert.throws(
    () => createCloudCollectionsRepository({ storage: second, keys, mutationLock: webLock }),
    /lock isolation is already process/i
  );
});

test('cloud collections repository gives every observer an independent committed snapshot', async () => {
  const { storage } = createMapStorage({
    models: [],
    colors: [],
    colorOrder: [],
    presetOrder: [],
    hiddenPresets: [],
  });
  const repository = createRepository({ storage, keys });
  await repository.ensureInitialized();
  const observed: unknown[] = [];

  repository.subscribe(envelope => {
    envelope.savedModels[0]!.name = 'mutated by first observer';
    envelope.savedModels.push({ id: 'observer-only', name: 'Observer Only' });
    envelope.savedColors.push({ id: 'observer-color', value: '#ffffff' });
  });
  repository.subscribe(envelope => {
    observed.push(envelope);
  });

  const result = await repository.commit({
    m: [{ id: 'm1', name: 'Canonical Model' }],
    c: [{ id: 'c1', value: '#111111' }],
    o: ['c1'],
    p: [],
    h: [],
  });

  assert.deepEqual(observed, [result.envelope]);
  assert.equal(result.envelope.savedModels[0]?.name, 'Canonical Model');
  assert.equal(result.envelope.savedModels.length, 1);
  assert.equal(result.envelope.savedColors.length, 1);
  assert.deepEqual(repository.read().m, [{ id: 'm1', name: 'Canonical Model' }]);
});
