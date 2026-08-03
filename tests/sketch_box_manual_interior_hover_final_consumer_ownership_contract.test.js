import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/services/canvas_picking_interior_hover_manual_mode.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function focusedImports() {
  return analyzeModuleDependencies(path.join(root, consumerRel), read(consumerRel))
    .imports.filter(dependency => dependency.specifier.includes('/dimensions/'))
    .map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: [...dependency.importedSymbols],
    }));
}

test('Manual Interior Hover imports its exact use-case owner and no aggregate path', () => {
  assert.deepEqual(focusedImports(), [
    {
      specifier: '../../shared/dimensions/interior_hover_manual_mode_dimension_policy.js',
      kind: 'value',
      syntax: 'static-import',
      symbols: [
        'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
        'INTERIOR_ROD_PLACEMENT_POLICY',
        'INTERIOR_SHELF_GEOMETRY_POLICY',
        'INTERIOR_STORAGE_BARRIER_POLICY',
        'INTERIOR_STORAGE_GRID_POLICY',
        'INTERIOR_STORAGE_PREVIEW_POLICY',
        'MATERIAL_THICKNESS_POLICY',
        'SKETCH_BOX_ROD_PREVIEW_POLICY',
        'SKETCH_BOX_SHELF_PREVIEW_POLICY',
      ],
    },
  ]);

  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  assert.equal(
    analysis.imports.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
    false
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.doesNotMatch(
    source,
    /\b(?:DRAWER_DIMENSIONS|INTERIOR_FITTINGS_DIMENSIONS|MATERIAL_DIMENSIONS|SKETCH_BOX_DIMENSIONS|DRAWER_SKETCH_POLICY|INTERIOR_FITTINGS_POLICY|INTERIOR_ROD_POLICY|INTERIOR_SHELF_POLICY|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|drawerDims|previewDims|storageDims|shelfDims|rodDims|materialDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
  );
});

test('Manual Interior Hover keeps the ownership formulas structurally exact', () => {
  const source = read(consumerRel);
  assert.match(
    source,
    /const pad = Math\.min\(\s*DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadMaxM,\s*Math\.max\(\s*DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadMinM,\s*target\.woodThick \*\s*DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY\.internalClampPadWoodRatio\s*\)\s*\);/u
  );
  assert.match(
    source,
    /readGridDivisions\(\s*ui\.currentGridDivisions,\s*INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault,\s*8\s*\)/u
  );
  assert.match(
    source,
    /target\.bottomY \+ gridIndex \* step \+ INTERIOR_ROD_PLACEMENT_POLICY\.defaultYOffsetM/u
  );
  assert.match(
    source,
    /Math\.max\(\s*target\.woodThick,\s*target\.woodThick \* INTERIOR_SHELF_GEOMETRY_POLICY\.doubleThicknessMultiplier\s*\)/u
  );
  assert.match(source, /MATERIAL_THICKNESS_POLICY\.glassShelf\.thicknessM/u);
  assert.match(source, /INTERIOR_STORAGE_BARRIER_POLICY\.barrierFrontZOffsetM/u);
  assert.match(source, /INTERIOR_STORAGE_PREVIEW_POLICY\.previewThicknessMinM/u);
  assert.match(source, /SKETCH_BOX_ROD_PREVIEW_POLICY\.rodMinLengthM/u);
  assert.match(source, /SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfBraceClearanceM/u);
  assert.doesNotMatch(source, /shelf(?:Hover)?MinWidthM/u);
});
