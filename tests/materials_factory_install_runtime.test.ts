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
    uuid = 'fake-texture-' + String(Math.random()).slice(2);
    wrapS: unknown;
    wrapT: unknown;
    colorSpace?: unknown;
    repeatCalls: Array<[number, number]> = [];
    repeat = {
      set: (x: number, y: number) => {
        this.repeatCalls.push([x, y]);
      },
    };
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

function createFakeCanvas() {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
  };
  return {
    width: 0,
    height: 0,
    getContext(kind: '2d') {
      return kind === '2d' ? (ctx as unknown as CanvasRenderingContext2D) : null;
    },
  };
}

function createApp(id: string, materials?: Record<string, unknown>, sketchMode = true): FakeApp {
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
      createCanvas: () => createFakeCanvas(),
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
          runtime: { sketchMode },
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

  heldGetMaterial('#ffffff', 'front', false, undefined, { cfgSnapshot: {}, sketchMode: true });
  assert.deepEqual(AppA.touches, ['A:sketch_white']);

  const AppB = createApp('B', installed);
  const reinstalled = installBuilderMaterialsFactory(AppB as never) as AnyMap;

  assert.equal(reinstalled, installed);
  assert.equal(reinstalled.getMaterial, heldGetMaterial);
  assert.equal(reinstalled.getDataURLTexture, heldGetTexture);
  assert.equal(AppB.deps.builder.materials.getMaterial, heldGetMaterial);
  assert.equal(AppB.deps.builder.materials.getDataURLTexture, heldGetTexture);

  heldGetMaterial('#ffffff', 'front', false, undefined, { cfgSnapshot: {}, sketchMode: true });
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

test('materials factory uses standard cabinet texture policy for catalog swatches', () => {
  const App = createApp('textures', undefined, false);
  const installed = installBuilderMaterialsFactory(App as never) as AnyMap;
  const snapshot = { cfgSnapshot: {}, sketchMode: false };

  const oakMaterial = installed.getMaterial('#c4935f', 'front', false, undefined, snapshot) as AnyMap;
  assert.equal(oakMaterial.opts.color, 0xffffff);
  assert.ok(oakMaterial.opts.map, 'standard oak swatch should render with a generated material texture');
  assert.deepEqual(oakMaterial.opts.map.repeatCalls.at(-1), [2, 4]);

  const graphiteMaterial = installed.getMaterial('#3f4245', 'front', false, undefined, snapshot) as AnyMap;
  assert.equal(graphiteMaterial.opts.color, 0xffffff);
  assert.ok(
    graphiteMaterial.opts.map,
    'standard melamine swatch should keep a subtle texture instead of flat color'
  );
  assert.deepEqual(graphiteMaterial.opts.map.repeatCalls.at(-1), [2, 2]);

  const plainMaterial = installed.getMaterial('#123456', 'front', false, undefined, snapshot) as AnyMap;
  assert.equal(plainMaterial.opts.color, '#123456');
  assert.equal(plainMaterial.opts.map, undefined);
});
