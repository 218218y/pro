#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_LOAD_FILE = 'esm/native/io/project_io_orchestrator_project_load.ts';
const PROJECT_CANONICAL_SNAPSHOT_FILE = 'esm/native/io/project_load_canonical_snapshot.ts';
const UI_RAW_SELECTORS_FILE = 'esm/native/runtime/ui_raw_selectors.ts';
const RUNTIME_ROOT = 'esm/native/runtime';

const PROJECT_CONFIG_SCALAR_REQUIRED_KEYS = [
  'wardrobeType',
  'boardMaterial',
  'isManualWidth',
  'showDimensions',
  'isMultiColorMode',
  'isLibraryMode',
  'grooveLinesCount',
  'overlayFrameThicknessCm',
  'overlayShelfThicknessCm',
  'insetFrameThicknessCm',
  'insetShelfThicknessCm',
];

const PROJECT_CONFIG_REPLACE_KEYS = [
  'modulesConfiguration',
  'stackSplitLowerModulesConfiguration',
  'cornerConfiguration',
  'groovesMap',
  'grooveLinesCountMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
  'removedDoorsMap',
  'roundedFrameSideShelvesMap',
  'drawerDividersMap',
  'individualColors',
  'doorSpecialMap',
  'doorStyleMap',
  'mirrorLayoutMap',
  'doorTrimMap',
  'savedColors',
  'savedNotes',
  'preChestState',
  'handlesMap',
  'hingeMap',
  'curtainMap',
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function walkFiles(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        files.push(full.split(path.sep).join('/'));
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function requireNeedle(failures, label, source, needle, message) {
  if (!source.includes(needle)) failures.push(`${label}: ${message || `missing ${needle}`}`);
}

function requireNoNeedle(failures, label, source, needle, message) {
  if (source.includes(needle)) failures.push(`${label}: ${message || `must not contain ${needle}`}`);
}

function findRuntimeImportsFromProjectCanonicalSnapshot(projectRoot) {
  const failures = [];
  for (const file of walkFiles(path.join(projectRoot, RUNTIME_ROOT))) {
    const rel = path.relative(projectRoot, file).split(path.sep).join('/');
    const text = read(file);
    if (
      /from\s+['"][.\/]+io\/project_load_canonical_snapshot/.test(text) ||
      /from\s+['"][.\/]+project_load_canonical_snapshot/.test(text) ||
      /from\s+['"][.\/]+io\/project_migrations\//.test(text) ||
      /from\s+['"][.\/]+project_migrations\//.test(text)
    ) {
      failures.push(`${rel} imports the project-load canonicalization boundary; runtime must stay below IO.`);
    }
  }
  return failures;
}

function requireOrderedNeedles(failures, label, source, needles, message) {
  let cursor = -1;
  for (const needle of needles) {
    const next = source.indexOf(needle, cursor + 1);
    if (next < 0) {
      failures.push(`${label}: ${message || 'missing ordered needle'} (${needle})`);
      continue;
    }
    if (next < cursor) failures.push(`${label}: ${needle} is out of order`);
    cursor = next;
  }
}

export function runProjectMigrationBoundaryAudit(projectRoot = process.cwd()) {
  const failures = [];
  const projectLoadPath = path.join(projectRoot, PROJECT_LOAD_FILE);
  const canonicalSnapshotPath = path.join(projectRoot, PROJECT_CANONICAL_SNAPSHOT_FILE);
  const uiRawSelectorsPath = path.join(projectRoot, UI_RAW_SELECTORS_FILE);

  if (!fs.existsSync(projectLoadPath)) failures.push(`${PROJECT_LOAD_FILE} is missing.`);
  if (!fs.existsSync(canonicalSnapshotPath)) failures.push(`${PROJECT_CANONICAL_SNAPSHOT_FILE} is missing.`);
  if (!fs.existsSync(uiRawSelectorsPath)) failures.push(`${UI_RAW_SELECTORS_FILE} is missing.`);

  if (fs.existsSync(projectLoadPath)) {
    const projectLoad = read(projectLoadPath);
    if (!projectLoad.includes("from './project_load_canonical_snapshot.js'")) {
      failures.push(
        'project load must use the project-load canonical snapshot owner for current-schema ingress.'
      );
    }
    if (/project_migrations|project_schema_migrations|project_schema_migrate/.test(projectLoad)) {
      failures.push('project load must not import or reference deleted legacy migration owners.');
    }
    if (/ensureUiRawDimsFromSnapshot|hasEssentialUiDimsFromSnapshot/.test(projectLoad)) {
      failures.push('project load must not use runtime fail-soft ui.raw completion helpers directly.');
    }
    if (!/assertCanonicalUiRawDims\(/.test(projectLoad)) {
      failures.push(
        'project load must assert canonical ui.raw dimensions after current-schema canonicalization.'
      );
    }
    requireNeedle(
      failures,
      PROJECT_LOAD_FILE,
      projectLoad,
      'PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS',
      'project load must use the canonical snapshot config replace-key map'
    );
    requireNoNeedle(
      failures,
      PROJECT_LOAD_FILE,
      projectLoad,
      'PROJECT_LOAD_CONFIG_REPLACE_KEYS',
      'project load must not carry a local config replace-key policy'
    );
  }

  if (fs.existsSync(canonicalSnapshotPath)) {
    const canonicalSnapshot = read(canonicalSnapshotPath);
    requireNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'PROJECT_CONFIG_SCALAR_REQUIRED_KEYS',
      'canonical snapshot owner must define deterministic scalar required-key order'
    );
    requireNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER',
      'canonical snapshot owner must define deterministic project-load replace-owned branches'
    );
    requireNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'buildProjectConfigSnapshotReplaceKeyMap',
      'canonical snapshot replace-key map must be derived from the deterministic owner order'
    );
    requireNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'isProjectConfigSnapshotReplaceKey',
      'canonical snapshot owner must expose a type-narrowing replace-key guard'
    );
    requireNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'PROJECT_CONFIG_SNAPSHOT_REQUIRED_KEYS',
      'canonical snapshot owner must include replace-owned branches in the canonical required-key contract'
    );
    requireNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'canonicalizeProjectUiSnapshot',
      'canonical snapshot owner must expose ui.raw canonicalization'
    );
    requireNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'buildCanonicalProjectUiSnapshot',
      'canonical snapshot owner must expose project-load ui.raw canonical snapshots'
    );
    requireNoNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'filledKeys',
      'current-schema ui.raw canonicalization must not fill from old top-level UI fields'
    );
    requireNoNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      'source[key]',
      'current-schema ui.raw canonicalization must not read old top-level UI scalar fields'
    );
    requireNoNeedle(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      '...Object.keys(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS)',
      'required-key contract must not depend on object-key enumeration order'
    );
    requireOrderedNeedles(
      failures,
      PROJECT_CANONICAL_SNAPSHOT_FILE,
      canonicalSnapshot,
      [
        'PROJECT_CONFIG_SCALAR_REQUIRED_KEYS',
        'PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER',
        'PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS',
        'PROJECT_CONFIG_SNAPSHOT_REQUIRED_KEYS',
      ],
      'canonical snapshot owner order must stay scalar keys -> replace-key order -> map -> required keys'
    );
    for (const key of PROJECT_CONFIG_SCALAR_REQUIRED_KEYS) {
      requireNeedle(
        failures,
        PROJECT_CANONICAL_SNAPSHOT_FILE,
        canonicalSnapshot,
        `'${key}'`,
        `canonical snapshot scalar required-key order must include ${key}`
      );
    }
    for (const key of PROJECT_CONFIG_REPLACE_KEYS) {
      requireNeedle(
        failures,
        PROJECT_CANONICAL_SNAPSHOT_FILE,
        canonicalSnapshot,
        `'${key}'`,
        `canonical snapshot replace-key order must include ${key}`
      );
      requireNeedle(
        failures,
        PROJECT_CANONICAL_SNAPSHOT_FILE,
        canonicalSnapshot,
        `out[key] = true`,
        'canonical snapshot replace-key map must be built from the owner order'
      );
    }
  }

  if (fs.existsSync(uiRawSelectorsPath)) {
    const selectors = read(uiRawSelectorsPath);
    for (const symbol of [
      'readUiRawScalarFromCanonicalSnapshot',
      'hasCanonicalEssentialUiRawDimsFromSnapshot',
      'assertCanonicalUiRawDims',
    ]) {
      if (!selectors.includes(symbol)) {
        failures.push(`${UI_RAW_SELECTORS_FILE} public facade must export ${symbol}.`);
      }
    }
  }

  failures.push(...findRuntimeImportsFromProjectCanonicalSnapshot(projectRoot));
  return { ok: failures.length === 0, failures };
}

function main() {
  const result = runProjectMigrationBoundaryAudit();
  if (!result.ok) {
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log('Project canonical snapshot boundary audit passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
