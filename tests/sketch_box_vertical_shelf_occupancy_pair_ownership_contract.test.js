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
const occupancyRel = 'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts';
const shelfRel = 'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts';
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

test('Vertical Shelf/Occupancy pair imports exact focused owners without aggregate paths', () => {
  assert.deepEqual(focusedDimensionImports(occupancyRel), [
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

function migrationEntry({ fromFile, companionSymbols, addedFile, addedSymbols, reason, removalCondition }) {
  return {
    from: 'services',
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

const occupancyCompanions = [
  'SKETCH_BOX_PREVIEW_CORE_POLICY',
  'SKETCH_BOX_ROD_PREVIEW_POLICY',
  'SKETCH_BOX_SHELF_PREVIEW_POLICY',
  'SKETCH_BOX_STORAGE_PREVIEW_POLICY',
];
const shelfCompanions = [
  'SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY',
  'SKETCH_BOX_PREVIEW_CORE_POLICY',
  'SKETCH_BOX_SHELF_PREVIEW_POLICY',
];

test('Vertical Shelf/Occupancy pair ledger transition and layer counts are exact', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(baseline.migrationBudgets.length, 105);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 100)),
    '42b33c25832a4d7e9a79cbc577e0f2ba8867e6fe7d771809372b9776c5451c5a'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    'f6b0d938acb9ff1fe2231078dcede6c8c55348683ed48e8d95c5149d1229e24d'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(100), [
    migrationEntry({
      fromFile: occupancyRel,
      companionSymbols: occupancyCompanions,
      addedFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
      addedSymbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
      reason:
        'The Sketch Box vertical content occupancy and removal-preview resolver replaces one legacy facade statement with the focused Interior Shelf Geometry owner plus focused Sketch Box Core, Rod, Shelf, and Storage Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box vertical occupancy composition seam eliminates the extra Interior Fittings statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: occupancyRel,
      companionSymbols: occupancyCompanions,
      addedFile: 'esm/shared/dimensions/interior_storage_policy.ts',
      addedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
      reason:
        'The Sketch Box vertical content occupancy and removal-preview resolver replaces one legacy facade statement with focused Interior Storage Barrier and Preview owners plus focused Sketch Box Core, Rod, Shelf, and Storage Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box vertical occupancy composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: occupancyRel,
      companionSymbols: occupancyCompanions,
      addedFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      addedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      reason:
        'The Sketch Box vertical content occupancy and removal-preview resolver replaces one legacy facade statement with the focused Material Thickness owner plus focused Sketch Box Core, Rod, Shelf, and Storage Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box vertical occupancy composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: shelfRel,
      companionSymbols: shelfCompanions,
      addedFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
      addedSymbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
      reason:
        'The Sketch Box vertical shelf preview resolver replaces one legacy facade statement with the focused Interior Shelf Geometry owner plus focused Sketch Box Measurement, Core, and Shelf Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box vertical shelf-preview composition seam eliminates the extra Interior Fittings statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: shelfRel,
      companionSymbols: shelfCompanions,
      addedFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      addedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      reason:
        'The Sketch Box vertical shelf preview resolver replaces one legacy facade statement with the focused Material Thickness owner plus focused Sketch Box Measurement, Core, and Shelf Preview owners on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed Sketch Box vertical shelf-preview composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
    }),
  ]);

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-22' });
  assert.equal(report.ok, true);
  assert.equal(report.migrationBudgets.filter(entry => entry.active).length, 105);
  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  assert.equal(observed.get('builder>shared'), 267);
  assert.equal(observed.get('features>shared'), 59);
  assert.equal(observed.get('services>shared'), 222);
  assert.equal(observed.get('ui>shared'), 28);
  assert.equal(
    report.migrationBudgets.filter(
      entry => entry.active && entry.from === 'services' && entry.to === 'shared'
    ).length,
    55
  );
});

test('Vertical Shelf/Occupancy pair leaves exact facade and Sketch Box inventories', () => {
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
  assert.equal(new Set(staticFacadeDependencies.map(dependency => dependency.file)).size, 45);
  assert.equal(staticFacadeDependencies.length, 45);
  assert.equal(new Set(facadeDependencies.map(dependency => dependency.file)).size, 47);
  assert.equal(facadeDependencies.length, 48);

  const sketchBoxConsumers = esmFiles
    .filter(file => file.replaceAll('\\', '/') !== path.join(root, facadeRel).replaceAll('\\', '/'))
    .filter(file => /\bSKETCH_BOX_DIMENSIONS\b/u.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file).replaceAll('\\', '/'))
    .sort();
  assert.deepEqual(sketchBoxConsumers, [
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
    'esm/native/builder/render_preview_interior_hover_apply.ts',
    'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
  ]);
  assert.equal(sketchBoxConsumers.filter(file => file.includes('/builder/')).length, 2);
  assert.equal(sketchBoxConsumers.filter(file => file.includes('/services/')).length, 1);
  assert.equal(sketchBoxConsumers.filter(file => file.includes('/ui/')).length, 0);
  for (const rel of sketchBoxConsumers) {
    const source = read(rel);
    assert.match(source, /SKETCH_BOX_DIMENSIONS\.preview/u);
    assert.doesNotMatch(source, /SKETCH_BOX_DIMENSIONS\.(?:geometry|freePlacement)|\bHANDLE_DIMENSIONS\b/u);
  }

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
