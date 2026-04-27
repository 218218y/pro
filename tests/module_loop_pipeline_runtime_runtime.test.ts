import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveModuleLoopRuntime } from '../esm/native/builder/module_loop_pipeline_runtime.ts';
import { resolveModuleLoopRuntimeBase } from '../esm/native/builder/module_loop_pipeline_runtime_base.ts';
import { resolveModuleLoopRuntimeResolvers } from '../esm/native/builder/module_loop_pipeline_runtime_resolvers.ts';

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

test('module loop runtime resolvers fail fast when createBoard is missing', () => {
  const ctx = createCtx({
    create: {
      createBoard: undefined,
    },
  });

  assert.throws(() => resolveModuleLoopRuntimeResolvers(ctx), /\[builder\/module_loop\] Missing createBoard/);
});
