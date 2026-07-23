import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/core_doors_compute.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const doorOwnerRel = 'esm/shared/dimensions/door_system_policy.ts';
const materialOwnerRel = 'esm/shared/dimensions/material_thickness_policy.ts';
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

const expectedEntry = Object.freeze({
  from: 'builder',
  to: 'shared',
  additionalStatements: 1,
  owner: 'dimension-ownership-migration',
  reviewedAt: '2026-07-23',
  reviewBy: '2026-10-18',
  fromFile: consumerRel,
  companionImport: {
    toFile: doorOwnerRel,
    kind: 'value',
    importedSymbols: ['HINGED_DOOR_MOUNT_POLICY', 'SLIDING_DOOR_CONSTRUCTION_POLICY'],
    syntax: 'static-import',
  },
  removedImport: {
    toFile: facadeRel,
    kind: 'value',
    importedSymbols: ['DOOR_SYSTEM_DIMENSIONS', 'MATERIAL_DIMENSIONS'],
    syntax: 'static-import',
  },
  addedImport: {
    toFile: materialOwnerRel,
    kind: 'value',
    importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
    syntax: 'static-import',
  },
  reason:
    'The core door geometry flow replaces one legacy facade statement with focused Hinged Door Mount and Sliding Door Construction owners plus the canonical Material Thickness owner on the existing builder to shared edge.',
  removalCondition:
    'Remove this entry when a reviewed core door geometry composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
});

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

test('Core Doors historical migration contract locks Entry 125 and its unchanged 124-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 124)),
    '9eeb17b61e2b1a64eb9303ca0b750319da74d868131f9130a26f1bd4977d49cf'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(124, 125), [expectedEntry]);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 125)),
    '84e9877bc6ca47028c5e081018b3025b96ea2f040d5d4f1ab838d9c1b0bd47cb'
  );
});
