import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/core_layout_compute.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const layoutOwnerRel = 'esm/shared/dimensions/wardrobe_layout_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: ['CM_PER_METER', 'MATERIAL_DIMENSIONS', 'WARDROBE_LAYOUT_DIMENSIONS'],
  syntax: 'static-import',
});

const expectedEntries = Object.freeze([
  {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-24',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: layoutOwnerRel,
      kind: 'value',
      importedSymbols: ['WARDROBE_MODULE_LAYOUT_POLICY'],
      syntax: 'static-import',
    },
    removedImport,
    addedImport: {
      toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The core module-layout flow replaces one legacy facade statement with the focused Wardrobe Module Layout owner plus the canonical Material Thickness owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed core module-layout composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
  },
  {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-24',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: layoutOwnerRel,
      kind: 'value',
      importedSymbols: ['WARDROBE_MODULE_LAYOUT_POLICY'],
      syntax: 'static-import',
    },
    removedImport,
    addedImport: {
      toFile: 'esm/shared/dimensions/units.ts',
      kind: 'value',
      importedSymbols: ['CM_PER_METER'],
      syntax: 'static-import',
    },
    reason:
      'The core module-layout flow replaces one legacy facade statement with the focused Wardrobe Module Layout owner plus the canonical centimeter-per-meter unit owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed core module-layout composition seam eliminates the extra Units statement without reintroducing the legacy facade.',
  },
]);

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

function directFields(source, owner) {
  return Array.from(source.matchAll(new RegExp(`\\b${owner}\\.([A-Za-z_$][\\w$]*)`, 'gu')), match => match[1])
    .filter((field, index, fields) => fields.indexOf(field) === index)
    .sort();
}

test('Wardrobe Module Layout owner contains only its exact three canonical values', () => {
  assert.equal(
    read(layoutOwnerRel).replace(/\r\n/gu, '\n').trim(),
    `export const WARDROBE_MODULE_LAYOUT_POLICY = Object.freeze({
  minSegmentWidthCm: 1,
  boundaryFullThicknessMultiplier: 1,
  boundarySharedThicknessMultiplier: 0.5,
});`
  );
  const analysis = analyzeModuleDependencies(path.join(root, layoutOwnerRel), read(layoutOwnerRel));
  assert.deepEqual(analysis.imports, []);
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
});

test('Core Module Layout imports exactly three focused owners without aliases or aggregates', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency => dependency.specifier.includes('/dimensions/'));

  assert.deepEqual(
    focusedImports.map(({ specifier, kind, syntax, importedSymbols }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
    })),
    [
      {
        specifier: '../../shared/dimensions/material_thickness_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CM_PER_METER'],
      },
      {
        specifier: '../../shared/dimensions/wardrobe_layout_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['WARDROBE_MODULE_LAYOUT_POLICY'],
      },
    ]
  );
  assert.equal(focusedImports.length, 3);
  assert.equal(
    focusedImports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.localName)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(source, /import\s+\*\s+as|import\s*\(|export\s+(?:type\s+)?(?:\*|\{)/u);
  assert.doesNotMatch(
    source,
    /\b(?:MATERIAL_DIMENSIONS|WARDROBE_LAYOUT_DIMENSIONS|WARDROBE_LAYOUT_POLICY)\b/u
  );
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:MATERIAL_THICKNESS_POLICY|WARDROBE_MODULE_LAYOUT_POLICY)\s*;/u
  );
});

test('Core Module Layout maps Material, Units, minimum, and shared boundaries directly to focused owners', () => {
  const source = read(consumerRel);

  assert.equal((source.match(/MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/gu) ?? []).length, 1);
  assert.deepEqual(directFields(source, 'WARDROBE_MODULE_LAYOUT_POLICY'), [
    'boundarySharedThicknessMultiplier',
    'minSegmentWidthCm',
  ]);
  assert.match(source, /__asNum\(inp\.woodThick, MATERIAL_THICKNESS_POLICY\.wood\.thicknessM\)/u);
  assert.match(source, /const totalWcm = totalW \* CM_PER_METER/u);
  assert.match(source, /const MIN_SEG_CM = WARDROBE_MODULE_LAYOUT_POLICY\.minSegmentWidthCm/u);
  assert.equal(
    (
      source.match(
        /woodThick \* CM_PER_METER \* WARDROBE_MODULE_LAYOUT_POLICY\.boundarySharedThicknessMultiplier/gu
      ) ?? []
    ).length,
    2
  );
  assert.match(source, /moduleInternalWidths\[i\] = internalCm \/ CM_PER_METER/u);
});

test('Core Module Layout migration appends exactly Entries 130-131 after the unchanged 129-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 129)),
    '7db36f6859327fd852fb251e414c53a5e0de95bf5b30fb38bd5bd0d50cee96b4'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(129, 131), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 131)),
    'f8b2ec4b773b4d1c01f4a4a0dd519c43bcf01fb2b96d34e075d21bb2b55b6687'
  );
});
