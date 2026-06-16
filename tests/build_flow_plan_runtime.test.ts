import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBuildFlowPlanInputs } from '../esm/native/builder/build_flow_plan_inputs.ts';
import { resolveBuildFlowPlanLayout } from '../esm/native/builder/build_flow_plan_layout.ts';

const toStr = (value: unknown, fallback = ''): string => (value == null ? fallback : String(value));
const assertApproximatelyEqual = (actual: number, expected: number): void => {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ~= ${expected}`);
};

test('build_flow_plan inputs derive split build metrics, base routing, and no-main depth policy', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      doorStyle: 'flat',
      hasCornice: 1,
      handleControl: 1,
      showHanger: 1,
      showContents: 0,
      splitDoors: 1,
      groovesEnabled: 1,
      internalDrawersEnabled: 1,
    } as any,
    cfg: {
      wardrobeType: 'hinged',
    } as any,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 0,
    toStr,
  });

  assert.equal(plan.stackSplitEnabled, false);
  assert.equal(plan.splitActiveForBuild, false);
  assert.equal(plan.totalW, 1.8);
  assert.equal(plan.H, 2.4);
  assert.equal(plan.D, 0.6);
  assert.equal(plan.baseTypeBottom, 'legs');
  assert.equal(plan.baseTypeTop, 'legs');
  assert.equal(plan.baseLegStyle, 'tapered');
  assert.equal(plan.baseLegColor, 'black');
  assert.equal(plan.baseLegHeightCm, 12);
  assert.equal(plan.baseLegWidthCm, 4);
  assert.equal(plan.noMainWardrobe, true);
  assert.equal(plan.depthReduction, 0.03);
  assert.equal(plan.hasCornice, true);
  assert.equal(plan.handleControlEnabled, true);
  assert.equal(plan.showHangerEnabled, true);
  assert.equal(plan.showContentsEnabled, false);
  assert.equal(plan.isInternalDrawersEnabled, true);
});

test('build_flow_plan inputs ignore stale stack split flags in no-main wardrobe mode', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      stackSplitEnabled: true,
      stackSplitDecorativeSeparatorEnabled: true,
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerDepth: 55,
        stackSplitLowerWidth: 80,
        stackSplitLowerDoors: 2,
        stackSplitLowerDepthManual: true,
        stackSplitLowerWidthManual: true,
        stackSplitLowerDoorsManual: true,
      },
    } as any,
    cfg: {
      wardrobeType: 'hinged',
    } as any,
    widthCm: 0,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 0,
    toStr,
  });

  assert.equal(plan.noMainWardrobe, true);
  assert.equal(plan.stackSplitEnabled, false);
  assert.equal(plan.splitActiveForBuild, false);
  assert.equal(plan.baseTypeBottom, 'legs');
  assert.equal(plan.baseTypeTop, 'legs');
});

test('build_flow_plan inputs clear top base when stack split is active and sliding keeps main wardrobe depth reduction', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'toeKick',
      baseLegStyle: 'round',
      baseLegColor: 'gold',
      basePlinthHeightCm: 14.5,
      baseLegHeightCm: 18,
      baseLegWidthCm: 7,
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerHeightManual: true,
        stackSplitLowerDepth: 55,
        stackSplitLowerDepthManual: true,
      },
      stackSplitEnabled: true,
    } as any,
    cfg: {
      wardrobeType: 'sliding',
    } as any,
    widthCm: 200,
    heightCm: 260,
    depthCm: 70,
    doorsCount: 3,
    toStr,
  });

  assert.equal(plan.splitActiveForBuild, true);
  assert.equal(plan.stackSplitUnifiedFrame, false);
  assert.equal(plan.lowerHeightCm, 90);
  assert.equal(plan.lowerDepthCm, 55);
  assert.equal(plan.baseTypeBottom, 'toeKick');
  assert.equal(plan.baseTypeTop, '');
  assert.equal(plan.baseLegStyle, 'round');
  assert.equal(plan.baseLegColor, 'gold');
  assert.equal(plan.basePlinthHeightCm, 14.5);
  assert.equal(plan.baseLegHeightCm, 18);
  assert.equal(plan.baseLegWidthCm, 7);
  assert.equal(plan.noMainWardrobe, false);
  assert.equal(plan.depthReduction, 0.12);
  assert.equal(plan.splitSeamGapM, 0.002);
  assert.ok(plan.H < 1.7);
});

test('build_flow_plan inputs keep one frame for stack split when lower width and depth match the upper unit', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerHeightManual: true,
        stackSplitLowerDepth: 60,
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidth: 180,
        stackSplitLowerWidthManual: false,
      },
      stackSplitEnabled: true,
    } as any,
    cfg: {
      wardrobeType: 'hinged',
    } as any,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 3,
    toStr,
  });

  assert.equal(plan.splitActiveForBuild, true);
  assert.equal(plan.stackSplitUnifiedFrame, true);
  assert.equal(plan.splitSeamGapM, 0);
  assert.equal(plan.baseTypeBottom, 'legs');
  assert.equal(plan.baseTypeTop, 'legs');
  assert.equal(plan.H, 1.5 + 0.018);
});

test('build_flow_plan inputs force separate stack frames when decorative separator is enabled', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerHeightManual: true,
        stackSplitLowerDepth: 60,
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidth: 180,
        stackSplitLowerWidthManual: false,
      },
      stackSplitEnabled: true,
      stackSplitDecorativeSeparatorEnabled: true,
    } as any,
    cfg: {
      wardrobeType: 'hinged',
    } as any,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 3,
    toStr,
  });

  assert.equal(plan.splitActiveForBuild, true);
  assert.equal(plan.stackSplitDecorativeSeparatorEnabled, true);
  assert.equal(plan.stackSplitUnifiedFrame, false);
  assert.equal(plan.splitSeamGapM, 0.002);
  assert.equal(plan.baseTypeBottom, 'legs');
  assert.equal(plan.baseTypeTop, '');
});

test('build_flow_plan inputs use separate stack frames when top per-cell depth differs', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerHeightManual: true,
        stackSplitLowerDepth: 60,
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidth: 180,
        stackSplitLowerWidthManual: false,
      },
      stackSplitEnabled: true,
    } as any,
    cfg: {
      wardrobeType: 'hinged',
      modulesConfiguration: [
        {
          specialDims: {
            depthCm: 45,
            baseDepthCm: 60,
          },
        },
        {},
      ],
    } as any,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 3,
    toStr,
  });

  assert.equal(plan.splitActiveForBuild, true);
  assert.equal(plan.stackSplitUnifiedFrame, false);
  assert.equal(plan.splitSeamGapM, 0.002);
  assert.equal(plan.baseTypeBottom, 'legs');
  assert.equal(plan.baseTypeTop, '');
});

test('build_flow_plan inputs use separate stack frames when top per-cell height differs', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerHeightManual: true,
        stackSplitLowerDepth: 60,
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidth: 180,
        stackSplitLowerWidthManual: false,
      },
      stackSplitEnabled: true,
    } as any,
    cfg: {
      wardrobeType: 'hinged',
      modulesConfiguration: [
        {
          specialDims: {
            heightCm: 250,
            baseHeightCm: 240,
          },
        },
        {},
      ],
    } as any,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 3,
    toStr,
  });

  assert.equal(plan.splitActiveForBuild, true);
  assert.equal(plan.stackSplitUnifiedFrame, false);
  assert.equal(plan.splitSeamGapM, 0.002);
  assert.equal(plan.baseTypeBottom, 'legs');
  assert.equal(plan.baseTypeTop, '');
});

test('build_flow_plan inputs use separate stack frames when lower per-cell depth differs', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerHeightManual: true,
        stackSplitLowerDepth: 60,
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidth: 180,
        stackSplitLowerWidthManual: false,
      },
      stackSplitEnabled: true,
    } as any,
    cfg: {
      wardrobeType: 'hinged',
      stackSplitLowerModulesConfiguration: [
        {},
        {
          specialDims: {
            depthCm: 50,
            baseDepthCm: 60,
          },
        },
      ],
    } as any,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 3,
    toStr,
  });

  assert.equal(plan.splitActiveForBuild, true);
  assert.equal(plan.stackSplitUnifiedFrame, false);
  assert.equal(plan.splitSeamGapM, 0.002);
});

test('build_flow_plan inputs use separate stack frames when top module is hex cell', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerHeightManual: true,
        stackSplitLowerDepth: 60,
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidth: 180,
        stackSplitLowerWidthManual: false,
      },
      stackSplitEnabled: true,
    } as any,
    cfg: {
      wardrobeType: 'hinged',
      modulesConfiguration: [
        {
          hexCell: {
            enabled: true,
            protrusionCm: 10,
          },
        },
        {},
      ],
    } as any,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 3,
    toStr,
  });

  assert.equal(plan.splitActiveForBuild, true);
  assert.equal(plan.stackSplitUnifiedFrame, false);
  assert.equal(plan.splitSeamGapM, 0.002);
  assert.equal(plan.baseTypeTop, '');
});

test('build_flow_plan inputs use separate stack frames when lower module is hex cell', () => {
  const plan = resolveBuildFlowPlanInputs({
    ui: {
      baseType: 'legs',
      raw: {
        stackSplitLowerHeight: 90,
        stackSplitLowerHeightManual: true,
        stackSplitLowerDepth: 60,
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidth: 180,
        stackSplitLowerWidthManual: false,
      },
      stackSplitEnabled: true,
    } as any,
    cfg: {
      wardrobeType: 'hinged',
      stackSplitLowerModulesConfiguration: [
        {},
        {
          hexCell: {
            enabled: true,
            protrusionCm: 10,
          },
        },
      ],
    } as any,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 3,
    toStr,
  });

  assert.equal(plan.splitActiveForBuild, true);
  assert.equal(plan.stackSplitUnifiedFrame, false);
  assert.equal(plan.splitSeamGapM, 0.002);
  assert.equal(plan.baseTypeTop, '');
});

test('build_flow_plan layout filters moduleInternalWidths and keeps carcass depth at default in mixed manual-depth mode', () => {
  const layout = resolveBuildFlowPlanLayout({
    App: {} as any,
    state: {} as any,
    cfg: {} as any,
    ui: {} as any,
    totalW: 1.8,
    woodThick: 0.018,
    doorsCount: 3,
    calculateModuleStructureFn: null,
    splitActiveForBuild: false,
    lowerHeightCm: 0,
    H: 2.4,
    D: 0.6,
    computeModulesAndLayoutFn: () =>
      ({
        modules: [{ id: 'm1' }],
        moduleCfgList: [
          {
            specialDims: {
              heightCm: 260,
              baseHeightCm: 240,
              depthCm: 45,
              baseDepthCm: 60,
            },
          },
          {},
        ],
        singleUnitWidth: 0.9,
        moduleInternalWidths: [0.82, 'bad', Number.NaN, 0.79],
        hingedDoorPivotMap: { a: 1 },
      }) as any,
  });

  assert.deepEqual(layout.moduleInternalWidths, [0.82, 0.79]);
  assert.deepEqual(layout.moduleHeightsTotal, [2.6, 2.4]);
  assert.equal(layout.carcassH, 2.6);
  assert.deepEqual(layout.moduleDepthsTotal, [0.45, 0.6]);
  assert.equal(layout.carcassD, 0.6);
});

test('build_flow_plan layout expands the outer carcass to the full height for unified stack split frames', () => {
  const layout = resolveBuildFlowPlanLayout({
    App: {} as any,
    state: {} as any,
    cfg: {} as any,
    ui: {} as any,
    totalW: 1.8,
    woodThick: 0.018,
    doorsCount: 3,
    calculateModuleStructureFn: null,
    splitActiveForBuild: true,
    stackSplitUnifiedFrame: true,
    lowerHeightCm: 90,
    H: 1.518,
    D: 0.6,
    computeModulesAndLayoutFn: () =>
      ({
        modules: [{ id: 'm1' }],
        moduleCfgList: [{}],
        singleUnitWidth: 0.6,
        moduleInternalWidths: [0.56],
        hingedDoorPivotMap: {},
      }) as any,
  });

  assert.equal(layout.moduleHeightsTotal[0], 1.518);
  assert.ok(Math.abs(layout.carcassH - 2.4) < 1e-9);
});

test('build_flow_plan inputs resolve frame and shelf thickness per active hinged door construction', () => {
  const insetPlan = resolveBuildFlowPlanInputs({
    ui: {} as any,
    cfg: { wardrobeType: 'hinged', doorMountMode: 'inset' } as any,
    widthCm: 120,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 2,
    toStr,
  });
  const overlayPlan = resolveBuildFlowPlanInputs({
    ui: {} as any,
    cfg: { wardrobeType: 'hinged', doorMountMode: 'overlay' } as any,
    widthCm: 120,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 2,
    toStr,
  });
  const slidingPlan = resolveBuildFlowPlanInputs({
    ui: {} as any,
    cfg: { wardrobeType: 'sliding', doorMountMode: 'inset' } as any,
    widthCm: 120,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 2,
    toStr,
  });
  const slidingCustomPlan = resolveBuildFlowPlanInputs({
    ui: {} as any,
    cfg: {
      wardrobeType: 'sliding',
      doorMountMode: 'inset',
      overlayFrameThicknessCm: 2.4,
      overlayShelfThicknessCm: 1.2,
      insetFrameThicknessCm: 4.2,
      insetShelfThicknessCm: 2.1,
    } as any,
    widthCm: 120,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 2,
    toStr,
  });
  const overlayCustomPlan = resolveBuildFlowPlanInputs({
    ui: {} as any,
    cfg: {
      wardrobeType: 'hinged',
      doorMountMode: 'overlay',
      overlayFrameThicknessCm: 2.4,
      overlayShelfThicknessCm: 1.2,
      insetFrameThicknessCm: 4.2,
      insetShelfThicknessCm: 2.1,
    } as any,
    widthCm: 120,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 2,
    toStr,
  });
  const insetCustomPlan = resolveBuildFlowPlanInputs({
    ui: {} as any,
    cfg: {
      wardrobeType: 'hinged',
      doorMountMode: 'inset',
      overlayFrameThicknessCm: 2.4,
      overlayShelfThicknessCm: 1.2,
      insetFrameThicknessCm: 4.2,
      insetShelfThicknessCm: 2.1,
    } as any,
    widthCm: 120,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 2,
    toStr,
  });

  assertApproximatelyEqual(insetPlan.woodThick, 0.036);
  assertApproximatelyEqual(insetPlan.shelfThick, 0.036);
  assertApproximatelyEqual(overlayPlan.woodThick, 0.018);
  assertApproximatelyEqual(overlayPlan.shelfThick, 0.018);
  assertApproximatelyEqual(slidingPlan.woodThick, 0.018);
  assertApproximatelyEqual(slidingPlan.shelfThick, 0.018);
  assertApproximatelyEqual(slidingCustomPlan.woodThick, 0.024);
  assertApproximatelyEqual(slidingCustomPlan.shelfThick, 0.012);
  assertApproximatelyEqual(overlayCustomPlan.woodThick, 0.024);
  assertApproximatelyEqual(overlayCustomPlan.shelfThick, 0.012);
  assertApproximatelyEqual(insetCustomPlan.woodThick, 0.042);
  assertApproximatelyEqual(insetCustomPlan.shelfThick, 0.021);
});
