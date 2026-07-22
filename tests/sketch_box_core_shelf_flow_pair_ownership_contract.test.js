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
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const consumers = new Map([
  [
    'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts',
    [
      {
        specifier: '../../shared/dimensions/interior_storage_policy.js',
        symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
      },
    ],
  ],
  [
    'esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts',
    [
      {
        specifier: '../../shared/dimensions/interior_fittings_policy.js',
        symbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
      },
    ],
  ],
]);

test('Sketch Box Core/Shelf flow pair imports are exact focused-owner statements', () => {
  for (const [rel, expected] of consumers) {
    const source = read(rel);
    const dependencies = analyzeModuleDependencies(path.join(root, rel), source).imports;
    const focusedOwners = dependencies.filter(
      dependency =>
        dependency.syntax === 'static-import' &&
        (dependency.specifier.endsWith('/dimensions/interior_storage_policy.js') ||
          dependency.specifier.endsWith('/dimensions/interior_fittings_policy.js') ||
          dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
    );

    assert.deepEqual(
      focusedOwners.map(dependency => ({
        specifier: dependency.specifier,
        symbols: [...dependency.importedSymbols],
      })),
      expected
    );
    assert.equal(focusedOwners.length, 2, `${rel} must have exactly two focused-owner statements`);
    assert.equal(
      dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false
    );
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_STORAGE_POLICY|INTERIOR_FITTINGS_POLICY|SKETCH_BOX_PREVIEW_POLICY)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
    );
    assert.doesNotMatch(
      source,
      /const\s+\w+\s*=\s*(?:INTERIOR_(?:STORAGE|SHELF)_[A-Z_]+_POLICY|SKETCH_BOX_(?:PREVIEW_CORE|SHELF_PREVIEW)_POLICY)\s*;/u
    );
  }
});

test('Sketch Box Core/Shelf flow pair ledger and layer transition are exact', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));

  assert.equal(baseline.migrationBudgets.length, 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 89)),
    'e99df16d69cccb08f23fdd3e00a0097aabe12ee091b59a666fe8d5e67f20eb33'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 91)),
    '7ff95da1386b7229e5976d89f247a2f010973ba98d50f6a6aecbecf268a2b224'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    'c3925619d29b30dbd157d10f9afd68f4ed4dfe3b7ebac810a1438aa633a89dfd'
  );

  assert.deepEqual(baseline.migrationBudgets.slice(89, 91), [
    {
      from: 'services',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
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
        importedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The internal-drawer existing-fitting removal flow replaces one legacy facade statement with focused Interior Storage Barrier and Grid owners plus focused Sketch Box Core and Shelf Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed existing-fitting removal composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    },
    {
      from: 'services',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
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
        importedSymbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch module surface-preview orchestration flow replaces one legacy facade statement with the focused Interior Shelf Geometry owner plus the focused Sketch Box Preview Core owner on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch module surface-preview orchestration seam eliminates the extra Interior Fittings statement without reintroducing the legacy facade.',
    },
  ]);

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-21' });
  assert.equal(report.ok, true);
  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  assert.equal(observed.get('builder>shared'), 267);
  assert.equal(observed.get('services>shared'), 209);
  assert.equal(
    report.migrationBudgets.filter(
      entry => entry.from === 'services' && entry.to === 'shared' && entry.active
    ).length,
    42
  );
});

test('Sketch Box Core/Shelf flow formulas and orchestration order remain structurally exact', () => {
  const existing = read('esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts');
  assert.match(
    existing,
    /Number\.isFinite\(value\) && value > 0\s*\? Math\.round\(value\)\s*:\s*INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault/u
  );
  assert.match(
    existing,
    /const outerW = Math\.max\(\s*SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfMinWidthM,\s*args\.widthM \?\? args\.innerW\s*\);/u
  );
  assert.match(
    existing,
    /const outerD = Math\.max\(\s*SKETCH_BOX_PREVIEW_CORE_POLICY\.minScaleM,\s*args\.depthM \?\? args\.internalDepth\s*\);/u
  );
  assert.match(
    existing,
    /const innerW = Math\.max\(\s*SKETCH_BOX_PREVIEW_CORE_POLICY\.minScaleM,\s*outerW - args\.woodThick \* 2\s*\);/u
  );
  assert.match(
    existing,
    /const innerD = Math\.max\(\s*SKETCH_BOX_PREVIEW_CORE_POLICY\.minScaleM,\s*outerD - args\.woodThick \* 2\s*\);/u
  );
  assert.match(
    existing,
    /const xNorm =\s*typeof args\.xNorm === 'number' && Number\.isFinite\(args\.xNorm\) \? args\.xNorm : 0\.5;/u
  );
  assert.match(existing, /storageH: INTERIOR_STORAGE_BARRIER_POLICY\.barrierHeightM/u);
  assert.ok(
    existing.indexOf('const storageHover = readManualLayoutSketchStorageHoverIntent') <
      existing.indexOf('const rodHover = readManualLayoutSketchRodHoverIntent')
  );
  assert.ok(
    existing.indexOf('const rodHover = readManualLayoutSketchRodHoverIntent') <
      existing.indexOf('const shelfHover = readManualLayoutSketchShelfHoverIntent')
  );

  const flow = read('esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts');
  assert.match(
    flow,
    /const regularDepth =\s*internalDepth > 0\s*\? Math\.min\(internalDepth, regShelfDepth\)\s*:\s*regShelfDepth;/u
  );
  assert.match(flow, /const removeEpsShelf = SKETCH_BOX_PREVIEW_CORE_POLICY\.removeEpsShelfM;/u);
  assert.match(flow, /const removeEpsBox = SKETCH_BOX_PREVIEW_CORE_POLICY\.removeEpsBoxM;/u);
  assert.ok(
    flow.indexOf('const shelfRemovePreview = allowExistingShelfRemove') <
      flow.indexOf('const storageRemovePreview = resolveSketchModuleStorageRemovePreview')
  );
  assert.ok(
    flow.indexOf('const storageRemovePreview = resolveSketchModuleStorageRemovePreview') <
      flow.indexOf('const rodRemovePreview = resolveSketchModuleRodRemovePreview')
  );
  assert.ok(
    flow.indexOf('const rodRemovePreview = resolveSketchModuleRodRemovePreview') <
      flow.indexOf('const boxPreviewState = resolveSketchModuleBoxPreviewState')
  );
  assert.ok(
    flow.indexOf('const boxPreviewState = resolveSketchModuleBoxPreviewState') <
      flow.indexOf('return resolveSketchModuleContentPreview')
  );
});
