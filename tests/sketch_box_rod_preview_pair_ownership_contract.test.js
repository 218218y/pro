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
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts',
    {
      interior: ['INTERIOR_ROD_RENDER_POLICY'],
      preview: ['SKETCH_BOX_ROD_PREVIEW_POLICY'],
    },
  ],
  [
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts',
    {
      interior: ['INTERIOR_ROD_RENDER_POLICY'],
      preview: ['SKETCH_BOX_PREVIEW_CORE_POLICY', 'SKETCH_BOX_ROD_PREVIEW_POLICY'],
    },
  ],
]);

test('Sketch Box Rod Preview pair imports are exact focused-owner statements', () => {
  for (const [rel, expected] of consumers) {
    const source = read(rel);
    const dependencies = analyzeModuleDependencies(path.join(root, rel), source).imports;
    const focusedOwners = dependencies.filter(
      dependency =>
        dependency.syntax === 'static-import' &&
        (dependency.specifier.endsWith('/dimensions/interior_fittings_policy.js') ||
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
          symbols: expected.interior,
        },
        {
          specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
          symbols: expected.preview,
        },
      ]
    );
    assert.equal(focusedOwners.length, 2, `${rel} must have exactly two focused-owner statements`);
    assert.equal(
      dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false
    );
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_ROD_POLICY|SKETCH_BOX_PREVIEW_POLICY)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
    );
    assert.doesNotMatch(
      source,
      /const\s+\w+\s*=\s*(?:INTERIOR_ROD_RENDER_POLICY|SKETCH_BOX_(?:PREVIEW_CORE|ROD_PREVIEW)_POLICY)\s*;/u
    );
  }
});

test('Sketch Box Rod Preview pair ledger and layer transition are exact', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));

  assert.equal(baseline.migrationBudgets.length, 91);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 87)),
    '32edb97832df2b9f8191fbe9f2bc6b19721216aa1e9efd42fcd8a1d126120adb'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 89)),
    'e99df16d69cccb08f23fdd3e00a0097aabe12ee091b59a666fe8d5e67f20eb33'
  );

  assert.deepEqual(baseline.migrationBudgets.slice(87, 89), [
    {
      from: 'builder',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts',
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
        importedSymbols: ['INTERIOR_ROD_RENDER_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch Box rod renderer replaces one legacy facade statement with the focused Interior Rod Render owner plus the focused Sketch Box Rod Preview owner on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box rod-rendering composition seam eliminates the extra Interior Rod statement without reintroducing the legacy facade.',
    },
    {
      from: 'services',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-ownership-migration',
      reviewedAt: '2026-07-21',
      reviewBy: '2026-10-18',
      fromFile: 'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts',
      companionImport: {
        toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
        kind: 'value',
        importedSymbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY', 'SKETCH_BOX_ROD_PREVIEW_POLICY'],
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
        importedSymbols: ['INTERIOR_ROD_RENDER_POLICY'],
        syntax: 'static-import',
      },
      reason:
        'The Sketch Box vertical rod preview resolver replaces one legacy facade statement with the focused Interior Rod Render owner plus focused Sketch Box Core and Rod Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box vertical rod-preview composition seam eliminates the extra Interior Rod statement without reintroducing the legacy facade.',
    },
  ]);

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-21' });
  assert.equal(report.ok, true);
  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  assert.equal(observed.get('builder>shared'), 267);
  assert.equal(observed.get('services>shared'), 208);
  assert.equal(
    report.migrationBudgets.filter(entry => entry.from === 'builder' && entry.to === 'shared' && entry.active)
      .length,
    48
  );
  assert.equal(
    report.migrationBudgets.filter(
      entry => entry.from === 'services' && entry.to === 'shared' && entry.active
    ).length,
    41
  );
});
