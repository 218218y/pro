import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/runtime/default_state.ts';
const ownerRel = 'esm/shared/dimensions/runtime_default_state_dimension_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const replacementSymbols = Object.freeze([
  'BASE_LEG_DIMENSIONS',
  'BASE_PLINTH_POLICY',
  'CHEST_MODE_ACTIVE_DEFAULTS_POLICY',
  'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
  'DEFAULT_CHEST_DRAWERS_COUNT',
  'DEFAULT_CORNER_DOORS',
  'DEFAULT_CORNER_WIDTH',
  'DEFAULT_HEIGHT',
  'DEFAULT_HINGED_DOORS',
  'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
  'DEFAULT_WIDTH',
  'HINGED_DEFAULT_DEPTH',
]);

const companionImport = Object.freeze({
  toFile: 'esm/shared/dimensions/wardrobe_defaults.ts',
  kind: 'value',
  importedSymbols: [
    'DEFAULT_CHEST_DRAWERS_COUNT',
    'DEFAULT_CORNER_DOORS',
    'DEFAULT_CORNER_WIDTH',
    'DEFAULT_HEIGHT',
    'DEFAULT_HINGED_DOORS',
    'DEFAULT_WIDTH',
    'HINGED_DEFAULT_DEPTH',
  ],
  syntax: 'static-import',
});

function compactDependencies(analysis) {
  return analysis.imports.map(({ specifier, kind, syntax, importedSymbols }) => ({
    specifier,
    kind,
    syntax,
    importedSymbols,
  }));
}

test('Default State consumes one focused composition statement without aliases or facade access', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency =>
    dependency.specifier.startsWith('../../shared/dimensions/')
  );

  assert.deepEqual(compactDependencies({ imports: focusedImports }), [
    {
      specifier: '../../shared/dimensions/runtime_default_state_dimension_policy.js',
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
  assert.doesNotMatch(source, /\b(?:CARCASS_BASE_DIMENSIONS|CHEST_MODE_DIMENSIONS)\b/u);
});

test('Default State composition owner re-exports only the five canonical dimension statements', () => {
  const source = read(ownerRel);
  const analysis = analyzeModuleDependencies(path.join(root, ownerRel), source);

  assert.deepEqual(compactDependencies(analysis), [
    {
      specifier: './base_leg_policy.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['BASE_LEG_DIMENSIONS'],
    },
    {
      specifier: './base_plinth_policy.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['BASE_PLINTH_POLICY'],
    },
    {
      specifier: './chest_mode_policy.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['CHEST_MODE_ACTIVE_DEFAULTS_POLICY', 'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY'],
    },
    {
      specifier: './stack_split_policy.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
    },
    {
      specifier: './wardrobe_defaults.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: companionImport.importedSymbols,
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

test('Default State maps every dimension default through unchanged canonical bindings', () => {
  const source = read(consumerRel);

  for (const symbol of companionImport.importedSymbols) {
    assert.match(source, new RegExp(`\\b${symbol}\\b`, 'u'));
  }
  assert.match(source, /stackSplitLowerHeight: DEFAULT_STACK_SPLIT_LOWER_HEIGHT/u);
  assert.match(source, /basePlinthHeightCm: BASE_PLINTH_POLICY\.heightM \* 100/u);
  assert.match(source, /baseLegHeightCm: BASE_LEG_DIMENSIONS\.defaults\.heightCm/u);
  assert.match(source, /baseLegWidthCm: BASE_LEG_DIMENSIONS\.defaults\.taperedWidthCm/u);
  assert.match(
    source,
    /chestCommodeMirrorHeightCm: CHEST_MODE_COMMODE_CONSTRAINTS_POLICY\.defaultMirrorHeightCm/u
  );
  assert.match(source, /chestCommodeMirrorWidthCm: CHEST_MODE_ACTIVE_DEFAULTS_POLICY\.widthCm/u);
});
