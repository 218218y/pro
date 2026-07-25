import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/runtime/default_state.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

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

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: [
    'DEFAULT_CHEST_DRAWERS_COUNT',
    'DEFAULT_CORNER_DOORS',
    'DEFAULT_CORNER_WIDTH',
    'DEFAULT_HEIGHT',
    'DEFAULT_HINGED_DOORS',
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
    'DEFAULT_WIDTH',
    'HINGED_DEFAULT_DEPTH',
    'BASE_LEG_DIMENSIONS',
    'CARCASS_BASE_DIMENSIONS',
    'CHEST_MODE_DIMENSIONS',
  ],
  syntax: 'static-import',
});

function expectedEntry({ toFile, importedSymbols, reason, removalCondition }) {
  return {
    from: 'runtime',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-25',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport,
    removedImport,
    addedImport: {
      toFile,
      kind: 'value',
      importedSymbols,
      syntax: 'static-import',
    },
    reason,
    removalCondition,
  };
}

const expectedEntries = Object.freeze([
  expectedEntry({
    toFile: 'esm/shared/dimensions/stack_split_policy.ts',
    importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
    reason:
      'The root default-state factory replaces one legacy facade statement with the canonical Wardrobe Defaults statement plus the focused Stack Split default owner on the existing runtime to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed default-state composition seam eliminates the extra Stack Split statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/base_leg_policy.ts',
    importedSymbols: ['BASE_LEG_DIMENSIONS'],
    reason:
      'The root default-state factory replaces one legacy facade statement with the canonical Wardrobe Defaults statement plus the focused Base Leg defaults owner on the existing runtime to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed default-state composition seam eliminates the extra Base Leg statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/base_plinth_policy.ts',
    importedSymbols: ['BASE_PLINTH_POLICY'],
    reason:
      'The root default-state factory replaces one legacy facade statement with the canonical Wardrobe Defaults statement plus the focused Base Plinth owner on the existing runtime to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed default-state composition seam eliminates the extra Base Plinth statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/chest_mode_policy.ts',
    importedSymbols: ['CHEST_MODE_ACTIVE_DEFAULTS_POLICY', 'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY'],
    reason:
      'The root default-state factory replaces one legacy facade statement with the canonical Wardrobe Defaults statement plus the focused Chest Mode Active Defaults and Commode Constraints owners on the existing runtime to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed default-state composition seam eliminates the extra Chest Mode statement without reintroducing the legacy facade.',
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
      const source = fs.readFileSync(file, 'utf8');
      const dependencies = analyzeModuleDependencies(file, source).imports;
      return dependencies.some(
        dependency =>
          dependency.syntax === 'static-import' &&
          dependency.specifier.includes('wardrobe_dimension_tokens_shared') &&
          dependency.importedSymbols.includes(importedSymbol)
      )
        ? [path.relative(root, file).replaceAll(path.sep, '/')]
        : [];
    })
    .sort();
}

test('Default State imports exactly five focused owner statements without aliases or facade access', () => {
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
        specifier: '../../shared/dimensions/base_leg_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_LEG_DIMENSIONS'],
      },
      {
        specifier: '../../shared/dimensions/base_plinth_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLINTH_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/chest_mode_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CHEST_MODE_ACTIVE_DEFAULTS_POLICY', 'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/stack_split_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'],
      },
      {
        specifier: '../../shared/dimensions/wardrobe_defaults.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: companionImport.importedSymbols,
      },
    ]
  );
  assert.equal(focusedImports.length, 5);
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
  assert.doesNotMatch(source, /\b(?:CARCASS_BASE_DIMENSIONS|CHEST_MODE_DIMENSIONS)\b/u);
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:BASE_LEG_DIMENSIONS|BASE_PLINTH_POLICY|CHEST_MODE_ACTIVE_DEFAULTS_POLICY|CHEST_MODE_COMMODE_CONSTRAINTS_POLICY)\s*;/u
  );
});

test('Default State maps every dimension default directly to its focused owner', () => {
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

test('Default State appends exactly Entries 146-149 after the unchanged 145-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 145)),
    'd4f939330cd5c5ec1febe5a004598d66f0a0dcc40618591f3fedffb367ea2447'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(145, 149), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 149)),
    '017aabccfc1a4d0fccde156cff556af4f6d0006409f196868b3d8a53dbd666e5'
  );
});

test('Default State leaves only the exact requested Base facade inventory', () => {
  assert.deepEqual(facadeConsumers('CARCASS_BASE_DIMENSIONS'), [
    'esm/native/builder/corner_connector_emit_shell_base.ts',
  ]);
  assert.deepEqual(facadeConsumers('CHEST_MODE_DIMENSIONS'), []);
  assert.deepEqual(facadeConsumers('BASE_LEG_DIMENSIONS'), []);
});
