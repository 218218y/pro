import test from 'node:test';
import assert from 'node:assert/strict';

import { pickChestModeUi } from '../esm/native/builder/build_wardrobe_flow_context_ui.ts';
import { prepareBuildWardrobeContextSetup } from '../esm/native/builder/build_wardrobe_flow_context_setup.ts';
import { resolveBuildWardrobeContextReaders } from '../esm/native/builder/build_wardrobe_flow_context_readers.ts';
import { resolveBuildWardrobeSplitMetrics } from '../esm/native/builder/build_wardrobe_flow_context_split.ts';
import {
  computeBuildWardrobeSplitLineY,
  resolveBuildWardrobeCarcassMetrics,
} from '../esm/native/builder/build_wardrobe_flow_context_carcass.ts';
import { resolveBuildWardrobeHingedContext } from '../esm/native/builder/build_wardrobe_flow_context_hinged.ts';
import { bindDoorVisualRenderPolicy } from '../esm/native/builder/door_visual_render_policy.ts';
import {
  DEFAULT_BASE_LEG_HEIGHT_CM,
  getDefaultBaseLegWidthCm,
  normalizeBaseLegStyle,
} from '../esm/native/features/base_leg_support.ts';
import { DEFAULT_BASE_PLINTH_HEIGHT_CM } from '../esm/native/features/base_plinth_support.ts';
import {
  DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM,
  DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM,
} from '../esm/native/features/platform_overhang_support.ts';

test('build wardrobe context runtime: chest ui sanitizer keeps only canonical fields', () => {
  assert.equal(pickChestModeUi(null), null);

  const defaultBaseLegStyle = normalizeBaseLegStyle(undefined);
  assert.deepEqual(
    pickChestModeUi({
      isChestMode: true,
      baseType: 'legs',
      colorChoice: 'oak',
      customColor: '#fff',
      raw: {
        chestCommodeMirrorHeightCm: '88.5',
      },
      chestCommodeMirrorWidthCm: '91.25',
      extra: 123,
    }),
    {
      isChestMode: true,
      baseType: 'legs',
      baseLegPlatformSideOverhangCm: DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM,
      baseLegPlatformFrontOverhangCm: DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM,
      basePlinthHeightCm: DEFAULT_BASE_PLINTH_HEIGHT_CM,
      baseLegHeightCm: DEFAULT_BASE_LEG_HEIGHT_CM,
      baseLegWidthCm: getDefaultBaseLegWidthCm(defaultBaseLegStyle),
      colorChoice: 'oak',
      customColor: '#fff',
      chestCommodeMirrorHeightCm: 88.5,
      chestCommodeMirrorWidthCm: 91.25,
    }
  );
});

test('build wardrobe context runtime: chest-only path forwards the canonical cfg snapshot', () => {
  const cfgSnapshot = { showDimensions: false, doorMountMode: 'inset' };
  const calls: any[] = [];
  const addOutlines = () => undefined;
  const renderPolicy = { sketchMode: false, addOutlines };
  const App: any = {
    services: {
      builder: {
        handles: {
          applyHandles(opts?: unknown) {
            calls.push(['handles', opts ?? null]);
          },
        },
        registry: {
          reset() {
            calls.push('registry.reset');
          },
          finalize() {
            calls.push('registry.finalize');
          },
        },
      },
    },
    render: {
      wardrobeGroup: { children: [] },
      renderer: {
        render() {
          calls.push('viewport.render');
        },
      },
      scene: {},
      camera: {},
      controls: {
        update() {
          calls.push('controls.update');
        },
      },
    },
  };

  const result = prepareBuildWardrobeContextSetup({
    App,
    label: 'unit',
    deps: {
      cleanGroup(group: any) {
        group.children = [];
        calls.push('cleanGroup');
      },
      getNotesForSave() {
        return [];
      },
      calculateModuleStructure() {
        return [];
      },
      getMaterial() {
        return null;
      },
      createOutlineBinding() {
        return () => undefined;
      },
      buildChestOnly(args: any) {
        calls.push(['buildChestOnly', args]);
      },
    },
    buildState: {
      state: { config: cfgSnapshot },
      ui: {
        isChestMode: true,
        baseType: 'legs',
        colorChoice: 'white',
        customColor: '',
      },
      runtime: {},
      globalClickMode: true,
      hadEditHold: false,
      cfgSnapshot,
    },
    widthCm: 100,
    heightCm: 120,
    depthCm: 50,
    doorsCount: 0,
    chestDrawersCount: 4,
    sketchMode: false,
    renderPolicy,
    createDoorVisual() {
      return {};
    },
  } as any);

  assert.equal(result, null);
  const buildCall = calls.find(call => Array.isArray(call) && call[0] === 'buildChestOnly');
  assert.ok(buildCall);
  assert.equal(buildCall[1].cfgSnapshot, cfgSnapshot);
  assert.equal(buildCall[1].renderPolicy.sketchMode, false);
  assert.deepEqual(calls.slice(-4), [
    ['handles', { triggerRender: false, cfgSnapshot, addOutlines, removeDoorsEnabled: false }],
    'viewport.render',
    'controls.update',
    'registry.finalize',
  ]);
});

test('build wardrobe context runtime: reader normalization keeps fallback getMaterial + sketch-only outlines', () => {
  const addOutlines = (mesh: unknown) => ({ wrapped: mesh });
  const readers = resolveBuildWardrobeContextReaders({
    label: 'unit',
    sketchMode: true,
    cfgSnapshot: {},
    calculateModuleStructure: null,
    getMaterial: null,
    addOutlines,
  });

  assert.equal(typeof readers.getMaterialFn, 'function');
  assert.equal(typeof readers.addOutlinesMesh, 'function');
  assert.throws(() => readers.getMaterialFn(null, 'body'), /Missing getMaterial \(unit\)/);

  const nonSketch = resolveBuildWardrobeContextReaders({
    label: 'unit',
    sketchMode: false,
    cfgSnapshot: {},
    calculateModuleStructure: null,
    getMaterial: () => 'mat',
    addOutlines,
  });
  assert.equal(nonSketch.addOutlinesMesh, null);
  assert.equal(nonSketch.getMaterialFn(null, 'body'), 'mat');
});

test('build wardrobe context runtime: rapid rebuild door bindings retain their own snapshot policy', () => {
  const calls: any[] = [];
  const createDoorVisual = ((...args: unknown[]) => {
    calls.push(args);
    return { args };
  }) as any;
  const normalOutline = () => 'normal';
  const sketchOutline = () => 'sketch';
  const normalPolicy = { sketchMode: false, addOutlines: normalOutline };
  const sketchPolicy = { sketchMode: true, addOutlines: sketchOutline };
  const normalDoorVisual = bindDoorVisualRenderPolicy(createDoorVisual, normalPolicy);
  const sketchDoorVisual = bindDoorVisualRenderPolicy(createDoorVisual, sketchPolicy);

  normalDoorVisual(1, 2, 0.02, null, 'flat', false, false, null, null, 1, false, null, 'd1', {
    glassFrameStyle: 'profile',
  });
  sketchDoorVisual(1, 2, 0.02, null, 'flat', false, false, null, null, 1, false, null, 'd1');

  assert.equal(calls[0][13].glassFrameStyle, 'profile');
  assert.equal(calls[0][13].renderPolicy, normalPolicy);
  assert.equal(calls[1][13].renderPolicy, sketchPolicy);
  assert.equal(calls[0][13].renderPolicy.addOutlines, normalOutline);
  assert.equal(calls[1][13].renderPolicy.addOutlines, sketchOutline);
});

test('build wardrobe context runtime: split metrics skip runner when stack split is inactive', () => {
  let calls = 0;
  const metrics = resolveBuildWardrobeSplitMetrics({
    prepared: {} as any,
    plan: { splitActiveForBuild: false } as any,
    calculateModuleStructureFn: null,
    getMaterialFn: (() => null) as any,
    addOutlinesMesh: null,
    createHandleMesh: null,
    doorState: null,
    getHandleType: null,
    isDoorRemoved: () => false,
    isRemoveDoorMode: false,
    removeDoorsEnabled: false,
    notesToPreserve: null,
    runSplitBuild: (() => {
      calls += 1;
      return { splitY: 1, splitDzTop: 2, upperStartIndex: 3 } as any;
    }) as any,
  });

  assert.deepEqual(metrics, {
    splitY: 0,
    splitDzTop: 0,
    splitUpperStartIndex: -1,
  });
  assert.equal(calls, 0);
});

test('build wardrobe context runtime: carcass metrics compute split line from shortcut and injected carcass runner', () => {
  assert.ok(
    Math.abs(
      computeBuildWardrobeSplitLineY({
        startY: 0.1,
        cabinetBodyHeight: 2.2,
        woodThick: 0.02,
      }) - 1.56
    ) < 1e-9
  );

  const noMain = resolveBuildWardrobeCarcassMetrics({
    App: {},
    THREE: {},
    cfg: {},
    plan: {
      noMainWardrobe: true,
      carcassH: 2.4,
      woodThick: 0.02,
    } as any,
    sketchMode: false,
    addOutlinesMesh: null,
  });

  assert.deepEqual(noMain, {
    startY: 0,
    cabinetBodyHeight: 2.4,
    cabinetTopY: 2.4,
    splitLineY: computeBuildWardrobeSplitLineY({
      startY: 0,
      cabinetBodyHeight: 2.4,
      woodThick: 0.02,
    }),
  });

  const injected = resolveBuildWardrobeCarcassMetrics({
    App: {},
    THREE: {},
    cfg: {},
    plan: {
      noMainWardrobe: false,
      carcassH: 2.4,
      woodThick: 0.02,
      totalW: 1.8,
      carcassD: 0.6,
      baseTypeTop: 'legs',
      doorsCount: 3,
      hasCornice: false,
      corniceType: 'flat',
      moduleInternalWidths: [],
      moduleHeightsTotal: [],
      moduleDepthsTotal: [],
      legMat: null,
      masoniteMat: null,
      whiteMat: null,
      bodyMat: null,
      getPartColorValue: null,
      getPartMaterial: null,
    } as any,
    sketchMode: true,
    addOutlinesMesh: null,
    applyCarcassAndGetCabinetMetricsFn: (() => ({
      startY: 0.25,
      cabinetBodyHeight: 2,
      cabinetTopY: 2.25,
    })) as any,
  });

  assert.equal(injected.startY, 0.25);
  assert.equal(injected.cabinetBodyHeight, 2);
  assert.equal(injected.cabinetTopY, 2.25);
  assert.equal(
    injected.splitLineY,
    computeBuildWardrobeSplitLineY({ startY: 0.25, cabinetBodyHeight: 2, woodThick: 0.02 })
  );
});

test('build wardrobe context runtime: unified stack split renders one full carcass with a shared divider board', () => {
  let receivedArgs: any = null;
  const metrics = resolveBuildWardrobeCarcassMetrics({
    App: {},
    THREE: {},
    cfg: {},
    plan: {
      noMainWardrobe: false,
      stackSplitUnifiedFrame: true,
      lowerHeightCm: 90,
      carcassH: 2.4,
      woodThick: 0.018,
      totalW: 1.8,
      carcassD: 0.6,
      baseTypeTop: 'legs',
      doorsCount: 3,
      hasCornice: false,
      corniceType: 'flat',
      moduleInternalWidths: [0.58, 0.58, 0.58],
      moduleHeightsTotal: [1.518, 1.518, 1.518],
      moduleDepthsTotal: [0.6, 0.6, 0.6],
      moduleCfgList: [{}, {}, {}],
      legMat: null,
      masoniteMat: null,
      whiteMat: null,
      bodyMat: null,
      getPartColorValue: null,
      getPartMaterial: null,
    } as any,
    sketchMode: false,
    addOutlinesMesh: null,
    applyCarcassAndGetCabinetMetricsFn: ((args: any) => {
      receivedArgs = args;
      return {
        startY: 0.12,
        cabinetBodyHeight: 2.28,
        cabinetTopY: 2.4,
      };
    }) as any,
  });

  assert.equal(metrics.cabinetTopY, 2.4);
  assert.equal(receivedArgs.H, 2.4);
  assert.equal(receivedArgs.baseType, 'legs');
  assert.equal(receivedArgs.stackSplitDividerY, 0.9);
  assert.equal(receivedArgs.moduleHeightsTotal, null);
});

test('build wardrobe context runtime: hinged context throws on missing ops and lifts global handle for tall drawers', () => {
  assert.throws(
    () =>
      resolveBuildWardrobeHingedContext({
        App: {},
        cfg: { wardrobeType: 'hinged' },
        plan: { noMainWardrobe: false } as any,
        startY: 0,
        splitY: 0,
        getBuilderRenderOpsFn: () => null,
      }),
    /Hinged door ops missing/
  );

  const hinged = resolveBuildWardrobeHingedContext({
    App: { services: { builder: { renderOps: { applyHingedDoorsOps() {} } } } },
    cfg: {
      wardrobeType: 'hinged',
      globalHandleType: 'edge',
      handlesMap: { __wp_edge_handle_variant_global: 'long' },
    },
    plan: {
      noMainWardrobe: false,
      splitActiveForBuild: true,
      woodThick: 0.02,
      moduleCfgList: [{ extDrawersCount: 4 }],
    } as any,
    startY: 0.8,
    splitY: 0.1,
  });

  assert.equal(hinged.useHingedDoorOps, true);
  assert.deepEqual(hinged.hingedDoorOpsList, []);
  assert.ok(Math.abs(hinged.globalHingedHandleAbsY - (1.8 + 0.15 + 0.1)) < 1e-9);
});
