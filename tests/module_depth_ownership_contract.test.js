import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/module_loop_pipeline_module_depth.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const shellOwnerRel = 'esm/shared/dimensions/carcass_shell_policy.ts';
const interiorOwnerRel = 'esm/shared/dimensions/carcass_interior_policy.ts';
const unitsOwnerRel = 'esm/shared/dimensions/units.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: ['CARCASS_INTERIOR_DIMENSIONS', 'CARCASS_SHELL_DIMENSIONS', 'CM_PER_METER'],
  syntax: 'static-import',
});

function expectedEntry({ toFile, importedSymbol, reason, removalCondition }) {
  return {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-24',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: shellOwnerRel,
      kind: 'value',
      importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
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
    toFile: interiorOwnerRel,
    importedSymbol: 'CARCASS_INTERIOR_DIMENSIONS',
    reason:
      'The module-depth flow replaces one legacy facade statement with the focused Carcass Shell owner plus the focused Carcass Interior owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed module-depth composition seam eliminates the extra Carcass Interior statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: unitsOwnerRel,
    importedSymbol: 'CM_PER_METER',
    reason:
      'The module-depth flow replaces one legacy facade statement with the focused Carcass Shell and Interior owners plus the canonical centimeter-per-meter unit owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed module-depth composition seam eliminates the extra Units statement without reintroducing the legacy facade.',
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

test('Module Depth imports exactly three focused owners without aliases or aggregate policies', () => {
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
        specifier: '../../shared/dimensions/carcass_interior_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_INTERIOR_DIMENSIONS'],
      },
      {
        specifier: '../../shared/dimensions/carcass_shell_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
      },
      {
        specifier: '../../shared/dimensions/units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CM_PER_METER'],
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
  assert.doesNotMatch(source, /\b(?:CARCASS_DEPTH_POLICY|MODULE_DEPTH_POLICY|CARCASS_GEOMETRY_POLICY)\b/u);
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:CARCASS_INTERIOR_DIMENSIONS|CARCASS_SHELL_DIMENSIONS)\s*;/u
  );
});

test('Module Depth preserves the exact focused-owner fields and depth formulas', () => {
  const source = read(consumerRel);

  assert.equal((source.match(/CARCASS_SHELL_DIMENSIONS\.sideDepthClearanceM/gu) ?? []).length, 1);
  assert.equal((source.match(/CARCASS_INTERIOR_DIMENSIONS\.internalBackInsetM/gu) ?? []).length, 1);
  assert.equal((source.match(/depthCmActive \/ CM_PER_METER/gu) ?? []).length, 1);
  assert.match(
    source,
    /const safePanelDepth = Math\.max\(woodThick, panelDepth\);[\s\S]*const requestedClearance = Math\.max\(0, CARCASS_SHELL_DIMENSIONS\.sideDepthClearanceM\);[\s\S]*return Math\.min\(requestedClearance, Math\.max\(0, safePanelDepth - woodThick\)\);/u
  );
  assert.match(
    source,
    /const moduleInternalZ =\s*-runtime\.D \/ 2 \+ moduleInternalDepth \/ 2 \+ CARCASS_INTERIOR_DIMENSIONS\.internalBackInsetM;/u
  );
  assert.match(source, /const moduleHitDepth = Math\.max\(moduleTotalDepth, moduleDoorDepth\);/u);
  assert.match(source, /const moduleHitZ = -runtime\.D \/ 2 \+ moduleHitDepth \/ 2;/u);
});

test('Module Depth appends exactly Entries 133-134 after the unchanged 132-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 132)),
    'e55d258b1696ea16e88e3b2feda047a539197361ea582d00be3917abc1e526d2'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(132, 134), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 134)),
    '99435b0f09eafa7c93cd6cf0e879685dc5e66b22b7ef6e43469f1777c778e919'
  );
});
