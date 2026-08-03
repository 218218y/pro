import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/platform/render_loop_motion_doors.ts';
const ownerRel = 'esm/shared/dimensions/render_loop_door_motion_dimension_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const replacementSymbols = Object.freeze(['SLIDING_DOOR_CONSTRUCTION_POLICY', 'WARDROBE_DEFAULTS', 'cmToM']);

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
