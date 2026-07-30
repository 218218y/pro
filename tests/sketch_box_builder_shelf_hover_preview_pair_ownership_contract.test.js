import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shelfRel = 'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts';
const hoverRel = 'esm/native/builder/render_preview_interior_hover_apply.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

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

function migrationEntry({ fromFile, companionSymbols, addedFile, addedSymbols, reason, removalCondition }) {
  return {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-22',
    reviewBy: '2026-10-18',
    fromFile,
    companionImport: {
      toFile: 'esm/shared/dimensions/sketch_box_preview_policy.ts',
      kind: 'value',
      importedSymbols: companionSymbols,
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['INTERIOR_FITTINGS_DIMENSIONS', 'MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: addedFile,
      kind: 'value',
      importedSymbols: addedSymbols,
      syntax: 'static-import',
    },
    reason,
    removalCondition,
  };
}

const shelfCompanions = ['SKETCH_BOX_DOOR_PREVIEW_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'];
const hoverCompanions = [
  'SKETCH_BOX_PREVIEW_CORE_POLICY',
  'SKETCH_BOX_ROD_PREVIEW_POLICY',
  'SKETCH_BOX_SHELF_PREVIEW_POLICY',
];

test('Builder Shelf/Hover pair historical ledger prefix remains semantically exact', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 110);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 105)),
    'f6b0d938acb9ff1fe2231078dcede6c8c55348683ed48e8d95c5149d1229e24d'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 110)),
    '8d1d7cafcce3d1d360a559daf7a9fa00b92f32139a4f90cf80d6b6f061dfdd2d'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(105, 110), [
    migrationEntry({
      fromFile: shelfRel,
      companionSymbols: shelfCompanions,
      addedFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
      addedSymbols: ['INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY'],
      reason:
        'The Sketch Box shelf renderer replaces one legacy facade statement with the focused Interior Shelf Content Clearance owner plus focused Sketch Box Door and Shelf Preview owners on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box shelf-render composition seam eliminates the extra Interior Fittings statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: shelfRel,
      companionSymbols: shelfCompanions,
      addedFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      addedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      reason:
        'The Sketch Box shelf renderer replaces one legacy facade statement with the focused Material Thickness owner plus focused Sketch Box Door and Shelf Preview owners on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box shelf-render composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: hoverRel,
      companionSymbols: hoverCompanions,
      addedFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
      addedSymbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
      reason:
        'The interior layout hover preview renderer replaces one legacy facade statement with the focused Interior Shelf Geometry owner plus focused Sketch Box Core, Rod, and Shelf Preview owners on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed interior layout hover-preview composition seam eliminates the extra Interior Fittings statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: hoverRel,
      companionSymbols: hoverCompanions,
      addedFile: 'esm/shared/dimensions/interior_storage_policy.ts',
      addedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
      reason:
        'The interior layout hover preview renderer replaces one legacy facade statement with focused Interior Storage Barrier and Preview owners plus focused Sketch Box Core, Rod, and Shelf Preview owners on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed interior layout hover-preview composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: hoverRel,
      companionSymbols: hoverCompanions,
      addedFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      addedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      reason:
        'The interior layout hover preview renderer replaces one legacy facade statement with the focused Material Thickness owner plus focused Sketch Box Core, Rod, and Shelf Preview owners on the existing builder to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed interior layout hover-preview composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
    }),
  ]);
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
