import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/services/canvas_picking_manual_layout_config_ops_shelf.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

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
