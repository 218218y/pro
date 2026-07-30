import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts';
const ownerRel = 'esm/shared/dimensions/interior_sketch_tools_dimension_policy.ts';
const geometryOwnerRel = 'esm/shared/dimensions/sketch_box_geometry_policy.ts';
const unitsOwnerRel = 'esm/shared/dimensions/units.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const historicalEntry = Object.freeze({
  from: 'ui',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-20',
  reviewBy: '2026-10-18',
  fromFile: consumerRel,
  addedImport: {
    toFile: unitsOwnerRel,
    kind: 'value',
    importedSymbols: ['mToCm'],
    syntax: 'static-import',
  },
  companionImport: {
    toFile: geometryOwnerRel,
    kind: 'value',
    importedSymbols: ['SKETCH_BOX_SHELL_GEOMETRY_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
    kind: 'value',
    importedSymbols: ['SKETCH_BOX_DIMENSIONS', 'mToCm'],
    syntax: 'static-import',
  },
  reason:
    'The Interior-tab Sketch tool helper replaces one legacy facade statement with the canonical Shell Geometry owner plus the focused meter-to-centimeter conversion owner on the existing UI to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed Sketch tool defaults composition seam eliminates the extra Units statement without reintroducing the legacy facade.',
});

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

test('Interior Sketch Tools preserves Entry 61 and retires it through one exact consolidation group', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 60)),
    '6ccc1cd736a1b435b3fb8523a6083f0b710bc4db10b3caccbc1a04f4445e9356'
  );
  assert.deepEqual(baseline.migrationBudgets[60], historicalEntry);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 61)),
    'a931b3e2c5090e4fa5de7c10057194fde44f0ad58409966e1ab203a8be2cdcc0'
  );

  const group = baseline.migrationConsolidations.find(
    entry => entry.id === 'interior-sketch-tools-dimension-consolidation'
  );
  assert.ok(group);
  assert.deepEqual(group.entryNumbers, [61]);
  assert.deepEqual(group.replacementStatement, {
    toFile: ownerRel,
    kind: 'value',
    syntax: 'static-import',
    importedSymbols: ['SKETCH_BOX_SHELL_GEOMETRY_POLICY', 'mToCm'],
  });
  assert.deepEqual(group.absorbedStatements, [
    { fromFile: consumerRel, ...historicalEntry.addedImport },
    { fromFile: consumerRel, ...historicalEntry.companionImport },
  ]);
  assert.deepEqual(
    baseline.migrationRetirements.find(entry => entry.entryNumber === 61),
    {
      entryNumber: 61,
      retiredAt: '2026-07-29',
      mode: 'statement-consolidated',
      reason:
        'The Interior-tab Sketch tool Shell Geometry and Units statements were replaced by one reviewed feature-use-case composition owner.',
      replacementConsolidationId: 'interior-sketch-tools-dimension-consolidation',
    }
  );
});
