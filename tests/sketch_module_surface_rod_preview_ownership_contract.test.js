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
const rel = 'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Sketch module surface rod preview imports are exact focused-owner statements', () => {
  const source = read(rel);
  const dependencies = analyzeModuleDependencies(path.join(root, rel), source).imports;
  const focusedOwners = dependencies.filter(
    dependency =>
      dependency.syntax === 'static-import' &&
      (dependency.specifier.endsWith('/dimensions/interior_fittings_policy.js') ||
        dependency.specifier.endsWith('/dimensions/interior_storage_policy.js') ||
        dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
  );

  assert.deepEqual(
    focusedOwners.map(dependency => ({
      specifier: dependency.specifier,
      symbols: [...dependency.importedSymbols],
    })),
    [
      {
        specifier: '../../shared/dimensions/interior_fittings_policy.js',
        symbols: ['INTERIOR_PRESET_ROD_FACTORS_POLICY', 'INTERIOR_ROD_PLACEMENT_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/interior_storage_policy.js',
        symbols: ['INTERIOR_STORAGE_GRID_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_ROD_PREVIEW_POLICY'],
      },
    ]
  );
  assert.equal(focusedOwners.length, 3);
  assert.equal(
    dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
    false
  );
  assert.doesNotMatch(
    source,
    /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_FITTINGS_POLICY|INTERIOR_PRESET_POLICY|INTERIOR_ROD_POLICY|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|presetDims|rodDims|storageDims|previewDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
  );
  assert.doesNotMatch(
    source,
    /const\s+\w+\s*=\s*(?:INTERIOR_PRESET_ROD_FACTORS_POLICY|INTERIOR_ROD_PLACEMENT_POLICY|INTERIOR_STORAGE_GRID_POLICY|SKETCH_BOX_ROD_PREVIEW_POLICY)\s*;/u
  );
});

test('Sketch module surface rod preview ledger and layer transition are exact', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));

  assert.equal(baseline.migrationBudgets.length, 95);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 93)),
    '0ff50bd06b93e4a303e769b92d5db0a87d775022d9bb1f80d9e5d721023bfa13'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    '998ce4016e780748d6f771d97fdd7e9980f0a2fb4d7995b92a1befb154f85fc0'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(93), [
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
        importedSymbols: ['SKETCH_BOX_ROD_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      removedImport: {
        toFile: 'esm/shared/wardrobe_dimension_tokens_shared.ts',
        kind: 'value',
        importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
        syntax: 'static-import',
      },
      addedImport: {
        toFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
        kind: 'value',
        importedSymbols: ['INTERIOR_PRESET_ROD_FACTORS_POLICY', 'INTERIOR_ROD_PLACEMENT_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch module surface rod-remove preview flow replaces one legacy facade statement with focused Interior Preset Rod Factors and Rod Placement owners plus the focused Sketch Box Rod Preview owner on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch module surface rod-preview composition seam eliminates the extra Interior Fittings statement without reintroducing the legacy facade.',
    },
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
        importedSymbols: ['SKETCH_BOX_ROD_PREVIEW_POLICY'],
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
        'The Sketch module surface rod-remove preview flow replaces one legacy facade statement with the focused Interior Storage Grid owner plus the focused Sketch Box Rod Preview owner on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch module surface rod-preview composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    },
  ]);

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-22' });
  assert.equal(report.ok, true);
  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  assert.equal(observed.get('builder>shared'), 267);
  assert.equal(observed.get('services>shared'), 212);
  assert.equal(
    report.migrationBudgets.filter(
      entry => entry.from === 'services' && entry.to === 'shared' && entry.active
    ).length,
    45
  );
});

test('Sketch module surface rod preview formulas remain structurally exact', () => {
  const source = read(rel);
  assert.match(
    source,
    /readRecordNumber\(args\.info, 'gridDivisions'\) \?\?\s*INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault/u
  );
  assert.match(
    source,
    /Math\.round\(\(rawYFactor \* divs\) \/ INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault\)/u
  );
  assert.match(source, /args\.bottomY \+\s*i \* step \+\s*INTERIOR_ROD_PLACEMENT_POLICY\.defaultYOffsetM/u);
  for (const field of [
    'mixedRodYFactor',
    'hangingRodYFactor',
    'splitUpperRodYFactor',
    'splitLowerRodYFactor',
    'storageRodYFactor',
  ]) {
    assert.match(source, new RegExp(`INTERIOR_PRESET_ROD_FACTORS_POLICY\\.${field}`, 'u'));
  }
  assert.match(source, /presetMatch\.dy < best\.dy/u);
  assert.match(source, /rodRemoveMatch\.dy > args\.removeEpsShelf/u);
  assert.match(
    source,
    /Math\.max\(args\.bottomY \+ args\.pad, Math\.min\(args\.topY - args\.pad, rodRemoveMatch\.yAbs\)\)/u
  );
  assert.match(
    source,
    /w:\s*Math\.max\(\s*SKETCH_BOX_ROD_PREVIEW_POLICY\.rodMinLengthM,\s*args\.innerW - SKETCH_BOX_ROD_PREVIEW_POLICY\.rodWidthClearanceM\s*\)/u
  );
  assert.match(source, /h: SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewHeightM/u);
  assert.match(source, /d: SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewDepthM/u);
});
