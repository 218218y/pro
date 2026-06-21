import test from 'node:test';
import assert from 'node:assert/strict';

// NOTE: We import from dist/esm because the repo is TS-first and runtime lives under ./dist.
const schemaMod = async () => await import('../dist/esm/native/io/project_schema.js');

test('project_schema: historical split-map migration helpers are not public API', async () => {
  const schema = await schemaMod();
  assert.equal('normalizeSplitDoorsMap' in schema, false);
  assert.equal('normalizeSplitDoorsBottomMap' in schema, false);
});

test('project_schema: detectProjectSchemaVersion accepts only the current __version field', async () => {
  const { detectProjectSchemaVersion } = await schemaMod();

  assert.equal(detectProjectSchemaVersion({ __version: 2, version: 1, schemaVersion: 7 }), 2);
  assert.equal(detectProjectSchemaVersion({ version: 3, schemaVersion: 7 }), 0);
  assert.equal(detectProjectSchemaVersion({ schemaVersion: 4 }), 0);
  assert.equal(detectProjectSchemaVersion({}), 0);
});

test('project_schema: normalizeProjectData accepts only current-schema project data', async () => {
  const { normalizeProjectData, PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } = await schemaMod();

  const data = {
    __schema: PROJECT_SCHEMA_ID,
    __version: PROJECT_SCHEMA_VERSION,
    settings: {
      wardrobeType: 'hinged',
      width: 120,
      height: 240,
      depth: 60,
      doors: 3,
    },
    toggles: {},
    splitDoorsMap: { split_d1: true },
  };

  const out = normalizeProjectData(data, '2026-02-04T00:00:00.000Z');

  assert.ok(out);
  assert.equal(out.__schema, PROJECT_SCHEMA_ID);
  assert.equal(out.__version, PROJECT_SCHEMA_VERSION);
  assert.equal(out.__createdAt, '2026-02-04T00:00:00.000Z');
  assert.equal(out.splitDoorsMap.split_d1, true);
  assert.ok(out.splitDoorsBottomMap && typeof out.splitDoorsBottomMap === 'object');
  assert.ok(out.handlesMap && typeof out.handlesMap === 'object');
  assert.ok(out.hingeMap && typeof out.hingeMap === 'object');
  assert.ok(out.removedDoorsMap && typeof out.removedDoorsMap === 'object');
  assert.ok(out.roundedFrameSideShelvesMap && typeof out.roundedFrameSideShelvesMap === 'object');
  assert.ok(out.curtainMap && typeof out.curtainMap === 'object');
  assert.ok(out.groovesMap && typeof out.groovesMap === 'object');

  assert.equal(normalizeProjectData({ settings: data.settings, toggles: {} }), null);
  assert.equal(normalizeProjectData({ project: data }), null);
});

test('project_schema: validateProjectData fails when settings is missing', async () => {
  const { validateProjectData } = await schemaMod();
  const v = validateProjectData({});
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => e.includes('settings')));
});
