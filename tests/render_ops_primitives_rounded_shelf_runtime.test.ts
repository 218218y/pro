import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderPrimitiveOps } from '../esm/native/builder/render_ops_primitives.ts';

type AnyMap = Record<string, any>;

type FakeAttribute = { array: number[]; itemSize: number; count: number };

class FakeFloat32BufferAttribute implements FakeAttribute {
  array: number[];
  itemSize: number;
  count: number;

  constructor(values: number[], itemSize: number) {
    this.array = values;
    this.itemSize = itemSize;
    this.count = values.length / itemSize;
  }
}

class FakeBufferGeometry {
  attributes: Record<string, FakeAttribute> = {};
  boundingBoxComputed = false;
  boundingSphereComputed = false;

  setAttribute(name: string, attribute: FakeAttribute) {
    this.attributes[name] = attribute;
    return this;
  }

  computeBoundingBox() {
    this.boundingBoxComputed = true;
  }

  computeBoundingSphere() {
    this.boundingSphereComputed = true;
  }
}

class FakeMesh {
  geometry: unknown;
  material: unknown;
  userData: AnyMap = {};
  castShadow = false;
  receiveShadow = false;
  position = { set: (_x: number, _y: number, _z: number) => undefined };

  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

function createRoundedShelfMesh(side: 'left' | 'right' | 'both') {
  const group = {
    children: [] as unknown[],
    add(obj: unknown) {
      this.children.push(obj);
    },
  };
  const THREE = {
    Vector3: class {},
    Box3: class {},
    CylinderGeometry: class {},
    MeshStandardMaterial: class {},
    MeshBasicMaterial: class {},
    BoxGeometry: class {},
    BufferGeometry: FakeBufferGeometry,
    Float32BufferAttribute: FakeFloat32BufferAttribute,
    Mesh: FakeMesh,
    Group: class {},
    DoubleSide: 2,
    FrontSide: 1,
  };
  const App = { services: { builder: {} } };
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
    __wardrobeGroup: () => group,
    __matCache: () => ({}),
  });

  const mesh = ops.createBoard({
    App,
    THREE,
    w: 1,
    h: 0.018,
    d: 0.55,
    x: 0,
    y: 0,
    z: 0,
    mat: {},
    partId: `rounded_${side}`,
    shape: 'rounded_shelf',
    roundedShelfSide: side,
    roundedShelfRadius: 0.12,
    roundedShelfSegments: 8,
  }) as FakeMesh;

  return mesh.geometry as FakeBufferGeometry;
}

function readNormals(geometry: FakeBufferGeometry): number[] {
  const normal = geometry.attributes.normal;
  assert.ok(normal, 'rounded shelf must write explicit normals');
  return normal.array;
}

test('rounded shelf writes explicit flat top and bottom normals instead of recomputing noisy extrude normals', () => {
  const geometry = createRoundedShelfMesh('left');
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;

  assert.ok(position, 'rounded shelf must write positions');
  assert.ok(normal, 'rounded shelf must write normals');
  assert.equal(normal.array.length, position.array.length);
  assert.equal(geometry.boundingBoxComputed, true);
  assert.equal(geometry.boundingSphereComputed, true);

  assert.deepEqual(normal.array.slice(0, 9), [0, 1, 0, 0, 1, 0, 0, 1, 0]);
  assert.deepEqual(normal.array.slice(9, 18), [0, -1, 0, 0, -1, 0, 0, -1, 0]);
});

test('rounded shelf keeps UVs so textured shelf materials render like regular boards', () => {
  const geometry = createRoundedShelfMesh('left');
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  assert.ok(position, 'rounded shelf must write positions');
  assert.ok(uv, 'rounded shelf must write UVs for material texture maps');
  assert.equal(uv.itemSize, 2);
  assert.equal(uv.count, position.count);

  const values = uv.array;
  assert.ok(
    values.some(value => value > 0 && value < 1),
    'UVs should preserve the texture coordinate range'
  );
  assert.ok(
    new Set(values.map(value => Math.round(value * 1000) / 1000)).size > 3,
    'UVs should not collapse the texture into a flat color'
  );
});

test('rounded shelf omits the hidden cap face that is flush with the remaining cabinet side', () => {
  const leftRemovedNormals = readNormals(createRoundedShelfMesh('left'));
  const rightRemovedNormals = readNormals(createRoundedShelfMesh('right'));
  const bothRemovedNormals = readNormals(createRoundedShelfMesh('both'));

  const hasPositiveXCap = (normals: number[]) =>
    normals.some((value, index) => index % 3 === 0 && value > 0.99);
  const hasNegativeXCap = (normals: number[]) =>
    normals.some((value, index) => index % 3 === 0 && value < -0.99);

  assert.equal(
    hasPositiveXCap(leftRemovedNormals),
    false,
    'right attached side face should not z-fight the side wall'
  );
  assert.equal(
    hasNegativeXCap(rightRemovedNormals),
    false,
    'left attached side face should not z-fight the side wall'
  );
  assert.equal(
    hasPositiveXCap(bothRemovedNormals),
    true,
    'both-open shelves still keep their visible right cap'
  );
  assert.equal(
    hasNegativeXCap(bothRemovedNormals),
    true,
    'both-open shelves still keep their visible left cap'
  );
});
