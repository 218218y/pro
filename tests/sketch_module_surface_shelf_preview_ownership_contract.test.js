import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeModuleDependencies,
  collectLayerContractGraph,
  evaluateLayerContract,
} from '../tools/wp_layer_contract_support.mjs';

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
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = 'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Sketch module surface shelf preview imports are exact focused-owner statements', () => {
  const source = read(rel);
  const dependencies = analyzeModuleDependencies(path.join(root, rel), source).imports;
  const focusedOwners = dependencies.filter(
    dependency =>
      dependency.syntax === 'static-import' &&
      (dependency.specifier.endsWith('/dimensions/interior_storage_policy.js') ||
        dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
  );

  assert.deepEqual(
    focusedOwners.map(dependency => ({
      specifier: dependency.specifier,
      symbols: [...dependency.importedSymbols],
    })),
    [
      {
        specifier: '../../shared/dimensions/interior_storage_policy.js',
        symbols: ['INTERIOR_STORAGE_GRID_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
      },
    ]
  );
  assert.equal(focusedOwners.length, 2);
  assert.equal(
    dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
    false
  );
  assert.doesNotMatch(
    source,
    /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|previewDims|measurementDims|storageDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
  );
  assert.doesNotMatch(
    source,
    /const\s+\w+\s*=\s*(?:INTERIOR_STORAGE_GRID_POLICY|SKETCH_BOX_(?:MEASUREMENT|SHELF)_PREVIEW_POLICY)\s*;/u
  );
});

test('Sketch module surface shelf preview ledger and layer transition are exact', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));

  assert.equal(baseline.migrationBudgets.length, 93);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 92)),
    'c3925619d29b30dbd157d10f9afd68f4ed4dfe3b7ebac810a1438aa633a89dfd'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    '0ff50bd06b93e4a303e769b92d5db0a87d775022d9bb1f80d9e5d721023bfa13'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(92), [
    {
      from: 'services',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-22',
      reviewBy: '2026-10-18',
      fromFile: rel,
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      removedImport: {
        toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
        kind: 'value',
        importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: 'esm/shared/dimensions/interior_storage_policy.ts',
        kind: 'value',
        importedSymbols: ['INTERIOR_STORAGE_GRID_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch module surface shelf-remove preview flow replaces one legacy facade statement with the focused Interior Storage Grid owner plus focused Sketch Box Measurement and Shelf Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch module surface shelf-preview composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    },
  ]);

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-22' });
  assert.equal(report.ok, true);
  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  assert.equal(observed.get('builder>shared'), 267);
  assert.equal(observed.get('services>shared'), 210);
  assert.equal(
    report.migrationBudgets.filter(
      entry => entry.from === 'services' && entry.to === 'shared' && entry.active
    ).length,
    43
  );
});

test('Sketch module surface shelf preview formulas remain structurally exact', () => {
  const source = read(rel);
  assert.match(
    source,
    /readRecordNumber\(info, 'gridDivisions'\) \?\?\s*INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault/u
  );
  assert.match(
    source,
    /const epsNoBoard = Math\.min\(\s*SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRemoveNoBoardToleranceMaxM,\s*Math\.max\(\s*SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRemoveNoBoardToleranceMinM,\s*step \* SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRemoveNoBoardToleranceStepRatio\s*\)\s*\)/u
  );
  assert.match(
    source,
    /const eps = hitFromBoard\s*\? SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRemoveBoardToleranceM\s*:\s*isCornerMk && isDrawers\s*\? Math\.min\(\s*SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRemoveNoBoardToleranceMaxM,\s*epsNoBoard \+ SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRemoveCornerDrawerToleranceExtraM\s*\)\s*:\s*epsNoBoard/u
  );
  assert.match(
    source,
    /Math\.max\(\s*SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementZOffsetMinM,\s*shelfPreview\.d \* SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementZOffsetDepthRatio\s*\)/u
  );
  assert.match(source, /textScale: SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementTextScale/u);
  assert.match(source, /styleKey: 'cell'/u);
});
