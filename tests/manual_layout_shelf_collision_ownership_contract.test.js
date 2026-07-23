import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/services/canvas_picking_manual_layout_config_ops_shelf.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
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
  from: 'services',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-23',
  reviewBy: '2026-10-18',
  fromFile: consumerRel,
  companionImport: {
    toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
    kind: 'value',
    importedSymbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['DRAWER_DIMENSIONS', 'MATERIAL_DIMENSIONS'],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
    kind: 'value',
    importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
    syntax: 'static-import',
  },
  reason:
    'The manual-layout shelf collision flow replaces one legacy facade statement with the focused Drawer Sketch Internal Preview owner plus the canonical Material Thickness owner on the existing services to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed manual-layout shelf-collision composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
});

test('manual-layout shelf collision imports exactly the two focused owners without aliases', () => {
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
        specifier: '../../shared/dimensions/drawer_sketch_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
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
    /\b(?:DRAWER_DIMENSIONS|MATERIAL_DIMENSIONS|DRAWER_SKETCH_POLICY|dims|drawerDims|sketchDims|materialDims)\b|import\s+\*\s+as/u
  );
});

test('manual-layout shelf collision preserves the focused ownership formulas', () => {
  const source = read(consumerRel);
  assert.match(
    source,
    /return parsed != null && parsed > 0\s*\?\s*parsed\s*:\s*MATERIAL_THICKNESS_POLICY\.wood\.thicknessM;/u
  );
  assert.match(
    source,
    /return Math\.min\(\s*DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadMaxM,\s*Math\.max\(\s*DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadMinM,\s*woodThick \* DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadWoodRatio\s*\)\s*\);/u
  );
});

test('manual-layout shelf collision appends exactly Entry 120 after the unchanged prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 120);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 119)),
    'e10f08c6cebfb73ed1ff89676e5bf8bc982d659bf566f218ac52dc89607d53a4'
  );
  assert.deepEqual(baseline.migrationBudgets[119], expectedEntry);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 120)),
    '40c8812b78771efc64e38c69b919ace57a104dabfd1cd79882decbd317d9e170'
  );
});
