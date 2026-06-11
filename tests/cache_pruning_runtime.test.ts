import test from 'node:test';
import assert from 'node:assert/strict';

import { installCachePruning } from '../esm/native/platform/cache_pruning.ts';
import { initRenderState } from '../esm/native/platform/render_state_init.ts';

type AnyRecord = Record<string, any>;

type TextureStub = { id: string; isTexture: true; disposed: number; dispose: () => void };
type MaterialStub = { id: string; map?: TextureStub | null; disposed: number; dispose: () => void };

type SceneStub = {
  traversed: number;
  traverse: (visitor: (obj: AnyRecord) => void) => void;
};

function makeTexture(id: string): TextureStub {
  return {
    id,
    isTexture: true,
    disposed: 0,
    dispose() {
      this.disposed += 1;
    },
  };
}

function makeMaterial(id: string, map?: TextureStub | null): MaterialStub {
  return {
    id,
    map: map ?? null,
    disposed: 0,
    dispose() {
      this.disposed += 1;
    },
  };
}

function makeScene(objs: AnyRecord[]): SceneStub {
  return {
    traversed: 0,
    traverse(visitor) {
      this.traversed += 1;
      for (const obj of objs) visitor(obj);
    },
  };
}

function installApp(
  limits?: Partial<Record<'textures' | 'materials' | 'dimLabels' | 'edges' | 'geometries', number>>
) {
  const App: AnyRecord = { config: {}, render: {} };
  initRenderState(App as any);
  installCachePruning(App as any);
  App.platform.util.cacheLimits = {
    textures: 1,
    materials: 1,
    dimLabels: 1,
    edges: 1,
    geometries: 1,
    ...(limits || {}),
  };
  return App;
}

test('cache pruning: no-op prune does not arm cooldown and immediate later pressure still prunes', () => {
  const App = installApp({ textures: 1 });
  const t1 = makeTexture('t1');
  const t2 = makeTexture('t2');

  App.render.cache.textureCache.set(t1, t1);
  App.render.meta.texture.set(t1, 1);

  const scene = makeScene([]);
  App.platform.util.pruneCachesSafe(scene);

  assert.equal(scene.traversed, 0);
  assert.equal(App.render.lastPruneAt ?? 0, 0);
  assert.equal(App.render.cache.textureCache.size, 1);

  App.render.cache.textureCache.set(t2, t2);
  App.render.meta.texture.set(t2, 2);

  App.platform.util.pruneCachesSafe(scene);

  assert.equal(scene.traversed, 1);
  assert.equal(App.render.cache.textureCache.size, 1);
  assert.equal(t1.disposed + t2.disposed, 1);
  assert.ok(typeof App.render.lastPruneAt === 'number' && App.render.lastPruneAt > 0);
});

test('cache pruning: active cooldown skips repeated over-limit traversals after real prune attempt', () => {
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    const App = installApp({ textures: 1 });
    const t1 = makeTexture('t1');
    const t2 = makeTexture('t2');
    const m1 = makeMaterial('m1', t1);
    const m2 = makeMaterial('m2', t2);

    App.render.cache.textureCache.set(t1, t1);
    App.render.cache.textureCache.set(t2, t2);
    App.render.meta.texture.set(t1, 1);
    App.render.meta.texture.set(t2, 2);

    const scene = makeScene([{ material: m1 }, { material: m2 }]);

    App.platform.util.pruneCachesSafe(scene);
    assert.equal(scene.traversed, 1);
    assert.equal(App.render.cache.textureCache.size, 2, 'used textures stay alive so pressure remains');
    assert.equal(App.render.lastPruneAt, 1000);

    now = 1200;
    App.platform.util.pruneCachesSafe(scene);

    assert.equal(scene.traversed, 1, 'cooldown should skip second traversal while still over limit');
    assert.equal(App.render.lastPruneAt, 1000);
  } finally {
    Date.now = originalNow;
  }
});
