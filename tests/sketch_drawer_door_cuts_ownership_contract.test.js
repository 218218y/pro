import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/post_build_sketch_door_cuts_apply.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const doorOwnerRel = 'esm/shared/dimensions/door_system_policy.ts';
const drawerOwnerRel = 'esm/shared/dimensions/drawer_sketch_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

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

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}

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
    importedSymbols: ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['DOOR_SYSTEM_DIMENSIONS', 'DRAWER_DIMENSIONS'],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: drawerOwnerRel,
    kind: 'value',
    importedSymbols: ['DRAWER_SKETCH_DOOR_CUT_POLICY'],
    syntax: 'static-import',
  },
  reason:
    'The post-build Sketch drawer door-cut application replaces one legacy facade statement with the focused Hinged Door Split Geometry owner plus the focused Drawer Sketch Door Cut owner on the existing builder to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed Sketch drawer door-cut composition seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.',
});

test('Sketch drawer door cuts import exactly the two focused owners without aliases', () => {
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
        importedSymbols: ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/drawer_sketch_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DRAWER_SKETCH_DOOR_CUT_POLICY'],
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
    /\b(?:DOOR_SYSTEM_DIMENSIONS|DRAWER_DIMENSIONS|HINGED_DOOR_SPLIT_POLICY|HINGED_DOOR_SYSTEM_POLICY|DRAWER_SKETCH_POLICY|splitDims|drawerDims|doorDims|cutDims)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
  );
});

test('Sketch drawer door cuts preserve the focused split and drawer-cut formulas', () => {
  const source = read(consumerRel);
  for (const field of [
    'minHeightForSplitM',
    'splitGapM',
    'bottomClampOffsetM',
    'topClampOffsetM',
    'minSegmentHeightM',
    'duplicateCutToleranceMinM',
    'duplicateCutToleranceMaxM',
    'duplicateCutToleranceHeightRatio',
  ]) {
    assert.match(source, new RegExp(`HINGED_DOOR_SPLIT_GEOMETRY_POLICY\\.${field}`, 'u'));
  }
  assert.match(source, /overlap > DRAWER_SKETCH_DOOR_CUT_POLICY\.doorCutHorizontalOverlapMinM/u);
  assert.equal((source.match(/DRAWER_SKETCH_DOOR_CUT_POLICY\.doorCutNoOpToleranceM/gu) || []).length, 2);
  assert.match(
    source,
    /minHeight:\s*splitPosList\.length\s*\?\s*HINGED_DOOR_SPLIT_GEOMETRY_POLICY\.splitGapM\s*\/\s*2\s*:\s*undefined/u
  );
});

test('Sketch drawer door-cut migration appends exactly Entry 123', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 123);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 122)),
    '60b9ef2947cfea12ddc16423ead76437ff6db645889aed2818e41f6733f9a112'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(122, 123), [expectedEntry]);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 123)),
    '7423bf5013baa9665b6ba01fe19d4dc57d4785dae27217f6509920b5a3c7f725'
  );
});

test('Sketch drawer door-cut migration leaves only the approved legacy consumers', () => {
  const facadeDependencies = listSourceFiles(path.join(root, 'esm')).flatMap(file =>
    analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'))
      .imports.filter(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared'))
      .map(dependency => ({
        file: path.relative(root, file).replaceAll('\\', '/'),
        ...dependency,
      }))
  );

  assert.deepEqual(
    facadeDependencies
      .filter(dependency => dependency.importedSymbols.includes('DRAWER_DIMENSIONS'))
      .map(dependency => dependency.file),
    ['esm/native/builder/render_drawer_ops_internal.ts']
  );
  assert.deepEqual(
    facadeDependencies
      .filter(dependency => dependency.importedSymbols.includes('DOOR_SYSTEM_DIMENSIONS'))
      .map(dependency => dependency.file)
      .sort(),
    [
      'esm/native/builder/core_doors_compute.ts',
      'esm/native/builder/visuals_chest_mode_build.ts',
      'esm/native/platform/render_loop_motion_doors.ts',
    ]
  );
});
