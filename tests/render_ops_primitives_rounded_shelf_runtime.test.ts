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
  rotation = { x: 0, y: 0, z: 0 };
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

  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeBoxGeometry {
  args: number[];

  constructor(...args: number[]) {
    this.args = args;
  }
}

class FakeMaterial {
  options: AnyMap;

  constructor(options: AnyMap = {}) {
    this.options = options;
  }
}

class FakeGroup {
  children: unknown[] = [];
  userData: AnyMap = {};
  rotation = { x: 0, y: 0, z: 0 };
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

  add(obj: unknown) {
    this.children.push(obj);
  }
}

function createPrimitiveHarness() {
  const group = new FakeGroup();
  const THREE = {
    Vector3: class {},
    Box3: class {},
    CylinderGeometry: class {},
    MeshStandardMaterial: FakeMaterial,
    MeshBasicMaterial: FakeMaterial,
    BoxGeometry: FakeBoxGeometry,
    BufferGeometry: FakeBufferGeometry,
    Float32BufferAttribute: FakeFloat32BufferAttribute,
    Mesh: FakeMesh,
    Group: FakeGroup,
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
  return { App, THREE, group, ops };
}

function createRoundedShelfMesh(side: 'left' | 'right' | 'both') {
  const { App, THREE, ops } = createPrimitiveHarness();

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

test('render primitive handles preserve focused policy dimensions and placement', () => {
  const { App, THREE, ops } = createPrimitiveHarness();

  const shortEdge = ops.createHandleMesh('edge', 0.5, 2, true, {
    App,
    THREE,
    edgeHandleVariant: 'short',
    handleColor: '#111111',
  }) as FakeGroup;
  const shortProfile = shortEdge.children[0] as FakeGroup;
  const shortMount = shortProfile.children[0] as FakeMesh;
  assert.equal(shortProfile.position.x, 0.4975);
  assert.deepEqual((shortMount.geometry as FakeBoxGeometry).args, [0.0045, 0.2, 0.014]);

  const longEdge = ops.createHandleMesh('edge', 0.5, 2, false, {
    App,
    THREE,
    edgeHandleVariant: 'long',
    handleColor: '#111111',
  }) as FakeGroup;
  const longProfile = longEdge.children[0] as FakeGroup;
  const longMount = longProfile.children[0] as FakeMesh;
  assert.equal(longProfile.position.x, -0.4975);
  assert.deepEqual((longMount.geometry as FakeBoxGeometry).args, [0.0045, 0.4, 0.014]);

  const standard = ops.createHandleMesh('standard', 0.5, 2, true, {
    App,
    THREE,
    handleColor: '#111111',
  }) as FakeGroup;
  const standardMesh = standard.children[0] as FakeMesh;
  assert.deepEqual((standardMesh.geometry as FakeBoxGeometry).args, [0.01, 0.16, 0.02]);
  assert.deepEqual(
    [standardMesh.position.x, standardMesh.position.y, standardMesh.position.z],
    [0.45, 0, 0.02]
  );
});
