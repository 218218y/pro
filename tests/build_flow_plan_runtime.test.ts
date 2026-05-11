import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBuildFlowPlanInputs } from '../esm/native/builder/build_flow_plan_inputs.ts';
import { resolveBuildFlowPlanLayout } from '../esm/native/builder/build_flow_plan_layout.ts';

const toStr = (value: unknown, fallback = ''): string => (value == null ? fallback : String(value));

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
  assert.equal(plan.lowerHeightCm, 90);
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
