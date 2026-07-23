import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/render_drawer_ops_internal.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const chestOwnerRel = 'esm/shared/dimensions/chest_mode_policy.ts';
const internalDrawerOwnerRel = 'esm/shared/dimensions/internal_drawer_policy.ts';
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

const expectedEntry = Object.freeze({
  from: 'builder',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-23',
  reviewBy: '2026-10-18',
  fromFile: consumerRel,
  companionImport: {
    toFile: internalDrawerOwnerRel,
    kind: 'value',
    importedSymbols: ['INTERNAL_DRAWER_CONTENTS_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['CHEST_MODE_DIMENSIONS', 'DRAWER_DIMENSIONS'],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: chestOwnerRel,
    kind: 'value',
    importedSymbols: ['CHEST_MODE_DRAWER_BOX_RENDER_POLICY'],
    syntax: 'static-import',
  },
  reason:
    'The internal-drawer render flow replaces one legacy facade statement with the focused Internal Drawer Contents owner plus the focused Chest Mode Drawer Box Render owner on the existing builder to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed internal-drawer render composition seam eliminates the extra Chest Mode statement without reintroducing the legacy facade.',
});

test('internal drawer render imports exactly the two focused owners without aliases', () => {
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
        specifier: '../../shared/dimensions/chest_mode_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CHEST_MODE_DRAWER_BOX_RENDER_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/internal_drawer_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['INTERNAL_DRAWER_CONTENTS_POLICY'],
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
    /\b(?:CHEST_MODE_DIMENSIONS|DRAWER_DIMENSIONS|CHEST_MODE_DIMENSIONS_OWNER|CHEST_MODE_POLICY|INTERNAL_DRAWER_POLICY|drawerDims|contentsDims|drawerBoxDimensions|chestDims)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
  );
});

test('internal drawer render preserves the focused contents and front-depth formulas', () => {
  const source = read(consumerRel);

  for (const field of ['contentsBottomInsetM', 'contentsWidthClearanceM', 'contentsHeightClearanceM']) {
    assert.match(source, new RegExp(`INTERNAL_DRAWER_CONTENTS_POLICY\\.${field}`, 'u'));
  }
  assert.match(
    source,
    /const accentFrontLift\s*=\s*CHEST_MODE_DRAWER_BOX_RENDER_POLICY\.accentZOffsetM\s*\+\s*CHEST_MODE_DRAWER_BOX_RENDER_POLICY\.accentStripDepthM\s*\/\s*2/u
  );
  assert.match(source, /return depth\s*\/\s*2\s*\+\s*Math\.max\(0,\s*accentFrontLift\)/u);
});

test('internal drawer render migration appends exactly Entry 124', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 124);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 123)),
    '7423bf5013baa9665b6ba01fe19d4dc57d4785dae27217f6509920b5a3c7f725'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(123, 124), [expectedEntry]);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 124)),
    '9eeb17b61e2b1a64eb9303ca0b750319da74d868131f9130a26f1bd4977d49cf'
  );
});
