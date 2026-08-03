import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shelfRel = 'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts';
const hoverRel = 'esm/native/builder/render_preview_interior_hover_apply.ts';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function focusedDimensionImports(rel) {
  return analyzeModuleDependencies(path.join(root, rel), read(rel))
    .imports.filter(dependency => dependency.specifier.includes('/dimensions/'))
    .map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: [...dependency.importedSymbols],
    }));
}

test('Builder Shelf/Hover pair imports exact focused owners without aggregate paths', () => {
  assert.deepEqual(focusedDimensionImports(shelfRel), [
    {
      specifier: '../../shared/dimensions/interior_fittings_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY'],
    },
    {
      specifier: '../../shared/dimensions/material_thickness_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['MATERIAL_THICKNESS_POLICY'],
    },
    {
      specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['SKETCH_BOX_DOOR_PREVIEW_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
    },
  ]);
  assert.deepEqual(focusedDimensionImports(hoverRel), [
    {
      specifier: '../../shared/dimensions/preview_interior_hover_apply_dimension_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: [
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_PREVIEW_POLICY',
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_PREVIEW_CORE_POLICY',
        'SKETCH_BOX_ROD_PREVIEW_POLICY',
        'SKETCH_BOX_SHELF_PREVIEW_POLICY',
      ],
    },
  ]);

  for (const rel of [shelfRel, hoverRel]) {
    const source = read(rel);
    const analysis = analyzeModuleDependencies(path.join(root, rel), source);
    assert.equal(
      analysis.imports.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false
    );
    assert.deepEqual(analysis.unresolvedDynamicImports, []);
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_FITTINGS_POLICY|INTERIOR_SHELF_POLICY|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|previewDims|storageDims|shelvesDims|shelfDims|materialDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
    );
  }
});

test('Builder Shelf/Hover pair keeps focused-owner formulas structurally exact', () => {
  const shelf = read(shelfRel);
  const hover = read(hoverRel);

  assert.match(shelf, /SKETCH_BOX_DOOR_PREVIEW_POLICY\.doorEdgeEpsilonM/u);
  assert.match(shelf, /MATERIAL_THICKNESS_POLICY\.glassShelf\.thicknessM/u);
  assert.match(shelf, /INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY\.contentsHeightClearanceM/u);
  assert.match(shelf, /INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY\.contentsWidthClearanceM/u);
  assert.match(shelf, /SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfMinWidthM/u);
  assert.match(shelf, /SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfBraceClearanceM/u);
  assert.match(shelf, /SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRegularClearanceM/u);

  assert.match(hover, /MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/u);
  assert.match(hover, /MATERIAL_THICKNESS_POLICY\.glassShelf\.thicknessM/u);
  assert.match(hover, /INTERIOR_SHELF_GEOMETRY_POLICY\.regularDepthM/u);
  assert.match(hover, /SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfHoverMinWidthM/u);
  assert.match(hover, /SKETCH_BOX_PREVIEW_CORE_POLICY\.minScaleM/u);
  assert.match(hover, /SKETCH_BOX_ROD_PREVIEW_POLICY\.rodMinLengthM/u);
  assert.match(hover, /SKETCH_BOX_ROD_PREVIEW_POLICY\.rodWidthClearanceM/u);
  assert.match(hover, /SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewHeightM/u);
  assert.match(hover, /SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewDepthM/u);
  assert.match(hover, /INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthMinM/u);
  assert.match(hover, /INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthClearanceM/u);
  assert.match(hover, /INTERIOR_STORAGE_PREVIEW_POLICY\.previewThicknessMinM/u);
});
