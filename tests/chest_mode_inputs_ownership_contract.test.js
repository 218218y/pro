import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/visuals_chest_mode_inputs.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Chest Mode Inputs imports its exact use-case owner without aliases or facade access', () => {
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
        specifier: '../../shared/dimensions/chest_mode_inputs_dimension_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [
          'BASE_PLATFORM_RENDER_POLICY',
          'CHEST_CASTER_RENDER_POLICY',
          'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
          'clampDimension',
          'cmToM',
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
