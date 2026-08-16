import test from 'node:test';
import assert from 'node:assert/strict';

import { makeBoardCreator } from '../esm/native/builder/board_factory.ts';
import { createBuilderRenderPrimitiveOps } from '../esm/native/builder/render_ops_primitives.ts';

type AnyMap = Record<string, any>;

type FakeAttribute = { array: number[]; itemSize: number; count: number };
type FakeGeometryGroup = { start: number; count: number; materialIndex: number };

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
  groups: FakeGeometryGroup[] = [];
  boundingBoxComputed = false;
  boundingSphereComputed = false;

  setAttribute(name: string, attribute: FakeAttribute) {
    this.attributes[name] = attribute;
    return this;
  }

  addGroup(start: number, count: number, materialIndex = 0) {
    this.groups.push({ start, count, materialIndex });
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
  renderOrder = 0;
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
  castShadow = false;
  receiveShadow = false;
  renderOrder = 0;
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

function createPrimitiveHarness(roomArchitecture?: AnyMap) {
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
  const App = {
    services: { builder: {} },
    store: {
      getState: () => ({
        config: roomArchitecture ? { roomArchitecture } : {},
        ui: { raw: { width: 200, height: 240, depth: 60 } },
        runtime: { wardrobeWidthM: 2, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
      }),
    },
  };
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

test('room column cuts a real rear notch into interior boards while preserving part identity', () => {
  const { App, THREE, group, ops } = createPrimitiveHarness({
    backWall: { enabled: true, widthCm: 300, heightCm: 280, wardrobeOffsetLeftCm: 50 },
    column: {
      enabled: true,
      offsetLeftCm: 140,
      widthCm: 30,
      depthCm: 20,
      heightCm: 240,
      bottomOffsetCm: 0,
    },
    surfacesHidden: true,
  });

  const board = ops.createBoard({
    App,
    THREE,
    w: 1.8,
    h: 0.018,
    d: 0.55,
    x: 0,
    y: 1,
    z: 0,
    mat: { id: 'shelf-material' },
    partId: 'shelf_column_test',
  }) as FakeGroup;

  assert.equal(group.children.length, 1);
  assert.equal(group.children[0], board);
  assert.equal(board.userData.partId, 'shelf_column_test');
  assert.equal(board.userData.__wpRoomColumnAdjusted, true);
  assert.equal(
    board.children.length,
    3,
    'rear column notch should split the board into left/right/front pieces'
  );
  for (const child of board.children as FakeMesh[]) {
    assert.equal(
      child.userData,
      board.userData,
      'split pieces must preserve the canonical part identity object'
    );
  }
});

test('room-column split boards propagate post-create render flags to every physical segment', () => {
  const { App, THREE, ops } = createPrimitiveHarness({
    backWall: { enabled: true, widthCm: 300, heightCm: 280, wardrobeOffsetLeftCm: 50 },
    column: {
      enabled: true,
      offsetLeftCm: 140,
      widthCm: 30,
      depthCm: 20,
      heightCm: 240,
      bottomOffsetCm: 0,
    },
    surfacesHidden: false,
  });

  const board = ops.createBoard({
    App,
    THREE,
    w: 1.8,
    h: 0.018,
    d: 0.55,
    x: 0,
    y: 1,
    z: 0,
    mat: { id: 'glass-like-material' },
    partId: 'render_flags_column_test',
  }) as FakeGroup;

  board.castShadow = false;
  board.receiveShadow = false;
  board.renderOrder = 7;

  for (const child of board.children as FakeMesh[]) {
    assert.equal(child.castShadow, false);
    assert.equal(child.receiveShadow, false);
    assert.equal(child.renderOrder, 7);
  }
});

test('room column keeps the rounded shelf front geometry and does not paint internal notch faces as front edges', () => {
  const { App, THREE, ops } = createPrimitiveHarness({
    backWall: { enabled: true, widthCm: 300, heightCm: 280, wardrobeOffsetLeftCm: 50 },
    column: {
      enabled: true,
      offsetLeftCm: 140,
      widthCm: 30,
      depthCm: 20,
      heightCm: 240,
      bottomOffsetCm: 0,
    },
    surfacesHidden: false,
  });
  const materials = ['right', 'left', 'top', 'bottom', 'front', 'back'];

  const board = ops.createBoard({
    App,
    THREE,
    w: 1.8,
    h: 0.018,
    d: 0.55,
    x: 0,
    y: 1,
    z: 0,
    mat: materials,
    partId: 'rounded_column_test',
    shape: 'rounded_shelf',
    roundedShelfSide: 'both',
    roundedShelfRadius: 0.12,
    roundedShelfSegments: 8,
  }) as FakeGroup;

  assert.equal(board.children.length, 3);
  const roundedFront = (board.children as FakeMesh[]).find(
    child => child.geometry instanceof FakeBufferGeometry
  );
  assert.ok(roundedFront, 'the full-width front slab must keep the rounded shelf geometry');
  assert.deepEqual(roundedFront.material, ['right', 'left', 'top', 'bottom', 'front', 'top']);

  const rearPieces = (board.children as FakeMesh[]).filter(child => child !== roundedFront);
  assert.equal(rearPieces.length, 2);
  for (const child of rearPieces) {
    const pieceMaterials = child.material as unknown[];
    assert.equal(
      pieceMaterials[4],
      'top',
      'new notch faces must use the neutral board material, not front edge banding'
    );
  }
});

function createRoundedShelfMesh(
  side: 'left' | 'right' | 'both',
  material: unknown = {},
  shelfExposedSide?: 'left' | 'right' | 'both'
): FakeMesh {
  const { App, THREE, ops } = createPrimitiveHarness();

  return ops.createBoard({
    App,
    THREE,
    w: 1,
    h: 0.018,
    d: 0.55,
    x: 0,
    y: 0,
    z: 0,
    mat: material,
    partId: `rounded_${side}`,
    shape: 'rounded_shelf',
    shelfExposedSide,
    roundedShelfSide: side,
    roundedShelfRadius: 0.12,
    roundedShelfSegments: 8,
  }) as FakeMesh;
}

function createSquareShelfMesh(material: unknown, shelfExposedSide?: 'left' | 'right' | 'both'): FakeMesh {
  const { App, THREE, ops } = createPrimitiveHarness();

  return ops.createBoard({
    App,
    THREE,
    w: 1,
    h: 0.018,
    d: 0.55,
    x: 0,
    y: 0,
    z: 0,
    mat: material,
    partId: 'square_shelf',
    shelfExposedSide,
  }) as FakeMesh;
}

function createRoundedShelfGeometry(side: 'left' | 'right' | 'both'): FakeBufferGeometry {
  return createRoundedShelfMesh(side).geometry as FakeBufferGeometry;
}

function readNormals(geometry: FakeBufferGeometry): number[] {
  const normal = geometry.attributes.normal;
  assert.ok(normal, 'rounded shelf must write explicit normals');
  return normal.array;
}

test('rounded shelf writes explicit flat top and bottom normals instead of recomputing noisy extrude normals', () => {
  const geometry = createRoundedShelfGeometry('left');
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;

  assert.ok(position, 'rounded shelf must write positions');
  assert.ok(normal, 'rounded shelf must write normals');
  assert.equal(normal.array.length, position.array.length);
  assert.equal(geometry.boundingBoxComputed, true);
  assert.equal(geometry.boundingSphereComputed, true);

  assert.deepEqual(normal.array.slice(0, 9), [0, 1, 0, 0, 1, 0, 0, 1, 0]);
  const bottomStart = geometry.groups.find(group => group.materialIndex === 3)?.start;
  assert.equal(typeof bottomStart, 'number');
  assert.deepEqual(
    normal.array.slice(bottomStart! * 3, bottomStart! * 3 + 9),
    [0, -1, 0, 0, -1, 0, 0, -1, 0]
  );
});

test('rounded shelf defines complete BoxGeometry-compatible groups for front-edge material arrays', () => {
  const materials = ['right', 'left', 'top', 'bottom', 'front', 'back'];
  const expectedMaterialIndices = {
    left: [1, 2, 3, 4, 5],
    right: [0, 2, 3, 4, 5],
    both: [0, 1, 2, 3, 4, 5],
  } as const;

  for (const side of ['left', 'right', 'both'] as const) {
    const mesh = createRoundedShelfMesh(side, materials);
    const geometry = mesh.geometry as FakeBufferGeometry;
    const position = geometry.attributes.position;

    assert.equal(mesh.material, materials);
    assert.ok(position, 'rounded shelf must write positions');
    assert.ok(geometry.groups.length > 0, 'multi-material rounded shelves require geometry groups');

    let nextStart = 0;
    for (const group of geometry.groups) {
      assert.equal(group.start, nextStart, 'groups must cover the non-indexed geometry without gaps');
      assert.ok(group.count > 0);
      assert.ok(group.materialIndex >= 0 && group.materialIndex < materials.length);
      nextStart += group.count;
    }
    assert.equal(nextStart, position.count, 'every rounded-shelf vertex must belong to one material group');
    assert.deepEqual(
      [...new Set(geometry.groups.map(group => group.materialIndex))].sort((a, b) => a - b),
      expectedMaterialIndices[side],
      `${side}-open shelf material groups must omit only faces that remain flush with a cabinet side`
    );
  }
});

test('rounded shelf assigns curved exposed corner faces to the front-edge material', () => {
  const geometry = createRoundedShelfGeometry('left');
  const position = geometry.attributes.position;
  assert.ok(position);

  const frontGroups = geometry.groups.filter(group => group.materialIndex === 4);
  assert.ok(frontGroups.length >= 2, 'straight and curved front-edge spans should both use material index 4');
  assert.ok(
    frontGroups.some(group => group.count > 6),
    'the segmented rounded corner should be grouped with the cabinet-colored front edge'
  );
});

test('removed-side shelf edge banding colors the exposed side for square and rounded shelves', () => {
  const baseMaterials = ['right', 'left', 'top', 'bottom', 'front', 'back'];

  const squareLeft = createSquareShelfMesh(baseMaterials, 'left');
  assert.deepEqual(squareLeft.material, ['right', 'front', 'top', 'bottom', 'front', 'back']);

  const squareRight = createSquareShelfMesh(baseMaterials, 'right');
  assert.deepEqual(squareRight.material, ['front', 'left', 'top', 'bottom', 'front', 'back']);

  const roundedBoth = createRoundedShelfMesh('both', baseMaterials, 'both');
  assert.deepEqual(roundedBoth.material, ['front', 'front', 'top', 'bottom', 'front', 'back']);

  assert.deepEqual(
    baseMaterials,
    ['right', 'left', 'top', 'bottom', 'front', 'back'],
    'per-shelf edge exposure must not mutate the shared material array'
  );

  const singleMaterial = { id: 'all-shelves' };
  assert.equal(createSquareShelfMesh(singleMaterial, 'left').material, singleMaterial);
});

test('board factory forwards removed-side shelf exposure to the render primitive contract', () => {
  let captured: AnyMap | null = null;
  const createBoard = makeBoardCreator({
    THREE: {} as never,
    sketchMode: false,
    addOutlines: null,
    runtime: {
      createBoard(args) {
        captured = args as AnyMap;
        return {} as never;
      },
      reportError: null,
    },
  });

  createBoard(1, 0.018, 0.55, 0, 0, 0, [], 'shelf', { shelfExposedSide: 'right' });

  assert.equal(captured?.shelfExposedSide, 'right');
});

test('rounded shelf keeps UVs so textured shelf materials render like regular boards', () => {
  const geometry = createRoundedShelfGeometry('left');
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
  const leftRemovedNormals = readNormals(createRoundedShelfGeometry('left'));
  const rightRemovedNormals = readNormals(createRoundedShelfGeometry('right'));
  const bothRemovedNormals = readNormals(createRoundedShelfGeometry('both'));

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
