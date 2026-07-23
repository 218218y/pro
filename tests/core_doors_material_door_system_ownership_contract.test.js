import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/core_doors_compute.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const doorOwnerRel = 'esm/shared/dimensions/door_system_policy.ts';
const materialOwnerRel = 'esm/shared/dimensions/material_thickness_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const hingedFields = Object.freeze([
  'insetRevealM',
  'sameModuleLeafGapMaxM',
  'sameModuleLeafGapWoodDivisor',
  'sameModuleLeafGapSpanRatioMax',
]);
const slidingFields = Object.freeze([
  'defaultDoorsCount',
  'overlapM',
  'railHeightM',
  'railDepthM',
  'railBackInsetM',
  'shellClearanceMinM',
  'shellClearanceMaxM',
  'shellClearanceWoodDivisor',
  'doorTopOverlapMaxM',
  'doorTopOverlapRailInsetM',
  'doorHeightMinM',
  'railLineOffsetYExtraM',
  'railTrackLaneDivisor',
]);

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const semanticSha256 = value => createHash('sha256').update(stableJson(value)).digest('hex');

const expectedEntry = Object.freeze({
  from: 'builder',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-23',
  reviewBy: '2026-10-18',
  fromFile: consumerRel,
  companionImport: {
    toFile: doorOwnerRel,
    kind: 'value',
    importedSymbols: ['HINGED_DOOR_MOUNT_POLICY', 'SLIDING_DOOR_CONSTRUCTION_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['DOOR_SYSTEM_DIMENSIONS', 'MATERIAL_DIMENSIONS'],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: materialOwnerRel,
    kind: 'value',
    importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
    syntax: 'static-import',
  },
  reason:
    'The core door geometry flow replaces one legacy facade statement with focused Hinged Door Mount and Sliding Door Construction owners plus the canonical Material Thickness owner on the existing builder to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed core door geometry composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
});

test('Core Doors imports exactly its two focused owner statements without aliases or aggregates', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency => dependency.specifier.includes('/dimensions/'));

  assert.deepEqual(
    focusedImports.map(({ specifier, kind, syntax, importedSymbols }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
    })),
    [
      {
        specifier: '../../shared/dimensions/door_system_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['HINGED_DOOR_MOUNT_POLICY', 'SLIDING_DOOR_CONSTRUCTION_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/material_thickness_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      },
    ]
  );
  assert.equal(focusedImports.length, 2);
  assert.equal(
    focusedImports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.localName)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(
    source,
    /\b(?:DOOR_SYSTEM_DIMENSIONS|MATERIAL_DIMENSIONS|HINGED_DOOR_SYSTEM_POLICY|SLIDING_DOOR_SYSTEM_POLICY|doorDims|hingedDims|slidingDims|materialDims)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
  );
});

test('Core Doors maps all seventeen Door System fields and Material thickness directly to focused owners', () => {
  const source = read(consumerRel);

  for (const field of hingedFields) {
    assert.match(source, new RegExp(`HINGED_DOOR_MOUNT_POLICY\\.${field}`, 'u'));
  }
  for (const field of slidingFields) {
    assert.match(source, new RegExp(`SLIDING_DOOR_CONSTRUCTION_POLICY\\.${field}`, 'u'));
  }
  assert.equal((source.match(/MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/gu) ?? []).length, 3);
  assert.match(source, /const INSET_REVEAL\s*=\s*HINGED_DOOR_MOUNT_POLICY\.insetRevealM/u);
});

test('Core Doors migration appends exactly Entry 125 after the unchanged 124-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(baseline.migrationBudgets.length, 125);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 124)),
    '9eeb17b61e2b1a64eb9303ca0b750319da74d868131f9130a26f1bd4977d49cf'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(124, 125), [expectedEntry]);
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    '84e9877bc6ca47028c5e081018b3025b96ea2f040d5d4f1ab838d9c1b0bd47cb'
  );
});

test('Core Doors migration leaves exactly two Material and two Door System facade statements', () => {
  const facadeDependencies = listSourceFiles(path.join(root, 'esm')).flatMap(file =>
    analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'))
      .imports.filter(
        dependency =>
          dependency.syntax === 'static-import' &&
          dependency.specifier.includes('wardrobe_dimension_tokens_shared')
      )
      .map(dependency => ({
        file: path.relative(root, file).replaceAll('\\', '/'),
        importedSymbols: dependency.importedSymbols,
      }))
  );
  const consumers = symbol =>
    facadeDependencies
      .filter(dependency => dependency.importedSymbols.includes(symbol))
      .map(dependency => dependency.file)
      .sort();

  assert.deepEqual(consumers('MATERIAL_DIMENSIONS'), [
    'esm/native/builder/core_carcass_shared.ts',
    'esm/native/builder/core_layout_compute.ts',
  ]);
  assert.deepEqual(consumers('DOOR_SYSTEM_DIMENSIONS'), [
    'esm/native/builder/visuals_chest_mode_build.ts',
    'esm/native/platform/render_loop_motion_doors.ts',
  ]);
});
