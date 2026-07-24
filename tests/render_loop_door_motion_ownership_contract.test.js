import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/platform/render_loop_motion_doors.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const doorOwnerRel = 'esm/shared/dimensions/door_system_policy.ts';
const unitsOwnerRel = 'esm/shared/dimensions/units.ts';
const defaultsOwnerRel = 'esm/shared/dimensions/wardrobe_defaults.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: ['cmToM', 'DOOR_SYSTEM_DIMENSIONS', 'WARDROBE_DEFAULTS'],
  syntax: 'static-import',
});

function expectedEntry({ toFile, importedSymbol, reason, removalCondition }) {
  return {
    from: 'platform',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-24',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: doorOwnerRel,
      kind: 'value',
      importedSymbols: ['SLIDING_DOOR_CONSTRUCTION_POLICY'],
      syntax: 'static-import',
    },
    removedImport,
    addedImport: {
      toFile,
      kind: 'value',
      importedSymbols: [importedSymbol],
      syntax: 'static-import',
    },
    reason,
    removalCondition,
  };
}

const expectedEntries = Object.freeze([
  expectedEntry({
    toFile: unitsOwnerRel,
    importedSymbol: 'cmToM',
    reason:
      'The render-loop door motion flow replaces one legacy facade statement with the focused Sliding Door Construction owner plus the canonical centimeter-to-meter conversion on the existing platform to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed render-loop door-motion composition seam eliminates the extra Units statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: defaultsOwnerRel,
    importedSymbol: 'WARDROBE_DEFAULTS',
    reason:
      'The render-loop door motion flow replaces one legacy facade statement with the focused Sliding Door Construction owner plus the canonical Wardrobe Defaults owner on the existing platform to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed render-loop door-motion composition seam eliminates the extra Wardrobe Defaults statement without reintroducing the legacy facade.',
  }),
]);

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
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name) ? [absolute] : [];
  });
}

function facadeConsumers(importedSymbol) {
  return listSourceFiles(path.join(root, 'esm'))
    .flatMap(file => {
      const relativeFile = path.relative(root, file).replaceAll(path.sep, '/');
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes(importedSymbol) || !source.includes('wardrobe_dimension_tokens_shared')) return [];
      const dependencies = analyzeModuleDependencies(file, source).imports;
      return dependencies.some(
        dependency =>
          dependency.syntax === 'static-import' &&
          dependency.specifier.includes('wardrobe_dimension_tokens_shared') &&
          dependency.importedSymbols.includes(importedSymbol)
      )
        ? [relativeFile]
        : [];
    })
    .sort();
}

test('Render Loop Door Motion imports exactly three focused owners without aliases or aggregate policies', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency =>
    dependency.specifier.startsWith('../../shared/dimensions/')
  );

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
        importedSymbols: ['SLIDING_DOOR_CONSTRUCTION_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['cmToM'],
      },
      {
        specifier: '../../shared/dimensions/wardrobe_defaults.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['WARDROBE_DEFAULTS'],
      },
    ]
  );
  assert.equal(focusedImports.length, 3);
  assert.equal(
    focusedImports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.localName)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(source, /import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u);
  assert.doesNotMatch(
    source,
    /\b(?:DOOR_SYSTEM_DIMENSIONS|SLIDING_DOOR_SYSTEM_POLICY|WARDROBE_DEFAULTS_OWNER)\b/u
  );
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:SLIDING_DOOR_CONSTRUCTION_POLICY|WARDROBE_DEFAULTS)\s*;/u
  );
});

test('Render Loop Door Motion preserves focused sliding construction, Units, and Defaults formulas', () => {
  const source = read(consumerRel);

  assert.equal((source.match(/SLIDING_DOOR_CONSTRUCTION_POLICY\.overlapM/gu) ?? []).length, 1);
  assert.equal((source.match(/SLIDING_DOOR_CONSTRUCTION_POLICY\.defaultDoorsCount/gu) ?? []).length, 2);
  assert.equal((source.match(/cmToM\(WARDROBE_DEFAULTS\.widthCm\)/gu) ?? []).length, 2);
  assert.match(source, /const overlap = SLIDING_DOOR_CONSTRUCTION_POLICY\.overlapM;/u);
  assert.match(
    source,
    /doorsCount =\s*\(Number\.isFinite\(doorsCount\)\s*\? doorsCount\s*:\s*SLIDING_DOOR_CONSTRUCTION_POLICY\.defaultDoorsCount\) \|\|\s*SLIDING_DOOR_CONSTRUCTION_POLICY\.defaultDoorsCount;/u
  );
  assert.match(source, /\(totalW \+ \(doorsCount - 1\) \* overlap\) \/ doorsCount/u);
  assert.match(source, /d\.originalX = idx \* \(doorW - overlap\) - totalW \/ 2 \+ doorW \/ 2;/u);
  assert.match(source, /d\.originalZ = g\.position \? g\.position\.z : 0;/u);
});

test('Render Loop Door Motion appends exactly Entries 135-136 after the unchanged 134-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 134)),
    '99435b0f09eafa7c93cd6cf0e879685dc5e66b22b7ef6e43469f1777c778e919'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(134, 136), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 136)),
    '17c6ec0de239b5bce3d6745b654dd6aa0c3650e626e8ecca360db3ced781ac47'
  );
});

test('Render Loop Door Motion leaves the exact requested legacy-facade inventories', () => {
  assert.deepEqual(facadeConsumers('DOOR_SYSTEM_DIMENSIONS'), [
    'esm/native/builder/visuals_chest_mode_build.ts',
  ]);
  assert.deepEqual(facadeConsumers('WARDROBE_DEFAULTS'), [
    'esm/native/builder/render_dimension_ops_shared.ts',
    'esm/native/data/preset_models_data.ts',
    'esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts',
  ]);
  assert.deepEqual(facadeConsumers('cmToM'), [
    'esm/native/builder/visuals_chest_mode_inputs.ts',
    'esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts',
  ]);
});
