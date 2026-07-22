import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectLayerContractGraph, evaluateLayerContract } from '../tools/wp_layer_contract_support.mjs';

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

test('Sketch Box Storage Preview pair ledger and layer transition are exact', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));

  assert.ok(baseline.migrationBudgets.length >= 92);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 85)),
    '8c99874fb35870ef203054a2f461c052a975194229e11e5c767153c68c32a864'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 87)),
    '32edb97832df2b9f8191fbe9f2bc6b19721216aa1e9efd42fcd8a1d126120adb'
  );

  assert.deepEqual(baseline.migrationBudgets.slice(85, 87), [
    {
      from: 'builder',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_STORAGE_PREVIEW_POLICY'],
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
        importedSymbols: [
          'INTERIOR_STORAGE_BARRIER_POLICY',
          'INTERIOR_STORAGE_LAYOUT_POLICY',
          'INTERIOR_STORAGE_PREVIEW_POLICY',
        ],
        syntax: 'static-import',
      },
      reason:
        'The Sketch Box storage-barrier renderer replaces one legacy facade statement with focused Interior Storage Barrier, Layout, and Preview owners plus the focused Sketch Box Storage Preview owner on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box storage-barrier rendering composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    },
    {
      from: 'services',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: [
          'SKETCH_BOX_PREVIEW_CORE_POLICY',
          'SKETCH_BOX_SHELF_PREVIEW_POLICY',
          'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
        ],
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
        'The Sketch Box vertical storage preview resolver replaces one legacy facade statement with focused Interior Storage Barrier and Preview owners plus focused Sketch Box Core, Shelf, and Storage Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box vertical storage-preview composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    },
  ]);

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-21' });
  assert.equal(report.ok, true);
  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  assert.equal(observed.get('builder>shared'), 267);
  assert.equal(observed.get('services>shared'), 210);
  assert.equal(
    report.migrationBudgets.filter(entry => entry.from === 'builder' && entry.to === 'shared' && entry.active)
      .length,
    48
  );
  assert.equal(
    report.migrationBudgets.filter(
      entry => entry.from === 'services' && entry.to === 'shared' && entry.active
    ).length,
    43
  );
});
