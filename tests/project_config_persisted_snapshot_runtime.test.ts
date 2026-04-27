import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalizeComparableProjectConfigPatch,
  canonicalizeComparableProjectConfigSnapshot,
  PERSISTED_PROJECT_CONFIG_BRANCH_KEYS,
} from '../esm/native/features/project_config/project_config_snapshot_canonical.ts';
import {
  readConfigStateProjectConfigSnapshot,
  readPersistedProjectConfigSnapshot,
} from '../esm/native/features/project_config/project_config_persisted_snapshot.ts';

test('project config comparable patch canonicalizes only provided branches and detaches comparable custom payloads', () => {
  const sourceNotes = [{ id: 'n1', blocks: [{ text: 'keep' }] }];
  const sourceCustomMeta: Record<string, unknown> = { accent: 'oak', nested: { keep: true } };

  const patch = canonicalizeComparableProjectConfigPatch({
    savedNotes: sourceNotes,
    mirrorLayoutMap: { d1: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }] },
    customMeta: sourceCustomMeta,
  } as never);

  assert.equal('modulesConfiguration' in patch, false);
  assert.equal('stackSplitLowerModulesConfiguration' in patch, false);
  assert.equal('cornerConfiguration' in patch, false);
  assert.deepEqual({ ...patch.mirrorLayoutMap }, { d1: [{ widthCm: 55, heightCm: 88 }] });
  assert.notEqual(patch.savedNotes, sourceNotes);
  assert.notEqual(patch.customMeta, sourceCustomMeta);

  (
    ((patch.savedNotes as Record<string, unknown>[])[0].blocks as Record<string, unknown>[])[0] as Record<
      string,
      unknown
    >
  ).text = 'changed';
  ((patch.customMeta as Record<string, unknown>).nested as Record<string, unknown>).keep = false;

  assert.equal((sourceNotes[0].blocks as Record<string, unknown>[])[0].text, 'keep');
  assert.equal((sourceCustomMeta.nested as Record<string, unknown>).keep, true);
});

test('project config persisted snapshot readers share a canonical branch list and omit non-persisted top-level branches', () => {
  const canonical = canonicalizeComparableProjectConfigSnapshot(
    {
      settings: {
        doors: 2,
        wardrobeType: 'hinged',
        singleDoorPos: 'left',
        structureSelection: '[1,1]',
      },
      modulesConfiguration: [{ layout: 'drawers', doors: '2' }],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
      cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
      savedColors: ['oak', { id: 'c2', value: '#222' }, { id: '' }],
      savedNotes: [{ id: 'n1', blocks: [{ text: 'keep' }] }],
      splitDoorsBottomMap: { d1: 1, drop: 0 },
      mirrorLayoutMap: { d1: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }] },
      doorTrimMap: { d1: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: '11' }, { bad: true }] },
      preChestState: { dims: { width: 55 } },
      isLibraryMode: true,
      grooveLinesCount: '4',
      customMeta: { should: 'drop' },
    } as never,
    { savedColorsMode: 'mixed' }
  );

  const persisted = readPersistedProjectConfigSnapshot(canonical);
  const configState = readConfigStateProjectConfigSnapshot(canonical);
  const expectedKeys = [...PERSISTED_PROJECT_CONFIG_BRANCH_KEYS].sort();

  assert.deepEqual(Object.keys(persisted).sort(), expectedKeys);
  assert.deepEqual(Object.keys(configState).sort(), expectedKeys);
  assert.equal('customMeta' in persisted, false);
  assert.deepEqual(persisted, configState);
  assert.deepEqual(persisted.savedColors, ['oak', { id: 'c2', value: '#222' }]);
  assert.deepEqual({ ...persisted.splitDoorsBottomMap }, { d1: 1, drop: 0 });
  assert.deepEqual({ ...persisted.mirrorLayoutMap }, { d1: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(Array.isArray(persisted.doorTrimMap.d1), true);
  assert.equal(persisted.doorTrimMap.d1[0].axis, 'vertical');
  assert.equal(persisted.doorTrimMap.d1[0].color, 'gold');
  assert.equal(persisted.doorTrimMap.d1[0].span, 'custom');
  assert.equal(persisted.doorTrimMap.d1[0].sizeCm, 11);
  assert.equal(persisted.grooveLinesCount, 4);
  assert.equal(persisted.isLibraryMode, true);
});

test('project config persisted snapshot readers sanitize structural and map branches even when given a loose raw snapshot', () => {
  const persisted = readPersistedProjectConfigSnapshot({
    modulesConfiguration: [{ layout: 'drawers', doors: '2' }, null, { customData: { storage: true } }],
    stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
    splitDoorsBottomMap: { d1: 1, drop: 0, junk: 'bad' },
    mirrorLayoutMap: { d1: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }] },
    doorTrimMap: { d1: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: '11' }, { bad: true }] },
    savedColors: ['oak', { id: 'c2', value: '#222', nested: { keep: true } }, { id: '' }],
    savedNotes: [{ id: 'n1', blocks: [{ text: 'keep' }] }],
    preChestState: { dims: { width: 55 } },
    grooveLinesCount: '4',
    isLibraryMode: true,
  } as never);

  assert.equal(persisted.modulesConfiguration[0].doors, 2);
  assert.equal(persisted.modulesConfiguration[1].doors, 2);
  assert.equal(persisted.modulesConfiguration[2].doors, 2);
  assert.equal(persisted.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(Array.isArray(persisted.cornerConfiguration.modulesConfiguration), true);
  assert.equal(persisted.cornerConfiguration.modulesConfiguration?.[0]?.doors, '5');
  assert.deepEqual({ ...persisted.splitDoorsBottomMap }, { d1: 1, drop: 0 });
  assert.deepEqual({ ...persisted.mirrorLayoutMap }, { d1: [{ widthCm: 55, heightCm: 88 }] });
  assert.equal(persisted.doorTrimMap.d1[0].sizeCm, 11);
  assert.deepEqual(persisted.savedColors, ['oak', { id: 'c2', value: '#222' }]);
  assert.equal(
    ((persisted.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width,
    55
  );
  assert.equal(persisted.grooveLinesCount, undefined);
  assert.equal(persisted.isLibraryMode, true);
});
