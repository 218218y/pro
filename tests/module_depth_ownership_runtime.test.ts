import test from 'node:test';
import assert from 'node:assert/strict';

import { CARCASS_INTERIOR_DIMENSIONS } from '../esm/shared/dimensions/carcass_interior_policy.ts';
import { CARCASS_SHELL_DIMENSIONS } from '../esm/shared/dimensions/carcass_shell_policy.ts';
import { CM_PER_METER } from '../esm/shared/dimensions/units.ts';
import {
  resolveModuleDepthProfile,
  resolveRearClearanceForDepth,
  resolveRearClearedBackZ,
  resolveRearClearedPanelDepth,
} from '../esm/native/builder/module_loop_pipeline_module_depth.ts';

import type { ModuleLoopRuntime } from '../esm/native/builder/module_loop_pipeline_runtime.ts';
import type { ModuleConfigLike } from '../types/index.ts';

function closeTo(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${message}: ${actual} !== ${expected}`);
}

function runtime(overrides: Partial<Pick<ModuleLoopRuntime, 'D' | 'woodThick' | 'depthReduction'>> = {}) {
  return {
    D: 0.6,
    woodThick: 0.018,
    depthReduction: 0.03,
    ...overrides,
  } as unknown as ModuleLoopRuntime;
}

test('rear clearance clamps to panel capacity and preserves rear-cleared panel placement', () => {
  const woodThick = 0.018;
  const fullClearance = CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM;

  assert.equal(resolveRearClearanceForDepth(woodThick - 0.01, woodThick), 0);
  assert.equal(resolveRearClearanceForDepth(woodThick, woodThick), 0);

  const partialPanelDepth = woodThick + fullClearance / 2;
  closeTo(
    resolveRearClearanceForDepth(partialPanelDepth, woodThick),
    fullClearance / 2,
    'partial rear clearance'
  );
  closeTo(
    resolveRearClearanceForDepth(woodThick + fullClearance * 2, woodThick),
    fullClearance,
    'full rear clearance'
  );

  const cabinetDepth = 0.6;
  const panelDepth = woodThick + fullClearance * 2;
  const panel = resolveRearClearedPanelDepth({ cabinetDepth, panelDepth, woodThick });
  const expectedDepth = panelDepth - fullClearance;
  closeTo(panel.depth, expectedDepth, 'rear-cleared panel depth');
  closeTo(panel.z, -cabinetDepth / 2 + fullClearance + expectedDepth / 2, 'rear-cleared panel center Z');
  closeTo(
    resolveRearClearedBackZ({ cabinetDepth, minPanelDepth: panelDepth, woodThick }),
    -cabinetDepth / 2 + fullClearance,
    'rear-cleared back Z'
  );
});

test('module depth profile preserves override validation, focused-owner offsets, and return shape', () => {
  const baseRuntime = runtime();
  const fallback = resolveModuleDepthProfile(baseRuntime, {});
  assert.deepEqual(Object.keys(fallback), [
    'moduleTotalDepth',
    'moduleInternalDepth',
    'moduleInternalZ',
    'moduleOuterZ',
    'moduleFrontZ',
    'moduleDoorDepth',
    'moduleDoorFrontZ',
    'moduleHitDepth',
    'moduleHitZ',
  ]);
  assert.equal(fallback.moduleTotalDepth, baseRuntime.D);
  assert.equal(fallback.moduleDoorDepth, baseRuntime.D);

  const customDepthCm = 45;
  const custom = resolveModuleDepthProfile(baseRuntime, {
    specialDims: { depthCm: customDepthCm, baseDepthCm: baseRuntime.D * CM_PER_METER },
  });
  const expectedTotalDepth = customDepthCm / CM_PER_METER;
  const expectedInternalDepth = Math.max(
    baseRuntime.woodThick,
    expectedTotalDepth - baseRuntime.depthReduction
  );
  closeTo(custom.moduleTotalDepth, expectedTotalDepth, 'custom total depth');
  closeTo(custom.moduleInternalDepth, expectedInternalDepth, 'custom internal depth');
  closeTo(
    custom.moduleInternalZ,
    -baseRuntime.D / 2 + expectedInternalDepth / 2 + CARCASS_INTERIOR_DIMENSIONS.internalBackInsetM,
    'internal Z uses the Carcass Interior owner'
  );
  closeTo(custom.moduleOuterZ, -baseRuntime.D / 2 + expectedTotalDepth / 2, 'outer Z');
  closeTo(custom.moduleFrontZ, -baseRuntime.D / 2 + expectedTotalDepth, 'front Z');
  closeTo(custom.moduleDoorFrontZ, -baseRuntime.D / 2 + expectedTotalDepth, 'door-front Z');
  closeTo(custom.moduleHitDepth, expectedTotalDepth, 'hit depth');
  closeTo(custom.moduleHitZ, -baseRuntime.D / 2 + expectedTotalDepth / 2, 'hit Z');

  const rejectedConfigs = [
    { specialDims: { depthCm: '45', baseDepthCm: 60 } },
    { specialDims: { depthCm: 0, baseDepthCm: 60 } },
    { specialDims: { depthCm: -45, baseDepthCm: 60 } },
    { specialDims: { depthCm: Number.POSITIVE_INFINITY, baseDepthCm: 60 } },
  ] as unknown as ModuleConfigLike[];
  for (const config of rejectedConfigs) {
    assert.equal(resolveModuleDepthProfile(baseRuntime, config).moduleTotalDepth, baseRuntime.D);
  }

  const floorRuntime = runtime({ depthReduction: 1 });
  const floored = resolveModuleDepthProfile(floorRuntime, {
    specialDims: { depthCm: 20, baseDepthCm: 60 },
  });
  assert.equal(floored.moduleInternalDepth, floorRuntime.woodThick);
});

test('Hex Cell keeps side depth separate from door and hit depth', () => {
  const baseRuntime = runtime();
  const profile = resolveModuleDepthProfile(baseRuntime, {
    specialDims: { depthCm: 70, baseDepthCm: 60 },
    hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 35 },
  });

  const expectedDoorDepth = 70 / CM_PER_METER;
  const expectedSideDepth = 60 / CM_PER_METER;
  closeTo(profile.moduleDoorDepth, expectedDoorDepth, 'Hex Cell door depth');
  closeTo(profile.moduleTotalDepth, expectedSideDepth, 'Hex Cell side depth');
  closeTo(profile.moduleHitDepth, expectedDoorDepth, 'Hex Cell hit depth chooses the maximum');
  closeTo(profile.moduleDoorFrontZ, -baseRuntime.D / 2 + expectedDoorDepth, 'Hex Cell door-front Z');
  closeTo(profile.moduleHitZ, -baseRuntime.D / 2 + expectedDoorDepth / 2, 'Hex Cell hit Z');
});
