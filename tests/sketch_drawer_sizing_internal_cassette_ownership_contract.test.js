import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
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

const expectedEntries = Object.freeze([
  {
    from: 'features',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-23',
    reviewBy: '2026-10-18',
    fromFile: sizingRel,
    companionImport: {
      toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
      kind: 'value',
      importedSymbols: ['DRAWER_SKETCH_SIZING_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'cmToM'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/units.ts',
      kind: 'value',
      importedSymbols: ['cmToM'],
      syntax: 'static-import',
    },
    reason:
      'The Sketch drawer sizing feature replaces one legacy facade statement with the focused Drawer Sketch Sizing owner plus the canonical centimeter-to-meter conversion on the existing features to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Sketch drawer sizing composition seam eliminates the extra Units statement without reintroducing the legacy facade.',
  },
  {
    from: 'features',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-23',
    reviewBy: '2026-10-18',
    fromFile: cassetteRel,
    companionImport: {
      toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
      kind: 'value',
      importedSymbols: ['DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'MATERIAL_DIMENSIONS'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The Sketch internal drawer cassette feature replaces one legacy facade statement with the focused Drawer Sketch Internal Preview owner plus the canonical Material Thickness owner on the existing features to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Sketch internal drawer cassette composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
  },
]);

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

test('Sketch drawer sizing and cassette append exactly entries 118-119 after the unchanged prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 119);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 117)),
    '7f6b6f681f71b979353ba75aaffe776ac13f8b339f90d6bb56bcb77452fb24d8'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(117, 119), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 119)),
    'e10f08c6cebfb73ed1ff89676e5bf8bc982d659bf566f218ac52dc89607d53a4'
  );
});
