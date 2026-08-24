import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

const root = process.cwd();
const foldedOwnerFile = path.join(root, 'esm/native/builder/visuals_contents_folded.ts');
const TARGET_KINDS = Object.freeze([
  'folded_cloth_item',
  'folded_cloth_top_panel',
  'folded_cloth_front_fold',
  'folded_cloth_collar',
  'folded_cloth_sleeve_fold',
  'folded_cloth_crease',
]);
const EPSILON = 1e-8;

class FakeVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class FakeObject3D {
  constructor() {
    this.children = [];
    this.parent = null;
    this.position = new FakeVector3();
    this.rotation = new FakeVector3();
    this.scale = new FakeVector3(1, 1, 1);
    this.userData = {};
  }

  add(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }
}

class FakeGroup extends FakeObject3D {
  constructor() {
    super();
    this.type = 'Group';
  }
}

class FakeMesh extends FakeObject3D {
  constructor(geometry, material) {
    super();
    this.type = 'Mesh';
    this.isMesh = true;
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeGeometry {
  constructor(...args) {
    this.args = args;
    this.userData = {};
  }
}

class FakeBoxGeometry extends FakeGeometry {
  constructor(...args) {
    super(...args);
    this.type = 'BoxGeometry';
  }
}

class FakeRoundedBoxGeometry extends FakeGeometry {
  constructor(...args) {
    super(...args);
    this.type = 'RoundedBoxGeometry';
  }
}

class FakeMeshStandardMaterial {
  constructor(options) {
    this.options = options;
    this.userData = {};
  }
}

function loadFoldedOwner(mode) {
  return loadTsRuntimeModule(foldedOwnerFile, {
    cache: new Map(),
    transformOptions: {
      esbuildOptions: {
        define: {
          __WP_FOLDED_GEOMETRY_MODE__: JSON.stringify(mode),
        },
      },
    },
  });
}

function createFoldedScene(mode) {
  const { addFoldedClothes } = loadFoldedOwner(mode);
  const THREE = {
    Group: FakeGroup,
    Mesh: FakeMesh,
    BoxGeometry: FakeBoxGeometry,
    RoundedBoxGeometry: FakeRoundedBoxGeometry,
    MeshStandardMaterial: FakeMeshStandardMaterial,
  };
  const App = {
    deps: { THREE },
    services: {
      builder: { modules: {}, contents: {} },
    },
  };
  const parent = new FakeGroup();
  addFoldedClothes(App, 0.07, 0.31, -0.04, 0.9, parent, 0.22, 0.4, {
    showContentsEnabled: true,
    sketchMode: false,
    addOutlines: null,
    cfgSnapshot: { isLibraryMode: false },
  });
  return parent;
}

function transformPointByObject(point, object) {
  let x = point.x * Number(object.scale?.x ?? 1);
  let y = point.y * Number(object.scale?.y ?? 1);
  let z = point.z * Number(object.scale?.z ?? 1);

  const rotationX = Number(object.rotation?.x ?? 0);
  const rotationY = Number(object.rotation?.y ?? 0);
  const rotationZ = Number(object.rotation?.z ?? 0);

  if (rotationX) {
    const nextY = y * Math.cos(rotationX) - z * Math.sin(rotationX);
    const nextZ = y * Math.sin(rotationX) + z * Math.cos(rotationX);
    y = nextY;
    z = nextZ;
  }
  if (rotationY) {
    const nextX = x * Math.cos(rotationY) + z * Math.sin(rotationY);
    const nextZ = -x * Math.sin(rotationY) + z * Math.cos(rotationY);
    x = nextX;
    z = nextZ;
  }
  if (rotationZ) {
    const nextX = x * Math.cos(rotationZ) - y * Math.sin(rotationZ);
    const nextY = x * Math.sin(rotationZ) + y * Math.cos(rotationZ);
    x = nextX;
    y = nextY;
  }

  return {
    x: x + Number(object.position?.x ?? 0),
    y: y + Number(object.position?.y ?? 0),
    z: z + Number(object.position?.z ?? 0),
  };
}

function resolveWorldPoint(object, localPoint) {
  let point = localPoint;
  for (let current = object; current; current = current.parent) {
    point = transformPointByObject(point, current);
  }
  return point;
}

function appendMeshWorldCorners(points, mesh) {
  const dimensions = Array.isArray(mesh.geometry?.args) ? mesh.geometry.args.slice(0, 3).map(Number) : [];
  if (dimensions.length !== 3 || dimensions.some(value => !Number.isFinite(value))) return;
  const [width, height, depth] = dimensions;
  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        points.push(
          resolveWorldPoint(mesh, {
            x: (xSign * width) / 2,
            y: (ySign * height) / 2,
            z: (zSign * depth) / 2,
          })
        );
      }
    }
  }
}

function collectWorldGeometryPoints(object) {
  const points = [];
  const pending = [object];
  while (pending.length) {
    const current = pending.pop();
    if (!current) continue;
    if (current.isMesh === true) appendMeshWorldCorners(points, current);
    pending.push(...current.children);
  }
  return points;
}

function snapshotWorldGeometry(object) {
  const points = collectWorldGeometryPoints(object);
  assert.ok(points.length > 0, `expected geometry for ${String(object.userData?.__kind || 'object')}`);
  const min = {
    x: Math.min(...points.map(point => point.x)),
    y: Math.min(...points.map(point => point.y)),
    z: Math.min(...points.map(point => point.z)),
  };
  const max = {
    x: Math.max(...points.map(point => point.x)),
    y: Math.max(...points.map(point => point.y)),
    z: Math.max(...points.map(point => point.z)),
  };
  const center = {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  };
  return {
    position: resolveWorldPoint(object, { x: 0, y: 0, z: 0 }),
    min,
    max,
    center,
    width: max.x - min.x,
    height: max.y - min.y,
    depth: max.z - min.z,
  };
}

function snapshotKinds(rootObject) {
  const byKind = Object.fromEntries(TARGET_KINDS.map(kind => [kind, []]));
  const pending = [...rootObject.children];
  while (pending.length) {
    const current = pending.shift();
    if (!current) continue;
    const kind = String(current.userData?.__kind || '');
    if (Object.hasOwn(byKind, kind)) byKind[kind].push(snapshotWorldGeometry(current));
    pending.unshift(...current.children);
  }
  return byKind;
}

function assertNear(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${label}: expected ${expected}, received ${actual}, delta=${Math.abs(actual - expected)}`
  );
}

function assertSnapshotNear(actual, expected, label) {
  for (const key of ['position', 'min', 'max', 'center']) {
    for (const axis of ['x', 'y', 'z']) {
      assertNear(actual[key][axis], expected[key][axis], `${label}.${key}.${axis}`);
    }
  }
  for (const dimension of ['width', 'height', 'depth']) {
    assertNear(actual[dimension], expected[dimension], `${label}.${dimension}`);
  }
}

test('canonical folded geometry preserves exact world transforms without scaling detail siblings', () => {
  const exactRoot = createFoldedScene('exact');
  const canonicalRoot = createFoldedScene('canonical-scale');
  const exactByKind = snapshotKinds(exactRoot);
  const canonicalByKind = snapshotKinds(canonicalRoot);

  for (const kind of TARGET_KINDS) {
    assert.ok(exactByKind[kind].length > 0, `fixture should emit ${kind}`);
    assert.equal(canonicalByKind[kind].length, exactByKind[kind].length, `${kind} count must remain stable`);
    for (let index = 0; index < exactByKind[kind].length; index += 1) {
      assertSnapshotNear(canonicalByKind[kind][index], exactByKind[kind][index], `${kind}[${index}]`);
    }
  }

  const canonicalGarments = canonicalRoot.children.filter(
    child => child.userData?.__kind === 'folded_cloth_item'
  );
  assert.ok(canonicalGarments.length > 0);
  assert.ok(
    canonicalGarments.every(
      garment => garment.scale.x === 1 && garment.scale.y === 1 && garment.scale.z === 1
    ),
    'garment roots must remain unscaled'
  );
  assert.ok(
    canonicalGarments.every(garment => {
      const body = garment.children.find(child => child.userData?.__kind === 'folded_cloth_body');
      const details = garment.children.filter(child =>
        String(child.userData?.__kind || '').startsWith('folded_cloth_')
      );
      return body && details.length > 1 && details.every(detail => detail.parent === garment);
    }),
    'body and details must be sibling meshes under the garment root'
  );
  assert.ok(
    canonicalGarments.some(garment => {
      const body = garment.children.find(child => child.userData?.__kind === 'folded_cloth_body');
      return Number(body?.scale?.z || 1) >= 1.8;
    }),
    'fixture must exercise the former double-scaling depth range'
  );
});
