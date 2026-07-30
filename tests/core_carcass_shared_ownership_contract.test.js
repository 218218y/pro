import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/core_carcass_shared.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const shellOwnerRel = 'esm/shared/dimensions/carcass_shell_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: ['CARCASS_BASE_DIMENSIONS', 'CARCASS_SHELL_DIMENSIONS', 'MATERIAL_DIMENSIONS'],
  syntax: 'static-import',
});

function expectedEntry({ toFile, importedSymbol, reason, removalCondition }) {
  return {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-23',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: shellOwnerRel,
      kind: 'value',
      importedSymbols: ['CARCASS_SHELL_DIMENSIONS'],
      syntax: 'static-import',
    },
    removedImport,
    addedImport: {
      toFile,
      kind: 'value',
      importedSymbols: [importedSymbol],
      syntax: 'static-import',
    },
    reason,
    removalCondition,
  };
}

const expectedEntries = Object.freeze([
  expectedEntry({
    toFile: 'esm/shared/dimensions/base_plinth_policy.ts',
    importedSymbol: 'BASE_PLINTH_POLICY',
    reason:
      'The core carcass preparation flow replaces one legacy facade statement with the focused Carcass Shell owner plus the focused Base Plinth owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed core carcass preparation composition seam eliminates the extra Base Plinth statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/base_leg_policy.ts',
    importedSymbol: 'BASE_LEG_LAYOUT_POLICY',
    reason:
      'The core carcass preparation flow replaces one legacy facade statement with the focused Carcass Shell owner plus the focused Base Leg Layout owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed core carcass preparation composition seam eliminates the extra Base Leg Layout statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/base_platform_render_policy.ts',
    importedSymbol: 'BASE_PLATFORM_RENDER_POLICY',
    reason:
      'The core carcass preparation flow replaces one legacy facade statement with the focused Carcass Shell owner plus the focused Base Platform Render owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed core carcass preparation composition seam eliminates the extra Base Platform Render statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
    importedSymbol: 'MATERIAL_THICKNESS_POLICY',
    reason:
      'The core carcass preparation flow replaces one legacy facade statement with the focused Carcass Shell owner plus the canonical Material Thickness owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed core carcass preparation composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
  }),
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

test('Core Carcass Shared imports its exact use-case owner without aliases or aggregates', () => {
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
        specifier: '../../shared/dimensions/core_carcass_dimension_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [
          'BASE_LEG_LAYOUT_POLICY',
          'BASE_PLATFORM_RENDER_POLICY',
          'BASE_PLINTH_POLICY',
          'CARCASS_SHELL_DIMENSIONS',
          'MATERIAL_THICKNESS_POLICY',
        ],
      },
    ]
  );
  assert.equal(focusedImports.length, 1);
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
    /\b(?:CARCASS_BASE_DIMENSIONS|MATERIAL_DIMENSIONS|BASE_LEG_LAYOUT_DIMENSIONS|BASE_LEG_PLATFORM_DIMENSIONS|PLINTH_DIMENSIONS)\b/u
  );
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:BASE_LEG_LAYOUT_POLICY|BASE_PLATFORM_RENDER_POLICY|BASE_PLINTH_POLICY|CARCASS_SHELL_DIMENSIONS|MATERIAL_THICKNESS_POLICY)\s*;/u
  );
});

test('Core Carcass Shared maps every migrated field and formula directly to its focused owner', () => {
  const source = read(consumerRel);

  assert.deepEqual(directFields(source, 'CARCASS_SHELL_DIMENSIONS'), ['backInsetZM', 'frontInsetZM']);
  assert.deepEqual(directFields(source, 'BASE_PLINTH_POLICY'), [
    'depthClearanceM',
    'frontInsetM',
    'segmentWidthEpsilonM',
    'steppedBackInsetM',
    'steppedMinSegmentDepthM',
    'widthClearanceM',
  ]);
  assert.deepEqual(directFields(source, 'BASE_LEG_LAYOUT_POLICY'), [
    'centerSupportDoorsThreshold',
    'cornerInsetM',
    'depthSteppedMinFrontBackGapM',
  ]);
  assert.deepEqual(directFields(source, 'BASE_PLATFORM_RENDER_POLICY'), [
    'heightM',
    'minDepthM',
    'minWidthM',
  ]);
  assert.equal((source.match(/MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/gu) ?? []).length, 1);

  assert.match(source, /export const CARCASS_BACK_INSET_Z: number = CARCASS_SHELL_DIMENSIONS\.backInsetZM;/u);
  assert.match(
    source,
    /export const CARCASS_FRONT_INSET_Z: number = CARCASS_SHELL_DIMENSIONS\.frontInsetZM;/u
  );
  assert.match(source, /__asNum\(inp\.woodThick, MATERIAL_THICKNESS_POLICY\.wood\.thicknessM\)/u);
  assert.match(source, /width: totalW - BASE_PLINTH_POLICY\.widthClearanceM/u);
  assert.match(source, /depth: D - BASE_PLINTH_POLICY\.depthClearanceM/u);
  assert.match(source, /z: 0 - BASE_PLINTH_POLICY\.frontInsetM/u);
  assert.match(source, /doorsCount >= BASE_LEG_LAYOUT_POLICY\.centerSupportDoorsThreshold/u);
  assert.match(source, /Math\.max\(BASE_PLATFORM_RENDER_POLICY\.minDepthM, args\.depth \+ frontOverhang\)/u);
  assert.match(
    source,
    /Math\.max\(BASE_PLATFORM_RENDER_POLICY\.minWidthM, args\.width \+ sideOverhang \* 2\)/u
  );
  assert.match(source, /rightBoundary - leftBoundary - BASE_PLINTH_POLICY\.segmentWidthEpsilonM/u);
  assert.match(source, /dm - BASE_PLINTH_POLICY\.depthClearanceM/u);
  assert.match(source, /-D \/ 2 \+ BASE_PLINTH_POLICY\.steppedBackInsetM \+ segDepth \/ 2/u);
  assert.match(source, /-D \/ 2 \+ dm - BASE_LEG_LAYOUT_POLICY\.cornerInsetM/u);
  assert.match(source, /backZ \+ BASE_LEG_LAYOUT_POLICY\.depthSteppedMinFrontBackGapM/u);
});

test('Core Carcass Shared historical migration locks Entries 126-129 and the unchanged 125-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 125)),
    '84e9877bc6ca47028c5e081018b3025b96ea2f040d5d4f1ab838d9c1b0bd47cb'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(125, 129), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 129)),
    '7db36f6859327fd852fb251e414c53a5e0de95bf5b30fb38bd5bd0d50cee96b4'
  );
});
