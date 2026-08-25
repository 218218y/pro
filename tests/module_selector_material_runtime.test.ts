import test from 'node:test';
import assert from 'node:assert/strict';

import { getModuleSelectorMaterial } from '../esm/native/builder/module_selector_material.ts';
import { createBuilderRenderPrimitiveOps } from '../esm/native/builder/render_ops_primitives.ts';
import { applyCornerWingCarcassSelectors } from '../esm/native/builder/corner_wing_carcass_selectors.ts';
import { appendCornerConnectorCorniceHitArea } from '../esm/native/builder/corner_connector_cornice_shared.ts';
import { ensureRenderCacheMaps } from '../esm/native/runtime/render_access.ts';
import { cleanGroup } from '../esm/native/platform/three_cleanup.ts';
import { installCachePruning } from '../esm/native/platform/cache_pruning.ts';
import { pruneCachesSafe } from '../esm/native/platform/cache_pruning_runtime.ts';

type AnyRecord = Record<string, any>;

class FakeMaterial {
  userData: AnyRecord = {};
  depthWrite = true;
  colorWrite = true;
  side: unknown = null;
  disposeCount = 0;

  constructor(public params: AnyRecord = {}) {
    if ('depthWrite' in params) this.depthWrite = Boolean(params.depthWrite);
    if ('side' in params) this.side = params.side;
  }

  dispose(): void {
    this.disposeCount += 1;
  }
}

class FakeGeometry {
  disposeCount = 0;
  constructor(public args: number[] = []) {}
  dispose(): void {
    this.disposeCount += 1;
  }
}

class FakeMesh {
  userData: AnyRecord = {};
  renderOrder = 0;
  children: FakeMesh[] = [];
  position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
    },
  };

  constructor(
    public geometry: FakeGeometry,
    public material: FakeMaterial
  ) {}
}

class FakeGroup {
  children: FakeMesh[] = [];
  add(obj: FakeMesh): void {
    this.children.push(obj);
  }
  remove(obj: FakeMesh): void {
    const index = this.children.indexOf(obj);
    if (index >= 0) this.children.splice(index, 1);
  }
}

const FakeTHREE = {
  Mesh: FakeMesh,
  BoxGeometry: class extends FakeGeometry {
    constructor(width: number, height: number, depth: number) {
      super([width, height, depth]);
    }
  },
  MeshBasicMaterial: FakeMaterial,
  DoubleSide: 'double-side',
};

function createApp(): AnyRecord {
  return {
    services: { builder: {} },
    render: { cache: {}, meta: {} },
    platform: { util: {} },
  };
}

function createStandardMaterial(): FakeMaterial {
  return new FakeMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: FakeTHREE.DoubleSide,
  });
}

function createPickingOnlyMaterial(): FakeMaterial {
  const material = new FakeMaterial({ transparent: true, opacity: 0 });
  material.depthWrite = false;
  material.colorWrite = false;
  material.side = FakeTHREE.DoubleSide;
  return material;
}

test('[module-selector-material] material lifetime is App-owned, variant-scoped, and isolated across Apps', () => {
  const AppA = createApp();
  const AppB = createApp();
  let createCount = 0;

  const first = getModuleSelectorMaterial(AppA, 'standard', () => {
    createCount += 1;
    return createStandardMaterial();
  });
  first.userData.ownerProbe = 'preserved';
  const second = getModuleSelectorMaterial(AppA, 'standard', () => {
    createCount += 1;
    return createStandardMaterial();
  });
  const pickingOnly = getModuleSelectorMaterial(AppA, 'picking-only', createPickingOnlyMaterial);
  const otherApp = getModuleSelectorMaterial(AppB, 'standard', createStandardMaterial);

  assert.equal(second, first);
  assert.equal(createCount, 1);
  assert.notEqual(pickingOnly, first);
  assert.notEqual(otherApp, first);
  assert.equal(first.userData.isCached, true);
  assert.equal(first.userData.ownerProbe, 'preserved');
  assert.equal(first.userData.__wpModuleSelectorMaterialVariant, 'standard');
  assert.equal(first.userData.__wpModuleSelectorMaterialCacheKey, 'module-selector:standard:v1');
  assert.equal(pickingOnly.userData.isCached, true);
  assert.equal(pickingOnly.userData.__wpModuleSelectorMaterialVariant, 'picking-only');
  assert.equal(pickingOnly.colorWrite, false);
});

test('[module-selector-material] cache hit heals lifetime metadata without replacing existing userData', () => {
  const App = createApp();
  const legacyUserData = { ownerProbe: 'legacy' };
  const legacyMaterial = createStandardMaterial();
  legacyMaterial.userData = legacyUserData;
  ensureRenderCacheMaps(App).materialCache.set('module-selector:standard:v1', legacyMaterial);

  const resolved = getModuleSelectorMaterial(App, 'standard', () => {
    throw new Error('legacy cache entry should be reused');
  });

  assert.equal(resolved, legacyMaterial);
  assert.equal(resolved.userData, legacyUserData);
  assert.equal(resolved.userData.ownerProbe, 'legacy');
  assert.equal(resolved.userData.isCached, true);
});

test('[module-selector-material] lifetime marker failure is fatal instead of returning an unsafe cached material', () => {
  const App = createApp();
  const legacyMaterial = createStandardMaterial();
  legacyMaterial.userData = Object.freeze({ ownerProbe: 'frozen' }) as AnyRecord;
  ensureRenderCacheMaps(App).materialCache.set('module-selector:standard:v1', legacyMaterial);

  assert.throws(
    () =>
      getModuleSelectorMaterial(App, 'standard', () => {
        throw new Error('frozen cache entry should be reused before lifetime validation');
      }),
    TypeError
  );
});

test('[module-selector-material] cleanGroup cannot dispose a shared selector material and rebuild reuses it', () => {
  const App = createApp();
  const material = getModuleSelectorMaterial(App, 'standard', createStandardMaterial);
  const group = new FakeGroup();
  group.add(new FakeMesh(new FakeGeometry(), material));
  group.add(new FakeMesh(new FakeGeometry(), material));

  cleanGroup(group);

  assert.equal(group.children.length, 0);
  assert.equal(material.disposeCount, 0);
  const rebuilt = getModuleSelectorMaterial(App, 'standard', createStandardMaterial);
  assert.equal(rebuilt, material);
  assert.equal(rebuilt.disposeCount, 0);
});

test('[module-selector-material] canonical pruning evicts unused selectors but retains a live selector', () => {
  const unusedApp = createApp();
  const unused = getModuleSelectorMaterial(unusedApp, 'standard', createStandardMaterial);
  installCachePruning(unusedApp as never);
  unusedApp.platform.util.cacheLimits = { textures: 0, materials: 0, dimLabels: 0, edges: 0, geometries: 0 };
  pruneCachesSafe(unusedApp as never, { traverse() {} });
  assert.equal(ensureRenderCacheMaps(unusedApp).materialCache.has('module-selector:standard:v1'), false);
  assert.equal(unused.disposeCount, 1);

  const liveApp = createApp();
  const live = getModuleSelectorMaterial(liveApp, 'standard', createStandardMaterial);
  installCachePruning(liveApp as never);
  liveApp.platform.util.cacheLimits = { textures: 0, materials: 0, dimLabels: 0, edges: 0, geometries: 0 };
  pruneCachesSafe(liveApp as never, {
    traverse(visitor: (node: AnyRecord) => void) {
      visitor({ material: live });
    },
  });
  assert.equal(ensureRenderCacheMaps(liveApp).materialCache.get('module-selector:standard:v1'), live);
  assert.equal(live.disposeCount, 0);
});

test('[module-selector-material] main module hitboxes share the canonical standard material', () => {
  const App = createApp();
  const group = new FakeGroup();
  const ops = createBuilderRenderPrimitiveOps({
    __app: () => App as never,
    __ops: () => ({}),
    __commonArgs: value => value as never,
    __handleMeshOpts: value => value as never,
    __boardArgs: value => value as never,
    __moduleHitBoxArgs: value => value as never,
    __drawerShadowPlaneArgs: value => value as never,
    __number: (value, defaultValue = 0) => (Number.isFinite(Number(value)) ? Number(value) : defaultValue),
    __isFn: (value): value is (...args: readonly unknown[]) => unknown => typeof value === 'function',
    __wardrobeGroup: () => group as never,
    __matCache: () => ({}),
  });

  const first = ops.createModuleHitBox({
    App,
    THREE: FakeTHREE as never,
    modWidth: 1,
    cabinetBodyHeight: 2,
    D: 0.6,
    x: 0,
    y: 1,
    z: 0,
    moduleIndex: 0,
    __wpStack: 'top',
  }) as FakeMesh;
  const second = ops.createModuleHitBox({
    App,
    THREE: FakeTHREE as never,
    modWidth: 1,
    cabinetBodyHeight: 2,
    D: 0.6,
    x: 1,
    y: 1,
    z: 0,
    moduleIndex: 1,
    __wpStack: 'top',
  }) as FakeMesh;

  assert.equal(first.material, second.material);
  assert.equal(first.material.userData.isCached, true);
  assert.equal(first.material.userData.__wpModuleSelectorMaterialVariant, 'standard');
  assert.equal(first.material.params.transparent, true);
  assert.equal(first.material.params.opacity, 0);
  assert.equal(first.material.depthWrite, false);
  assert.equal(first.material.side, FakeTHREE.DoubleSide);
});

test('[module-selector-material] corner wing and connector selectors share the canonical picking-only material', () => {
  const App = createApp();
  const wingGroup = new FakeGroup();
  const internalGrid: AnyRecord = {};
  const cornerCells = [
    {
      key: 'corner:0',
      width: 0.5,
      centerX: 0.25,
      bodyHeight: 2,
      depth: 0.55,
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.1,
      gridDivisions: 20,
    },
    {
      key: 'corner:1',
      width: 0.5,
      centerX: 0.75,
      bodyHeight: 2,
      depth: 0.55,
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.1,
      gridDivisions: 20,
    },
  ];

  applyCornerWingCarcassSelectors({
    ctx: {
      THREE: FakeTHREE,
      woodThick: 0.018,
      startY: 0,
      wingD: 0.6,
      activeWidth: 1,
      cabinetBodyHeight: 2,
      __stackKey: 'top',
      wingGroup,
    },
    locals: { App, cornerCells, activeFaceCenter: 0.5 },
    helpers: { getInternalGridMap: () => internalGrid },
  } as never);

  assert.equal(wingGroup.children.length, 2);
  assert.equal(wingGroup.children[0]?.material, wingGroup.children[1]?.material);
  const pickingMaterial = wingGroup.children[0]?.material;
  assert.equal(pickingMaterial?.userData.isCached, true);
  assert.equal(pickingMaterial?.userData.__wpModuleSelectorMaterialVariant, 'picking-only');
  assert.equal(pickingMaterial?.depthWrite, false);
  assert.equal(pickingMaterial?.colorWrite, false);

  const connectorGroup = new FakeGroup();
  appendCornerConnectorCorniceHitArea({
    ctx: {
      App,
      THREE: FakeTHREE,
      startY: 0,
      wingH: 2,
      __stackKey: 'top',
    },
    locals: {
      mx: (x: number) => x,
      L: 0.6,
      cornerGroup: connectorGroup,
    },
  } as never);

  assert.equal(connectorGroup.children.length, 1);
  assert.equal(connectorGroup.children[0]?.material, pickingMaterial);
});
