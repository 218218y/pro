import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/visuals_chest_mode_build.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const structuralOwnerRel = 'esm/shared/dimensions/chest_structural_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const companionImport = Object.freeze({
  toFile: structuralOwnerRel,
  kind: 'value',
  importedSymbols: [
    'CHEST_CASTER_RENDER_POLICY',
    'CHEST_CONNECTOR_POLICY',
    'CHEST_DRAWER_GEOMETRY_POLICY',
    'CHEST_MOTION_POLICY',
    'CHEST_SHELL_POLICY',
  ],
  syntax: 'static-import',
});

const removedImport = Object.freeze({
  toFile: facadeRel,
  kind: 'value',
  importedSymbols: [
    'CARCASS_BASE_DIMENSIONS',
    'CHEST_MODE_DIMENSIONS',
    'DOOR_SYSTEM_DIMENSIONS',
    'resolveDoorMountThicknessesFromConfig',
  ],
  syntax: 'static-import',
});

function expectedEntry({ toFile, importedSymbols, reason, removalCondition }) {
  return {
    from: 'builder',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-24',
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
    toFile: 'esm/shared/dimensions/base_plinth_policy.ts',
    importedSymbols: ['BASE_PLINTH_POLICY'],
    reason:
      'The Chest Mode build flow replaces one legacy facade statement with the focused Chest Structural owners plus the focused Base Plinth owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode build composition seam eliminates the extra Base Plinth statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/base_leg_policy.ts',
    importedSymbols: ['BASE_LEG_LAYOUT_POLICY'],
    reason:
      'The Chest Mode build flow replaces one legacy facade statement with the focused Chest Structural owners plus the focused Base Leg Layout owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode build composition seam eliminates the extra Base Leg Layout statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/base_platform_render_policy.ts',
    importedSymbols: ['BASE_PLATFORM_RENDER_POLICY'],
    reason:
      'The Chest Mode build flow replaces one legacy facade statement with the focused Chest Structural owners plus the focused Base Platform Render owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode build composition seam eliminates the extra Base Platform Render statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/chest_mode_policy.ts',
    importedSymbols: [
      'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
      'CHEST_MODE_COMMODE_RENDER_POLICY',
      'CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY',
    ],
    reason:
      'The Chest Mode build flow replaces one legacy facade statement with the focused Chest Structural owners plus the focused Chest Mode Commode and Dimension Guide owners on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode build composition seam eliminates the extra Chest Mode policy statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/door_system_policy.ts',
    importedSymbols: ['HINGED_DOOR_MOUNT_POLICY'],
    reason:
      'The Chest Mode build flow replaces one legacy facade statement with the focused Chest Structural owners plus the focused Hinged Door Mount owner on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode build composition seam eliminates the extra Hinged Door Mount statement without reintroducing the legacy facade.',
  }),
  expectedEntry({
    toFile: 'esm/shared/dimensions/door_mount_thickness_policy.ts',
    importedSymbols: ['resolveDoorMountThicknessesFromConfig'],
    reason:
      'The Chest Mode build flow replaces one legacy facade statement with the focused Chest Structural owners plus the canonical Door Mount Thickness resolver on the existing builder to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed Chest Mode build composition seam eliminates the extra Door Mount Thickness statement without reintroducing the legacy facade.',
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

test('Chest Mode Build imports exactly seven focused owners without aliases or aggregates', () => {
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
        specifier: '../../shared/dimensions/base_leg_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_LEG_LAYOUT_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/base_platform_render_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLATFORM_RENDER_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/base_plinth_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['BASE_PLINTH_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/chest_structural_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: companionImport.importedSymbols,
      },
      {
        specifier: '../../shared/dimensions/chest_mode_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [
          'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
          'CHEST_MODE_COMMODE_RENDER_POLICY',
          'CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY',
        ],
      },
      {
        specifier: '../../shared/dimensions/door_system_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['HINGED_DOOR_MOUNT_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/door_mount_thickness_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['resolveDoorMountThicknessesFromConfig'],
      },
    ]
  );
  assert.equal(focusedImports.length, 7);
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
    /\b(?:CARCASS_BASE_DIMENSIONS|CHEST_MODE_DIMENSIONS|DOOR_SYSTEM_DIMENSIONS|PLINTH_DIMENSIONS|BASE_LEG_LAYOUT_DIMENSIONS|BASE_LEG_PLATFORM_DIMENSIONS|CHEST_DIMENSIONS|wheelDims)\b/u
  );
  assert.doesNotMatch(source, /const\s+commode\s*=/u);
  assert.doesNotMatch(
    source,
    /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:BASE_LEG_LAYOUT_POLICY|BASE_PLATFORM_RENDER_POLICY|BASE_PLINTH_POLICY|CHEST_CASTER_RENDER_POLICY|CHEST_CONNECTOR_POLICY|CHEST_DRAWER_GEOMETRY_POLICY|CHEST_MOTION_POLICY|CHEST_SHELL_POLICY|CHEST_MODE_COMMODE_CONSTRAINTS_POLICY|CHEST_MODE_COMMODE_RENDER_POLICY|CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY|HINGED_DOOR_MOUNT_POLICY)\s*;/u
  );
});

test('Chest Mode Build maps every structural field directly to its focused owner', () => {
  const source = read(consumerRel);
  const expectedFields = {
    BASE_PLINTH_POLICY: ['widthClearanceM', 'depthClearanceM', 'frontInsetM'],
    BASE_LEG_LAYOUT_POLICY: ['cornerInsetM', 'chestCenterSupportWidthThresholdM'],
    BASE_PLATFORM_RENDER_POLICY: ['heightM', 'minDepthM', 'minWidthM'],
    CHEST_SHELL_POLICY: [
      'backThicknessM',
      'backInsetM',
      'backPanelWidthClearanceM',
      'backPanelHeightClearanceM',
    ],
    CHEST_DRAWER_GEOMETRY_POLICY: [
      'drawerGapM',
      'drawerWidthClearanceM',
      'drawerFrontThicknessM',
      'drawerBoxWidthClearanceM',
      'drawerBoxHeightClearanceM',
      'drawerBoxDepthClearanceM',
    ],
    CHEST_CONNECTOR_POLICY: [
      'connectorDepthM',
      'connectorBackInsetM',
      'connectorWidthClearanceM',
      'connectorHeightClearanceM',
    ],
    CHEST_MOTION_POLICY: ['openOffsetZM'],
    CHEST_CASTER_RENDER_POLICY: [
      'radiusM',
      'thicknessM',
      'plateWidthM',
      'plateHeightM',
      'plateDepthM',
      'forkWidthM',
      'forkHeightM',
      'forkDepthM',
    ],
    CHEST_MODE_COMMODE_CONSTRAINTS_POLICY: ['minMirrorWidthCm', 'minMirrorHeightCm'],
    CHEST_MODE_COMMODE_RENDER_POLICY: [
      'backPanelThicknessM',
      'mirrorThicknessM',
      'mirrorInsetM',
      'backPanelYOffsetM',
      'mirrorSurfaceLiftM',
    ],
    CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY: ['sideOffsetM', 'topOffsetM', 'textScale'],
    HINGED_DOOR_MOUNT_POLICY: ['insetRevealM'],
  };

  for (const [owner, fields] of Object.entries(expectedFields)) {
    for (const field of fields) {
      assert.match(source, new RegExp(`\\b${owner}\\.${field}\\b`, 'u'), `${owner}.${field}`);
    }
  }
  assert.match(source, /const doorMountThicknesses = resolveDoorMountThicknessesFromConfig\(cfg\);/u);
  assert.match(
    source,
    /const insetReveal = isInsetDrawerMount\s*\? Math\.min\(HINGED_DOOR_MOUNT_POLICY\.insetRevealM, Math\.max\(0, thick \/ 3\)\)\s*: 0;/u
  );
  assert.match(source, /const dimensionTextScale = CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY\.textScale;/u);
});

test('Chest Mode Build appends exactly Entries 137-142 after the unchanged 136-entry prefix', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 136)),
    '17c6ec0de239b5bce3d6745b654dd6aa0c3650e626e8ecca360db3ced781ac47'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(136, 142), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 142)),
    'e813a8d82fc10b63f077b6b3fba67f9a4db5dc5a308825d871f85e1dcf95a861'
  );
});
