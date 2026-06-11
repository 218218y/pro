import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalizeSegmentedDoorMaps,
  inferInternalDrawersToggle,
  migrateDoorStylePayloadMaps,
  normalizeCornerConfigurationShape,
  normalizeToggleDefaults,
  stripDeprecatedProjectCompatFields,
} from '../esm/native/io/project_schema_migrations.ts';
import { ensureSettingsRecord, ensureTogglesRecord } from '../esm/native/io/project_schema_shared.ts';

test('project schema migrations canonicalize segmented door maps and infer drawers without leaking compat fields', () => {
  const data: any = {
    settings: {
      width: 240,
      depth: 60,
      doors: 4,
      modulesConfiguration: [{ legacy: true }],
      stackSplitLowerModulesConfiguration: [{ legacy: true }],
      isLibraryMode: true,
      preChestState: { enabled: true },
    },
    toggles: {
      showContents: false,
      showHanger: false,
      showDimensions: false,
    },
    removedDoorsMap: { removed_d1: true },
    individualColors: { d1: 'oak' },
    doorSpecialMap: { d1: 'mirror' },
    curtainMap: { d1: 'linen' },
    mirrorLayoutMap: { d1: [{ x: 1, y: 2, width: 3, height: 4 }] },
    modulesConfiguration: [{ intDrawersSlot: '2' }],
    cornerConfiguration: {
      modulesConfiguration: 'bad-shape',
      stackSplitLower: { modulesConfiguration: 'bad-shape' },
    },
    hingeDoorsMap: { old: true },
    grooveMap: { old: true },
    doorsCount: 4,
    wardrobeWidth: 240,
    wardrobeHeight: 240,
  };

  canonicalizeSegmentedDoorMaps(data);
  normalizeToggleDefaults(data, ensureTogglesRecord);
  migrateDoorStylePayloadMaps(data);
  normalizeCornerConfigurationShape(data);
  inferInternalDrawersToggle(data, ensureTogglesRecord);
  stripDeprecatedProjectCompatFields(data, ensureSettingsRecord);

  assert.deepEqual(data.removedDoorsMap, { removed_d1_full: true });
  assert.equal(data.individualColors.d1, undefined);
  assert.equal(data.individualColors.d1_full, 'oak');
  assert.equal(data.doorSpecialMap.d1_full, 'mirror');
  assert.equal(data.doorSpecialMap.d1_top, 'mirror');
  assert.equal(data.curtainMap.d1_full, 'linen');
  assert.notEqual(data.mirrorLayoutMap.d1_top, data.mirrorLayoutMap.d1_full);
  assert.deepEqual(data.cornerConfiguration.modulesConfiguration, []);
  assert.deepEqual(data.cornerConfiguration.stackSplitLower.modulesConfiguration, []);
  assert.equal(data.toggles.showHanger, true);
  assert.equal(data.toggles.showDimensions, true);
  assert.equal(data.toggles.globalClickMode, true);
  assert.equal(data.toggles.internalDrawers, true);
  assert.equal('hingeDoorsMap' in data, false);
  assert.equal('grooveMap' in data, false);
  assert.equal('modulesConfiguration' in data.settings, false);
  assert.equal('preChestState' in data.settings, false);
});
