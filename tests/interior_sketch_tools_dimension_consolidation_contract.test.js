import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts';
const ownerRel = 'esm/shared/dimensions/interior_sketch_tools_dimension_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function compactDependencies(analysis) {
  return analysis.imports.map(({ specifier, kind, syntax, importedSymbols }) => ({
    specifier,
    kind,
    syntax,
    importedSymbols,
  }));
}

test('Interior Sketch Tools consumes one shared composition statement and creates no UI to shared growth', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const sharedDimensionImports = analysis.imports.filter(dependency =>
    dependency.specifier.startsWith('../../../../shared/dimensions/')
  );

  assert.deepEqual(compactDependencies({ imports: sharedDimensionImports }), [
    {
      specifier: '../../../../shared/dimensions/interior_sketch_tools_dimension_policy.js',
      kind: 'value',
      syntax: 'static-import',
      importedSymbols: ['SKETCH_BOX_SHELL_GEOMETRY_POLICY', 'mToCm'],
    },
  ]);
  assert.equal(
    sharedDimensionImports[0].bindings.every(binding => binding.importedName === binding.localName),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
});

test('Interior Sketch Tools composition owner is an identity-preserving two-binding boundary', () => {
  const source = read(ownerRel);
  const analysis = analyzeModuleDependencies(path.join(root, ownerRel), source);

  assert.deepEqual(compactDependencies(analysis), [
    {
      specifier: './sketch_box_geometry_policy.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    },
    {
      specifier: './units.js',
      kind: 'value',
      syntax: 'static-re-export',
      importedSymbols: ['mToCm'],
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

test('Interior Sketch Tools keeps default dimension formulas, parsing, and formatting ownership unchanged', () => {
  const source = read(consumerRel);
  assert.match(
    source,
    /DEFAULT_SKETCH_BOX_HEIGHT_CM: number = Math\.round\(\s*mToCm\(SKETCH_BOX_SHELL_GEOMETRY_POLICY\.defaultOuterHeightM\)\s*\)/u
  );
  assert.match(
    source,
    /DEFAULT_SKETCH_BOX_WIDTH_CM: number = Math\.round\(\s*mToCm\(SKETCH_BOX_SHELL_GEOMETRY_POLICY\.defaultOuterWidthM\)\s*\)/u
  );
  assert.match(
    source,
    /DEFAULT_SKETCH_BOX_DEPTH_CM: number = Math\.round\(\s*mToCm\(SKETCH_BOX_SHELL_GEOMETRY_POLICY\.defaultOuterDepthM\)\s*\)/u
  );
  assert.match(source, /export function parseSketchBoxTool\(tool: string\): SketchBoxToolSpec \| null/u);
  assert.match(
    source,
    /export function mkSketchBoxTool\(heightCm: number, widthCm: number \| null, depthCm: number \| null\): string/u
  );
});
