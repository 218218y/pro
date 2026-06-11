import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizeWhitespace, readSource, bundleSources } from './_source_bundle.js';

const cornerOwner = readSource(
  '../esm/native/features/modules_configuration/corner_cells_api.ts',
  import.meta.url
);
const cornerSnapshot = readSource(
  '../esm/native/features/modules_configuration/corner_cells_snapshot.ts',
  import.meta.url
);
const cornerSnapshotShared = readSource(
  '../esm/native/features/modules_configuration/corner_cells_snapshot_shared.ts',
  import.meta.url
);
const cornerSnapshotNormalize = readSource(
  '../esm/native/features/modules_configuration/corner_cells_snapshot_normalize.ts',
  import.meta.url
);
const cornerSnapshotStack = readSource(
  '../esm/native/features/modules_configuration/corner_cells_snapshot_stack.ts',
  import.meta.url
);
const cornerBundle = bundleSources(
  [
    '../esm/native/features/modules_configuration/corner_cells_api.ts',
    '../esm/native/features/modules_configuration/corner_cells_contracts.ts',
    '../esm/native/features/modules_configuration/corner_cells_patch.ts',
    '../esm/native/features/modules_configuration/corner_cells_snapshot.ts',
    '../esm/native/features/modules_configuration/corner_cells_snapshot_shared.ts',
    '../esm/native/features/modules_configuration/corner_cells_snapshot_normalize.ts',
    '../esm/native/features/modules_configuration/corner_cells_snapshot_stack.ts',
    '../esm/native/features/modules_configuration/corner_cells_ui_defaults.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

test('[corner-stack-lower-snapshot] corner cell public owner stays thin while shared/normalize/stack owners keep lower-shell defaults and mutation seeding canonical', () => {
  assert.match(cornerOwner, /corner_cells_contracts\.js/);
  assert.match(cornerOwner, /corner_cells_patch\.js/);
  assert.match(cornerOwner, /corner_cells_snapshot\.js/);
  assert.match(cornerOwner, /corner_cells_ui_defaults\.js/);
  assert.doesNotMatch(cornerOwner, /const DEFAULT_LOWER_CORNER_CONFIGURATION =/);
  assert.doesNotMatch(cornerOwner, /function sanitizeCornerCustomDataForPatch\(/);

  assert.match(cornerSnapshot, /corner_cells_snapshot_shared\.js/);
  assert.match(cornerSnapshot, /corner_cells_snapshot_normalize\.js/);
  assert.match(cornerSnapshot, /corner_cells_snapshot_stack\.js/);
  assert.doesNotMatch(cornerSnapshot, /const DEFAULT_LOWER_CORNER_CONFIGURATION:/);

  assert.match(cornerSnapshotShared, /const DEFAULT_LOWER_CORNER_CONFIGURATION:/);
  assert.match(cornerSnapshotShared, /layout: 'shelves',/);
  assert.match(cornerSnapshotShared, /extDrawersCount: 0,/);
  assert.match(cornerSnapshotShared, /hasShoeDrawer: false,/);
  assert.match(cornerSnapshotShared, /intDrawersList: \[\],/);
  assert.match(cornerSnapshotShared, /isCustom: true,/);
  assert.match(cornerSnapshotShared, /gridDivisions: 6,/);
  assert.match(cornerSnapshotShared, /modulesConfiguration: \[\],/);
  assert.match(cornerSnapshotShared, /shelves: \[false, true, false, true, false, false\],/);
  assert.match(cornerSnapshotShared, /rods: \[false, false, false, false, false, false\],/);
  assert.match(cornerSnapshotShared, /export function sanitizeCornerCustomDataForPatch\(/);

  assert.match(cornerSnapshotNormalize, /export function sanitizeCornerConfigurationListsOnly\(/);
  assert.match(cornerSnapshotNormalize, /export function sanitizeLowerCornerConfigurationForPatch\(/);

  assert.match(cornerSnapshotStack, /function resolveLowerCornerSeedForMutation\(/);
  assert.match(cornerSnapshotStack, /delete out\.stackSplitLower;/);
  assert.match(cornerBundle, /export function cloneCornerConfigurationForLowerSnapshot\(/);
});

test('[corner-stack-lower-snapshot] lower corner builder/router seed the clean lower snapshot whenever split is active and lower data is still missing', () => {
  const builderLower = readFileSync('esm/native/builder/corner_state_normalize_config.ts', 'utf8');
  const stackRouter = [
    'esm/native/kernel/state_api_stack_router.ts',
    'esm/native/kernel/state_api_stack_router_shared.ts',
    'esm/native/kernel/state_api_stack_router_ensure.ts',
    'esm/native/kernel/state_api_stack_router_patch.ts',
  ]
    .map(p => readFileSync(p, 'utf8'))
    .join('\n');
  const stackRouterNorm = normalizeWhitespace(stackRouter);
  assert.match(builderLower, /return cloneCornerConfigurationForLowerSnapshot\(__baseCornerCfg\);/);
  assert.match(stackRouter, /function seedLowerCornerSnapshotForSplit\(/);
  assert.match(stackRouter, /stackSplitLower: cloneCornerConfigurationForLowerSnapshot\(base\),/);
  assert.match(
    stackRouterNorm,
    /const base = seedLowerCornerSnapshotForSplit\(!!ctx\.readUiSnapshot\(\)\.stackSplitEnabled, cloneRecord\(ctx, prev\)\);/
  );
  assert.match(stackRouterNorm, /const seeded = seedLowerCornerSnapshotForSplit\(splitOnNow, base\);/);
});
