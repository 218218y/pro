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

function findMatchingParen(source, openAt) {
  let depth = 0;
  for (let i = openAt; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findFunctionBodyOpen(source, fromIndex) {
  let depth = 0;
  for (let i = fromIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') {
      if (depth === 0) {
        let j = i + 1;
        while (j < source.length && /\s/.test(source[j])) j += 1;
        const next = source.slice(j, j + 5);
        if (
          next !== 'width' &&
          next !== 'heigh' &&
          next !== 'depth' &&
          next !== 'doors' &&
          next !== 'chest'
        ) {
          return i;
        }
      }
      depth += 1;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      if (depth === 0 && source[j] === '{') return j;
    } else if (ch === '=') {
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      if (source[j] === '>') {
        j += 1;
        while (j < source.length && /\s/.test(source[j])) j += 1;
        return source[j] === '{' ? j : -1;
      }
    }
  }
  return -1;
}

function readFunctionBody(rel, source, name) {
  const marker = `function ${name}`;
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) {
    failures.push(`${rel}: missing function ${name}`);
    return '';
  }

  const paramsOpenAt = source.indexOf('(', markerAt + marker.length);
  if (paramsOpenAt < 0) {
    failures.push(`${rel}: cannot locate parameters for ${name}`);
    return '';
  }
  const paramsCloseAt = findMatchingParen(source, paramsOpenAt);
  if (paramsCloseAt < 0) {
    failures.push(`${rel}: cannot close parameters for ${name}`);
    return '';
  }

  const openAt = findFunctionBodyOpen(source, paramsCloseAt + 1);
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

function requirePublicUiRawExports(rel, source) {
  for (const symbol of [
    'readUiRawScalarFromCanonicalSnapshot',
    'hasCanonicalEssentialUiRawDimsFromSnapshot',
    'assertCanonicalUiRawDims',
    'readCanonicalUiRawNumberFromSnapshot',
    'readCanonicalUiRawIntFromSnapshot',
    'readCanonicalUiRawDimsCmFromSnapshot',
    'readCanonicalUiRawDimsCmFromStore',
  ]) {
    requireIncludes(rel, source, symbol, `${rel} public API must expose canonical ui.raw selector ${symbol}`);
  }
}

const loaderRel = 'esm/native/io/project_io_orchestrator_project_load.ts';
const migrationsRel = 'esm/native/io/project_migrations/index.ts';
const uiSelectorsRel = 'esm/native/runtime/ui_raw_selectors.ts';
const cfgMigrationRel = 'esm/native/io/project_migrations/config_snapshot_migration.ts';
const runtimeSelectorTestRel = 'tests/project_migration_runtime_selector_hardening_runtime.test.ts';
const coreApiRel = 'esm/native/core/api.ts';
const stateSurfaceRel = 'esm/native/services/api_state_surface.ts';

const loader = read(loaderRel);
const migrations = read(migrationsRel);
const uiSelectors = read(uiSelectorsRel);
const cfgMigration = read(cfgMigrationRel);
const runtimeSelectorTest = read(runtimeSelectorTestRel);
const coreApi = read(coreApiRel);
const stateSurface = read(stateSurfaceRel);

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

requirePublicUiRawExports(coreApiRel, coreApi);
requirePublicUiRawExports(stateSurfaceRel, stateSurface);

requireIncludes(
  runtimeSelectorTestRel,
  runtimeSelectorTest,
  'canonical ui.raw batch readers fail fast before project ingress migration and stay raw-only afterwards',
  'runtime selector tests must cover canonical batch readers against legacy ui.* fallback regression'
);
requireIncludes(
  runtimeSelectorTestRel,
  runtimeSelectorTest,
  'canonical ui.raw readers are exposed through public core and state surfaces',
  'runtime selector tests must lock the public API surface for canonical ui.raw readers'
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
