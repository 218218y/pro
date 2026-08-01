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
const rel = 'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Sketch module surface content preview imports are exact focused-owner statements', () => {
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
        symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY', 'SKETCH_BOX_ROD_PREVIEW_POLICY'],
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
    /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|previewDims|storageDims|measurementDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
  );
  assert.doesNotMatch(
    source,
    /const\s+\w+\s*=\s*(?:INTERIOR_STORAGE_(?:BARRIER|PREVIEW)_POLICY|SKETCH_BOX_(?:MEASUREMENT|ROD)_PREVIEW_POLICY)\s*;/u
  );
});

test('Sketch module surface content preview ledger and layer transition are exact', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));

  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 91)),
    '7ff95da1386b7229e5976d89f247a2f010973ba98d50f6a6aecbecf268a2b224'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 92)),
    'c3925619d29b30dbd157d10f9afd68f4ed4dfe3b7ebac810a1438aa633a89dfd'
  );

  assert.deepEqual(baseline.migrationBudgets.slice(91, 92), [
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
        importedSymbols: ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY', 'SKETCH_BOX_ROD_PREVIEW_POLICY'],
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
        importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch module surface content-preview flow replaces one legacy facade statement with focused Interior Storage Barrier and Preview owners plus focused Sketch Box Measurement and Rod Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch module surface content-preview composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    },
  ]);

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-30' });
  assert.equal(report.ok, true);
  const entryNumbers = [92];
  assert.deepEqual(
    report.migrationBudgets.slice(91, 92).map(entry => ({
      entryNumber: entry.entryNumber,
      active: entry.active,
      retired: entry.retired,
      retirementMode: entry.retirementMode,
      replacementReviewedOwnershipBudgetId: entry.replacementReviewedOwnershipBudgetId,
    })),
    entryNumbers.map(entryNumber => ({
      entryNumber,
      active: false,
      retired: true,
      retirementMode: 'ownership-reviewed',
      replacementReviewedOwnershipBudgetId: `dimension-migration-entry-${entryNumber}-reviewed-ownership`,
    }))
  );
  for (const entryNumber of entryNumbers) {
    const replacement = report.reviewedOwnershipBudgets.find(
      budget => budget.id === `dimension-migration-entry-${entryNumber}-reviewed-ownership`
    );
    assert.ok(replacement);
    assert.deepEqual(
      {
        active: replacement.active,
        statementValid: replacement.statementValid,
        evidenceContractsValid: replacement.evidenceContractsValid,
      },
      { active: true, statementValid: true, evidenceContractsValid: true }
    );
  }
});

test('Sketch module surface content preview formulas remain structurally exact', () => {
  const source = read(rel);
  assert.match(source, /z:\s*zFront \+ INTERIOR_STORAGE_BARRIER_POLICY\.barrierFrontZOffsetM/u);
  assert.match(
    source,
    /w:\s*Math\.max\(\s*INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthMinM,\s*innerW - INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthClearanceM\s*\)/u
  );
  assert.match(source, /d:\s*Math\.max\(INTERIOR_STORAGE_PREVIEW_POLICY\.previewThicknessMinM, woodThick\)/u);
  assert.match(
    source,
    /w:\s*Math\.max\(\s*SKETCH_BOX_ROD_PREVIEW_POLICY\.rodMinLengthM,\s*innerW - SKETCH_BOX_ROD_PREVIEW_POLICY\.rodWidthClearanceM\s*\)/u
  );
  assert.match(source, /h: SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewHeightM/u);
  assert.match(source, /d: SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewDepthM/u);
  assert.match(
    source,
    /Math\.max\(\s*SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementZOffsetMinM,\s*shelfPreview\.d \*\s*SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementZOffsetDepthRatio\s*\)/u
  );
  assert.match(source, /textScale: SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementTextScale/u);
});
