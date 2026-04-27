import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProjectPdfUiPatch,
  preserveUiEphemeral,
} from '../dist/esm/native/io/project_io_load_helpers.js';
import {
  buildProjectStructureFromModel,
  loadProjectStructureResult,
} from '../dist/esm/native/services/models_apply_project.js';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function asPlainRecord(value) {
  return value ? { ...value } : {};
}

function createStoreState(overrides = {}) {
  return {
    ui: {},
    config: {},
    runtime: {},
    mode: {},
    meta: {},
    ...overrides,
  };
}

test('project/model release regressions preserve UI ephemerals without mutating the incoming snapshot', () => {
  const uiSnap = { projectName: 'Demo' };
  const uiNow = {
    activeTab: 'structure',
    selectedModelId: 'model-7',
    site2TabsGateOpen: true,
    site2TabsGateUntil: 123456,
    site2TabsGateBy: 'client-1',
  };

  const next = preserveUiEphemeral(uiSnap, uiNow);

  assert.notEqual(next, uiSnap);
  assert.deepEqual(next, {
    projectName: 'Demo',
    activeTab: 'structure',
    selectedModelId: 'model-7',
    site2TabsGateOpen: true,
    site2TabsGateUntil: 123456,
    site2TabsGateBy: 'client-1',
  });
  assert.deepEqual(uiSnap, { projectName: 'Demo' });
});

test('project/model release regressions deep-clone the PDF overlay patch payload', () => {
  const sourceDraft = {
    notes: 'Hello',
    nested: { keep: 1 },
    items: [1, { ok: true }],
  };

  const patch = buildProjectPdfUiPatch(
    {
      orderPdfEditorDraft: sourceDraft,
      orderPdfEditorZoom: '2.5',
    },
    cloneJson
  );

  assert.notEqual(patch.orderPdfEditorDraft, sourceDraft);
  assert.deepEqual(patch.orderPdfEditorDraft, {
    notes: 'Hello',
    nested: { keep: 1 },
    items: [1, { ok: true }],
  });
  sourceDraft.nested.keep = 9;
  assert.equal(patch.orderPdfEditorDraft.nested.keep, 1);
  assert.equal(patch.orderPdfEditorZoom, 2.5);
});

test('project/model release regressions preserve current PDF draft, canonicalize config lists, and detach model payload slices during model apply payload build', () => {
  const state = createStoreState({
    ui: {
      orderPdfEditorDraft: {
        manualEnabled: true,
        notes: 'Keep me',
        nested: { value: 1 },
      },
      orderPdfEditorZoom: 1.75,
    },
    config: {
      savedColors: [{ id: 'c1', hex: '#fff' }],
    },
  });

  const App = {
    store: {
      getState: () => state,
      patch: () => true,
    },
    util: {
      normalizeSplitDoorsMapWithDoors(map) {
        return map;
      },
    },
  };

  const model = {
    settings: { width: 240, doors: 5, structureSelection: '[2,2,1]', wardrobeType: 'hinged' },
    toggles: { sketchMode: false },
    modulesConfiguration: [
      { id: 'm1', doors: '2' },
      { id: 'm2', doors: '2' },
      { id: 'm3', doors: '2' },
    ],
    stackSplitLowerModulesConfiguration: [{ id: 'lower-1', extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
    splitDoorsMap: { main: ['1', 2, 'bad'] },
    splitDoorsBottomMap: { lower: 1, off: 0 },
    doorTrimMap: { d1_full: [{ axis: 'vertical', color: 'gold' }] },
    savedNotes: [{ text: 'note' }],
    preChestState: { enabled: true },
    isLibraryMode: true,
  };

  const built = buildProjectStructureFromModel(App, model);

  assert.deepEqual(built.savedColors, [{ id: 'c1', hex: '#fff' }]);
  assert.notEqual(built.orderPdfEditorDraft, state.ui.orderPdfEditorDraft);
  assert.deepEqual(built.orderPdfEditorDraft, {
    manualEnabled: true,
    notes: 'Keep me',
    nested: { value: 1 },
  });
  assert.equal(built.orderPdfEditorZoom, 1.75);
  assert.deepEqual(asPlainRecord(built.splitDoorsMap), { main: [1, 2] });
  assert.deepEqual(asPlainRecord(built.splitDoorsBottomMap), { lower: 1, off: 0 });
  assert.equal(built.modulesConfiguration[2].doors, 1);
  assert.equal(built.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(built.cornerConfiguration.layout, 'shelves');
  assert.equal(built.isLibraryMode, true);
  assert.deepEqual(asPlainRecord(built.preChestState), { enabled: true });

  model.modulesConfiguration[2].doors = '9';
  model.stackSplitLowerModulesConfiguration[0].extDrawersCount = '9';
  model.cornerConfiguration.modulesConfiguration[0].doors = '9';
  model.doorTrimMap.d1_full[0].color = 'black';
  assert.equal(built.modulesConfiguration[2].doors, 1);
  assert.equal(built.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(built.cornerConfiguration.modulesConfiguration[0].doors, '5');
  assert.equal(built.doorTrimMap.d1_full[0].color, 'gold');
});

test('project/model release regressions route model apply through silent canonical project-load semantics', () => {
  const seen = [];
  const projectStructure = { settings: { width: 120 } };
  const App = {
    services: {
      history: {
        system: {
          pushState() {
            seen.push(['history.push']);
          },
        },
      },
      projectIO: {
        loadProjectData(data, opts) {
          seen.push(['projectIO.load', data, opts]);
          return { ok: true, restoreGen: 11 };
        },
      },
    },
  };

  const result = loadProjectStructureResult(App, projectStructure);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(seen, [
    ['history.push'],
    ['projectIO.load', projectStructure, { toast: false, meta: { source: 'model.apply' } }],
    ['history.push'],
  ]);
});
