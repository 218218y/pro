import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sizingRel = 'esm/native/features/sketch_drawer_sizing.ts';
const cassetteRel = 'esm/native/features/sketch_internal_drawer_cassette.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const expectedImports = Object.freeze({
  [sizingRel]: Object.freeze([
    Object.freeze({
      specifier: '../../shared/dimensions/sketch_drawer_sizing_dimension_policy.js',
      symbols: Object.freeze(['DRAWER_SKETCH_SIZING_POLICY', 'cmToM']),
    }),
  ]),
  [cassetteRel]: Object.freeze([
    Object.freeze({
      specifier: '../../shared/dimensions/sketch_internal_drawer_cassette_dimension_policy.js',
      symbols: Object.freeze(['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY', 'MATERIAL_THICKNESS_POLICY']),
    }),
  ]),
});

function focusedImports(rel) {
  return analyzeModuleDependencies(path.join(root, rel), read(rel))
    .imports.filter(dependency => dependency.specifier.includes('/dimensions/'))
    .map(dependency => ({
      specifier: dependency.specifier,
      kind: dependency.kind,
      syntax: dependency.syntax,
      symbols: [...dependency.importedSymbols].sort((a, b) => a.localeCompare(b)),
      bindings: dependency.bindings.map(binding => ({
        importedName: binding.importedName,
        localName: binding.localName,
      })),
    }));
}

test('Sketch drawer sizing and cassette import one exact composition owner without aliases', () => {
  for (const [rel, expected] of Object.entries(expectedImports)) {
    const imports = focusedImports(rel);
    assert.deepEqual(
      imports.map(({ specifier, kind, syntax, symbols }) => ({
        specifier,
        kind,
        syntax,
        symbols,
      })),
      expected.map(entry => ({
        specifier: entry.specifier,
        kind: 'value',
        syntax: 'static-import',
        symbols: [...entry.symbols].sort((a, b) => a.localeCompare(b)),
      })),
      rel
    );
    assert.equal(imports.length, 1, `${rel} must keep exactly one composition statement`);
    assert.equal(
      imports.every(dependency =>
        dependency.bindings.every(binding => binding.importedName === binding.localName)
      ),
      true,
      `${rel} must not alias focused owner symbols`
    );

    const source = read(rel);
    assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
    assert.doesNotMatch(
      source,
      /\b(?:DRAWER_DIMENSIONS|MATERIAL_DIMENSIONS|DRAWER_SKETCH_POLICY|drawerDims|sizingDims|sketchDims)\b|import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u
    );
  }
});

test('Sketch drawer sizing and cassette keep their public module surfaces', () => {
  const sizingExports = collectNamedModuleExports(sizingRel, read(sizingRel));
  assert.deepEqual(
    sizingExports.map(entry => [entry.kind, entry.exportedName]),
    [
      ['value', 'SKETCH_INTERNAL_DRAWERS_TOOL_ID'],
      ['value', 'SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX'],
      ['value', 'SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR'],
      ['value', 'SKETCH_DRAWER_HEIGHT_MIN_CM'],
      ['value', 'SKETCH_DRAWER_HEIGHT_MAX_CM'],
      ['value', 'SKETCH_EXTERNAL_DRAWER_COUNT_MIN'],
      ['value', 'SKETCH_EXTERNAL_DRAWER_COUNT_MAX'],
      ['value', 'DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM'],
      ['value', 'DEFAULT_SKETCH_SHOE_DRAWER_HEIGHT_CM'],
      ['value', 'DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM'],
      ['value', 'DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M'],
      ['value', 'DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M'],
      ['value', 'DEFAULT_SKETCH_INTERNAL_DRAWER_GAP_M'],
      ['value', 'SKETCH_INTERNAL_DRAWER_STACK_COUNT'],
      ['value', 'SKETCH_INTERNAL_DRAWERS_DIRTY_KEY'],
      ['value', 'markSketchInternalDrawersDirty'],
      ['value', 'hasSketchInternalDrawersDirtyOrData'],
      ['type', 'SketchExternalDrawersToolSpec'],
      ['type', 'SketchInternalDrawersToolSpec'],
      ['type', 'SketchInternalDrawerMetrics'],
      ['type', 'SketchExternalDrawerMetrics'],
      ['type', 'SketchDrawerFitResult'],
      ['value', 'normalizeSketchDrawerHeightCm'],
      ['value', 'normalizeSketchDrawerHeightM'],
      ['value', 'isSketchInternalDrawersTool'],
      ['value', 'isSketchExternalDrawersTool'],
      ['value', 'parseSketchInternalDrawersTool'],
      ['value', 'parseSketchExternalDrawersTool'],
      ['value', 'createSketchInternalDrawersTool'],
      ['value', 'createSketchExternalDrawersTool'],
      ['value', 'readSketchDrawerHeightMFromItem'],
      ['value', 'isSketchExternalShoeDrawerItem'],
      ['value', 'resolveSketchInternalDrawerMetrics'],
      ['value', 'resolveSketchExternalDrawerMetrics'],
      ['value', 'sketchStackFitsAvailableHeight'],
      ['value', 'resolveSketchInternalDrawerFit'],
      ['value', 'resolveSketchExternalDrawerFit'],
    ]
  );

  const cassetteExports = collectNamedModuleExports(cassetteRel, read(cassetteRel));
  assert.deepEqual(
    cassetteExports.map(entry => [entry.kind, entry.exportedName]),
    [
      ['value', 'SKETCH_INTERNAL_DRAWER_CASSETTE_TOUCH_EPSILON_M'],
      ['value', 'SKETCH_INTERNAL_DRAWER_CASSETTE_PART_SUFFIX'],
      ['value', 'createSketchInternalDrawerCassettePartId'],
      ['value', 'isSketchInternalDrawerCassettePartId'],
      ['type', 'SketchInternalDrawerCassetteRange'],
      ['value', 'resolveSketchInternalDrawerCassetteWoodThick'],
      ['value', 'resolveSketchInternalDrawerCassetteRange'],
      ['value', 'verticalRangesTouchOrOverlap'],
      ['value', 'resolveSketchInternalDrawerCassetteSideFillerWidth'],
      ['value', 'resolveSketchInternalDrawerCassetteFrameOuterWidth'],
      ['value', 'resolveSketchInternalDrawerCassetteDrawerWidth'],
    ]
  );
});
