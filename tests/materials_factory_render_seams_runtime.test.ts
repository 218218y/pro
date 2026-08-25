import test from 'node:test';
import assert from 'node:assert/strict';

import { getMaterial } from '../esm/native/builder/materials_factory.ts';
import { ensureRenderCacheMaps, ensureRenderMetaMaps } from '../esm/native/runtime/render_access.ts';
import { cleanGroup } from '../esm/native/platform/three_cleanup.ts';
import { installCachePruning } from '../esm/native/platform/cache_pruning.ts';
import { pruneCachesSafe } from '../esm/native/platform/cache_pruning_runtime.ts';

type AnyRecord = Record<string, unknown>;

function makeStore(runtime: AnyRecord, config: AnyRecord = {}) {
  return {
    getState() {
      return { runtime, config };
    },
    subscribe() {
      return () => undefined;
    },
  };
}

function makeThreeStub() {
  let textureIndex = 0;

  class Texture {
    uuid = `texture-${++textureIndex}`;
    repeat = {
      set(_x: number, _y: number) {},
    };
  }

  class MeshBasicMaterial {
    userData: AnyRecord = {};
    disposeCount = 0;
    constructor(public opts: AnyRecord) {}
    dispose() {
      this.disposeCount += 1;
    }
  }

  class MeshStandardMaterial {
    userData: AnyRecord = {};
    disposeCount = 0;
    constructor(public opts: AnyRecord) {}
    dispose() {
      this.disposeCount += 1;
    }
  }

  return {
    MeshBasicMaterial,
    MeshStandardMaterial,
    Texture,
    CanvasTexture: class extends Texture {
      constructor(public canvas: unknown) {
        super();
      }
    },
    RepeatWrapping: 'repeat',
  };
}

function makeLiveTexture(uuid: string) {
  return {
    uuid,
    repeat: {
      set(_x: number, _y: number) {},
    },
  };
}

function materialSnapshot(sketchMode: boolean, cfgSnapshot: AnyRecord = {}) {
  return { sketchMode, cfgSnapshot };
}

function withFakeImage(fn: () => void): void {
  type ImageHost = { Image?: unknown };
  const imageHost = globalThis as unknown as ImageHost;
  const previousImage = imageHost.Image;
  imageHost.Image = class FakeImage {
    onload: (() => void) | null = null;
    set src(_value: string) {
      this.onload?.();
    }
  };
  try {
    fn();
  } finally {
    if (typeof previousImage === 'undefined') delete imageHost.Image;
    else imageHost.Image = previousImage;
  }
}

test('materials_factory rejects calls without a material snapshot', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };

  assert.throws(
    () => getMaterial(App, '#ffffff', 'front', false, undefined, undefined as never),
    /materialSnapshot is required/
  );
});

test('materials_factory uses canonical render cache/meta service seams', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };

  const material = getMaterial(App, '#ffffff', 'front', false, undefined, materialSnapshot(true));
  assert.ok(material);

  const renderCache = ensureRenderCacheMaps(App);
  const renderMeta = ensureRenderMetaMaps(App);
  assert.equal(renderCache.materialCache instanceof Map, true);
  assert.equal(renderMeta.material instanceof Map, true);
  assert.equal(renderCache.materialCache.has('sketch_white'), true);
  assert.equal(renderMeta.material.has('sketch_white'), true);
});

test('materials_factory sketch material is App-owned, cached, and isolated across Apps', () => {
  const AppA: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };
  const AppB: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };

  const first = getMaterial(AppA, '#111111', 'front', false, undefined, materialSnapshot(true)) as AnyRecord;
  first.userData.ownerProbe = 'preserved';
  const second = getMaterial(AppA, '#222222', 'body', false, undefined, materialSnapshot(true)) as AnyRecord;
  const otherApp = getMaterial(
    AppB,
    '#111111',
    'front',
    false,
    undefined,
    materialSnapshot(true)
  ) as AnyRecord;

  assert.equal(second, first);
  assert.notEqual(otherApp, first);
  assert.equal((first.userData as AnyRecord).isCached, true);
  assert.equal((first.userData as AnyRecord).ownerProbe, 'preserved');
  assert.equal((first.opts as AnyRecord).color, 0xffffff);
});

test('materials_factory heals cached sketch lifetime metadata on cache hit without replacing userData', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };
  const legacyUserData: AnyRecord = { ownerProbe: 'legacy-cache-entry' };
  const legacyMaterial: AnyRecord = {
    userData: legacyUserData,
    opts: { color: 0xffffff },
    disposeCount: 0,
    dispose() {
      this.disposeCount += 1;
    },
  };
  ensureRenderCacheMaps(App).materialCache.set('sketch_white', legacyMaterial);

  const resolved = getMaterial(
    App,
    '#ffffff',
    'front',
    false,
    undefined,
    materialSnapshot(true)
  ) as AnyRecord;

  assert.equal(resolved, legacyMaterial);
  assert.equal(resolved.userData, legacyUserData);
  assert.equal((resolved.userData as AnyRecord).ownerProbe, 'legacy-cache-entry');
  assert.equal((resolved.userData as AnyRecord).isCached, true);
});

test('materials_factory fails fast when a cached material cannot accept its lifetime marker', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };
  const legacyMaterial: AnyRecord = {
    userData: Object.freeze({ ownerProbe: 'frozen-cache-entry' }),
    opts: { color: 0xffffff },
    dispose() {},
  };
  ensureRenderCacheMaps(App).materialCache.set('sketch_white', legacyMaterial);

  assert.throws(
    () => getMaterial(App, '#ffffff', 'front', false, undefined, materialSnapshot(true)),
    TypeError
  );
});

test('materials_factory sketch material survives cleanGroup and remains reusable after rebuild', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };
  const material = getMaterial(
    App,
    '#ffffff',
    'front',
    false,
    undefined,
    materialSnapshot(true)
  ) as AnyRecord;
  const children: AnyRecord[] = [
    { children: [], material, userData: {} },
    { children: [], material, userData: {} },
  ];
  const group = {
    children,
    remove(child: unknown) {
      const index = children.indexOf(child as AnyRecord);
      if (index >= 0) children.splice(index, 1);
    },
  };

  cleanGroup(group);

  assert.equal(material.disposeCount, 0);
  assert.equal(children.length, 0);
  const rebuilt = getMaterial(App, '#000000', 'metal', false, undefined, materialSnapshot(true)) as AnyRecord;
  assert.equal(rebuilt, material);
  assert.equal(rebuilt.disposeCount, 0);
});

test('materials_factory sketch material can be pruned when unused and is retained while live in scene', () => {
  const makeApp = () =>
    ({
      deps: { THREE: makeThreeStub() },
      store: makeStore({ sketchMode: true }),
    }) as AnyRecord;

  const unusedApp = makeApp();
  const unused = getMaterial(
    unusedApp,
    '#ffffff',
    'front',
    false,
    undefined,
    materialSnapshot(true)
  ) as AnyRecord;
  installCachePruning(unusedApp as never);
  unusedApp.platform.util.cacheLimits = { textures: 0, materials: 0, dimLabels: 0, edges: 0, geometries: 0 };
  pruneCachesSafe(unusedApp as never, { traverse() {} });
  assert.equal(ensureRenderCacheMaps(unusedApp).materialCache.has('sketch_white'), false);
  assert.equal(unused.disposeCount, 1);

  const liveApp = makeApp();
  const live = getMaterial(
    liveApp,
    '#ffffff',
    'front',
    false,
    undefined,
    materialSnapshot(true)
  ) as AnyRecord;
  installCachePruning(liveApp as never);
  liveApp.platform.util.cacheLimits = { textures: 0, materials: 0, dimLabels: 0, edges: 0, geometries: 0 };
  pruneCachesSafe(liveApp as never, {
    traverse(visitor: (node: AnyRecord) => void) {
      visitor({ material: live });
    },
  });
  assert.equal(ensureRenderCacheMaps(liveApp).materialCache.get('sketch_white'), live);
  assert.equal(live.disposeCount, 0);
});

test('materials_factory keeps front color albedo canonical instead of applying display compensation', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: false }),
  };

  const material = getMaterial(
    App,
    '#336699',
    'front',
    false,
    undefined,
    materialSnapshot(false)
  ) as AnyRecord;
  assert.equal((material.opts as AnyRecord).color, '#336699');
});

test('materials_factory uses snapshot sketch policy instead of live runtime state', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };

  const material = getMaterial(
    App,
    '#336699',
    'front',
    false,
    undefined,
    materialSnapshot(false)
  ) as AnyRecord;
  assert.equal((material.opts as AnyRecord).color, '#336699');
});

test('materials_factory resolves explicit texture data URL without falling back to stale live cache', () => {
  const staleTexture = makeLiveTexture('stale-live-cache');
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    services: { texturesCache: { customUploadedTexture: staleTexture } },
    store: makeStore({ sketchMode: false }, { customUploadedDataURL: 'data:config-texture' }),
  };

  withFakeImage(() => {
    const material = getMaterial(
      App,
      'custom',
      'front',
      true,
      'data:explicit-texture',
      materialSnapshot(false, { customUploadedDataURL: 'data:snapshot-texture' })
    ) as AnyRecord;
    const opts = material.opts as AnyRecord;
    assert.ok(opts.map);
    assert.notEqual(opts.map, staleTexture);
    assert.equal((opts.map as AnyRecord).uuid, 'texture-1');
  });
});

test('materials_factory resolves config texture data URL without falling back to stale live cache', () => {
  const staleTexture = makeLiveTexture('stale-live-cache');
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    services: { texturesCache: { customUploadedTexture: staleTexture } },
    store: makeStore({ sketchMode: false }, { customUploadedDataURL: 'data:config-texture' }),
  };

  withFakeImage(() => {
    const material = getMaterial(
      App,
      'custom',
      'front',
      true,
      undefined,
      materialSnapshot(false, { customUploadedDataURL: 'data:config-texture' })
    ) as AnyRecord;
    const opts = material.opts as AnyRecord;
    assert.ok(opts.map);
    assert.notEqual(opts.map, staleTexture);
    assert.equal((opts.map as AnyRecord).uuid, 'texture-1');
  });
});

test('materials_factory ignores live texture cache when no canonical texture URL exists', () => {
  const liveTexture = makeLiveTexture('stale-live-cache');
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    services: { texturesCache: { customUploadedTexture: liveTexture } },
    store: makeStore({ sketchMode: false }),
  };

  const material = getMaterial(App, 'custom', 'front', true, undefined, materialSnapshot(false)) as AnyRecord;
  const opts = material.opts as AnyRecord;
  assert.equal(opts.map, undefined);
  assert.equal(opts.color, '#ffffff');
});
