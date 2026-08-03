import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = 'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Sketch module surface content preview imports are exact focused-owner statements', () => {
  const source = read(rel);
  const dependencies = analyzeModuleDependencies(path.join(root, rel), source).imports;
  const focusedOwners = dependencies.filter(
    dependency =>
      dependency.syntax === 'static-import' &&
      (dependency.specifier.endsWith('/dimensions/interior_storage_policy.js') ||
        dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
  );

  assert.deepEqual(
    focusedOwners.map(dependency => ({
      specifier: dependency.specifier,
      symbols: [...dependency.importedSymbols],
    })),
    [
      {
        specifier: '../../shared/dimensions/interior_storage_policy.js',
        symbols: ['INTERIOR_STORAGE_BARRIER_POLICY', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY', 'SKETCH_BOX_ROD_PREVIEW_POLICY'],
      },
    ]
  );
  assert.equal(focusedOwners.length, 2);
  assert.equal(
    dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
    false
  );
  assert.doesNotMatch(
    source,
    /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|previewDims|storageDims|measurementDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
  );
  assert.doesNotMatch(
    source,
    /const\s+\w+\s*=\s*(?:INTERIOR_STORAGE_(?:BARRIER|PREVIEW)_POLICY|SKETCH_BOX_(?:MEASUREMENT|ROD)_PREVIEW_POLICY)\s*;/u
  );
});

test('Sketch module surface content preview formulas remain structurally exact', () => {
  const source = read(rel);
  assert.match(source, /z:\s*zFront \+ INTERIOR_STORAGE_BARRIER_POLICY\.barrierFrontZOffsetM/u);
  assert.match(
    source,
    /w:\s*Math\.max\(\s*INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthMinM,\s*innerW - INTERIOR_STORAGE_BARRIER_POLICY\.barrierWidthClearanceM\s*\)/u
  );
  assert.match(source, /d:\s*Math\.max\(INTERIOR_STORAGE_PREVIEW_POLICY\.previewThicknessMinM, woodThick\)/u);
  assert.match(
    source,
    /w:\s*Math\.max\(\s*SKETCH_BOX_ROD_PREVIEW_POLICY\.rodMinLengthM,\s*innerW - SKETCH_BOX_ROD_PREVIEW_POLICY\.rodWidthClearanceM\s*\)/u
  );
  assert.match(source, /h: SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewHeightM/u);
  assert.match(source, /d: SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewDepthM/u);
  assert.match(
    source,
    /Math\.max\(\s*SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementZOffsetMinM,\s*shelfPreview\.d \*\s*SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementZOffsetDepthRatio\s*\)/u
  );
  assert.match(source, /textScale: SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY\.measurementTextScale/u);
});
