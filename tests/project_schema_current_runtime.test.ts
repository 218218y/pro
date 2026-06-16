import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProjectData } from '../esm/native/io/project_schema_normalize.ts';
import { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from '../esm/shared/project_schema_constants.ts';

test('current project schema normalizes canonical maps without accepting old project envelopes', () => {
  const data: any = {
    __schema: PROJECT_SCHEMA_ID,
    __version: PROJECT_SCHEMA_VERSION,
    settings: {
      wardrobeType: 'hinged',
      width: 240,
      depth: 60,
      doors: 4,
      globalHandleType: 'bad-shape',
    },
    toggles: {
      showContents: false,
      showHanger: false,
      showDimensions: false,
    },
    splitDoorsMap: { split_d1_full: true, splitpos_d1_top: ['0.2', 'bad', 2] },
    splitDoorsBottomMap: { splitBottom_d1_full: 1 },
    removedDoorsMap: { removed_d1_full: true },
    roundedFrameSideShelvesMap: { body_left: true },
    individualColors: { d1_full: 'oak' },
    doorSpecialMap: { d1_full: 'mirror' },
    doorStyleMap: { d1_full: 'profile' },
    curtainMap: { d1_full: 'linen' },
    mirrorLayoutMap: { d1_full: [{ x: 1, y: 2, width: 3, height: 4 }] },
    groovesMap: 'bad-shape',
    grooveLinesCount: '3.8',
  };

  const out = normalizeProjectData(data, '2026-02-04T00:00:00.000Z');

  assert.ok(out);
  assert.equal(out.__schema, PROJECT_SCHEMA_ID);
  assert.equal(out.__version, PROJECT_SCHEMA_VERSION);
  assert.equal(out.__createdAt, '2026-02-04T00:00:00.000Z');
  assert.equal(out.splitDoorsMap.split_d1, true);
  assert.deepEqual(out.splitDoorsMap.splitpos_d1, [0.2, 1]);
  assert.deepEqual(out.splitDoorsBottomMap, { splitb_d1: true });
  assert.equal(out.removedDoorsMap.removed_d1_full, true);
  assert.equal(out.individualColors.d1_full, 'oak');
  assert.equal(out.doorSpecialMap.d1_full, 'mirror');
  assert.equal(out.doorStyleMap.d1_full, 'profile');
  assert.equal(out.curtainMap.d1_full, 'linen');
  assert.deepEqual(out.groovesMap, {});
  assert.equal(out.grooveLinesCount, 3);
  assert.equal('globalHandleType' in out.settings, false);
  assert.equal(out.__validation.ok, true);
});

test('current project schema rejects missing schema metadata and old payload envelopes', () => {
  const currentData = {
    __schema: PROJECT_SCHEMA_ID,
    __version: PROJECT_SCHEMA_VERSION,
    settings: { wardrobeType: 'hinged', width: 120, height: 240, depth: 60, doors: 3 },
    toggles: {},
  };

  assert.equal(normalizeProjectData({ settings: currentData.settings, toggles: {} }), null);
  assert.equal(normalizeProjectData({ project: currentData }), null);
  assert.equal(normalizeProjectData({ payload: currentData }), null);
  assert.equal(normalizeProjectData({ ...currentData, __version: PROJECT_SCHEMA_VERSION - 1 }), null);
});
