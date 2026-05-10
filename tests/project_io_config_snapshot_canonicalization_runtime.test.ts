import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProjectConfigSnapshot } from '../esm/native/io/project_io_load_helpers.ts';
import { canonicalizeComparableProjectConfigSnapshot } from '../esm/native/features/project_config/project_config_snapshot_canonical.ts';
import {
  buildDefaultProjectDataSnapshot,
  finalizeProjectForSavePayload,
} from '../esm/native/io/project_io_save_helpers.ts';

test('project io load snapshot rematerializes top modules with structure-aware doors', () => {
  const cfg = buildProjectConfigSnapshot({
    settings: {
      doors: 5,
      wardrobeType: 'hinged',
      singleDoorPos: 'left',
      structureSelection: '[2,2,1]',
    },
    modulesConfiguration: [{ layout: 'drawers', doors: '2' }, null, { customData: { storage: true } }],
    stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
  } as never);

  assert.equal(cfg.modulesConfiguration.length, 3);
  assert.equal(cfg.modulesConfiguration[0].doors, 2);
  assert.equal(cfg.modulesConfiguration[0].layout, 'drawers');
  assert.equal(cfg.modulesConfiguration[1].doors, 2);
  assert.equal(cfg.modulesConfiguration[1].layout, 'shelves');
  assert.equal(cfg.modulesConfiguration[2].doors, 1);
  assert.equal(cfg.modulesConfiguration[2].layout, 'shelves');
  assert.equal(cfg.modulesConfiguration[2].customData?.storage, true);
  assert.equal(cfg.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(cfg.cornerConfiguration.layout, 'shelves');
  assert.ok(Array.isArray(cfg.cornerConfiguration.modulesConfiguration));
});

test('project io default snapshot rematerializes saved module lists before export', () => {
  const snap = buildDefaultProjectDataSnapshot({
    ui: {
      raw: { doors: 5 },
      structureSelect: '[2,2,1]',
      singleDoorPos: 'left',
    },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ layout: 'drawers', doors: '2' }, null, { customData: { storage: true } }],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '4' }],
      cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
    },
  } as never);

  assert.equal(snap.modulesConfiguration.length, 3);
  assert.equal(snap.modulesConfiguration[2].doors, 1);
  assert.equal(snap.modulesConfiguration[2].customData?.storage, true);
  assert.equal(snap.stackSplitLowerModulesConfiguration[0].extDrawersCount, 4);
  assert.equal(snap.cornerConfiguration.layout, 'shelves');
});

test('project save finalizer canonicalizes captured module lists from raw payload snapshots', () => {
  const finalized = finalizeProjectForSavePayload(
    {
      settings: {
        doors: 5,
        wardrobeType: 'hinged',
        singleDoorPos: 'left',
        structureSelection: '[2,2,1]',
      },
      modulesConfiguration: [{ layout: 'drawers', doors: '2' }, null, { customData: { storage: true } }],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '2' }],
      cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
    },
    {
      cloneJson: value => JSON.parse(JSON.stringify(value)),
      schemaId: 'wardrobepro.test',
      schemaVersion: 77,
    }
  );

  assert.equal(finalized.modulesConfiguration.length, 3);
  assert.equal(finalized.modulesConfiguration[1].doors, 2);
  assert.equal(finalized.modulesConfiguration[2].doors, 1);
  assert.equal(finalized.stackSplitLowerModulesConfiguration[0].extDrawersCount, 2);
  assert.equal(finalized.cornerConfiguration.layout, 'shelves');
});

test('project io default snapshot canonicalizes persisted config maps while preserving mixed saved colors', () => {
  const sourceSavedColors = ['oak', { id: 'c2', value: '#222' }, { id: '' }];
  const sourcePreChestState = { dims: { width: 55 } };
  const snap = buildDefaultProjectDataSnapshot({
    ui: {
      raw: { doors: 2 },
      structureSelect: '[1,1]',
      singleDoorPos: 'left',
    },
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: true,
      savedColors: sourceSavedColors,
      splitDoorsBottomMap: { d1: 1, drop: 0 },
      mirrorLayoutMap: { d1: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }] },
      doorTrimMap: { d1: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: '11' }, { bad: true }] },
      preChestState: sourcePreChestState,
    },
  } as never);

  assert.deepEqual(snap.savedColors, ['oak', { id: 'c2', value: '#222' }]);
  assert.deepEqual({ ...snap.splitDoorsBottomMap }, { splitb_d1: true, drop: false });
  assert.deepEqual({ ...snap.mirrorLayoutMap }, { d1: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(Array.isArray(snap.doorTrimMap.d1), true);
  assert.equal(snap.doorTrimMap.d1.length, 2);
  assert.equal(snap.doorTrimMap.d1[0].axis, 'vertical');
  assert.equal(snap.doorTrimMap.d1[0].color, 'gold');
  assert.equal(snap.doorTrimMap.d1[0].span, 'custom');
  assert.equal(snap.doorTrimMap.d1[0].sizeCm, 11);
  assert.equal(snap.isLibraryMode, true);
  assert.notEqual(snap.preChestState, sourcePreChestState);
  ((snap.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width = 77;
  assert.equal((sourcePreChestState.dims as Record<string, unknown>).width, 55);
});

test('project save finalizer detaches persisted notes and canonicalizes config maps without dropping mixed saved colors', () => {
  const sourceSavedNotes = [{ id: 'n1', blocks: [{ text: 'keep' }] }];
  const sourceProject = {
    settings: {
      doors: 2,
      wardrobeType: 'hinged',
      singleDoorPos: 'left',
      structureSelection: '[1,1]',
    },
    savedNotes: sourceSavedNotes,
    savedColors: ['oak', { id: 'c2', value: '#222' }, { id: '' }],
    splitDoorsBottomMap: { d1: 1, drop: 0 },
    mirrorLayoutMap: { d1: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }] },
    doorTrimMap: { d1: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: '11' }, { bad: true }] },
    preChestState: { dims: { width: 55 } },
  };

  const finalized = finalizeProjectForSavePayload(sourceProject as never, {
    cloneJson: value => JSON.parse(JSON.stringify(value)),
    schemaId: 'wardrobepro.test',
    schemaVersion: 77,
  });

  assert.deepEqual(finalized.savedColors, ['oak', { id: 'c2', value: '#222' }]);
  assert.deepEqual({ ...finalized.splitDoorsBottomMap }, { splitb_d1: true, drop: false });
  assert.deepEqual({ ...finalized.mirrorLayoutMap }, { d1: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(Array.isArray(finalized.doorTrimMap.d1), true);
  assert.equal(finalized.doorTrimMap.d1.length, 2);
  assert.equal(finalized.doorTrimMap.d1[0].axis, 'vertical');
  assert.equal(finalized.doorTrimMap.d1[0].color, 'gold');
  assert.equal(finalized.doorTrimMap.d1[0].span, 'custom');
  assert.equal(finalized.doorTrimMap.d1[0].sizeCm, 11);
  assert.notEqual(finalized.savedNotes, sourceSavedNotes);
  (
    ((finalized.savedNotes as Record<string, unknown>[])[0].blocks as Record<string, unknown>[])[0] as Record<
      string,
      unknown
    >
  ).text = 'changed';
  assert.equal((sourceSavedNotes[0].blocks as Record<string, unknown>[])[0].text, 'keep');
});

test('project config comparable snapshot tolerates cyclic custom branches and detaches them from the source payload', () => {
  const sourceMeta: Record<string, unknown> = { accent: 'red' };
  sourceMeta.self = sourceMeta;

  const snapshot = canonicalizeComparableProjectConfigSnapshot({
    settings: {
      doors: 2,
      wardrobeType: 'hinged',
      singleDoorPos: 'left',
      structureSelection: '[1,1]',
    },
    customMeta: sourceMeta,
  } as never);

  const customMeta = snapshot.customMeta as Record<string, unknown>;
  assert.ok(customMeta);
  assert.notEqual(customMeta, sourceMeta);
  assert.equal(customMeta.self, customMeta);

  (customMeta.self as Record<string, unknown>).accent = 'blue';
  assert.equal(sourceMeta.accent, 'red');
});

test('project io load snapshot detaches raw config branches and normalizes live saved colors to object entries', () => {
  const sourceSavedColors = ['legacy-oak', { id: 'c2', value: '#222', extra: { keep: true } }, { id: '' }];
  const sourcePreChestState = { dims: { width: 55 }, nested: [{ id: 'pc1' }] };
  const sourceHingeMap = { d1: { side: 'left', nested: { keep: true } } };

  const cfg = buildProjectConfigSnapshot({
    settings: {
      doors: 2,
      wardrobeType: 'hinged',
      singleDoorPos: 'left',
      structureSelection: '[1,1]',
    },
    savedColors: sourceSavedColors,
    preChestState: sourcePreChestState,
    hingeMap: sourceHingeMap,
    isLibraryMode: true,
  } as never);

  assert.deepEqual(cfg.savedColors, [{ id: 'c2', value: '#222' }]);
  assert.equal(cfg.isLibraryMode, true);
  assert.notEqual(cfg.savedColors, sourceSavedColors);
  assert.notEqual(cfg.preChestState, sourcePreChestState);
  assert.notEqual(cfg.hingeMap, sourceHingeMap);

  ((cfg.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width = 77;
  (
    ((cfg.hingeMap as Record<string, unknown>).d1 as Record<string, unknown>).nested as Record<
      string,
      unknown
    >
  ).keep = false;
  ((cfg.savedColors as Record<string, unknown>[])[0] as Record<string, unknown>).value = '#999';

  assert.equal((sourcePreChestState.dims as Record<string, unknown>).width, 55);
  assert.equal(((sourceHingeMap.d1 as Record<string, unknown>).nested as Record<string, unknown>).keep, true);
  assert.equal((sourceSavedColors[1] as Record<string, unknown>).value, '#222');
});

test('project io load snapshot unwraps payload envelopes before canonicalization', () => {
  const cfg = buildProjectConfigSnapshot({
    payload: {
      settings: {
        doors: 2,
        wardrobeType: 'hinged',
        singleDoorPos: 'left',
        structureSelection: '[1,1]',
      },
      savedColors: ['legacy-oak', { id: 'c2', value: '#222' }],
      grooveLinesCount: '5',
      isLibraryMode: true,
    },
  } as never);

  assert.deepEqual(cfg.savedColors, [{ id: 'c2', value: '#222' }]);
  assert.equal(cfg.wardrobeType, 'hinged');
  assert.equal(cfg.grooveLinesCount, 5);
  assert.equal(cfg.isLibraryMode, true);
});

test('project save/default helpers share the same persisted config projection for comparable branches', () => {
  const source = {
    settings: {
      doors: 2,
      wardrobeType: 'hinged',
      singleDoorPos: 'left',
      structureSelection: '[1,1]',
    },
    savedColors: ['oak', { id: 'c2', value: '#222' }],
    savedNotes: [{ id: 'n1', blocks: [{ text: 'keep' }] }],
    splitDoorsBottomMap: { d1: 1, drop: 0 },
    mirrorLayoutMap: { d1: [{ widthCm: '55', heightCm: 88 }] },
    doorTrimMap: { d1: [{ axis: 'vertical', color: 'gold' }] },
    preChestState: { dims: { width: 55 } },
  };

  const finalized = finalizeProjectForSavePayload(source as never, {
    cloneJson: value => JSON.parse(JSON.stringify(value)),
    schemaId: 'wardrobepro.test',
    schemaVersion: 77,
  });
  const builtDefault = buildDefaultProjectDataSnapshot({
    ui: {
      raw: { doors: 2 },
      structureSelect: '[1,1]',
      singleDoorPos: 'left',
    },
    config: source,
  } as never);

  assert.deepEqual({ ...builtDefault.splitDoorsBottomMap }, { ...finalized.splitDoorsBottomMap });
  assert.deepEqual({ ...builtDefault.mirrorLayoutMap }, { ...finalized.mirrorLayoutMap });
  assert.equal(Array.isArray(builtDefault.doorTrimMap.d1), true);
  assert.equal(Array.isArray(finalized.doorTrimMap.d1), true);
  assert.equal(builtDefault.doorTrimMap.d1[0].axis, finalized.doorTrimMap.d1[0].axis);
  assert.equal(builtDefault.doorTrimMap.d1[0].color, finalized.doorTrimMap.d1[0].color);
  assert.equal(builtDefault.doorTrimMap.d1[0].span, finalized.doorTrimMap.d1[0].span);
  assert.equal(builtDefault.doorTrimMap.d1[0].sizeCm, finalized.doorTrimMap.d1[0].sizeCm);
  assert.deepEqual(builtDefault.savedColors, finalized.savedColors);
  assert.deepEqual(builtDefault.preChestState, finalized.preChestState);
});

test('project config comparable snapshot canonicalizes duplicate color swatch order ids and keeps first unique entry', () => {
  const snapshot = canonicalizeComparableProjectConfigSnapshot({
    settings: {
      doors: 2,
      wardrobeType: 'hinged',
      singleDoorPos: 'left',
      structureSelection: '[1,1]',
    },
    savedColors: ['legacy-oak', { id: 'c2', value: '#222' }, { id: 'c2', value: '#333' }],
    colorSwatchesOrder: [' legacy-oak ', 'c2', 'legacy-oak', null, '', 7, '7'],
  } as never);

  assert.deepEqual(snapshot.savedColors, [{ id: 'c2', value: '#222' }]);
  assert.deepEqual(snapshot.colorSwatchesOrder, ['legacy-oak', 'c2', '7']);
});

test('project io corner config tolerates sparse customData snapshots and rematerializes normalized shelves/rods arrays', () => {
  const source = {
    settings: {
      doors: 2,
      wardrobeType: 'hinged',
      singleDoorPos: 'left',
      structureSelection: '[1,1]',
    },
    cornerConfiguration: {
      layout: 'drawers',
      customData: { storage: true },
      stackSplitLower: {
        customData: { rods: [true, false, true] },
        modulesConfiguration: [{ layout: 'shelves' }],
      },
    },
  };

  const loaded = buildProjectConfigSnapshot(source as never);
  const finalized = finalizeProjectForSavePayload(source as never, {
    cloneJson: value => JSON.parse(JSON.stringify(value)),
    schemaId: 'wardrobepro.test',
    schemaVersion: 77,
  });

  assert.equal(loaded.cornerConfiguration.customData.storage, true);
  assert.deepEqual(loaded.cornerConfiguration.customData.shelves, [false, false, false, false, false, false]);
  assert.deepEqual(loaded.cornerConfiguration.customData.rods, [false, false, false, false, false, false]);
  assert.deepEqual(finalized.cornerConfiguration.customData.shelves, [
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  assert.deepEqual(finalized.cornerConfiguration.customData.rods, [false, false, false, false, false, false]);
  assert.equal(finalized.cornerConfiguration.stackSplitLower.modulesConfiguration[0].layout, 'shelves');
});
