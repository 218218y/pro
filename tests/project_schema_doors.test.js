import test from 'node:test';
import assert from 'node:assert/strict';

// NOTE: We import from dist/esm because the repo is TS-first and runtime lives under ./dist.
const schemaMod = async () => await import('../dist/esm/native/io/project_schema.js');

test('project_schema: normalizeSplitDoorsMap strips _full/_top/_bot suffixes and merges collisions', async () => {
  const { normalizeSplitDoorsMap } = await schemaMod();

  const input = {
    split_d12_full: true,
    split_d12_top: true,
    split_d9_bot: false,
    split_d9_full: true, // should end up false because one entry is false
    otherKey: 123,
  };

  const out = normalizeSplitDoorsMap(input);
  assert.deepEqual(out.split_d12, true);
  assert.deepEqual(out.split_d9, false);
  assert.equal(out.otherKey, 123);

  // original keys should not survive when normalized
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'split_d12_full'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'split_d12_top'), false);
});

test('project_schema: normalizeSplitDoorsMap upgrades legacy door-id keys to split_* keys', async () => {
  const { normalizeSplitDoorsMap } = await schemaMod();

  const input = {
    d12: true, // legacy
    split_d12_full: false, // canonical (explicit disable wins)
    d9_top: true, // legacy with suffix
  };

  const out = normalizeSplitDoorsMap(input);

  assert.equal(out.split_d12, false);
  assert.equal(out.split_d9, true);

  // legacy keys should not survive
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'd12'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'd9_top'), false);
});

test('project_schema: normalizeSplitDoorsMap normalizes splitpos_* keys and coerces values to a number[]', async () => {
  const { normalizeSplitDoorsMap } = await schemaMod();

  const input = {
    splitPos_d5_full: '0.33',
    splitpos_d6: '[0.2, 0.8]',
    splitpos_d7_bot: [0.8, '0.1', 'bad', -1, 2],
  };

  const out = normalizeSplitDoorsMap(input);

  assert.deepEqual(out.splitpos_d5, [0.33]);
  assert.deepEqual(out.splitpos_d6, [0.2, 0.8]);
  assert.deepEqual(out.splitpos_d7, [0, 0.1, 0.8, 1]);

  // original keys should not survive
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'splitPos_d5_full'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'splitpos_d7_bot'), false);
});

test('project_schema: normalizeSplitDoorsBottomMap normalizes splitBottom_* and strips suffixes', async () => {
  const { normalizeSplitDoorsBottomMap } = await schemaMod();

  const input = {
    splitBottom_d7_full: 1,
    splitb_d8_mid: true,
    splitb_d9: false,
    splitBottom_d10_top: 'bad',
    arbitrary: 'bad',
    explicitNull: null,
  };

  const out = normalizeSplitDoorsBottomMap(input);
  assert.deepEqual(out.splitb_d7, true);
  assert.deepEqual(out.splitb_d8, true);
  assert.deepEqual(out.splitb_d9, false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'splitb_d10'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'arbitrary'), false);
  assert.deepEqual(out.explicitNull, null);

  assert.equal(Object.prototype.hasOwnProperty.call(out, 'splitBottom_d7_full'), false);
});

test('project_schema: detectProjectSchemaVersion prefers __version, then version, then schemaVersion', async () => {
  const { detectProjectSchemaVersion } = await schemaMod();

  assert.equal(detectProjectSchemaVersion({ __version: 2, version: 1, schemaVersion: 7 }), 2);
  assert.equal(detectProjectSchemaVersion({ version: 3, schemaVersion: 7 }), 3);
  assert.equal(detectProjectSchemaVersion({ schemaVersion: 4 }), 4);
  assert.equal(detectProjectSchemaVersion({}), 0);
});

test('project_schema: migrateProjectData stamps schema metadata, keeps canonical maps, and strips deprecated compat fields', async () => {
  const { migrateProjectData, PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } = await schemaMod();

  const data = {
    // intentionally missing settings + maps
    doorsCount: 3,
    wardrobeWidth: 120,
    wardrobeHeight: 240,
    hingeDoorsMap: { d9: 'left' },
    grooveMap: { legacy_groove: true },
    settings: {
      modulesConfiguration: [{ legacy: true }],
      stackSplitLowerModulesConfiguration: [{ legacy: 'lower' }],
      isLibraryMode: true,
      preChestState: { open: true },
    },
    splitDoorsMap: { split_d1_full: true },
  };

  const out = migrateProjectData(data, '2026-02-04T00:00:00.000Z');

  assert.equal(out.__schema, PROJECT_SCHEMA_ID);
  assert.equal(out.__version, PROJECT_SCHEMA_VERSION);
  assert.equal(out.__createdAt, '2026-02-04T00:00:00.000Z');

  // maps are objects after migrate
  assert.ok(out.splitDoorsMap && typeof out.splitDoorsMap === 'object');
  assert.ok(out.splitDoorsBottomMap && typeof out.splitDoorsBottomMap === 'object');
  assert.ok(out.handlesMap && typeof out.handlesMap === 'object');
  assert.ok(out.hingeMap && typeof out.hingeMap === 'object');
  assert.ok(out.removedDoorsMap && typeof out.removedDoorsMap === 'object');
  assert.ok(out.curtainMap && typeof out.curtainMap === 'object');
  assert.ok(out.groovesMap && typeof out.groovesMap === 'object');

  // deprecated compat fields are no longer migrated forward
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'doorsCount'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'wardrobeWidth'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'wardrobeHeight'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'hingeDoorsMap'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'grooveMap'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out.settings, 'modulesConfiguration'), false);
  assert.equal(
    Object.prototype.hasOwnProperty.call(out.settings, 'stackSplitLowerModulesConfiguration'),
    false
  );
  assert.equal(Object.prototype.hasOwnProperty.call(out.settings, 'isLibraryMode'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out.settings, 'preChestState'), false);
  assert.deepEqual(out.hingeMap, {});
  assert.deepEqual(out.groovesMap, {});

  // normalized key
  assert.equal(out.splitDoorsMap.split_d1, true);
});

test('project_schema: validateProjectData fails when settings is missing', async () => {
  const { validateProjectData } = await schemaMod();
  const v = validateProjectData({});
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => e.includes('settings')));
});
