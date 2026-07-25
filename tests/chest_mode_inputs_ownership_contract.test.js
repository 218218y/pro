import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/visuals_chest_mode_inputs.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const companionImport = Object.freeze({
  toFile: 'esm/shared/dimensions/chest_mode_policy.ts',
  kind: 'value',
  importedSymbols: ['CHEST_MODE_COMMODE_CONSTRAINTS_POLICY'],
  syntax: 'static-import',
});

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: ['CARCASS_BASE_DIMENSIONS', 'CHEST_MODE_DIMENSIONS', 'clampDimension', 'cmToM'],
  syntax: 'static-import',
});

function expectedEntry({ toFile, importedSymbols, reason, removalCondition }) {
  return {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-25',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport,
    removedImport,
    addedImport: {
      toFile,
      kind: 'value',
      importedSymbols,
      syntax: 'static-import',
    },
    reason,
    removalCondition,
  };
}

const expectedEntries = Object.freeze([
  expectedEntry({
    toFile: 'esm/shared/dimensions/base_platform_render_policy.ts',
    importedSymbols: ['BASE_PLATFORM_RENDER_POLICY'],
    reason:
      'The Chest Mode input-normalization flow replaces one legacy facade statement with the focused Chest Mode Commode Constraints owner plus the focused Base Platform Render owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode input composition seam eliminates the extra Base Platform Render statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/chest_structural_policy.ts',
    importedSymbols: ['CHEST_CASTER_RENDER_POLICY'],
    reason:
      'The Chest Mode input-normalization flow replaces one legacy facade statement with the focused Chest Mode Commode Constraints owner plus the focused Chest Caster Render owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode input composition seam eliminates the extra Chest Caster Render statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/units.ts',
    importedSymbols: ['clampDimension', 'cmToM'],
    reason:
      'The Chest Mode input-normalization flow replaces one legacy facade statement with the focused Chest Mode Commode Constraints owner plus the canonical dimension clamp and centimeter-to-meter conversion on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode input composition seam eliminates the extra Units statement without reintroducing the legacy facade.',
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

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name) ? [absolute] : [];
  });
}

function facadeConsumers(importedSymbol) {
  return listSourceFiles(path.join(root, 'esm'))
    .flatMap(file => {
      const source = fs.readFileSync(file, 'utf8');
      const dependencies = analyzeModuleDependencies(file, source).imports;
      return dependencies.some(
        dependency =>
          dependency.syntax === 'static-import' &&
          dependency.specifier.includes('wardrobe_dimension_tokens_shared') &&
          dependency.importedSymbols.includes(importedSymbol)
      )
        ? [path.relative(root, file).replaceAll(path.sep, '/')]
        : [];
    })
    .sort();
}

test('Chest Mode Inputs imports exactly four focused owner statements without aliases or facade access', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency =>
    dependency.specifier.startsWith('../../shared/dimensions/')
  );

  assert.deepEqual(
    focusedImports.map(({ specifier, kind, syntax, importedSymbols }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
    })),
    [
      {
        specifier: '../../shared/dimensions/base_platform_render_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLATFORM_RENDER_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/chest_structural_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CHEST_CASTER_RENDER_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/chest_mode_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['CHEST_MODE_COMMODE_CONSTRAINTS_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/units.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['clampDimension', 'cmToM'],
      },
    ]
  );
  assert.equal(focusedImports.length, 4);
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
  assert.doesNotMatch(source, /\b(?:CARCASS_BASE_DIMENSIONS|CHEST_MODE_DIMENSIONS)\b/u);
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:BASE_PLATFORM_RENDER_POLICY|CHEST_CASTER_RENDER_POLICY|CHEST_MODE_COMMODE_CONSTRAINTS_POLICY)\s*;/u
  );
});

test('Chest Mode Inputs maps platform, caster, commode constraints, and units directly', () => {
  const source = read(consumerRel);

  assert.match(
    source,
    /const baseLegPlatformHeightM = baseLegPlatformEnabled\s*\? BASE_PLATFORM_RENDER_POLICY\.heightM\s*: 0;/u
  );
  assert.match(
    source,
    /const effectiveBaseLegHeightM = isWheelsBase\s*\? CHEST_CASTER_RENDER_POLICY\.heightM\s*: legOptions\.heightM;/u
  );
  for (const field of [
    'defaultMirrorHeightCm',
    'minMirrorHeightCm',
    'maxMirrorHeightCm',
    'minMirrorWidthCm',
    'maxMirrorWidthCm',
  ]) {
    assert.match(source, new RegExp(`\\bCHEST_MODE_COMMODE_CONSTRAINTS_POLICY\\.${field}\\b`, 'u'));
  }
  assert.match(source, /clampDimension\(raw, bounds\.min, bounds\.max\)/u);
  assert.match(source, /chestCommodeMirrorHeightM: cmToM\(chestCommodeMirrorHeightCm\)/u);
  assert.match(source, /chestCommodeMirrorWidthM: cmToM\(chestCommodeMirrorWidthCm\)/u);
  assert.match(source, /Math\.round\(effectiveBaseLegHeightM \* 1000\) \/ 10/u);
});

test('Chest Mode Inputs appends exactly Entries 143-145 after the unchanged 142-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 142)),
    'e813a8d82fc10b63f077b6b3fba67f9a4db5dc5a308825d871f85e1dcf95a861'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(142, 145), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 145)),
    'd4f939330cd5c5ec1febe5a004598d66f0a0dcc40618591f3fedffb367ea2447'
  );
});

test('Chest Mode Inputs leaves the exact requested focused-migration inventories', () => {
  assert.deepEqual(facadeConsumers('CARCASS_BASE_DIMENSIONS'), [
    'esm/native/builder/corner_connector_emit_shell_base.ts',
    'esm/native/runtime/default_state.ts',
  ]);
  assert.deepEqual(facadeConsumers('CHEST_MODE_DIMENSIONS'), ['esm/native/runtime/default_state.ts']);
  assert.deepEqual(facadeConsumers('cmToM'), [
    'esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts',
  ]);
  assert.deepEqual(facadeConsumers('clampDimension'), []);
});
