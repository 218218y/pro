import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRel = 'esm/native/services/canvas_picking_manual_layout_free_box_content.ts';
const plansRel = 'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts';
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
      specifier: '../../shared/dimensions/manual_layout_free_box_plans_dimension_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: [
        'INTERIOR_ROD_RENDER_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_PREVIEW_CORE_POLICY',
      ],
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
