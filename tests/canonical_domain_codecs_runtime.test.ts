import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cloneCanonicalFeatureValue,
  fingerprintCanonicalFeatureValue,
  serializeCanonicalFeatureValue,
} from '../esm/native/features/canonical_codec_runtime.ts';
import { savedModelCodec } from '../esm/native/features/model_record/api.ts';
import {
  buildCloudCollectionsEnvelope,
  cloudCollectionsCodec,
  parseCloudCollectionsEnvelope,
} from '../esm/native/services/cloud_collections_codec.ts';
import { projectConfigMapCodec } from '../esm/native/features/project_config/api.ts';
import {
  SETTINGS_BACKUP_SCHEMA_VERSION,
  settingsBackupCodec,
} from '../esm/native/ui/settings_backup_codec.ts';
import { projectSchemaCodec } from '../esm/native/io/project_schema_codec.ts';
import { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from '../esm/shared/project_schema_constants.ts';

test('canonical JSON clone/serialize/fingerprint are deterministic and detached', () => {
  const a = { z: [1, { b: true, a: 'x' }], a: { y: 2, x: 1 } };
  const b = { a: { x: 1, y: 2 }, z: [1, { a: 'x', b: true }] };

  assert.equal(serializeCanonicalFeatureValue(a), serializeCanonicalFeatureValue(b));
  assert.equal(fingerprintCanonicalFeatureValue(a), fingerprintCanonicalFeatureValue(b));

  const clone = cloneCanonicalFeatureValue(a);
  assert.deepEqual(clone, a);
  assert.notEqual(clone, a);
  assert.notEqual(clone.a, a.a);
  assert.notEqual(clone.z, a.z);

  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.throws(() => serializeCanonicalFeatureValue(circular), /circular/i);
});

test('Saved Model codec owns validation, normalization, round-trip and malformed rejection', () => {
  const normalized = savedModelCodec.normalize({
    id: ' model-1 ',
    name: ' Model One ',
    settings: { wardrobeType: 'hinged', width: 180, height: 240, depth: 60, doors: 3 },
    splitDoorsMap: { split_d1: true, splitpos_d1: [0.25, 0.75] },
    savedNotes: [{ id: 'n1', text: 'note' }],
  });

  assert.ok(normalized);
  assert.equal(normalized.id, 'model-1');
  assert.equal(normalized.name, 'Model One');
  assert.equal(savedModelCodec.validate(normalized), true);
  assert.equal(
    savedModelCodec.serialize(savedModelCodec.normalize(normalized)!),
    savedModelCodec.serialize(normalized)
  );

  const clone = savedModelCodec.clone(normalized);
  assert.equal(savedModelCodec.serialize(clone), savedModelCodec.serialize(normalized));
  assert.notEqual(clone, normalized);
  assert.notEqual(clone.settings, normalized.settings);

  const parsed = JSON.parse(savedModelCodec.serialize(normalized));
  assert.equal(savedModelCodec.validate(parsed), true);
  assert.equal(
    savedModelCodec.serialize(savedModelCodec.normalize(parsed)!),
    savedModelCodec.serialize(normalized)
  );
  assert.equal(savedModelCodec.fingerprint(parsed), savedModelCodec.fingerprint(normalized));

  assert.equal(savedModelCodec.normalize({ id: '', name: 'bad' }), null);
  assert.equal(savedModelCodec.validate({ id: 'm1', name: 'bad', settings: { width: '180' } }), false);
  assert.equal(savedModelCodec.validate({ id: 'm1', name: 'bad', doorStyleMap: { d1: 'unknown' } }), false);
});

test('Cloud Collections codec composes Saved Model codec and rejects unsupported envelope versions', () => {
  const model = savedModelCodec.normalize({ id: 'm1', name: 'Model 1' });
  assert.ok(model);
  const envelope = buildCloudCollectionsEnvelope(
    {
      m: [model],
      c: [{ id: 'c1', value: '#ffffff' }],
      o: ['c1'],
      p: ['m1'],
      h: [],
    },
    7
  );

  assert.equal(cloudCollectionsCodec.validate(envelope), true);
  const serialized = cloudCollectionsCodec.serialize(envelope);
  const parsed = JSON.parse(serialized);
  assert.deepEqual(cloudCollectionsCodec.normalize(parsed), envelope);
  assert.equal(cloudCollectionsCodec.fingerprint(parsed), cloudCollectionsCodec.fingerprint(envelope));
  assert.equal(parseCloudCollectionsEnvelope({ ...parsed, schemaVersion: 99 }).ok, false);
  assert.equal(cloudCollectionsCodec.normalize({ ...parsed, savedModels: [{ id: 'm1', name: '' }] }), null);
});

test('Project Config map codec gives one canonical decision across normalize/validate/serialize/fingerprint', () => {
  const canonical = { split_d1: true, splitpos_d1: [0.25, 0.75] };
  assert.equal(projectConfigMapCodec.validate('splitDoorsMap', canonical), true);
  assert.deepEqual(projectConfigMapCodec.normalize('splitDoorsMap', canonical), canonical);
  assert.equal(
    projectConfigMapCodec.serialize('splitDoorsMap', { splitpos_d1: [0.25, 0.75], split_d1: true }),
    projectConfigMapCodec.serialize('splitDoorsMap', canonical)
  );
  assert.equal(
    projectConfigMapCodec.fingerprint('splitDoorsMap', { splitpos_d1: [0.25, 0.75], split_d1: true }),
    projectConfigMapCodec.fingerprint('splitDoorsMap', canonical)
  );
  assert.equal(projectConfigMapCodec.validate('splitDoorsMap', { split_d1: 'true' }), false);
  assert.equal(projectConfigMapCodec.validate('unknownMap', canonical), false);

  // Deterministic property pass: object insertion order must never change the canonical map fingerprint.
  const entries = Object.entries(canonical);
  const expected = projectConfigMapCodec.fingerprint('splitDoorsMap', canonical);
  for (let i = 0; i < 24; i += 1) {
    const rotated = entries.slice(i % entries.length).concat(entries.slice(0, i % entries.length));
    assert.equal(projectConfigMapCodec.fingerprint('splitDoorsMap', Object.fromEntries(rotated)), expected);
  }
});

test('Settings Backup codec explicitly migrates legacy unversioned backups and rejects future versions', () => {
  const legacy = {
    type: 'system_backup',
    timestamp: 123,
    savedModels: [{ id: 'm1', name: 'Model 1' }],
    savedColors: [{ id: 'c1', value: '#fff' }],
    presetOrder: ['m1'],
    hiddenPresets: [],
    colorSwatchesOrder: ['c1'],
  };
  const normalized = settingsBackupCodec.normalize(legacy);
  assert.ok(normalized);
  assert.equal(normalized.schemaVersion, SETTINGS_BACKUP_SCHEMA_VERSION);
  assert.equal(settingsBackupCodec.validate(normalized), true);
  assert.deepEqual(
    settingsBackupCodec.normalize(JSON.parse(settingsBackupCodec.serialize(normalized))),
    normalized
  );
  assert.equal(
    settingsBackupCodec.fingerprint(settingsBackupCodec.clone(normalized)),
    settingsBackupCodec.fingerprint(normalized)
  );
  assert.equal(settingsBackupCodec.normalize({ ...legacy, schemaVersion: 99 }), null);
  assert.equal(settingsBackupCodec.validate(legacy), false);
});

test('Project Schema codec round-trips current schema and rejects historical schema at the canonical boundary', () => {
  const current = {
    __schema: PROJECT_SCHEMA_ID,
    __version: PROJECT_SCHEMA_VERSION,
    __createdAt: '2026-08-09T00:00:00.000Z',
    settings: { wardrobeType: 'hinged', width: 240, height: 240, depth: 60, doors: 4 },
    toggles: {},
    splitDoorsMap: { split_d1: true },
    splitDoorsBottomMap: {},
    removedDoorsMap: {},
    roundedFrameSideShelvesMap: {},
    drawerDividersMap: {},
    groovesMap: {},
    grooveLinesCountMap: {},
    individualColors: {},
    doorSpecialMap: {},
    doorStyleMap: {},
    handlesMap: {},
    hingeMap: {},
    curtainMap: {},
    mirrorLayoutMap: {},
    doorTrimMap: {},
  };
  const normalized = projectSchemaCodec.normalize(current);
  assert.ok(normalized);
  assert.equal(projectSchemaCodec.validate(normalized), true);
  const parsed = JSON.parse(projectSchemaCodec.serialize(normalized));
  assert.equal(projectSchemaCodec.validate(parsed), true);
  assert.deepEqual(projectSchemaCodec.normalize(parsed), normalized);
  assert.equal(projectSchemaCodec.fingerprint(parsed), projectSchemaCodec.fingerprint(normalized));
  assert.equal(projectSchemaCodec.normalize({ ...current, __version: PROJECT_SCHEMA_VERSION - 1 }), null);
  assert.equal(projectSchemaCodec.normalize({ settings: current.settings, toggles: {} }), null);
});
