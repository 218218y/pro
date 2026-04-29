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

function findMatchingDelimiter(source, openAt, openChar, closeChar) {
  let depth = 0;
  for (let i = openAt; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function previousNonWhitespaceChar(source, beforeIndex) {
  for (let i = beforeIndex - 1; i >= 0; i -= 1) {
    if (!/\s/.test(source[i])) return source[i];
  }
  return '';
}

function findFunctionBodyOpen(rel, source, name) {
  const marker = `function ${name}`;
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) {
    failures.push(`${rel}: missing function ${name}`);
    return -1;
  }

  const paramsOpenAt = source.indexOf('(', markerAt + marker.length);
  if (paramsOpenAt < 0) {
    failures.push(`${rel}: cannot locate parameters for ${name}`);
    return -1;
  }

  const paramsCloseAt = findMatchingDelimiter(source, paramsOpenAt, '(', ')');
  if (paramsCloseAt < 0) {
    failures.push(`${rel}: unterminated parameters for ${name}`);
    return -1;
  }

  for (let i = paramsCloseAt + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (ch !== '{') continue;

    const previous = previousNonWhitespaceChar(source, i);
    if (previous === ':' || previous === '<' || previous === '|' || previous === '&' || previous === ',') {
      const typeCloseAt = findMatchingDelimiter(source, i, '{', '}');
      if (typeCloseAt < 0) {
        failures.push(`${rel}: unterminated return type for ${name}`);
        return -1;
      }
      i = typeCloseAt;
      continue;
    }

    return i;
  }

  failures.push(`${rel}: cannot locate body for ${name}`);
  return -1;
}

function readFunctionBody(rel, source, name) {
  const openAt = findFunctionBodyOpen(rel, source, name);
  if (openAt < 0) return '';

  const closeAt = findMatchingDelimiter(source, openAt, '{', '}');
  if (closeAt < 0) {
    failures.push(`${rel}: unterminated body for ${name}`);
    return '';
  }

  return source.slice(openAt + 1, closeAt);
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
const runtimeSelectorTestRel = 'tests/project_migration_runtime_selector_hardening_runtime.test.ts';

const loader = read(loaderRel);
const migrations = read(migrationsRel);
const uiSelectors = read(uiSelectorsRel);
const cfgMigration = read(cfgMigrationRel);
const runtimeSelectorTest = read(runtimeSelectorTestRel);

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
requireIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readCanonicalUiRawNumberFromSnapshot',
  'runtime must expose canonical ui.raw number reader for live/build code'
);
requireIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readCanonicalUiRawIntFromSnapshot',
  'runtime must expose canonical ui.raw int reader for live/build code'
);
requireIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readCanonicalUiRawDimsCmFromSnapshot',
  'runtime must expose canonical ui.raw dimension batch reader for live/build code'
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
requireFunctionIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readCanonicalUiRawNumberFromSnapshot',
  'readUiRawScalarFromCanonicalSnapshot(ui, key)',
  'canonical number reader must use canonical scalar reads only'
);
requireFunctionNotIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readCanonicalUiRawNumberFromSnapshot',
  'readUiRawScalarFromSnapshot',
  'canonical number reader must not use tolerant snapshot reads'
);
requireFunctionIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readCanonicalUiRawDimsCmFromSnapshot',
  'assertCanonicalUiRawDims(ui, context)',
  'canonical dimensions reader must fail fast when project ingress did not migrate ui.raw dimensions'
);
requireFunctionIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readCanonicalUiRawDimsCmFromSnapshot',
  'readCanonicalUiRawNumberFromSnapshot',
  'canonical dimensions reader must compose canonical numeric readers'
);
requireFunctionNotIncludes(
  uiSelectorsRel,
  uiSelectors,
  'readCanonicalUiRawDimsCmFromSnapshot',
  'readUiRawNumberFromSnapshot',
  'canonical dimensions reader must not use tolerant legacy numeric readers'
);

requireIncludes(
  runtimeSelectorTestRel,
  runtimeSelectorTest,
  'canonical ui.raw batch readers fail fast before project ingress migration and stay raw-only afterwards',
  'runtime selector tests must cover canonical batch readers against legacy ui.* fallback regression'
);
requireIncludes(
  runtimeSelectorTestRel,
  runtimeSelectorTest,
  'readCanonicalUiRawDimsCmFromSnapshot(legacySnapshot',
  'runtime selector tests must prove canonical batch readers reject unmigrated legacy snapshots'
);

if (failures.length) {
  console.error('[runtime-selector-policy] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[runtime-selector-policy] ok');
