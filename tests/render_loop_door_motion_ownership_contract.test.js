import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/platform/render_loop_motion_doors.ts';
const ownerRel = 'esm/shared/dimensions/render_loop_door_motion_dimension_policy.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const doorOwnerRel = 'esm/shared/dimensions/door_system_policy.ts';
const unitsOwnerRel = 'esm/shared/dimensions/units.ts';
const defaultsOwnerRel = 'esm/shared/dimensions/wardrobe_defaults.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const replacementSymbols = Object.freeze(['SLIDING_DOOR_CONSTRUCTION_POLICY', 'WARDROBE_DEFAULTS', 'cmToM']);

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

function compactDependencies(analysis) {
  return analysis.imports.map(({ specifier, kind, syntax, importedSymbols }) => ({
    specifier,
    kind,
    syntax,
    importedSymbols,
  }));
}

test('Render Loop Door Motion consumes one focused composition statement without aliases', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency =>
    dependency.specifier.startsWith('../../shared/dimensions/')
  );

  assert.deepEqual(compactDependencies({ imports: focusedImports }), [
    {
      specifier: '../../shared/dimensions/render_loop_door_motion_dimension_policy.js',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: replacementSymbols,
    },
  ]);
  assert.equal(
    focusedImports[0].bindings.every(binding => binding.importedName === binding.localName),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(source, /import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u);
});

test('Render Loop Door Motion composition owner re-exports exactly three canonical bindings', () => {
  const source = read(ownerRel);
  const analysis = analyzeModuleDependencies(path.join(root, ownerRel), source);

  assert.deepEqual(compactDependencies(analysis), [
    {
      specifier: './door_system_policy.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['SLIDING_DOOR_CONSTRUCTION_POLICY'],
    },
    {
      specifier: './units.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['cmToM'],
    },
    {
      specifier: './wardrobe_defaults.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['WARDROBE_DEFAULTS'],
    },
  ]);
  assert.equal(
    analysis.imports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.exportedName)
    ),
    true
  );
  assert.doesNotMatch(source, /const\s|Object\.freeze|=>|function\s/u);
});

test('Render Loop Door Motion preserves sliding construction, conversion, and Defaults formulas', () => {
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

test('Render Loop Door Motion preserves Entries 135-136 and retires them through one exact group', () => {
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

  const group = baseline.migrationConsolidations.find(
    entry => entry.id === 'platform-door-motion-dimension-consolidation'
  );
  assert.ok(group);
  assert.deepEqual(group.entryNumbers, [135, 136]);
  assert.deepEqual(group.replacementStatement, {
    toFile: ownerRel,
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: replacementSymbols,
  });
  assert.deepEqual(
    baseline.migrationRetirements
      .filter(entry => group.entryNumbers.includes(entry.entryNumber))
      .map(entry => [entry.entryNumber, entry.mode, entry.replacementConsolidationId]),
    [
      [135, 'statement-consolidated', 'platform-door-motion-dimension-consolidation'],
      [136, 'statement-consolidated', 'platform-door-motion-dimension-consolidation'],
    ]
  );
  assert.deepEqual(
    new Set(group.absorbedStatements.map(statement => statement.toFile)),
    new Set([doorOwnerRel, unitsOwnerRel, defaultsOwnerRel])
  );
});
