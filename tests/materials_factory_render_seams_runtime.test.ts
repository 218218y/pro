import test from 'node:test';
import assert from 'node:assert/strict';

import { getMaterial } from '../esm/native/builder/materials_factory.ts';
import { ensureRenderCacheMaps, ensureRenderMetaMaps } from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

function makeStore(runtime: AnyRecord) {
  return {
    getState() {
      return { runtime };
    },
    subscribe() {
      return () => undefined;
    },
  };
}

function makeThreeStub() {
  class MeshBasicMaterial {
    userData: AnyRecord = {};
    constructor(public opts: AnyRecord) {}
  }

  class MeshStandardMaterial {
    userData: AnyRecord = {};
    constructor(public opts: AnyRecord) {}
  }

  class Color {
    #hex = 'ffffff';
    setStyle(style: string) {
      this.#hex = String(style || '#ffffff')
        .replace(/^#/, '')
        .padStart(6, '0')
        .slice(-6);
    }
    getHSL(target: { h: number; s: number; l: number }) {
      target.h = 0;
      target.s = 0;
      target.l = 1;
    }
    setHSL() {
      return this;
    }
    getHexString() {
      return this.#hex;
    }
  }

  return {
    MeshBasicMaterial,
    MeshStandardMaterial,
    Color,
    Texture: class {},
    CanvasTexture: class {},
    RepeatWrapping: 'repeat',
  };
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
