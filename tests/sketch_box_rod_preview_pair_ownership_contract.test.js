import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
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
