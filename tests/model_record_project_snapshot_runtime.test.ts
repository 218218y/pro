import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeModelRecord } from '../esm/native/features/model_record/model_record_normalizer.ts';
import { buildProjectStructureFromModel } from '../esm/native/services/models_apply_project_snapshot.ts';

test('normalizeModelRecord canonicalizes persisted model config maps and detaches nested branches', () => {
  const sourceModel: Record<string, any> = {
    id: 'model-1',
    name: 'Model 1',
    settings: { doors: 5, structureSelection: '[2,2,1]', wardrobeType: 'hinged' },
    modulesConfiguration: [{ layout: 'drawers', doors: '2' }, { doors: '2' }, { doors: '2' }],
    stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
    splitDoorsBottomMap: { lower: 1, off: 0, junk: 'maybe' },
    mirrorLayoutMap: { d1_full: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }] },
    doorTrimMap: {
      d1_full: [{ axis: 'vertical', span: 'custom', sizeCm: '11', color: 'gold' }, { bad: true }],
    },
    preChestState: { dims: { width: 55 } },
    savedNotes: [{ id: 'n1', blocks: [{ text: 'keep' }] }],
  };

  const normalized = normalizeModelRecord(sourceModel as never);

  assert.deepEqual({ ...normalized.splitDoorsBottomMap }, { lower: true, off: false });
  assert.deepEqual({ ...normalized.mirrorLayoutMap }, { d1_full: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(Array.isArray(normalized.doorTrimMap?.d1_full), true);
  assert.equal(normalized.doorTrimMap?.d1_full?.length, 2);
  assert.equal(normalized.doorTrimMap?.d1_full?.[0]?.axis, 'vertical');
  assert.equal(normalized.doorTrimMap?.d1_full?.[0]?.sizeCm, 11);

  const sourcePreChestDims = sourceModel.preChestState.dims as Record<string, unknown>;
  const sourceSavedNoteBlock = (sourceModel.savedNotes[0].blocks as Record<string, unknown>[])[0] as Record<
    string,
    unknown
  >;
  sourcePreChestDims.width = 99;
  sourceSavedNoteBlock.text = 'mutated';

  const normalizedPreChestDims = (normalized.preChestState as Record<string, unknown>).dims as Record<
    string,
    unknown
  >;
  const normalizedSavedNoteBlock = (
    (normalized.savedNotes as Record<string, unknown>[])[0].blocks as Record<string, unknown>[]
  )[0] as Record<string, unknown>;
  assert.equal(normalizedPreChestDims.width, 55);
  assert.equal(normalizedSavedNoteBlock.text, 'keep');
});

test('buildProjectStructureFromModel keeps canonical mirror/layout payloads and detaches model-owned branches', () => {
  const appState = {
    ui: {
      orderPdfEditorDraft: { notes: 'keep', nested: { value: 1 } },
      orderPdfEditorZoom: 1.5,
    },
    config: {
      savedColors: [{ id: 'keep-color', value: '#fff' }],
    },
  };

  const App = {
    store: {
      getState: () => appState,
      patch: () => true,
    },
    util: {
      normalizeSplitDoorsMapWithDoors(map: unknown) {
        return map;
      },
    },
  } as never;

  const model: Record<string, any> = {
    id: 'model-2',
    name: 'Model 2',
    settings: { width: 240, doors: 5, structureSelection: '[2,2,1]', wardrobeType: 'hinged' },
    modulesConfiguration: [{ doors: '2' }, { doors: '2' }, { doors: '2' }],
    stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
    splitDoorsMap: { main: ['1', 2, 'bad'] },
    splitDoorsBottomMap: { lower: 1, off: 0 },
    mirrorLayoutMap: { d1_full: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }] },
    doorTrimMap: { d1_full: [{ axis: 'vertical', color: 'gold' }] },
    savedNotes: [{ blocks: [{ text: 'note' }] }],
    preChestState: { dims: { width: 55 } },
    isLibraryMode: true,
  };

  const built = buildProjectStructureFromModel(App, model as never);

  assert.deepEqual(built.savedColors, [{ id: 'keep-color', value: '#fff' }]);
  assert.deepEqual(built.splitDoorsMap, { main: [1, 2] });
  assert.deepEqual({ ...built.splitDoorsBottomMap }, { lower: true, off: false });
  assert.deepEqual({ ...built.mirrorLayoutMap }, { d1_full: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(Array.isArray(built.doorTrimMap?.d1_full), true);
  assert.equal(built.doorTrimMap?.d1_full?.[0]?.color, 'gold');
  assert.equal(built.modulesConfiguration?.[2]?.doors, 1);
  assert.equal(built.stackSplitLowerModulesConfiguration?.[0]?.extDrawersCount, 3);
  assert.equal(built.cornerConfiguration?.layout, 'shelves');
  assert.equal(built.isLibraryMode, true);
  assert.notEqual(built.orderPdfEditorDraft, appState.ui.orderPdfEditorDraft);

  model.mirrorLayoutMap.d1_full[0].widthCm = 99;
  model.doorTrimMap.d1_full[0].color = 'black';
  const modelPreChestDims = model.preChestState.dims as Record<string, unknown>;
  const modelSavedNoteBlock = (model.savedNotes[0].blocks as Record<string, unknown>[])[0] as Record<
    string,
    unknown
  >;
  modelPreChestDims.width = 77;
  modelSavedNoteBlock.text = 'changed';

  assert.deepEqual({ ...built.mirrorLayoutMap }, { d1_full: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(built.doorTrimMap?.d1_full?.[0]?.color, 'gold');
  const builtPreChestDims = (built.preChestState as Record<string, unknown>).dims as Record<string, unknown>;
  const builtSavedNoteBlock = (
    (built.savedNotes as Record<string, unknown>[])[0].blocks as Record<string, unknown>[]
  )[0] as Record<string, unknown>;
  assert.equal(builtPreChestDims.width, 55);
  assert.equal(builtSavedNoteBlock.text, 'note');
});

test('buildProjectStructureFromModel reuses the persisted config projection without leaking model-owned branches', () => {
  const App = {
    store: {
      getState: () => ({ ui: {}, config: { savedColors: [] } }),
      patch: () => true,
    },
  } as never;

  const model = {
    id: 'model-3',
    name: 'Model 3',
    settings: { doors: 2, structureSelection: '[1,1]', wardrobeType: 'hinged' },
    savedNotes: [{ id: 'n1', blocks: [{ text: 'keep' }] }],
    mirrorLayoutMap: { d1: [{ widthCm: '55', heightCm: 88 }] },
    doorTrimMap: { d1: [{ axis: 'vertical', color: 'gold' }] },
    preChestState: { dims: { width: 55 } },
  } as Record<string, any>;

  const built = buildProjectStructureFromModel(App, model as never);
  assert.deepEqual({ ...built.mirrorLayoutMap }, { d1: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(built.doorTrimMap?.d1?.[0]?.color, 'gold');
  assert.equal(((built.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width, 55);

  model.mirrorLayoutMap.d1[0].widthCm = 99;
  model.doorTrimMap.d1[0].color = 'black';
  (model.preChestState.dims as Record<string, unknown>).width = 77;

  assert.deepEqual({ ...built.mirrorLayoutMap }, { d1: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(built.doorTrimMap?.d1?.[0]?.color, 'gold');
  assert.equal(((built.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width, 55);
});

test('buildProjectStructureFromModel detaches settings toggles and chest settings snapshots from the source model', () => {
  const App = {
    store: {
      getState: () => ({ ui: {}, config: { savedColors: [] } }),
      patch: () => true,
    },
  } as never;

  const model = {
    id: 'model-4',
    name: 'Model 4',
    settings: { doors: 2, structureSelection: '[1,1]', wardrobeType: 'hinged', width: 240 },
    toggles: { groovesEnabled: true },
    chestSettings: { mode: 'double', dims: { width: 60 } },
  } as Record<string, any>;

  const built = buildProjectStructureFromModel(App, model as never) as Record<string, unknown>;
  const builtSettings = built.settings as Record<string, unknown>;
  const builtToggles = built.toggles as Record<string, unknown>;
  const builtChest = built.chestSettings as Record<string, unknown>;

  (model.settings as Record<string, unknown>).width = 999;
  (model.toggles as Record<string, unknown>).groovesEnabled = false;
  ((model.chestSettings as Record<string, unknown>).dims as Record<string, unknown>).width = 90;

  assert.equal(builtSettings.width, 240);
  assert.equal(builtToggles.groovesEnabled, true);
  assert.equal((builtChest.dims as Record<string, unknown>).width, 60);
});
