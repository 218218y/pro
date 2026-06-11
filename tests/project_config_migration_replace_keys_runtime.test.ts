import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCanonicalProjectConfigSnapshot,
  buildCanonicalProjectConfigSnapshot,
  isProjectConfigSnapshotReplaceKey,
  PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS,
  PROJECT_CONFIG_SCALAR_MIGRATION_REQUIRED_KEYS,
  PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER,
  PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS,
  type ProjectConfigSnapshotReplaceKey,
} from '../esm/native/io/project_migrations/config_snapshot_migration.ts';

test('project config migration materializes every replace-owned branch so project load can clear stale state', () => {
  const cfg = buildCanonicalProjectConfigSnapshot({
    settings: {
      width: 160,
      height: 240,
      depth: 55,
      doors: 4,
    },
  }) as Record<string, unknown>;

  for (const key of PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(cfg, key),
      true,
      `${key} must be present on canonical project config snapshots`
    );
    assert.notEqual(
      cfg[key],
      undefined,
      `${key} must not be undefined on canonical project config snapshots`
    );
    assert.equal(
      PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS.includes(key),
      true,
      `${key} must be part of the canonical project config required-key contract`
    );
  }
});

test('project config migration fails fast when a replace-owned branch is missing', () => {
  const cfg = buildCanonicalProjectConfigSnapshot({ settings: {} }) as Record<string, unknown>;
  delete cfg.removedDoorsMap;

  assert.throws(
    () => assertCanonicalProjectConfigSnapshot(cfg, 'stage33.projectConfig'),
    /stage33\.projectConfig missing canonical config key\(s\): removedDoorsMap/
  );
});

test('project config replace-key owner remains immutable and reusable by project load', () => {
  assert.equal(Object.isFrozen(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER), true);
  assert.equal(Object.isFrozen(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS), true);
  assert.deepEqual(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER.slice(0, 3), [
    'modulesConfiguration',
    'stackSplitLowerModulesConfiguration',
    'cornerConfiguration',
  ]);
  assert.deepEqual(
    Object.keys(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS),
    [...PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER],
    'replace-key map must be built from the deterministic owner order'
  );
  assert.equal(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS.savedNotes, true);
  assert.equal(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS.preChestState, true);
});

test('project config replace-key required contract is deterministic and type-narrowed', () => {
  assert.deepEqual(
    PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS.slice(0, PROJECT_CONFIG_SCALAR_MIGRATION_REQUIRED_KEYS.length),
    [...PROJECT_CONFIG_SCALAR_MIGRATION_REQUIRED_KEYS]
  );
  assert.deepEqual(
    PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS.slice(PROJECT_CONFIG_SCALAR_MIGRATION_REQUIRED_KEYS.length),
    [...PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER]
  );

  const candidate = 'removedDoorsMap';
  assert.equal(isProjectConfigSnapshotReplaceKey(candidate), true);
  if (isProjectConfigSnapshotReplaceKey(candidate)) {
    const typed: ProjectConfigSnapshotReplaceKey = candidate;
    assert.equal(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS[typed], true);
  }

  assert.equal(isProjectConfigSnapshotReplaceKey('wardrobeType'), false);
  assert.equal(isProjectConfigSnapshotReplaceKey('__replace'), false);
});
