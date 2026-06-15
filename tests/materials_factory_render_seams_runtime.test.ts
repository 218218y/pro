import test from 'node:test';
import assert from 'node:assert/strict';

import { getMaterial } from '../esm/native/builder/materials_factory.ts';
import { ensureRenderCacheMaps, ensureRenderMetaMaps } from '../esm/native/runtime/render_access.ts';

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
    constructor(public opts: AnyRecord) {}
  }

  class MeshStandardMaterial {
    userData: AnyRecord = {};
    constructor(public opts: AnyRecord) {}
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

test('materials_factory uses canonical render cache/meta seams without materializing compat refs on App', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };

  const material = getMaterial(App, '#ffffff', 'front');
  assert.ok(material);

  const renderCache = ensureRenderCacheMaps(App);
  const renderMeta = ensureRenderMetaMaps(App);
  assert.equal(renderCache.materialCache instanceof Map, true);
  assert.equal(renderMeta.material instanceof Map, true);
  assert.equal(renderCache.materialCache.has('sketch_white'), true);
  assert.equal(renderMeta.material.has('sketch_white'), true);

  assert.equal('__wpRenderCache' in App, false);
  assert.equal('__wpRenderMeta' in App, false);
  assert.equal('__wpRenderMaterials' in App, false);
});

test('materials_factory keeps front color albedo canonical instead of applying display compensation', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: false }),
  };

  const material = getMaterial(App, '#336699', 'front') as AnyRecord;
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
    const material = getMaterial(App, 'custom', 'front', true, 'data:explicit-texture') as AnyRecord;
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
    const material = getMaterial(App, 'custom', 'front', true) as AnyRecord;
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

  const material = getMaterial(App, 'custom', 'front', true) as AnyRecord;
  const opts = material.opts as AnyRecord;
  assert.equal(opts.map, undefined);
  assert.equal(opts.color, '#ffffff');
});
