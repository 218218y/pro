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
    'esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts',
    [
      {
        specifier: '../../shared/dimensions/interior_storage_policy.js',
        symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_GRID_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY', 'SKETCH_BOX_SHELF_PREVIEW_POLICY'],
      },
    ],
  ],
  [
    'esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts',
    [
      {
        specifier: '../../shared/dimensions/interior_fittings_policy.js',
        symbols: ['INTERIOR_SHELF_GEOMETRY_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_PREVIEW_CORE_POLICY'],
      },
    ],
  ],
]);

test('Sketch Box Core/Shelf flow pair imports are exact focused-owner statements', () => {
  for (const [rel, expected] of consumers) {
    const source = read(rel);
    const dependencies = analyzeModuleDependencies(path.join(root, rel), source).imports;
    const focusedOwners = dependencies.filter(
      dependency =>
        dependency.syntax === 'static-import' &&
        (dependency.specifier.endsWith('/dimensions/interior_storage_policy.js') ||
          dependency.specifier.endsWith('/dimensions/interior_fittings_policy.js') ||
          dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
    );

    assert.deepEqual(
      focusedOwners.map(dependency => ({
        specifier: dependency.specifier,
        symbols: [...dependency.importedSymbols],
      })),
      expected
    );
    assert.equal(focusedOwners.length, 2, `${rel} must have exactly two focused-owner statements`);
    assert.equal(
      dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
      false
    );
    assert.doesNotMatch(
      source,
      /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_STORAGE_POLICY|INTERIOR_FITTINGS_POLICY|SKETCH_BOX_PREVIEW_POLICY)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
    );
    assert.doesNotMatch(
      source,
      /const\s+\w+\s*=\s*(?:INTERIOR_(?:STORAGE|SHELF)_[A-Z_]+_POLICY|SKETCH_BOX_(?:PREVIEW_CORE|SHELF_PREVIEW)_POLICY)\s*;/u
    );
  }
});

test('Sketch Box Core/Shelf flow formulas and orchestration order remain structurally exact', () => {
  const existing = read('esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts');
  assert.match(
    existing,
    /Number\.isFinite\(value\) && value > 0\s*\? Math\.round\(value\)\s*:\s*INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault/u
  );
  assert.match(
    existing,
    /const outerW = Math\.max\(\s*SKETCH_BOX_SHELF_PREVIEW_POLICY\.shelfMinWidthM,\s*args\.widthM \?\? args\.innerW\s*\);/u
  );
  assert.match(
    existing,
    /const outerD = Math\.max\(\s*SKETCH_BOX_PREVIEW_CORE_POLICY\.minScaleM,\s*args\.depthM \?\? args\.internalDepth\s*\);/u
  );
  assert.match(
    existing,
    /const innerW = Math\.max\(\s*SKETCH_BOX_PREVIEW_CORE_POLICY\.minScaleM,\s*outerW - args\.woodThick \* 2\s*\);/u
  );
  assert.match(
    existing,
    /const innerD = Math\.max\(\s*SKETCH_BOX_PREVIEW_CORE_POLICY\.minScaleM,\s*outerD - args\.woodThick \* 2\s*\);/u
  );
  assert.match(
    existing,
    /const xNorm =\s*typeof args\.xNorm === 'number' && Number\.isFinite\(args\.xNorm\) \? args\.xNorm : 0\.5;/u
  );
  assert.match(existing, /storageH: INTERIOR_STORAGE_BARRIER_POLICY\.barrierHeightM/u);
  assert.ok(
    existing.indexOf('const storageHover = readManualLayoutSketchStorageHoverIntent') <
      existing.indexOf('const rodHover = readManualLayoutSketchRodHoverIntent')
  );
  assert.ok(
    existing.indexOf('const rodHover = readManualLayoutSketchRodHoverIntent') <
      existing.indexOf('const shelfHover = readManualLayoutSketchShelfHoverIntent')
  );

  const flow = read('esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts');
  assert.match(
    flow,
    /const regularDepth =\s*internalDepth > 0\s*\? Math\.min\(internalDepth, regShelfDepth\)\s*:\s*regShelfDepth;/u
  );
  assert.match(flow, /const removeEpsShelf = SKETCH_BOX_PREVIEW_CORE_POLICY\.removeEpsShelfM;/u);
  assert.match(flow, /const removeEpsBox = SKETCH_BOX_PREVIEW_CORE_POLICY\.removeEpsBoxM;/u);
  assert.ok(
    flow.indexOf('const shelfRemovePreview = allowExistingShelfRemove') <
      flow.indexOf('const storageRemovePreview = resolveSketchModuleStorageRemovePreview')
  );
  assert.ok(
    flow.indexOf('const storageRemovePreview = resolveSketchModuleStorageRemovePreview') <
      flow.indexOf('const rodRemovePreview = resolveSketchModuleRodRemovePreview')
  );
  assert.ok(
    flow.indexOf('const rodRemovePreview = resolveSketchModuleRodRemovePreview') <
      flow.indexOf('const boxPreviewState = resolveSketchModuleBoxPreviewState')
  );
  assert.ok(
    flow.indexOf('const boxPreviewState = resolveSketchModuleBoxPreviewState') <
      flow.indexOf('return resolveSketchModuleContentPreview')
  );
});
