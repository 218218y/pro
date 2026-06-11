import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStructureCfgSnapshot,
  buildStructureUiSnapshotFromSettings,
  buildStructureUiSnapshotFromUiState,
  canonicalizeProjectConfigStructuralLists,
  canonicalizeProjectConfigStructuralPatch,
  canonicalizeProjectConfigStructuralSnapshot,
} from '../esm/native/features/project_config/project_config_lists_canonical.ts';

test('project config canonicalization: structural list helper reconciles sparse top modules against structure context and keeps empty corner snapshots light in auto mode', () => {
  const result = canonicalizeProjectConfigStructuralLists(
    {
      modulesConfiguration: [
        { doors: '9', layout: 'drawers', customData: { storage: true } },
        null,
        { customData: { storage: false } },
      ],
      stackSplitLowerModulesConfiguration: [{ extDrawersCount: '4' }, null],
      cornerConfiguration: {},
    },
    {
      settings: {
        doors: 5,
        singleDoorPos: 'right',
        structureSelection: '',
        wardrobeType: 'hinged',
      },
      cornerMode: 'auto',
    }
  );

  assert.deepEqual(
    result.modulesConfiguration.map((entry: any) => entry.doors),
    [9, 2, 1]
  );
  assert.equal(result.modulesConfiguration[0].customData.storage, true);
  assert.equal(result.stackSplitLowerModulesConfiguration[0].extDrawersCount, 4);
  assert.equal(result.stackSplitLowerModulesConfiguration[1].extDrawersCount, 0);
  assert.deepEqual(result.cornerConfiguration, {});
});

test('project config canonicalization: full structural snapshot seeds detached full corner defaults when requested', () => {
  const uiSnapshot = buildStructureUiSnapshotFromUiState({
    doors: 5,
    singleDoorPos: 'right',
    structureSelect: '',
    raw: { doors: 5, singleDoorPos: 'right', structureSelect: '' },
  });
  const cfgSeed: any = { wardrobeType: 'hinged', cornerConfiguration: {} };

  const snapshot = canonicalizeProjectConfigStructuralSnapshot(cfgSeed, {
    uiSnapshot,
    cfgSnapshot: cfgSeed,
    cornerMode: 'full',
  });

  assert.equal(snapshot.cornerConfiguration.layout, 'shelves');
  assert.equal(snapshot.cornerConfiguration.gridDivisions, 6);

  cfgSeed.cornerConfiguration.layout = 'mutated';
  assert.equal(snapshot.cornerConfiguration.layout, 'shelves');
});

test('project config canonicalization: structural patch only rewrites present buckets with the effective live structure', () => {
  const uiSnapshot = buildStructureUiSnapshotFromSettings({
    doors: 5,
    singleDoorPos: 'right',
    structureSelection: '',
  });
  const cfgSnapshot = buildStructureCfgSnapshot({ wardrobeType: 'hinged' });

  const patch: any = canonicalizeProjectConfigStructuralPatch(
    {
      modulesConfiguration: [{ layout: 'drawers', extDrawersCount: '3' }, null, { layout: 'shelves' }],
      cornerConfiguration: { extDrawersCount: '2' },
      handlesMap: { keep: true },
    },
    {
      uiSnapshot,
      cfgSnapshot,
      cornerMode: 'auto',
    }
  );

  assert.deepEqual(
    patch.modulesConfiguration.map((entry: any) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(patch.modulesConfiguration[0].extDrawersCount, 3);
  assert.equal(patch.cornerConfiguration.extDrawersCount, 2);
  assert.equal('stackSplitLowerModulesConfiguration' in patch, false);
  assert.deepEqual(patch.handlesMap, { keep: true });
});
