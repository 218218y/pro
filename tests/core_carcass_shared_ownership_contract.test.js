import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/core_carcass_shared.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

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
