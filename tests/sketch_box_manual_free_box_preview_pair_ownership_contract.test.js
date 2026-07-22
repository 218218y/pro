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
const contentRel = 'esm/native/services/canvas_picking_manual_layout_free_box_content.ts';
const plansRel = 'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts';
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

test('Manual Free Box preview pair imports exact focused owners without aggregate paths', () => {
  assert.deepEqual(focusedDimensionImports(contentRel), [
    {
      specifier: '../../shared/dimensions/interior_storage_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['INTERIOR_STORAGE_BARRIER_POLICY'],
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
      symbols: ['SKETCH_BOX_SHELF_PREVIEW_POLICY'],
    },
  ]);
  assert.deepEqual(focusedDimensionImports(plansRel), [
    {
      specifier: '../../shared/dimensions/interior_fittings_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['INTERIOR_ROD_RENDER_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
    },
    {
      specifier: '../../shared/dimensions/interior_storage_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
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
      symbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
    },
  ]);

  for (const rel of [contentRel, plansRel]) {
    const source = read(rel);
    const analysis = analyzeModuleDependencies(path.join(root, rel), source);
    assert.equal(
      analysis.imports.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false
    );
    assert.deepEqual(analysis.unresolvedDynamicImports, []);
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_FITTINGS_POLICY|INTERIOR_ROD_POLICY|INTERIOR_SHELF_POLICY|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|previewDims|storageDims|shelfDims|rodDims|materialDims)\b|import\s+\*\s+as|import\s*\(/u
    );
    assert.doesNotMatch(
      source,
      /const\s+\w+\s*=\s*(?:INTERIOR_STORAGE_BARRIER_POLICY|INTERIOR_STORAGE_GRID_POLICY|INTERIOR_ROD_RENDER_POLICY|INTERIOR_SHELF_GEOMETRY_POLICY|MATERIAL_THICKNESS_POLICY|SKETCH_BOX_PREVIEW_CORE_POLICY|SKETCH_BOX_SHELF_PREVIEW_POLICY)\s*;/u
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

test('Manual Free Box preview pair ledger transition and layer counts are exact', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(baseline.migrationBudgets.length, 100);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 95)),
    '998ce4016e780748d6f771d97fdd7e9980f0a2fb4d7995b92a1befb154f85fc0'
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    '42b33c25832a4d7e9a79cbc577e0f2ba8867e6fe7d771809372b9776c5451c5a'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(95), [
    migrationEntry({
      fromFile: contentRel,
      companionSymbols: ['SKETCH_BOX_SHELF_PREVIEW_POLICY'],
      addedFile: 'esm/shared/dimensions/interior_storage_policy.ts',
      addedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY'],
      reason:
        'The manual free-box content hover flow replaces one legacy facade statement with the focused Interior Storage Barrier owner plus the focused Sketch Box Shelf Preview owner on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed manual free-box content-preview composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: contentRel,
      companionSymbols: ['SKETCH_BOX_SHELF_PREVIEW_POLICY'],
      addedFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      addedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      reason:
        'The manual free-box content hover flow replaces one legacy facade statement with the focused Material Thickness owner plus the focused Sketch Box Shelf Preview owner on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed manual free-box content-preview composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: plansRel,
      companionSymbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
      addedFile: 'esm/shared/dimensions/interior_fittings_policy.ts',
      addedSymbols: ['INTERIOR_ROD_RENDER_POLICY', 'INTERIOR_SHELF_GEOMETRY_POLICY'],
      reason:
        'The manual free-box planning flow replaces one legacy facade statement with focused Interior Rod Render and Shelf Geometry owners plus the focused Sketch Box Preview Core owner on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed manual free-box planning composition seam eliminates the extra Interior Fittings statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: plansRel,
      companionSymbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
      addedFile: 'esm/shared/dimensions/interior_storage_policy.ts',
      addedSymbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
      reason:
        'The manual free-box planning flow replaces one legacy facade statement with focused Interior Storage Barrier and Grid owners plus the focused Sketch Box Preview Core owner on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed manual free-box planning composition seam eliminates the extra Interior Storage statement without reintroducing the legacy facade.',
    }),
    migrationEntry({
      fromFile: plansRel,
      companionSymbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
      addedFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      addedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      reason:
        'The manual free-box planning flow replaces one legacy facade statement with the focused Material Thickness owner plus the focused Sketch Box Preview Core owner on the existing services to shared edge.',
      removalCondition:
        'Remove this entry when a reviewed manual free-box planning composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
    }),
  ]);

  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-22' });
  assert.equal(report.ok, true);
  assert.equal(report.migrationBudgets.filter(entry => entry.active).length, 100);
  const observed = new Map(graph.edges.map(edge => [`${edge.from}>${edge.to}`, edge.importCount]));
  assert.equal(observed.get('builder>shared'), 267);
  assert.equal(observed.get('features>shared'), 59);
  assert.equal(observed.get('services>shared'), 217);
  assert.equal(observed.get('ui>shared'), 28);
  assert.equal(
    report.migrationBudgets.filter(
      entry => entry.active && entry.from === 'services' && entry.to === 'shared'
    ).length,
    50
  );
});

test('Manual Free Box preview pair leaves the exact facade and Sketch Box inventories', () => {
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
  assert.equal(new Set(staticFacadeDependencies.map(dependency => dependency.file)).size, 47);
  assert.equal(staticFacadeDependencies.length, 47);
  assert.equal(new Set(facadeDependencies.map(dependency => dependency.file)).size, 49);
  assert.equal(facadeDependencies.length, 50);

  const sketchBoxConsumers = esmFiles
    .filter(file => file.replaceAll('\\', '/') !== path.join(root, facadeRel).replaceAll('\\', '/'))
    .filter(file => /\bSKETCH_BOX_DIMENSIONS\b/u.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file).replaceAll('\\', '/'))
    .sort();
  assert.deepEqual(sketchBoxConsumers, [
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
    'esm/native/builder/render_preview_interior_hover_apply.ts',
    'esm/native/services/canvas_picking_interior_hover_manual_mode.ts',
    'esm/native/services/canvas_picking_sketch_box_vertical_content_occupancy.ts',
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
  ]);
  assert.equal(sketchBoxConsumers.filter(file => file.includes('/builder/')).length, 2);
  assert.equal(sketchBoxConsumers.filter(file => file.includes('/services/')).length, 3);
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

test('Manual Free Box preview pair keeps the focused-owner formulas structurally exact', () => {
  const content = read(contentRel);
  const plans = read(plansRel);
  assert.match(
    content,
    /w:\s*Math\.max\(\s*SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfMinWidthM,\s*args\.plan\.previewW\s*-\s*\(isBrace\s*\? SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfBraceClearanceM\s*:\s*SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfRegularClearanceM\)\s*\)/u
  );
  assert.equal((content.match(/MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/gu) ?? []).length, 2);
  assert.match(
    content,
    /storageHeight:\s*contentKind === 'storage'\s*\? INTERIOR_STORAGE_BARRIER_POLICY\.barrierHeightM\s*:\s*null/u
  );
  assert.match(
    content,
    /if \(removalOp === 'remove' && \(removalKind === 'rod' \|\| removalKind === 'storage'\)\) \{[\s\S]*__wp_writeSketchHover[\s\S]*args\.hideLayoutPreview\(\);[\s\S]*args\.setSketchPreview\([\s\S]*return true;[\s\S]*const plan = resolveManualLayoutFreeBoxShelfGridPlan/u
  );

  assert.equal((plans.match(/MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/gu) ?? []).length, 3);
  assert.match(plans, /step < INTERIOR_SHELF_GEOMETRY_POLICY\.spanMinHeightM/u);
  assert.equal((plans.match(/INTERIOR_SHELF_GEOMETRY_POLICY\.spanMinHeightM/gu) ?? []).length, 2);
  assert.match(plans, /const divs = INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault;/u);
  assert.match(plans, /const rodH = INTERIOR_ROD_RENDER_POLICY\.radiusM \* 2;/u);
  assert.match(
    plans,
    /args\.targetGeo\.innerBackZ \+\s*args\.targetGeo\.innerD \+\s*INTERIOR_STORAGE_BARRIER_POLICY\.barrierFrontZOffsetM/u
  );
  assert.match(plans, /const tolerance = SKETCH_BOX_PREVIEW_CORE_POLICY\.removeEpsShelfM;/u);
  assert.match(plans, /if \(dy > tolerance \|\| dy >= bestDy\) continue;/u);
});
