import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = 'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Sketch module surface rod preview imports are exact focused-owner statements', () => {
  const source = read(rel);
  const dependencies = analyzeModuleDependencies(path.join(root, rel), source).imports;
  const focusedOwners = dependencies.filter(
    dependency =>
      dependency.syntax === 'static-import' &&
      (dependency.specifier.endsWith('/dimensions/interior_fittings_policy.js') ||
        dependency.specifier.endsWith('/dimensions/interior_storage_policy.js') ||
        dependency.specifier.endsWith('/dimensions/sketch_box_preview_policy.js'))
  );

  assert.deepEqual(
    focusedOwners.map(dependency => ({
      specifier: dependency.specifier,
      symbols: [...dependency.importedSymbols],
    })),
    [
      {
        specifier: '../../shared/dimensions/interior_fittings_policy.js',
        symbols: ['INTERIOR_PRESET_ROD_FACTORS_POLICY', 'INTERIOR_ROD_PLACEMENT_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/interior_storage_policy.js',
        symbols: ['INTERIOR_STORAGE_GRID_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/sketch_box_preview_policy.js',
        symbols: ['SKETCH_BOX_ROD_PREVIEW_POLICY'],
      },
    ]
  );
  assert.equal(focusedOwners.length, 3);
  assert.equal(
    dependencies.some(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared')),
    false
  );
  assert.doesNotMatch(
    source,
    /\b(?:INTERIOR_FITTINGS_DIMENSIONS|SKETCH_BOX_DIMENSIONS|INTERIOR_FITTINGS_POLICY|INTERIOR_PRESET_POLICY|INTERIOR_ROD_POLICY|INTERIOR_STORAGE_POLICY|SKETCH_BOX_PREVIEW_POLICY|presetDims|rodDims|storageDims|previewDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
  );
  assert.doesNotMatch(
    source,
    /const\s+\w+\s*=\s*(?:INTERIOR_PRESET_ROD_FACTORS_POLICY|INTERIOR_ROD_PLACEMENT_POLICY|INTERIOR_STORAGE_GRID_POLICY|SKETCH_BOX_ROD_PREVIEW_POLICY)\s*;/u
  );
});

test('Sketch module surface rod preview formulas remain structurally exact', () => {
  const source = read(rel);
  assert.match(
    source,
    /readRecordNumber\(args\.info, 'gridDivisions'\) \?\?\s*INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault/u
  );
  assert.match(
    source,
    /Math\.round\(\(rawYFactor \* divs\) \/ INTERIOR_STORAGE_GRID_POLICY\.gridDivisionsDefault\)/u
  );
  assert.match(source, /args\.bottomY \+\s*i \* step \+\s*INTERIOR_ROD_PLACEMENT_POLICY\.defaultYOffsetM/u);
  for (const field of [
    'mixedRodYFactor',
    'hangingRodYFactor',
    'splitUpperRodYFactor',
    'splitLowerRodYFactor',
    'storageRodYFactor',
  ]) {
    assert.match(source, new RegExp(`INTERIOR_PRESET_ROD_FACTORS_POLICY\\.${field}`, 'u'));
  }
  assert.match(source, /presetMatch\.dy < best\.dy/u);
  assert.match(source, /rodRemoveMatch\.dy > args\.removeEpsShelf/u);
  assert.match(
    source,
    /Math\.max\(args\.bottomY \+ args\.pad, Math\.min\(args\.topY - args\.pad, rodRemoveMatch\.yAbs\)\)/u
  );
  assert.match(
    source,
    /w:\s*Math\.max\(\s*SKETCH_BOX_ROD_PREVIEW_POLICY\.rodMinLengthM,\s*args\.innerW - SKETCH_BOX_ROD_PREVIEW_POLICY\.rodWidthClearanceM\s*\)/u
  );
  assert.match(source, /h: SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewHeightM/u);
  assert.match(source, /d: SKETCH_BOX_ROD_PREVIEW_POLICY\.rodPreviewDepthM/u);
});
