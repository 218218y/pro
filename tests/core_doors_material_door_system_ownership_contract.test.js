import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/core_doors_compute.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const hingedFields = Object.freeze([
  'insetRevealM',
  'sameModuleLeafGapMaxM',
  'sameModuleLeafGapWoodDivisor',
  'sameModuleLeafGapSpanRatioMax',
]);
const slidingFields = Object.freeze([
  'defaultDoorsCount',
  'overlapM',
  'railHeightM',
  'railDepthM',
  'railBackInsetM',
  'shellClearanceMinM',
  'shellClearanceMaxM',
  'shellClearanceWoodDivisor',
  'doorTopOverlapMaxM',
  'doorTopOverlapRailInsetM',
  'doorHeightMinM',
  'railLineOffsetYExtraM',
  'railTrackLaneDivisor',
]);

test('Core Doors imports exactly its two focused owner statements without aliases or aggregates', () => {
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
        specifier: '../../shared/dimensions/door_system_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['HINGED_DOOR_MOUNT_POLICY', 'SLIDING_DOOR_CONSTRUCTION_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/material_thickness_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      },
    ]
  );
  assert.equal(focusedImports.length, 2);
  assert.equal(
    focusedImports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.localName)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(
    source,
    /\b(?:DOOR_SYSTEM_DIMENSIONS|MATERIAL_DIMENSIONS|HINGED_DOOR_SYSTEM_POLICY|SLIDING_DOOR_SYSTEM_POLICY|doorDims|hingedDims|slidingDims|materialDims)\b|import\s+\*\s+as|export\s+(?:type\s+)?(?:\*|\{)/u
  );
});

test('Core Doors historical contract locks all seventeen Door System fields and their formulas', () => {
  const source = read(consumerRel);

  for (const field of hingedFields) {
    assert.match(source, new RegExp(`HINGED_DOOR_MOUNT_POLICY\\.${field}`, 'u'));
  }
  for (const field of slidingFields) {
    assert.match(source, new RegExp(`SLIDING_DOOR_CONSTRUCTION_POLICY\\.${field}`, 'u'));
  }
  assert.equal((source.match(/MATERIAL_THICKNESS_POLICY\.wood\.thicknessM/gu) ?? []).length, 3);
  assert.match(source, /const INSET_REVEAL\s*=\s*HINGED_DOOR_MOUNT_POLICY\.insetRevealM/u);
  assert.match(
    source,
    /Math\.min\(\s*HINGED_DOOR_MOUNT_POLICY\.sameModuleLeafGapMaxM,\s*woodThick \/ HINGED_DOOR_MOUNT_POLICY\.sameModuleLeafGapWoodDivisor\s*\)/u
  );
  assert.match(
    source,
    /const maxTotalGap = effectiveSpanW \* HINGED_DOOR_MOUNT_POLICY\.sameModuleLeafGapSpanRatioMax/u
  );
  assert.match(source, /let internalWidthForDoors = totalW - 2 \* woodThick/u);
  assert.match(
    source,
    /let doorWidth = \(internalWidthForDoors \+ \(numDoors - 1\) \* overlap\) \/ numDoors/u
  );
  assert.match(
    source,
    /const offsetZ = railDepth \/ SLIDING_DOOR_CONSTRUCTION_POLICY\.railTrackLaneDivisor/u
  );
  assert.match(source, /woodThick \/ SLIDING_DOOR_CONSTRUCTION_POLICY\.shellClearanceWoodDivisor/u);
  assert.match(
    source,
    /let railZ = D \/ 2 - railDepth \/ 2 - SLIDING_DOOR_CONSTRUCTION_POLICY\.railBackInsetM/u
  );
  assert.match(
    source,
    /Math\.max\(0, railHeight - SLIDING_DOOR_CONSTRUCTION_POLICY\.doorTopOverlapRailInsetM\)/u
  );
  assert.match(
    source,
    /Math\.max\(SLIDING_DOOR_CONSTRUCTION_POLICY\.doorHeightMinM, doorTopY - doorBottomY\)/u
  );
  assert.match(
    source,
    /lineOffsetY: -railHeight \/ 2 - SLIDING_DOOR_CONSTRUCTION_POLICY\.railLineOffsetYExtraM/u
  );
});
