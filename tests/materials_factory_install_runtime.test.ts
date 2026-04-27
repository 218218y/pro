import test from 'node:test';
import assert from 'node:assert/strict';

import { installBuilderMaterialsFactory } from '../esm/native/builder/materials_factory.ts';

type AnyMap = Record<string, any>;

type FakeApp = {
  id: string;
  deps: AnyMap;
  services: AnyMap;
  platform: AnyMap;
  store: {
    getState: () => AnyMap;
  };
  touches: string[];
};

function createFakeTHREE() {
  class Texture {
    repeat = { set() {} };
  }
  class CanvasTexture extends Texture {
    constructor(public canvas: unknown) {
      super();
    }
  }
  class MeshBasicMaterial {
    constructor(public opts: AnyMap) {}
  }
  class MeshStandardMaterial {
    constructor(public opts: AnyMap) {}
  }
  class Color {
    setStyle() {}
    getHSL(target: { h: number; s: number; l: number }) {
      target.h = 0;
      target.s = 0;
      target.l = 0;
    }
    setHSL() {}
    getHexString() {
      return 'ffffff';
    }
  }
  return {
    Texture,
    CanvasTexture,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Color,
    RepeatWrapping: 'repeat',
    SRGBColorSpace: 'srgb',
  };
}

function createApp(id: string, materials?: Record<string, unknown>): FakeApp {
  const touches: string[] = [];
  return {
    id,
    touches,
    deps: {
      THREE: createFakeTHREE(),
      builder: {},
    },
    services: {
      builder: {
        materials: materials ?? {},
      },
    },
    platform: {
      util: {
        cacheTouch(_meta: unknown, key: string) {
          touches.push(`${id}:${key}`);
        },
        hash32(value: unknown) {
          return `${id}:${String(value)}`;
        },
      },
    },
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime: { sketchMode: true },
          mode: {},
          meta: {},
        };
      },
    },
  };
}

test('materials factory install keeps stable refs live across root replacement installs', () => {
  const AppA = createApp('A');
  const installed = installBuilderMaterialsFactory(AppA as never) as AnyMap;
  const heldGetMaterial = installed.getMaterial;
  const heldGetTexture = installed.getDataURLTexture;

  assert.equal(typeof heldGetMaterial, 'function');
  assert.equal(typeof heldGetTexture, 'function');

  heldGetMaterial('#ffffff', 'front');
  assert.deepEqual(AppA.touches, ['A:sketch_white']);

  const AppB = createApp('B', installed);
  const reinstalled = installBuilderMaterialsFactory(AppB as never) as AnyMap;

  assert.equal(reinstalled, installed);
  assert.equal(reinstalled.getMaterial, heldGetMaterial);
  assert.equal(reinstalled.getDataURLTexture, heldGetTexture);
  assert.equal(AppB.deps.builder.materials.getMaterial, heldGetMaterial);
  assert.equal(AppB.deps.builder.materials.getDataURLTexture, heldGetTexture);

  heldGetMaterial('#ffffff', 'front');
  assert.deepEqual(AppA.touches, ['A:sketch_white']);
  assert.deepEqual(AppB.touches, ['B:sketch_white']);
});

test('materials factory install heals drift even when the installed marker is already set', () => {
  const driftedGetMaterial = () => 'drifted';
  const App = createApp('A', {
    __esm_materials_factory_v1: true,
    getMaterial: driftedGetMaterial,
  });

  const installed = installBuilderMaterialsFactory(App as never) as AnyMap;
  const canonicalGetMaterial = installed.getMaterial;

  assert.notEqual(canonicalGetMaterial, driftedGetMaterial);
  assert.equal(typeof installed.generateTexture, 'function');
  assert.equal(typeof installed.getDataURLTexture, 'function');

  installed.getMaterial = () => 'drifted-again';
  installBuilderMaterialsFactory(App as never);

  assert.equal(installed.getMaterial, canonicalGetMaterial);
});
