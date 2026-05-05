import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { createLibraryTopModuleConfig } from '../esm/native/features/library_preset/module_defaults.ts';

type AnyRecord = Record<string, unknown>;

function asRec(v: unknown): AnyRecord {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {};
}

function createStoreStub(root?: AnyRecord) {
  const state: AnyRecord = root || {
    ui: {},
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  };
  const commits: Array<{ patch: AnyRecord; meta?: AnyRecord }> = [];

  const applyPatch = (payload: AnyRecord) => {
    if (!payload || typeof payload !== 'object') return;
    if (payload.ui && typeof payload.ui === 'object') Object.assign(state.ui || (state.ui = {}), payload.ui);
    if (payload.runtime && typeof payload.runtime === 'object') {
      Object.assign(state.runtime || (state.runtime = {}), payload.runtime);
    }
    if (payload.mode && typeof payload.mode === 'object')
      Object.assign(state.mode || (state.mode = {}), payload.mode);
    if (payload.meta && typeof payload.meta === 'object')
      Object.assign(state.meta || (state.meta = {}), payload.meta);
    if (payload.config && typeof payload.config === 'object')
      Object.assign(state.config || (state.config = {}), payload.config);
  };

  return {
    commits,
    getState: () => state,
    patch: (payload: AnyRecord) => {
      applyPatch(payload);
      return payload;
    },
    setUi: (patch: AnyRecord) => {
      applyPatch({ ui: patch });
      return patch;
    },
    setRuntime: (patch: AnyRecord) => {
      applyPatch({ runtime: patch });
      return patch;
    },
    setModePatch: (patch: AnyRecord) => {
      applyPatch({ mode: patch });
      return patch;
    },
    setConfig: (patch: AnyRecord, meta?: AnyRecord) => {
      commits.push({ patch, meta });
      applyPatch({ config: patch });
      return patch;
    },
    setMeta: (patch: AnyRecord) => {
      applyPatch({ meta: patch });
      return patch;
    },
    subscribe: () => () => undefined,
  };
}

test('[state-api.config] captureSnapshot rematerializes top modules and detaches structural buckets', () => {
  const store = createStoreStub({
    ui: { doors: 5, singleDoorPos: 'right', structureSelect: '', raw: { doors: 5, singleDoorPos: 'right' } },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ doors: 9, extDrawersCount: '4', intDrawersList: null, customData: {} }],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '2', customData: { storage: true } }],
      cornerConfiguration: {
        layout: 'drawers',
        extDrawersCount: '3',
        modulesConfiguration: [{ layout: 'hanging_top2' }],
        stackSplitLower: { modulesConfiguration: [{ extDrawersCount: '7' }] },
      },
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });

  const App: AnyRecord = { actions: {}, store };
  installStateApi(App as any);

  const snapshot = (App.actions as any).config.captureSnapshot();
  const snapRec = asRec(snapshot);
  const top = Array.isArray(snapRec.modulesConfiguration)
    ? (snapRec.modulesConfiguration as AnyRecord[])
    : [];
  const lower = Array.isArray(snapRec.stackSplitLowerModulesConfiguration)
    ? (snapRec.stackSplitLowerModulesConfiguration as AnyRecord[])
    : [];
  const corner = asRec(snapRec.cornerConfiguration);
  const cornerTop = Array.isArray(corner.modulesConfiguration)
    ? (corner.modulesConfiguration as AnyRecord[])
    : [];

  assert.deepEqual(
    top.map(entry => entry.doors),
    [2, 2, 1]
  );
  assert.equal(top[0].extDrawersCount, 4);
  assert.deepEqual(top[0].intDrawersList, []);
  assert.equal(asRec(corner).extDrawersCount, 3);

  lower[0].extDrawersCount = 99;
  cornerTop[0].layout = 'mutated';

  const cfg = asRec(store.getState().config);
  assert.equal(asRec((cfg.stackSplitLowerModulesConfiguration as AnyRecord[])[0]).extDrawersCount, '2');
  assert.equal(asRec(asRec(cfg.cornerConfiguration).modulesConfiguration?.[0]).layout, 'hanging_top2');
});

test('[state-api.config] applyProjectSnapshot materializes top modules against live structure before commit', () => {
  const store = createStoreStub({
    ui: { doors: 5, singleDoorPos: 'right', structureSelect: '', raw: { doors: 5, singleDoorPos: 'right' } },
    config: { wardrobeType: 'hinged', handlesMap: { keep: true } },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = { actions: {}, store };
  installStateApi(App as any);

  const inputCorner = { extDrawersCount: '2', modulesConfiguration: [{ layout: 'shelves' }] };
  const out = (App.actions as any).config.applyProjectSnapshot(
    {
      modulesConfiguration: [{ doors: 8, extDrawersCount: '5' }],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '6' }],
      cornerConfiguration: inputCorner,
      handlesMap: { next: 'bar' },
    },
    { source: 'test:project-snapshot' }
  );

  const patch = asRec(out);
  const top = Array.isArray(patch.modulesConfiguration) ? (patch.modulesConfiguration as AnyRecord[]) : [];
  assert.deepEqual(
    top.map(entry => entry.doors),
    [2, 2, 1]
  );
  assert.equal(top[0].extDrawersCount, 5);
  assert.equal(asRec(patch.cornerConfiguration).extDrawersCount, 2);
  assert.equal(asRec(store.getState().config.handlesMap).next, 'bar');

  inputCorner.extDrawersCount = '999';
  assert.equal(asRec(store.getState().config.cornerConfiguration).extDrawersCount, 2);

  const committedPatch = store.commits[0]?.patch || {};
  assert.deepEqual(
    (committedPatch.modulesConfiguration as AnyRecord[]).map(entry => entry.doors),
    [2, 2, 1]
  );
  assert.equal(asRec(store.commits[0]?.meta).source, 'test:project-snapshot');
});

test('[state-api.config] applyProjectSnapshot keeps library module signature from the incoming snapshot', () => {
  const store = createStoreStub({
    ui: {
      doors: 4,
      singleDoorPos: '',
      structureSelect: '[2,2]',
      raw: { doors: 4, structureSelect: '[2,2]' },
    },
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: false,
      modulesConfiguration: [createLibraryTopModuleConfig(2), createLibraryTopModuleConfig(2)],
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = { actions: {}, store };
  installStateApi(App as any);

  const incomingModules = [
    createLibraryTopModuleConfig(2),
    createLibraryTopModuleConfig(2),
    createLibraryTopModuleConfig(2),
  ];

  const out = (App.actions as any).config.applyProjectSnapshot(
    {
      wardrobeType: 'hinged',
      isLibraryMode: true,
      modulesConfiguration: incomingModules,
    },
    { source: 'test:library-preset:config-before-ui' }
  );

  const patch = asRec(out);
  const top = Array.isArray(patch.modulesConfiguration) ? (patch.modulesConfiguration as AnyRecord[]) : [];
  assert.deepEqual(
    top.map(entry => entry.doors),
    [2, 2, 2]
  );
  assert.deepEqual(
    top.map(entry => entry.gridDivisions),
    [5, 5, 5]
  );
  assert.deepEqual(
    top.map(entry => asRec(entry.customData).shelves),
    [
      [true, true, true, true, false],
      [true, true, true, true, false],
      [true, true, true, true, false],
    ]
  );

  const committedTop = store.commits[0]?.patch.modulesConfiguration as AnyRecord[];
  assert.equal(committedTop.length, 3);
  assert.equal(committedTop[2].gridDivisions, 5);
  assert.deepEqual(asRec(committedTop[2].customData).shelves, [true, true, true, true, false]);
});

test('[state-api.config] applyProjectSnapshot marks snapshot-owned visual/config branches for replace semantics', () => {
  const store = createStoreStub({
    ui: { doors: 4, raw: { doors: 4 } },
    config: {
      wardrobeType: 'hinged',
      grooveLinesCountMap: { groove_d1_full: 9 },
      doorTrimMap: { d1_full: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: 11 }] },
      doorStyleMap: { d1_full: 'profile' },
      mirrorLayoutMap: { d1_full: [{ widthCm: 55, heightCm: 88, faceSign: -1 }] },
      colorSwatchesOrder: ['oak', 'walnut'],
      savedNotes: [{ id: 'note-1', blocks: [{ text: 'stale' }] }],
      preChestState: { dims: { width: 80 } },
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = { actions: {}, store };
  installStateApi(App as any);

  (App.actions as any).config.applyProjectSnapshot(
    {
      grooveLinesCountMap: {},
      doorTrimMap: {},
      doorStyleMap: {},
      mirrorLayoutMap: {},
      colorSwatchesOrder: [],
      savedNotes: [],
      preChestState: null,
    },
    { source: 'test:project-snapshot:replace-branches' }
  );

  const committedPatch = asRec(store.commits[0]?.patch);
  const replace = asRec(committedPatch.__replace);
  assert.equal(replace.grooveLinesCountMap, true);
  assert.equal(replace.doorTrimMap, true);
  assert.equal(replace.doorStyleMap, true);
  assert.equal(replace.mirrorLayoutMap, true);
  assert.equal(replace.colorSwatchesOrder, true);
  assert.equal(replace.savedNotes, true);
  assert.equal(replace.preChestState, true);
  assert.deepEqual({ ...asRec(committedPatch.grooveLinesCountMap) }, {});
  assert.deepEqual({ ...asRec(committedPatch.doorTrimMap) }, {});
  assert.deepEqual({ ...asRec(committedPatch.doorStyleMap) }, {});
  assert.deepEqual({ ...asRec(committedPatch.mirrorLayoutMap) }, {});
  assert.deepEqual(committedPatch.colorSwatchesOrder, []);
  assert.deepEqual(committedPatch.savedNotes, []);
  assert.equal(committedPatch.preChestState, null);
});

test('[state-api.config] applyModulesGeometrySnapshot keeps modules structure-aware on store-backed paths', () => {
  const store = createStoreStub({
    ui: { doors: 5, singleDoorPos: 'right', structureSelect: '', raw: { doors: 5, singleDoorPos: 'right' } },
    config: { wardrobeType: 'hinged', wardrobeWidth: 200 },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = { actions: {}, store };
  installStateApi(App as any);

  (App.actions as any).config.applyModulesGeometrySnapshot(
    {
      modulesConfiguration: [{ layout: 'shelves' }],
      wardrobeWidth: 333,
    },
    { source: 'test:modules-geometry' }
  );

  const committedPatch = store.commits[0]?.patch || {};
  const top = Array.isArray(committedPatch.modulesConfiguration)
    ? (committedPatch.modulesConfiguration as AnyRecord[])
    : [];
  assert.deepEqual(
    top.map(entry => entry.doors),
    [2, 2, 1]
  );
  assert.equal(committedPatch.wardrobeWidth, 333);
  assert.equal(asRec(store.getState().config).wardrobeWidth, 333);
});

test('[state-api.config] captureSnapshot detaches non-structural config branches and normalizes collections', () => {
  const sourceSavedNotes = [{ id: 'note-1', blocks: [{ text: 'keep' }] }];
  const sourcePreChest = { dims: { width: 80 } };
  const sourceExtra = { nested: { enabled: true } };
  const store = createStoreStub({
    ui: { doors: 4, raw: { doors: 4 } },
    config: {
      wardrobeType: 'hinged',
      savedNotes: sourceSavedNotes,
      preChestState: sourcePreChest,
      savedColors: ['oak', { id: 'c2', value: '#000' }, { id: '' }],
      colorSwatchesOrder: [' c2 ', '', null],
      extraSettings: sourceExtra,
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = { actions: {}, store };
  installStateApi(App as any);

  const snapshot = (App.actions as any).config.captureSnapshot();
  const snapRec = asRec(snapshot);
  assert.deepEqual(snapRec.savedColors, [{ id: 'c2', value: '#000' }]);
  assert.deepEqual(snapRec.colorSwatchesOrder, ['c2']);

  ((snapRec.savedNotes as AnyRecord[])[0].blocks as AnyRecord[])[0].text = 'changed';
  ((snapRec.preChestState as AnyRecord).dims as AnyRecord).width = 120;
  ((snapRec.extraSettings as AnyRecord).nested as AnyRecord).enabled = false;

  assert.equal((((sourceSavedNotes[0] as AnyRecord).blocks as AnyRecord[])[0] as AnyRecord).text, 'keep');
  assert.equal((sourcePreChest.dims as AnyRecord).width, 80);
  assert.equal((sourceExtra.nested as AnyRecord).enabled, true);
});

test('[state-api.config] applyProjectSnapshot canonicalizes and detaches non-structural payload branches before commit', () => {
  const inputSavedNotes = [{ id: 'note-1', blocks: [{ text: 'keep' }] }];
  const inputPreChest = { dims: { width: 70 } };
  const inputExtra = { nested: { enabled: true } };
  const store = createStoreStub({
    ui: { doors: 4, raw: { doors: 4 } },
    config: { wardrobeType: 'hinged' },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = { actions: {}, store };
  installStateApi(App as any);

  const out = (App.actions as any).config.applyProjectSnapshot(
    {
      savedNotes: inputSavedNotes,
      preChestState: inputPreChest,
      savedColors: ['oak', { id: 'c3', value: '#333' }, { id: '' }],
      colorSwatchesOrder: [' c3 ', '', null],
      extraSettings: inputExtra,
    },
    { source: 'test:project-snapshot-non-structural' }
  );

  const patch = asRec(out);
  assert.deepEqual(patch.savedColors, [{ id: 'c3', value: '#333' }]);
  assert.deepEqual(patch.colorSwatchesOrder, ['c3']);

  (((patch.savedNotes as AnyRecord[])[0].blocks as AnyRecord[])[0] as AnyRecord).text = 'patched';
  ((patch.preChestState as AnyRecord).dims as AnyRecord).width = 99;
  ((patch.extraSettings as AnyRecord).nested as AnyRecord).enabled = false;

  assert.equal((((inputSavedNotes[0] as AnyRecord).blocks as AnyRecord[])[0] as AnyRecord).text, 'keep');
  assert.equal((inputPreChest.dims as AnyRecord).width, 70);
  assert.equal((inputExtra.nested as AnyRecord).enabled, true);

  const committedPatch = asRec(store.commits[0]?.patch || {});
  assert.deepEqual(committedPatch.savedColors, [{ id: 'c3', value: '#333' }]);
  assert.deepEqual(committedPatch.colorSwatchesOrder, ['c3']);
  assert.equal(asRec(store.commits[0]?.meta).source, 'test:project-snapshot-non-structural');

  (((committedPatch.savedNotes as AnyRecord[])[0].blocks as AnyRecord[])[0] as AnyRecord).text =
    'store-patched';
  ((committedPatch.preChestState as AnyRecord).dims as AnyRecord).width = 88;
  ((committedPatch.extraSettings as AnyRecord).nested as AnyRecord).enabled = false;

  assert.equal((((inputSavedNotes[0] as AnyRecord).blocks as AnyRecord[])[0] as AnyRecord).text, 'keep');
  assert.equal((inputPreChest.dims as AnyRecord).width, 70);
  assert.equal((inputExtra.nested as AnyRecord).enabled, true);
});

test('[state-api.config] applyPaintSnapshot commits door style with special glass atomically', () => {
  const store = createStoreStub({
    ui: {},
    config: {
      individualColors: {},
      curtainMap: {},
      doorSpecialMap: {},
      mirrorLayoutMap: {},
      doorStyleMap: {},
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = { actions: {}, store };
  installStateApi(App as any);

  (App.actions as any).config.applyPaintSnapshot(
    {},
    {},
    { source: 'test:paint-style-snapshot' },
    { drawer_1: 'glass' },
    {},
    { drawer_1: 'tom' }
  );

  const committedPatch = asRec(store.commits[0]?.patch);
  const replace = asRec(committedPatch.__replace);
  assert.deepEqual(asRec(committedPatch.doorSpecialMap), { drawer_1: 'glass' });
  assert.deepEqual(asRec(committedPatch.doorStyleMap), { drawer_1: 'tom' });
  assert.equal(replace.doorSpecialMap, true);
  assert.equal(replace.doorStyleMap, true);
});
