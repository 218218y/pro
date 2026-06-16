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
const uiSelectorsRel = 'esm/native/runtime/ui_raw_selectors.ts';
const uiSnapshotSelectorsRel = 'esm/native/runtime/ui_raw_selectors_snapshot.ts';
const uiCanonicalSelectorsRel = 'esm/native/runtime/ui_raw_selectors_canonical.ts';
const canonicalSnapshotRel = 'esm/native/io/project_load_canonical_snapshot.ts';
const runtimeSelectorTestRel = 'tests/project_migration_runtime_selector_hardening_runtime.test.ts';
const coreApiRel = 'esm/native/core/api.ts';
const stateSurfaceRel = 'esm/native/services/api_state_surface.ts';

const loader = read(loaderRel);
const uiSelectors = read(uiSelectorsRel);
const uiSnapshotSelectors = read(uiSnapshotSelectorsRel);
const uiCanonicalSelectors = read(uiCanonicalSelectorsRel);
const canonicalSnapshot = read(canonicalSnapshotRel);
const runtimeSelectorTest = read(runtimeSelectorTestRel);
const coreApi = read(coreApiRel);
const stateSurface = read(stateSurfaceRel);

requireIncludes(
  loaderRel,
  loader,
  'buildCanonicalProjectUiSnapshot',
  'project load must canonicalize ui snapshots through the current-schema snapshot owner'
);
requireIncludes(
  loaderRel,
  loader,
  'buildCanonicalProjectConfigSnapshot',
  'project load must canonicalize config snapshots through the current-schema snapshot owner'
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
  loaderRel,
  loader,
  "from './project_load_canonical_snapshot.js'",
  'project load must import the current-schema snapshot owner directly'
);
requireIncludes(
  canonicalSnapshotRel,
  canonicalSnapshot,
  'canonicalizeProjectUiSnapshot',
  'current-schema snapshot owner must expose ui.raw canonicalization'
);
requireIncludes(
  canonicalSnapshotRel,
  canonicalSnapshot,
  'buildCanonicalProjectUiSnapshot',
  'current-schema snapshot owner must expose project-load ui.raw snapshots'
);
requireIncludes(
  canonicalSnapshotRel,
  canonicalSnapshot,
  'PROJECT_CONFIG_SNAPSHOT_REQUIRED_KEYS',
  'current-schema snapshot owner must define canonical config required keys'
);
requireIncludes(
  canonicalSnapshotRel,
  canonicalSnapshot,
  'assertCanonicalProjectConfigSnapshot',
  'current-schema snapshot owner must expose a fail-fast config assertion'
);
requireNotIncludes(
  canonicalSnapshotRel,
  canonicalSnapshot,
  'filledKeys',
  'current-schema ui.raw canonicalization must not fill from old top-level UI fields'
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
  uiSnapshotSelectorsRel,
  uiSnapshotSelectors,
  'readUiRawScalarFromSnapshot',
  'readUiDirectScalar(ui, key)',
  'legacy snapshot reader may be tolerant, but that tolerance must stay isolated in the non-canonical reader'
);
requireFunctionIncludes(
  uiCanonicalSelectorsRel,
  uiCanonicalSelectors,
  'readUiRawScalarFromCanonicalSnapshot',
  'Object.prototype.hasOwnProperty.call(raw, key)',
  'canonical reader must require an explicit ui.raw key instead of reading legacy ui.* fields'
);
requireFunctionNotIncludes(
  uiCanonicalSelectorsRel,
  uiCanonicalSelectors,
  'readUiRawScalarFromCanonicalSnapshot',
  'readUiDirectScalar',
  'canonical reader must not fall back to legacy ui.* fields'
);
requireFunctionNotIncludes(
  uiCanonicalSelectorsRel,
  uiCanonicalSelectors,
  'assertCanonicalUiRawDims',
  'readUiRawScalarFromSnapshot',
  'canonical assertion must not validate through tolerant snapshot readers'
);
requireFunctionIncludes(
  uiCanonicalSelectorsRel,
  uiCanonicalSelectors,
  'readCanonicalUiRawNumberFromSnapshot',
  'readUiRawScalarFromCanonicalSnapshot(ui, key)',
  'canonical number reader must use canonical scalar reads only'
);
requireFunctionNotIncludes(
  uiCanonicalSelectorsRel,
  uiCanonicalSelectors,
  'readCanonicalUiRawNumberFromSnapshot',
  'readUiRawScalarFromSnapshot',
  'canonical number reader must not use tolerant snapshot reads'
);
requireFunctionIncludes(
  uiCanonicalSelectorsRel,
  uiCanonicalSelectors,
  'readCanonicalUiRawDimsCmFromSnapshot',
  'assertCanonicalUiRawDims(ui, context)',
  'canonical dimensions reader must fail fast when project ingress did not migrate ui.raw dimensions'
);
requireFunctionIncludes(
  uiCanonicalSelectorsRel,
  uiCanonicalSelectors,
  'readCanonicalUiRawDimsCmFromSnapshot',
  'readCanonicalUiRawNumberFromSnapshot',
  'canonical dimensions reader must compose canonical numeric readers'
);
requireFunctionNotIncludes(
  uiCanonicalSelectorsRel,
  uiCanonicalSelectors,
  'readCanonicalUiRawDimsCmFromSnapshot',
  'readUiRawNumberFromSnapshot',
  'canonical dimensions reader must not use tolerant legacy numeric readers'
);

requirePublicUiRawExports(coreApiRel, coreApi);
requirePublicUiRawExports(stateSurfaceRel, stateSurface);

requireIncludes(
  runtimeSelectorTestRel,
  runtimeSelectorTest,
  'canonical ui.raw batch readers fail fast for old top-level-only snapshots before and after project ingress canonicalization',
  'runtime selector tests must cover canonical batch readers against old ui.* fallback regression'
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
  'readCanonicalUiRawDimsCmFromSnapshot(oldSnapshot',
  'runtime selector tests must prove canonical batch readers reject old top-level-only snapshots'
);

if (failures.length) {
  console.error('[runtime-selector-policy] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[runtime-selector-policy] ok');
