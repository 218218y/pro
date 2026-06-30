import test from 'node:test';
import assert from 'node:assert/strict';

import { addDimensionLine } from '../esm/native/builder/render_ops_extras_dimensions.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  clone() {
    return new FakeVector3(this.x, this.y, this.z);
  }
  add(v: { x: number; y: number; z: number }) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  addVectors(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    return this;
  }
  multiplyScalar(value: number) {
    this.x *= value;
    this.y *= value;
    this.z *= value;
    return this;
  }
  copy(v: { x: number; y: number; z: number }) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
}

class FakeBufferGeometry {
  points: unknown[] = [];
  setFromPoints(points: unknown[]) {
    this.points = points;
    return this;
  }
}

class FakeLineBasicMaterial {
  userData: Record<string, unknown> = {};
  constructor(public opts: Record<string, unknown>) {}
}

class FakeLine {
  userData: Record<string, unknown> = {};
  constructor(
    public geometry: unknown,
    public material: unknown
  ) {}
}

class FakeSprite {
  userData: Record<string, unknown> = {};
  position = new FakeVector3();
  scale = {
    values: [] as number[],
    set: (x: number, y: number, z: number) => {
      this.scale.values = [x, y, z];
    },
  };
  constructor(public material: unknown) {}
}

class FakeCanvasTexture {
  userData: Record<string, unknown> = {};
  constructor(public canvas: unknown) {}
}

class FakeSpriteMaterial {
  userData: Record<string, unknown> = {};
  constructor(public opts: Record<string, unknown>) {}
}

function makeCanvas(width: number, height: number) {
  const ctx: Record<string, unknown> = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect() {},
    fillText() {},
  };
  return { width, height, ctx, getContext: () => ctx };
}

function makeGroup() {
  return {
    children: [] as unknown[],
    userData: {},
    position: {},
    rotation: {},
    scale: {},
    add(child: unknown) {
      this.children.push(child);
    },
    remove(child: unknown) {
      this.children = this.children.filter(entry => entry !== child);
    },
  };
}

function makeApp() {
  const canvases: Array<ReturnType<typeof makeCanvas>> = [];
  const wardrobeGroup = makeGroup();
  const App: any = {
    deps: {
      THREE: {
        BufferGeometry: FakeBufferGeometry,
        LineBasicMaterial: FakeLineBasicMaterial,
        Line: FakeLine,
        Sprite: FakeSprite,
        Vector3: FakeVector3,
        CanvasTexture: FakeCanvasTexture,
        SpriteMaterial: FakeSpriteMaterial,
      },
    },
    services: {
      builder: { renderOps: {} },
      platform: {
        util: {},
        createCanvas(width: number, height: number) {
          const canvas = makeCanvas(width, height);
          canvases.push(canvas);
          return canvas;
        },
      },
    },
    render: { wardrobeGroup },
  };
  return { App, canvases, wardrobeGroup };
}

test('dimension extras can render a compact black total style without falling back to oversized default text', () => {
  const { App, canvases, wardrobeGroup } = makeApp();

  addDimensionLine(
    new FakeVector3(0, 0, 0),
    new FakeVector3(1, 0, 0),
    new FakeVector3(0, 0, 0),
    '160',
    { scale: 0.66, styleKey: 'compactTotal' },
    { App }
  );

  assert.equal(canvases.length, 1);
  assert.equal(canvases[0].width, 96);
  assert.equal(canvases[0].height, 48);
  assert.equal(canvases[0].ctx.font, 'bold 30px Arial');
  assert.equal(canvases[0].ctx.fillStyle, 'black');

  const [line, sprite] = wardrobeGroup.children as [FakeLine, FakeSprite];
  assert.equal((line.material as FakeLineBasicMaterial).opts.color, 0x555555);
  assert.deepEqual(sprite.scale.values, [0.3168, 0.1584, 1]);
});

test('dimension extras text scale ignores string-encoded runtime scale values', () => {
  const { App, wardrobeGroup } = makeApp();

  addDimensionLine(
    new FakeVector3(0, 0, 0),
    new FakeVector3(1, 0, 0),
    new FakeVector3(0, 0, 0),
    '160',
    { scale: '0.66', styleKey: 'compactTotal' },
    { App }
  );

  const [, sprite] = wardrobeGroup.children as [FakeLine, FakeSprite];
  assert.deepEqual(sprite.scale.values, [0.48, 0.24, 1]);
});
