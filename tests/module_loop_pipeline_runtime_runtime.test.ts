import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveModuleLoopRuntime } from '../esm/native/builder/module_loop_pipeline_runtime.ts';
import { resolveModuleFrame } from '../esm/native/builder/module_loop_pipeline_module_frame.ts';
import { resolveModuleLoopRuntimeBase } from '../esm/native/builder/module_loop_pipeline_runtime_base.ts';
import { resolveModuleLoopRuntimeResolvers } from '../esm/native/builder/module_loop_pipeline_runtime_resolvers.ts';
import { createInterDivider } from '../esm/native/builder/module_loop_pipeline_module_dividers.ts';
import { resolveModuleDepthProfile } from '../esm/native/builder/module_loop_pipeline_module_depth.ts';
import { computeModulesAndLayout } from '../esm/native/builder/module_layout_pipeline.ts';
import { asModuleList, asNumberList } from '../esm/native/builder/module_loop_pipeline_shared.ts';

function closeTo(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} !== ${expected}`);
}

function createApp() {
  return {
    deps: {
      THREE: {
        Group: class Group {},
        Mesh: class Mesh {},
      },
    },
    services: {},
  } as any;
}

function createDoorState() {
  return {
    getHingeDir: (_key: string, fallback: 'left' | 'right') => fallback,
    isDoorSplit: () => false,
    isDoorSplitBottom: () => false,
    curtainVal: () => null,
    grooveVal: () => false,
  };
}

function createCtx(overrides: Record<string, unknown> = {}) {
  const base = {
    App: createApp(),
    cfg: {},
    ui: {},
    layout: {
      modules: [{ doors: 1 }, { doors: 1 }],
      moduleCfgList: [{}, {}],
      moduleInternalWidths: [0.82, 0.79],
      singleUnitWidth: 0.9,
      hingedDoorPivotMap: {
        1: { pivotX: 0.1, doorWidth: 0.5, isLeftHinge: true },
        2: { pivotX: 1.1, doorWidth: 0.4, isLeftHinge: false },
      },
    },
    dims: {
      totalW: 1.8,
      woodThick: 0.02,
      cabinetBodyHeight: 2.2,
      startY: 0.1,
      D: 0.6,
      H: 2.4,
      internalDepth: 0.56,
      internalZ: 0,
      defaultH: 2.4,
    },
    flags: {
      __wpStack: 'bottom',
      splitDoors: true,
      isGroovesEnabled: true,
      isInternalDrawersEnabled: true,
      showHangerEnabled: false,
      showContentsEnabled: true,
    },
    strings: {
      doorStyle: 'shaker',
    },
    resolvers: {
      doorState: createDoorState(),
      getPartMaterial: (partId: string) => ({ partId, material: 'wood' }),
      getPartColorValue: (partId: string) => `color:${partId}`,
      removeDoorsEnabled: 1,
      isDoorRemoved: (partId: string) => partId === 'gone',
    },
    create: {
      createBoard: (...args: unknown[]) => ({ args }),
      createDoorVisual: (...args: unknown[]) => ({ args }),
      createInternalDrawerBox: (...args: unknown[]) => ({ args }),
    },
    fns: {
      addOutlines: (mesh: unknown) => mesh,
      addRealisticHanger: () => null,
      addHangingClothes: () => null,
      addFoldedClothes: () => null,
    },
    materials: {
      bodyMat: { id: 'body' },
      globalFrontMat: { id: 'front' },
      shadowMat: { id: 'shadow' },
      legMat: { id: 'leg' },
    },
    hinged: {
      opsList: [{ id: 1 }],
      globalHandleAbsY: 1.25,
    },
  } as any;

  return {
    ...base,
    ...overrides,
    layout: {
      ...base.layout,
      ...(overrides.layout as any),
    },
    dims: {
      ...base.dims,
      ...(overrides.dims as any),
    },
    flags: {
      ...base.flags,
      ...(overrides.flags as any),
    },
    strings: {
      ...base.strings,
      ...(overrides.strings as any),
    },
    resolvers: {
      ...base.resolvers,
      ...(overrides.resolvers as any),
    },
    create: {
      ...base.create,
      ...(overrides.create as any),
    },
    fns: {
      ...base.fns,
      ...(overrides.fns as any),
    },
    materials: {
      ...base.materials,
      ...(overrides.materials as any),
    },
    hinged: {
      ...base.hinged,
      ...(overrides.hinged as any),
    },
  } as any;
}

test('module loop runtime resolves bottom-stack routing, bottom cache map, and pivot-based door spans', () => {
  const ctx = createCtx();
  const runtime = resolveModuleLoopRuntime(ctx);

  assert.equal(runtime.stackKey, 'bottom');
  assert.equal(runtime.drawerKeyPrefix, 'lower_');
  assert.equal(runtime.showContentsEnabled, true);
  assert.equal(runtime.removeDoorsEnabled, true);
  assert.equal(runtime.globalHandleAbsY, 1.25);
  assert.equal(runtime.internalGridMap, runtime.App.services.runtimeCache.internalGridMapSplitBottom);
  assert.deepEqual(runtime.getPartMaterial('p1'), { partId: 'p1', material: 'wood' });
  assert.equal(runtime.getPartColorValue?.('p2'), 'color:p2');

  const span = runtime.computeModuleDoorSpan(1, 2, 9, 9);
  assert.ok(Math.abs(span.spanW - 1) < 1e-9);
  assert.ok(Math.abs(span.centerX - 0.6) < 1e-9);
});

test('module loop runtime readers do not coerce string-encoded module numbers', () => {
  const modules = asModuleList([{ doors: '3' }, { doors: 2 }]);
  assert.equal(modules[0]?.doors, undefined);
  assert.equal(modules[1]?.doors, 2);
  assert.equal(asNumberList([0.82, '0.79']), null);
  assert.deepEqual(asNumberList([0.82, 0.79]), [0.82, 0.79]);

  const runtime = resolveModuleLoopRuntimeBase(
    createCtx({
      layout: {
        modules: [{ doors: '3' }],
        moduleCfgList: [{}],
        moduleInternalWidths: ['0.82'],
        singleUnitWidth: 0.25,
      },
    })
  );

  assert.equal(runtime.modules[0]?.doors, undefined);
  assert.equal(runtime.moduleInternalWidthsList, null);

  const frame = resolveModuleFrame(runtime, { currentX: 0, globalDoorCounter: 1 }, 0, '3');
  assert.equal(frame.modDoors, 1);
  assert.equal(frame.modWidth, 0.25);
});

test('module loop runtime base applies top-stack height offset when deriving custom module heights', () => {
  const ctx = createCtx({
    flags: {
      __wpStack: 'top',
      stackSplitActive: true,
      stackSplitLowerHeightCm: 60,
    },
    layout: {
      moduleCfgList: [
        {
          specialDims: {
            heightCm: 250,
            baseHeightCm: 240,
          },
        },
        {},
      ],
    },
  });

  const runtime = resolveModuleLoopRuntimeBase(ctx);
  assert.equal(runtime.stackKey, 'top');
  assert.equal(runtime.drawerKeyPrefix, '');
  assert.deepEqual(runtime.moduleIsCustom, [true, false]);
  assert.ok(Math.abs(runtime.moduleBodyHeights[0] - 1.8) < 1e-9);
  assert.ok(Math.abs(runtime.moduleBodyHeights[1] - 2.3) < 1e-9);
  assert.equal(runtime.internalGridMap, runtime.App.services.runtimeCache.internalGridMap);
});

test('module loop runtime base treats hex cells as custom boundary geometry without depth overrides', () => {
  const ctx = createCtx({
    layout: {
      modules: [{ doors: 2 }, { doors: 2 }, { doors: 2 }],
      moduleCfgList: [
        {},
        {
          hexCell: {
            enabled: true,
            protrusionCm: 10,
          },
        },
        {},
      ],
      moduleInternalWidths: [0.55, 0.55, 0.55],
      singleUnitWidth: 0.275,
    },
  });

  const runtime = resolveModuleLoopRuntimeBase(ctx);

  assert.deepEqual(runtime.moduleIsCustom, [false, true, false]);
});

test('module loop runtime keeps hex-cell divider placement aligned with compensated door pivots', () => {
  const modules = [{ doors: 2 }, { doors: 2 }, { doors: 2 }];
  const moduleCfgList = [
    {},
    {
      hexCell: {
        enabled: true,
        protrusionCm: 10,
      },
    },
    {},
  ];
  const App = createApp();
  const totalW = 3;
  const woodThick = 0.018;
  const depthM = 0.6;
  const layout = computeModulesAndLayout({
    App,
    state: { build: { modulesStructure: modules } } as any,
    cfg: {
      wardrobeType: 'hinged',
      modulesConfiguration: moduleCfgList,
    } as any,
    ui: {} as any,
    totalW,
    woodThick,
    doorsCount: 6,
  });
  const ctx = createCtx({
    App,
    cfg: { wardrobeType: 'hinged', modulesConfiguration: moduleCfgList },
    layout,
    dims: {
      totalW,
      woodThick,
      cabinetBodyHeight: 2.4,
      startY: 0,
      D: depthM,
      H: 2.4,
      internalDepth: 0.57,
      internalZ: 0,
      defaultH: 2.4,
    },
  });
  const baseRuntime = resolveModuleLoopRuntimeBase(ctx);
  const calls: unknown[][] = [];
  const runtime = {
    ...baseRuntime,
    createBoard: (...args: unknown[]) => {
      calls.push(args);
      return { args };
    },
    getPartMaterial: (partId: string) => ({ partId }),
  } as any;
  const middleIndex = 1;
  const firstX = -totalW / 2 + woodThick;
  const middleX = firstX + Number(layout.moduleInternalWidths?.[0]) + woodThick;
  const middleDepth = resolveModuleDepthProfile(runtime, layout.moduleCfgList[middleIndex]);
  const frame = {
    modWidth: Number(layout.moduleInternalWidths?.[middleIndex]),
    ...middleDepth,
  } as any;

  createInterDivider(runtime, { currentX: middleX } as any, middleIndex, frame);

  const rightDivider = calls.find(call => call[7] === 'divider_inter_fullR_1');
  assert.ok(rightDivider, 'right cell should receive its own full-depth wall next to a hex cell');

  const rightFirstDoor = (layout.hingedDoorPivotMap as any)?.[5];
  assert.ok(rightFirstDoor, 'six-door layout should have a first right-cell door pivot');
  closeTo(
    Number(rightDivider[3]),
    Number(rightFirstDoor.doorLeftEdge),
    'right-cell wall center should align with the compensated left door edge'
  );
  closeTo(
    Number(rightDivider[5]) + Number(rightDivider[2]) / 2,
    depthM / 2,
    'right-cell full-depth wall should reach the door plane'
  );
});

test('module loop runtime resolvers fail fast when createBoard is missing', () => {
  const ctx = createCtx({
    create: {
      createBoard: undefined,
    },
  });

  assert.throws(() => resolveModuleLoopRuntimeResolvers(ctx), /\[builder\/module_loop\] Missing createBoard/);
});

test('module loop runtime resolvers preserve explicit content snapshots and hanger flags', () => {
  const foldedCalls: unknown[][] = [];
  const hangerCalls: unknown[][] = [];
  const hangingClothesCalls: unknown[][] = [];
  const ctx = createCtx({
    fns: {
      addFoldedClothes: (...args: unknown[]) => foldedCalls.push(args),
      addRealisticHanger: (...args: unknown[]) => hangerCalls.push(args),
      addHangingClothes: (...args: unknown[]) => hangingClothesCalls.push(args),
    },
  });
  const runtime = resolveModuleLoopRuntimeResolvers(ctx);
  const parentGroup = {} as any;
  const contentsPolicy = {
    showContentsEnabled: true,
    sketchMode: false,
    addOutlines: null,
    cfgSnapshot: { isLibraryMode: true },
  };
  const hangingPolicy = {
    showContentsEnabled: true,
    doorStyle: 'profile',
    sketchMode: false,
    addOutlines: null,
  };
  const hangerPolicy = { showHangerEnabled: false, sketchMode: false, addOutlines: null };

  runtime.addFoldedClothes?.(1, 2, 3, 4, parentGroup, 5, 6, contentsPolicy);
  runtime.addRealisticHanger?.(1, 2, 3, parentGroup, 4, hangerPolicy);
  runtime.addHangingClothes?.(1, 2, 3, 4, parentGroup, 5, 6, hangingPolicy);

  assert.equal(foldedCalls[0]?.[7], contentsPolicy);
  assert.equal(hangerCalls[0]?.[5], hangerPolicy);
  assert.equal(hangingClothesCalls[0]?.[7], hangingPolicy);
});
