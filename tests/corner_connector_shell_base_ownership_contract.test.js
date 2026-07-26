import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/corner_connector_emit_shell_base.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const plinthOwnerRel = 'esm/shared/dimensions/base_plinth_policy.ts';
const legOwnerRel = 'esm/shared/dimensions/base_leg_policy.ts';
const platformOwnerRel = 'esm/shared/dimensions/base_platform_render_policy.ts';
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

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: ['CARCASS_BASE_DIMENSIONS'],
  syntax: 'static-import',
});

function expectedEntry({ toFile, importedSymbol, reason, removalCondition }) {
  return {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-25',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: plinthOwnerRel,
      kind: 'value',
      importedSymbols: ['BASE_PLINTH_POLICY'],
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
    toFile: legOwnerRel,
    importedSymbol: 'BASE_LEG_LAYOUT_POLICY',
    reason:
      'The Corner Connector shell-base flow replaces one legacy facade statement with the focused Base Plinth owner plus the focused Base Leg Layout owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Corner Connector shell-base composition seam eliminates the extra Base Leg Layout statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: platformOwnerRel,
    importedSymbol: 'BASE_PLATFORM_RENDER_POLICY',
    reason:
      'The Corner Connector shell-base flow replaces one legacy facade statement with the focused Base Plinth owner plus the focused Base Platform Render owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Corner Connector shell-base composition seam eliminates the extra Base Platform Render statement without reintroducing the legacy facade.',
  }),
]);

test('Corner Connector shell-base imports exactly the three focused Base owners', () => {
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
        importedSymbols: ['BASE_LEG_LAYOUT_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/base_platform_render_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLATFORM_RENDER_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/base_plinth_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLINTH_POLICY'],
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
    /\b(?:CARCASS_BASE_DIMENSIONS|PLINTH_DIMENSIONS|BASE_LEG_LAYOUT_DIMENSIONS|LEG_PLATFORM_DIMENSIONS)\b/u
  );
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:BASE_PLINTH_POLICY|BASE_LEG_LAYOUT_POLICY|BASE_PLATFORM_RENDER_POLICY)\s*;/u
  );
});

test('Corner Connector shell-base reads every migrated field directly from its semantic owner', () => {
  const source = read(consumerRel);
  const exactUses = new Map([
    ['BASE_PLINTH_POLICY.connectorMaxToeRatio', 1],
    ['BASE_PLINTH_POLICY.connectorToeEndTrimMaxM', 1],
    ['BASE_PLINTH_POLICY.connectorWallInsetM', 2],
    ['BASE_PLINTH_POLICY.connectorTinyEpsilonM', 1],
    ['BASE_PLINTH_POLICY.segmentWidthEpsilonM', 1],
    ['BASE_PLINTH_POLICY.connectorShapeInsetM', 1],
    ['BASE_LEG_LAYOUT_POLICY.connectorInsetM', 1],
    ['BASE_LEG_LAYOUT_POLICY.connectorBackInsetM', 2],
    ['BASE_PLATFORM_RENDER_POLICY.heightM', 1],
  ]);

  for (const [expression, expectedCount] of exactUses) {
    assert.equal(source.split(expression).length - 1, expectedCount, expression);
  }
  assert.equal((source.match(/\b1e-6\b/gu) ?? []).length, 4);
  assert.match(
    source,
    /Math\.max\(0, Math\.min\(toeInset, diagLen \* BASE_PLINTH_POLICY\.connectorMaxToeRatio\)\)/u
  );
  assert.match(source, /Math\.max\(-L \+ inset, -inset - BASE_LEG_LAYOUT_POLICY\.connectorBackInsetM\)/u);
  assert.match(
    source,
    /readPositiveNumber\(\s*baseLegHeightM,\s*Math\.max\(0, baseH - BASE_PLATFORM_RENDER_POLICY\.heightM\)\s*\)/u
  );
});

test('Corner Connector shell-base appends exactly Entries 150-151 after the unchanged 149-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 149)),
    '017aabccfc1a4d0fccde156cff556af4f6d0006409f196868b3d8a53dbd666e5'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(149, 151), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 151)),
    'e9e9c2b5c6446497ce5f8d3c9b4258b99a33ea23846a2f998c11375d10e03897'
  );
});
