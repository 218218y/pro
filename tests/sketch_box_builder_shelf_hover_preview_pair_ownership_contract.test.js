import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeModuleDependencies,
  collectLayerContractGraph,
  collectNamedModuleExports,
  evaluateLayerContract,
} from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shelfRel = 'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts';
const hoverRel = 'esm/native/builder/render_preview_interior_hover_apply.ts';
const manualHoverRel = 'esm/native/services/canvas_picking_interior_hover_manual_mode.ts';
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

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}

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
      specifier: '../../shared/dimensions/interior_fittings_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
    },
    {
      specifier: '../../shared/dimensions/interior_storage_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
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

test('Builder Shelf/Hover pair ledger transition and repository layer counts are exact', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(baseline.migrationBudgets.length, 110);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 105)),
    'f6b0d938acb9ff1fe2231078dcede6c8c55348683ed48e8d95c5149d1229e24d'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    '8d1d7cafcce3d1d360a559daf7a9fa00b92f32139a4f90cf80d6b6f061dfdd2d'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(105), [
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

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-22' });
  assert.equal(report.ok, true);
  assert.equal(report.migrationBudgets.filter(entry => entry.active).length, 110);
  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  assert.equal(observed.get('builder>shared'), 272);
  assert.equal(observed.get('features>shared'), 59);
  assert.equal(observed.get('services>shared'), 222);
  assert.equal(observed.get('ui>shared'), 28);
  assert.equal(
    report.migrationBudgets.filter(entry => entry.active && entry.from === 'builder' && entry.to === 'shared')
      .length,
    53
  );
});

test('Builder Shelf/Hover pair leaves one exact Sketch Box facade consumer', () => {
  const esmFiles = listSourceFiles(path.join(root, 'esm'));
  const facadeDependencies = esmFiles.flatMap(file => {
    const dependencies = analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8')).imports.filter(
      dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')
    );
    return dependencies.map(dependency => ({ file, ...dependency }));
  });
  const staticFacadeDependencies = facadeDependencies.filter(
    dependency => dependency.syntax === 'static-import'
  );
  assert.equal(new Set(staticFacadeDependencies.map(dependency => dependency.file)).size, 43);
  assert.equal(staticFacadeDependencies.length, 43);
  assert.equal(new Set(facadeDependencies.map(dependency => dependency.file)).size, 45);
  assert.equal(facadeDependencies.length, 46);

  const sketchBoxConsumers = esmFiles
    .filter(file => file.replaceAll('\\', '/') !== path.join(root, facadeRel).replaceAll('\\', '/'))
    .filter(file => /\bSKETCH_BOX_DIMENSIONS\b/u.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file).replaceAll('\\', '/'))
    .sort();
  assert.deepEqual(sketchBoxConsumers, [manualHoverRel]);
  assert.equal(sketchBoxConsumers.filter(file => file.includes('/builder/')).length, 0);
  assert.equal(sketchBoxConsumers.filter(file => file.includes('/services/')).length, 1);
  assert.equal(sketchBoxConsumers.filter(file => file.includes('/ui/')).length, 0);
  const manualHover = read(manualHoverRel);
  assert.match(manualHover, /SKETCH_BOX_DIMENSIONS\.preview/u);
  assert.doesNotMatch(
    manualHover,
    /SKETCH_BOX_DIMENSIONS\.(?:geometry|freePlacement)|\bHANDLE_DIMENSIONS\b/u
  );

  const facadeExports = collectNamedModuleExports(facadeRel, read(facadeRel));
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'value').map(entry => entry.exportedName)).size,
    89
  );
  assert.equal(
    new Set(facadeExports.filter(entry => entry.kind === 'type').map(entry => entry.exportedName)).size,
    10
  );
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
