import test from 'node:test';
import assert from 'node:assert/strict';

import { pickChestModeUi } from '../esm/native/builder/build_wardrobe_flow_context_ui.ts';
import { resolveBuildWardrobeContextReaders } from '../esm/native/builder/build_wardrobe_flow_context_readers.ts';
import { resolveBuildWardrobeSplitMetrics } from '../esm/native/builder/build_wardrobe_flow_context_split.ts';
import {
  computeBuildWardrobeSplitLineY,
  resolveBuildWardrobeCarcassMetrics,
} from '../esm/native/builder/build_wardrobe_flow_context_carcass.ts';
import { resolveBuildWardrobeHingedContext } from '../esm/native/builder/build_wardrobe_flow_context_hinged.ts';

test('build wardrobe context runtime: chest ui sanitizer keeps only canonical fields', () => {
  assert.equal(pickChestModeUi(null), null);
  assert.deepEqual(
    pickChestModeUi({
      isChestMode: true,
      baseType: 'legs',
      colorChoice: 'oak',
      customColor: '#fff',
      extra: 123,
    }),
    {
      isChestMode: true,
      baseType: 'legs',
      colorChoice: 'oak',
      customColor: '#fff',
    }
  );
});

test('build wardrobe context runtime: reader normalization keeps fallback getMaterial + sketch-only outlines', () => {
  const addOutlines = (mesh: unknown) => ({ wrapped: mesh });
  const readers = resolveBuildWardrobeContextReaders({
    label: 'unit',
    sketchMode: true,
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
    calculateModuleStructure: null,
    getMaterial: () => 'mat',
    addOutlines,
  });
  assert.equal(nonSketch.addOutlinesMesh, null);
  assert.equal(nonSketch.getMaterialFn(null, 'body'), 'mat');
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
