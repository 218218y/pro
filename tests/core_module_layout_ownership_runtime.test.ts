import test from 'node:test';
import assert from 'node:assert/strict';

import { computeModuleLayout } from '../esm/native/builder/core_layout_compute.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { CM_PER_METER } from '../esm/shared/dimensions/units.ts';
import { WARDROBE_MODULE_LAYOUT_POLICY } from '../esm/shared/dimensions/wardrobe_layout_policy.ts';

type LayoutResult = ReturnType<typeof computeModuleLayout>;

function assertClose(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-12, `${actual} must equal ${expected} within tolerance`);
}

function assertArrayClose(actual: number[], expected: number[]): void {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++) assertClose(actual[index]!, expected[index]!);
}

function fixedWidthConfig(widthCm: number, baseWidthCm = widthCm - 1): Record<string, unknown> {
  return {
    specialDims: {
      widthCm,
      baseWidthCm,
    },
  };
}

function boundaryMultiplier(index: number, moduleCount: number): number {
  const left =
    index === 0
      ? WARDROBE_MODULE_LAYOUT_POLICY.boundaryFullThicknessMultiplier
      : WARDROBE_MODULE_LAYOUT_POLICY.boundarySharedThicknessMultiplier;
  const right =
    index === moduleCount - 1
      ? WARDROBE_MODULE_LAYOUT_POLICY.boundaryFullThicknessMultiplier
      : WARDROBE_MODULE_LAYOUT_POLICY.boundarySharedThicknessMultiplier;
  return left + right;
}

function segmentWidthsCm(result: LayoutResult, woodThick: number): number[] {
  return result.moduleInternalWidths.map(
    (internalWidth, index) =>
      internalWidth * CM_PER_METER +
      woodThick * CM_PER_METER * boundaryMultiplier(index, result.modules.length)
  );
}

function expectedInternalWidthM(
  segmentWidthCm: number,
  index: number,
  moduleCount: number,
  woodThick: number
): number {
  const boundaryCm = woodThick * CM_PER_METER * boundaryMultiplier(index, moduleCount);
  return Math.max(0, segmentWidthCm - boundaryCm) / CM_PER_METER;
}

function assertExactTiling(result: LayoutResult, totalWidthM: number, woodThick: number): void {
  const totalSegmentWidthCm = segmentWidthsCm(result, woodThick).reduce((sum, width) => sum + width, 0);
  assertClose(totalSegmentWidthCm, totalWidthM * CM_PER_METER);
}

test('Core Module Layout preserves default, custom, and numeric-string-rejected wood thickness', () => {
  const defaultWood = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const singleModule = [{ doors: 1 }];
  const defaults = computeModuleLayout({
    totalW: 1,
    modulesStructure: singleModule,
    modulesConfiguration: [],
  });
  const customWood = 0.025;
  const custom = computeModuleLayout({
    totalW: 1,
    woodThick: customWood,
    modulesStructure: singleModule,
    modulesConfiguration: [],
  });
  const numericString = computeModuleLayout({
    totalW: 1,
    woodThick: String(defaultWood),
    modulesStructure: singleModule,
    modulesConfiguration: [],
  });

  assert.deepEqual(Object.keys(defaults), [
    'modules',
    'moduleConfigs',
    'totalDividersWidth',
    'netInternalWidth',
    'doorUnits',
    'singleUnitWidth',
    'moduleInternalWidths',
  ]);
  assert.equal(defaults.modules.length, 1);
  assert.equal(defaults.moduleConfigs.length, 1);
  assert.equal(defaults.totalDividersWidth, 0);
  assert.equal(defaults.doorUnits, 1);
  assertClose(
    defaults.moduleInternalWidths[0]!,
    1 -
      defaultWood *
        (WARDROBE_MODULE_LAYOUT_POLICY.boundaryFullThicknessMultiplier +
          WARDROBE_MODULE_LAYOUT_POLICY.boundaryFullThicknessMultiplier)
  );
  assertClose(custom.moduleInternalWidths[0]!, 1 - customWood * 2);
  assertClose(numericString.moduleInternalWidths[0]!, defaults.moduleInternalWidths[0]!);
  assertExactTiling(defaults, 1, defaultWood);
  assertExactTiling(custom, 1, customWood);
});

test('Core Module Layout preserves full outer and shared half-divider boundaries', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const result = computeModuleLayout({
    totalW: 1,
    woodThick,
    modulesStructure: [{ doors: 1 }, { doors: 1 }],
    modulesConfiguration: [],
  });
  const expectedSegments = [50, 50];

  assert.equal(result.totalDividersWidth, woodThick);
  assertClose(result.netInternalWidth, 1 - woodThick * 3);
  assert.equal(result.doorUnits, 2);
  assertClose(result.singleUnitWidth, result.netInternalWidth / 2);
  assertArrayClose(segmentWidthsCm(result, woodThick), expectedSegments);
  for (let index = 0; index < expectedSegments.length; index++) {
    assertClose(
      result.moduleInternalWidths[index]!,
      expectedInternalWidthM(expectedSegments[index]!, index, expectedSegments.length, woodThick)
    );
  }
  assertExactTiling(result, 1, woodThick);
});

test('Core Module Layout preserves mixed fixed/flexible distribution and door-unit weighting', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const mixed = computeModuleLayout({
    totalW: 2,
    woodThick,
    modulesStructure: [{ doors: 1 }, { doors: 2 }, { doors: 1 }],
    modulesConfiguration: [fixedWidthConfig(50, 40), {}, {}],
  });
  const weighted = computeModuleLayout({
    totalW: 2,
    woodThick,
    modulesStructure: [{ doors: 1 }, { doors: 3 }],
    modulesConfiguration: [{}, {}],
  });

  assertArrayClose(segmentWidthsCm(mixed, woodThick), [50, 100, 50]);
  assert.equal(mixed.doorUnits, 4);
  assertClose(mixed.singleUnitWidth, mixed.netInternalWidth / 4);
  assertArrayClose(segmentWidthsCm(weighted, woodThick), [50, 150]);
  assert.equal(weighted.doorUnits, 4);
  assertExactTiling(mixed, 2, woodThick);
  assertExactTiling(weighted, 2, woodThick);
});

test('Core Module Layout preserves rightmost fixed fallback for positive and negative delta', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const positive = computeModuleLayout({
    totalW: 1,
    woodThick,
    modulesStructure: [{ doors: 1 }, { doors: 1 }],
    modulesConfiguration: [fixedWidthConfig(30, 20), fixedWidthConfig(40, 30)],
  });
  const negative = computeModuleLayout({
    totalW: 1,
    woodThick,
    modulesStructure: [{ doors: 1 }, { doors: 1 }],
    modulesConfiguration: [fixedWidthConfig(60, 50), fixedWidthConfig(60, 50)],
  });

  assertArrayClose(segmentWidthsCm(positive, woodThick), [30, 70]);
  assertArrayClose(segmentWidthsCm(negative, woodThick), [60, 40]);
  assertExactTiling(positive, 1, woodThick);
  assertExactTiling(negative, 1, woodThick);
});

test('Core Module Layout preserves negative-remaining fallback, flexible precedence, and minimum clamp', () => {
  const woodThick = 0.001;
  const negativeRemaining = computeModuleLayout({
    totalW: 2,
    woodThick,
    modulesStructure: [{ doors: 1 }, { doors: 1 }],
    modulesConfiguration: [fixedWidthConfig(250, 200), {}],
  });
  const clamped = computeModuleLayout({
    totalW: 0.01,
    woodThick,
    modulesStructure: [{ doors: 1 }, { doors: 1 }],
    modulesConfiguration: [fixedWidthConfig(20, 10), fixedWidthConfig(100, 90)],
  });

  assertArrayClose(segmentWidthsCm(negativeRemaining, woodThick), [
    199,
    WARDROBE_MODULE_LAYOUT_POLICY.minSegmentWidthCm,
  ]);
  assertExactTiling(negativeRemaining, 2, woodThick);
  assertArrayClose(segmentWidthsCm(clamped, woodThick), [
    WARDROBE_MODULE_LAYOUT_POLICY.minSegmentWidthCm,
    WARDROBE_MODULE_LAYOUT_POLICY.minSegmentWidthCm,
  ]);
  for (let index = 0; index < clamped.moduleInternalWidths.length; index++) {
    assertClose(
      clamped.moduleInternalWidths[index]!,
      expectedInternalWidthM(
        WARDROBE_MODULE_LAYOUT_POLICY.minSegmentWidthCm,
        index,
        clamped.moduleInternalWidths.length,
        woodThick
      )
    );
  }
});

test('Core Module Layout preserves no-module return shape and zero door-unit behavior', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const result = computeModuleLayout({
    totalW: 2,
    woodThick,
    modulesStructure: [],
    modulesConfiguration: [fixedWidthConfig(50, 40)],
  });

  assert.deepEqual(result.modules, []);
  assert.deepEqual(result.moduleConfigs, []);
  assert.equal(result.totalDividersWidth, 0);
  assertClose(result.netInternalWidth, 2 - woodThick * 2);
  assert.equal(result.doorUnits, 0);
  assert.equal(result.singleUnitWidth, 0);
  assert.deepEqual(result.moduleInternalWidths, []);
});
