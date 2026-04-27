import test from 'node:test';
import assert from 'node:assert/strict';

import { createFrontRevealMaterialsRuntime } from '../esm/native/builder/post_build_front_reveal_frames_materials.ts';

class FakeLineBasicMaterial {
  colorValue: number;
  transparent: boolean;
  opacity: number;
  depthWrite = true;
  depthTest = false;
  constructor(opts: Record<string, unknown>) {
    this.colorValue = Number(opts.color) >>> 0;
    this.transparent = !!opts.transparent;
    this.opacity = Number(opts.opacity) || 0;
  }
}

class FakeMatrix4 {
  offsetZ = 0;
  copy(matrix: { offsetZ?: number } | null | undefined) {
    this.offsetZ = Number(matrix?.offsetZ) || 0;
    return this;
  }
  invert() {
    this.offsetZ = -this.offsetZ;
    return this;
  }
  multiplyMatrices(a: { offsetZ?: number } | null | undefined, b: { offsetZ?: number } | null | undefined) {
    this.offsetZ = (Number(a?.offsetZ) || 0) + (Number(b?.offsetZ) || 0);
    return this;
  }
}

class FakeVector3 {
  x = 0;
  y = 0;
  z = 0;
}

class FakeBox3 {
  min: { z: number };
  max: { z: number };
  size: { x: number; y: number; z: number };
  constructor(size: { x: number; y: number; z: number }, minZ: number, maxZ: number) {
    this.size = { ...size };
    this.min = { z: minZ };
    this.max = { z: maxZ };
  }
  clone() {
    return new FakeBox3(this.size, this.min.z, this.max.z);
  }
  applyMatrix4(matrix: { offsetZ?: number } | null | undefined) {
    const offset = Number(matrix?.offsetZ) || 0;
    this.min.z += offset;
    this.max.z += offset;
    return this;
  }
  getSize(target: { x: number; y: number; z: number }) {
    target.x = this.size.x;
    target.y = this.size.y;
    target.z = this.size.z;
    return target;
  }
}

class FakeGeometry {
  boundingBox: FakeBox3 | null;
  constructor(size: { x: number; y: number; z: number }, minZ: number, maxZ: number) {
    this.boundingBox = new FakeBox3(size, minZ, maxZ);
  }
}

class FakeOffscreenCanvas {
  width: number;
  height: number;
  __sampleColor: [number, number, number, number] | null;
  static drawCalls = 0;
  constructor(width: number, height: number, sampleColor: [number, number, number, number] | null = null) {
    this.width = width;
    this.height = height;
    this.__sampleColor = sampleColor;
  }
  getContext() {
    let currentColor = this.__sampleColor;
    return {
      drawImage: (source: { __sampleColor?: [number, number, number, number] | null }) => {
        FakeOffscreenCanvas.drawCalls += 1;
        currentColor = source?.__sampleColor ?? null;
      },
      getImageData: () => ({
        data: new Uint8ClampedArray(this.width * this.height * 4)
          .fill(0)
          .map((_, idx) => (currentColor ?? [0, 0, 0, 0])[idx % 4]),
      }),
      clearRect: () => {},
    };
  }
}

function createRoot(children: any[]) {
  return {
    matrixWorld: { offsetZ: 0 },
    updateMatrixWorld() {},
    traverse(fn: (obj: any) => void) {
      children.forEach(child => fn(child));
    },
  };
}

function createPanel(args: {
  size: { x: number; y: number; z: number };
  minZ: number;
  maxZ: number;
  directHex?: number;
  textureColor?: [number, number, number, number] | null;
  offsetZ?: number;
}) {
  const material: any = {};
  if (args.directHex != null) {
    material.color = {
      getHex: () => args.directHex,
    };
  }
  if (args.textureColor) {
    material.map = {
      image: new FakeOffscreenCanvas(2, 2, args.textureColor),
    };
  }
  return {
    geometry: new FakeGeometry(args.size, args.minZ, args.maxZ),
    material,
    matrixWorld: { offsetZ: args.offsetZ || 0 },
  };
}

function createTaggedPanel(args: Parameters<typeof createPanel>[0] & { role: string }) {
  const panel = createPanel(args) as any;
  panel.userData = { __doorVisualRole: args.role };
  panel.children = [];
  return panel;
}

function createRuntime(overrides: Partial<Parameters<typeof createFrontRevealMaterialsRuntime>[0]> = {}) {
  const slots = new Map<string, unknown>();
  const runtime = createFrontRevealMaterialsRuntime({
    App: {} as any,
    THREE: {
      LineBasicMaterial: FakeLineBasicMaterial,
      Matrix4: FakeMatrix4,
      Vector3: FakeVector3,
    } as any,
    docForTextureToneRead: null,
    sketchMode: false,
    readLineMaterial: (key: string) => slots.get(key),
    writeLineMaterial: (key: string, value: unknown) => {
      slots.set(key, value);
      return value;
    },
    ...overrides,
  });
  assert.ok(runtime);
  return { runtime, slots };
}

test('front reveal materials return the cached base line material when no root is provided', () => {
  const { runtime, slots } = createRuntime();

  assert.equal(runtime!.pickRevealLineMaterial(null), runtime!.baseLineMaterial);
  assert.equal(slots.size, 1);
  assert.ok(slots.has('frontRevealFrameLineMaterial'));
});

test('front reveal materials prefer sampled texture tone over washed-out direct color and cache adaptive buckets', () => {
  const prevOffscreenCanvas = globalThis.OffscreenCanvas;
  (globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;
  try {
    const { runtime, slots } = createRuntime();
    const root = createRoot([
      createPanel({
        size: { x: 1.2, y: 2.1, z: 0.02 },
        minZ: -0.02,
        maxZ: 0.02,
        directHex: 0xffffff,
        textureColor: [24, 24, 24, 255],
      }),
    ]);

    const first = runtime!.pickRevealLineMaterial(root);
    const second = runtime!.pickRevealLineMaterial(root);

    assert.ok(first);
    assert.notEqual(first, runtime!.baseLineMaterial);
    assert.equal(first, second);
    assert.ok(
      Array.from(slots.keys()).some(key => String(key).startsWith('frontRevealFrameLineMaterialAdaptive_'))
    );
    assert.ok((first as any).colorValue < (runtime!.baseLineMaterial as any).colorValue);
    assert.ok((first as any).opacity > (runtime!.baseLineMaterial as any).opacity);
  } finally {
    if (prevOffscreenCanvas === undefined) {
      delete (globalThis as any).OffscreenCanvas;
    } else {
      (globalThis as any).OffscreenCanvas = prevOffscreenCanvas;
    }
  }
});

test('front reveal materials score thin front-most panels ahead of thicker deeper candidates', () => {
  const { runtime, slots } = createRuntime();
  const root = createRoot([
    createPanel({
      size: { x: 2.4, y: 2.4, z: 1.4 },
      minZ: -0.7,
      maxZ: 0.7,
      directHex: 0xfefefe,
    }),
    createPanel({
      size: { x: 1.3, y: 2.1, z: 0.02 },
      minZ: -0.08,
      maxZ: 0.08,
      directHex: 0x101010,
    }),
  ]);

  const picked = runtime!.pickRevealLineMaterial(root);

  assert.notEqual(picked, runtime!.baseLineMaterial);
  assert.ok(
    Array.from(slots.keys()).some(key => String(key).startsWith('frontRevealFrameLineMaterialAdaptive_'))
  );
});

test('front reveal materials prefer tagged center panels without falling back to expensive box scoring', () => {
  let boundingBoxReads = 0;
  class CountingGeometry extends FakeGeometry {
    computeBoundingBox() {
      boundingBoxReads += 1;
      return this.boundingBox;
    }
  }
  const { runtime } = createRuntime();
  const root = createRoot([
    {
      geometry: new CountingGeometry({ x: 2.4, y: 2.4, z: 1.4 }, -0.7, 0.7),
      material: { color: { getHex: () => 0xfefefe } },
      matrixWorld: { offsetZ: 0 },
      children: [],
    },
    createTaggedPanel({
      role: 'door_profile_center_panel',
      size: { x: 1.3, y: 2.1, z: 0.02 },
      minZ: -0.08,
      maxZ: 0.08,
      directHex: 0x101010,
    }),
  ]);

  const picked = runtime!.pickRevealLineMaterial(root);

  assert.notEqual(picked, runtime!.baseLineMaterial);
  assert.equal(boundingBoxReads, 0);
});

test('front reveal materials persist sampled texture tone on the texture across runtime recreations', () => {
  const prevOffscreenCanvas = globalThis.OffscreenCanvas;
  (globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;
  FakeOffscreenCanvas.drawCalls = 0;
  try {
    const sharedTexture: any = { image: new FakeOffscreenCanvas(2, 2, [32, 32, 32, 255]) };
    const root = createRoot([
      {
        geometry: new FakeGeometry({ x: 1.2, y: 2.1, z: 0.02 }, -0.02, 0.02),
        material: {
          color: { getHex: () => 0xffffff },
          map: sharedTexture,
        },
        matrixWorld: { offsetZ: 0 },
      },
    ]);

    const firstRuntime = createRuntime().runtime;
    const first = firstRuntime!.pickRevealLineMaterial(root);
    const drawCallsAfterFirst = FakeOffscreenCanvas.drawCalls;
    const secondRuntime = createRuntime().runtime;
    const second = secondRuntime!.pickRevealLineMaterial(root);

    assert.ok(first);
    assert.ok(second);
    assert.equal(FakeOffscreenCanvas.drawCalls, drawCallsAfterFirst);
    assert.equal(sharedTexture.userData.__wpFrontRevealToneHex, 0x202020);
  } finally {
    if (prevOffscreenCanvas === undefined) delete (globalThis as any).OffscreenCanvas;
    else (globalThis as any).OffscreenCanvas = prevOffscreenCanvas;
  }
});
