import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/builder/visuals_chest_mode_build.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Chest Mode Build imports its exact use-case owner without aliases or aggregates', () => {
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
        specifier: '../../shared/dimensions/chest_mode_build_dimension_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: [
          'BASE_LEG_LAYOUT_POLICY',
          'BASE_PLATFORM_RENDER_POLICY',
          'BASE_PLINTH_POLICY',
          'CHEST_CASTER_RENDER_POLICY',
          'CHEST_CONNECTOR_POLICY',
          'CHEST_DRAWER_GEOMETRY_POLICY',
          'CHEST_MODE_COMMODE_CONSTRAINTS_POLICY',
          'CHEST_MODE_COMMODE_RENDER_POLICY',
          'CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY',
          'CHEST_MOTION_POLICY',
          'CHEST_SHELL_POLICY',
          'HINGED_DOOR_MOUNT_POLICY',
          'resolveDoorMountThicknessesFromConfig',
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
