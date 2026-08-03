import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const occupancyRel = 'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts';
const shelfRel = 'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts';
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

test('Vertical Shelf/Occupancy pair imports exact focused owners without aggregate paths', () => {
  assert.deepEqual(focusedDimensionImports(occupancyRel), [
    {
      specifier: '../../shared/dimensions/sketch_box_vertical_content_occupancy_dimension_policy.js',
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
        'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
      ],
    },
  ]);
  assert.deepEqual(focusedDimensionImports(shelfRel), [
    {
      specifier: '../../shared/dimensions/interior_fittings_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
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
      symbols: [
        'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
        'SKETCH_BOX_PREVIEW_CORE_POLICY',
        'SKETCH_BOX_SHELF_PREVIEW_POLICY',
      ],
    },
  ]);

  for (const rel of [occupancyRel, shelfRel]) {
    const source = read(rel);
    const analysis = analyzeModuleDependencies(path.join(root, rel), source);
    assert.equal(
      analysis.imports.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false
    );
    assert.deepEqual(analysis.unresolvedDynamicImports, []);
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_FITTINGS_POLICY|INTERIOR_SHELF_POLICY|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|previewDims|storageDims|shelfDims|materialDims|measurementDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
    );
  }
});

test('Vertical Shelf/Occupancy pair keeps focused-owner formulas structurally exact', () => {
  const occupancy = read(occupancyRel);
  const shelf = read(shelfRel);
  assert.match(occupancy, /Math\.max\(requestedToleranceM, SKETCH_BOX_PREVIEW_CORE_POLICY\.removeEpsBoxM\)/u);
  assert.match(
    occupancy,
    /Math\.max\(requestedToleranceM, SKETCH_BOX_PREVIEW_CORE_POLICY\.removeEpsShelfM\)/u
  );
  assert.match(
    occupancy,
    /w:\s*Math\.max\(\s*SKETCH_BOX_ROD_PREVIEW_POLICY\.rodMinLengthM,\s*width - SKETCH_BOX_ROD_PREVIEW_POLICY\.rodWidthClearanceM\s*\)/u
  );
  assert.match(
    occupancy,
    /Math\.min\(\s*SKETCH_BOX_STORAGE_PREVIEW_POLICY\.storageBarrierDepthClearanceMaxM,\s*Math\.max\(\s*SKETCH_BOX_STORAGE_PREVIEW_POLICY\.storageBarrierDepthClearanceMinM,\s*state\.targetGeo\.innerD \*\s*SKETCH_BOX_STORAGE_PREVIEW_POLICY\.storageBarrierDepthClearanceRatio\s*\)\s*\)/u
  );
  assert.match(occupancy, /INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthClearanceM/u);
  assert.match(occupancy, /INTERIOR_STORAGE_PREVIEW_POLICY\.previewThicknessMinM/u);
  assert.match(occupancy, /INTERIOR_SHELF_GEOMETRY_POLICY\.regularDepthM/u);
  assert.match(occupancy, /MATERIAL_THICKNESS_POLICY\.glassShelf\.thicknessM/u);
  assert.match(occupancy, /Math\.max\(previewArgs\.woodThick, previewArgs\.woodThick \* 2\)/u);

  assert.match(shelf, /removeEpsShelf = SKETCH_BOX_PREVIEW_CORE_POLICY\.removeEpsShelfM/u);
  assert.match(
    shelf,
    /Math\.max\(removeEpsShelf, SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRemoveBoardToleranceM\)/u
  );
  assert.match(shelf, /INTERIOR_SHELF_GEOMETRY_POLICY\.regularDepthM/u);
  assert.match(shelf, /MATERIAL_THICKNESS_POLICY\.glassShelf\.thicknessM/u);
  assert.match(
    shelf,
    /Math\.max\(\s*SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementZOffsetMinM,\s*shelfDepth \* SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementZOffsetDepthRatio\s*\)/u
  );
  assert.match(shelf, /textScale: SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementTextScale/u);
});
