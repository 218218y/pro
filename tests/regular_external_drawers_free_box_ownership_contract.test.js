import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('regular external-drawer free-box hover imports exactly three focused owners without aliases', () => {
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
        importedSymbols: ['DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/external_drawer_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['EXTERNAL_DRAWER_FRONT_RENDER_POLICY', 'EXTERNAL_DRAWER_SIZE_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/material_thickness_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
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
  assert.doesNotMatch(
    source,
    /\b(?:DRAWER_DIMENSIONS|MATERIAL_DIMENSIONS|DRAWER_SKETCH_POLICY|EXTERNAL_DRAWER_POLICY|drawerDims|externalDims|previewDims|materialDims)\b|import\s+\*\s+as/u
  );
});

test('regular external-drawer free-box preview keeps focused sizing and geometry formulas', () => {
  const source = read(consumerRel);
  assert.match(source, /const woodThick = MATERIAL_THICKNESS_POLICY\.wood\.thicknessM;/u);
  assert.match(source, /drawerHeightM: EXTERNAL_DRAWER_SIZE_POLICY\.regularHeightM/u);
  assert.match(source, /const regH = EXTERNAL_DRAWER_SIZE_POLICY\.regularHeightM;/u);
  assert.match(source, /const shoeH = EXTERNAL_DRAWER_SIZE_POLICY\.shoeHeightM;/u);
  assert.match(
    source,
    /Math\.max\(\s*DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY\.externalPreviewVisualMinWidthM,\s*faceWidth - EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualWidthClearanceM\s*\)/u
  );
  assert.match(
    source,
    /ctx\.frontOverlay\s*\?\s*ctx\.frontOverlay\.d\s*:\s*EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualThicknessM/u
  );
  assert.match(source, /EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.frontOffsetZM/u);
  assert.match(source, /EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualHeightClearanceM/u);
});
