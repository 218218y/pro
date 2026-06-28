import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProjectData } from '../esm/native/io/project_schema_normalize.ts';
import { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from '../esm/shared/project_schema_constants.ts';

test('current project schema accepts canonical maps without mutating their persisted shape', () => {
  const data: any = {
    __schema: PROJECT_SCHEMA_ID,
    __version: PROJECT_SCHEMA_VERSION,
    settings: {
      wardrobeType: 'hinged',
      width: 240,
      height: 240,
      depth: 60,
      doors: 4,
      globalHandleType: 'standard',
    },
    toggles: {
      showContents: false,
      showHanger: false,
      showDimensions: false,
    },
    splitDoorsMap: { split_d1: true, splitpos_d1: [0.2, 1] },
    splitDoorsBottomMap: { splitb_d1: true },
    removedDoorsMap: { removed_d1_full: true },
    roundedFrameSideShelvesMap: { body_left: true },
    individualColors: { d1_full: 'oak' },
    doorSpecialMap: { d1_full: 'mirror' },
    doorStyleMap: { d1_full: 'profile' },
    curtainMap: { d1_full: 'linen' },
    mirrorLayoutMap: { d1_full: [{ widthCm: 3, heightCm: 4 }] },
    groovesMap: {},
    grooveLinesCount: 3,
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
  assert.equal(out.settings.globalHandleType, 'standard');
  assert.equal(out.__validation.ok, true);
});

test('current project schema rejects values that require historical migration', () => {
  const base = {
    __schema: PROJECT_SCHEMA_ID,
    __version: PROJECT_SCHEMA_VERSION,
    settings: { wardrobeType: 'hinged', width: 240, height: 240, depth: 60, doors: 4 },
    toggles: {},
  };

  assert.equal(normalizeProjectData({ ...base, settings: { ...base.settings, projectName: 'old' } }), null);
  assert.equal(normalizeProjectData({ ...base, notes: [{ text: 'old' }] }), null);
  assert.equal(normalizeProjectData({ ...base, toggles: { showContents: 1 } }), null);
  assert.equal(normalizeProjectData({ ...base, splitDoorsMap: { split_d1_full: true } }), null);
  assert.equal(normalizeProjectData({ ...base, splitDoorsMap: { split_d1: 'true' } }), null);
  assert.equal(normalizeProjectData({ ...base, splitDoorsMap: { splitpos_d1: '0.25,0.75' } }), null);
  assert.equal(normalizeProjectData({ ...base, splitDoorsBottomMap: { splitb_d1_full: true } }), null);
  assert.equal(normalizeProjectData({ ...base, splitDoorsBottomMap: { splitb_d1: 1 } }), null);
  assert.equal(
    normalizeProjectData({
      ...base,
      doorTrimMap: {
        d1_full: [
          {
            id: 'trim_old_center',
            axis: 'horizontal',
            color: 'nickel',
            span: 'full',
            ['center' + 'Norm']: 0.25,
          },
        ],
      },
    }),
    null
  );
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
