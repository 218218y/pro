#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(file) {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch (err) {
    failures.push(`${file}: cannot read (${err?.message || err})`);
    return '';
  }
}

function requireIncludes(rel, text, needle, message) {
  if (!text.includes(needle)) failures.push(`${rel}: ${message || `missing ${needle}`}`);
}

function requireNotIncludes(rel, text, needle, message) {
  if (text.includes(needle)) failures.push(`${rel}: ${message || `must not contain ${needle}`}`);
}

function readFunctionBody(rel, source, name) {
  const marker = `function ${name}`;
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) {
    failures.push(`${rel}: missing function ${name}`);
    return '';
  }

  const openAt = source.indexOf('{', markerAt);
  if (openAt < 0) {
    failures.push(`${rel}: cannot locate body for ${name}`);
    return '';
  }

  let depth = 0;
  for (let i = openAt; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openAt + 1, i);
    }
  }

  failures.push(`${rel}: unterminated body for ${name}`);
  return '';
}

function requireFunctionIncludes(rel, source, name, needle, message) {
  const body = readFunctionBody(rel, source, name);
  requireIncludes(`${rel}#${name}`, body, needle, message);
}

function requireFunctionNotIncludes(rel, source, name, needle, message) {
  const body = readFunctionBody(rel, source, name);
  requireNotIncludes(`${rel}#${name}`, body, needle, message);
}

const loaderRel = 'esm/native/io/project_io_orchestrator_project_load.ts';
const migrationsRel = 'esm/native/io/project_migrations/index.ts';
const uiSelectorsRel = 'esm/native/runtime/ui_raw_selectors.ts';
const cfgMigrationRel = 'esm/native/io/project_migrations/config_snapshot_migration.ts';

const loader = read(loaderRel);
const migrations = read(migrationsRel);
const uiSelectors = read(uiSelectorsRel);
const cfgMigration = read(cfgMigrationRel);

requireIncludes(
  loaderRel,
  loader,
  'buildCanonicalProjectUiSnapshot',
  'project load must canonicalize ui snapshots through the migration owner'
);
requireIncludes(
  loaderRel,
  loader,
  'buildCanonicalProjectConfigSnapshot',
  'project load must canonicalize config snapshots through the migration owner'
);
requireIncludes(
  loaderRel,
  loader,
  'assertCanonicalUiRawDims',
  'project load must assert canonical ui.raw dimensions before commit/build'
);
requireNotIncludes(
  loaderRel,
  loader,
  'buildProjectConfigSnapshot(data)',
  'project load must not call the raw project config helper directly'
);

requireIncludes(
  migrationsRel,
  migrations,
  './ui_raw_snapshot_migration.js',
  'migration barrel must export the ui.raw migration owner'
);
requireIncludes(
  migrationsRel,
  migrations,
  './config_snapshot_migration.js',
  'migration barrel must export the config migration owner'
);
requireIncludes(
  cfgMigrationRel,
  cfgMigration,
  'PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS',
  'config migration owner must define canonical required keys'
);
requireIncludes(
  cfgMigrationRel,
  cfgMigration,
  'assertCanonicalProjectConfigSnapshot',
  'config migration owner must expose a fail-fast assertion'
);

requireIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readUiRawScalarFromCanonicalSnapshot',
  'runtime must expose canonical ui.raw reader'
);
requireIncludes(
  uiSelectorsRel,
  uiSelectors,
  'assertCanonicalUiRawDims',
  'runtime must expose canonical ui.raw assertion'
);
requireFunctionIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readUiRawScalarFromSnapshot',
  'readUiDirectScalar(ui, key)',
  'legacy snapshot reader may be tolerant, but that tolerance must stay isolated in the non-canonical reader'
);
requireFunctionIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readUiRawScalarFromCanonicalSnapshot',
  'Object.prototype.hasOwnProperty.call(raw, key)',
  'canonical reader must require an explicit ui.raw key instead of reading legacy ui.* fields'
);
requireFunctionNotIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readUiRawScalarFromCanonicalSnapshot',
  'readUiDirectScalar',
  'canonical reader must not fall back to legacy ui.* fields'
);
requireFunctionNotIncludes(
  uiSelectorsRel,
  uiSelectors,
  'assertCanonicalUiRawDims',
  'readUiRawScalarFromSnapshot',
  'canonical assertion must not validate through tolerant snapshot readers'
);

if (failures.length) {
  console.error('[runtime-selector-policy] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[runtime-selector-policy] ok');
