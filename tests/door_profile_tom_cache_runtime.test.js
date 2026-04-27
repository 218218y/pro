import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const moduleCache = new Map();

function resolveTsPath(specifier, fromFile) {
  if (specifier.startsWith('.')) {
    const resolved = path.resolve(path.dirname(fromFile), specifier);
    const candidates = [resolved, resolved.replace(/\.js$/i, '.ts'), resolved.replace(/\.js$/i, '.js')];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

function loadTsModule(file) {
  const normalized = path.resolve(file);
  if (moduleCache.has(normalized)) return moduleCache.get(normalized).exports;

  const source = fs.readFileSync(normalized, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: normalized,
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(normalized, mod);
  const localRequire = specifier => {
    const maybeTs = resolveTsPath(specifier, normalized);
    if (maybeTs) return loadTsModule(maybeTs);
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(normalized),
    __filename: normalized,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: normalized });
  return mod.exports;
}

const { createProfileDoorVisual } = loadTsModule(
  path.join(process.cwd(), 'esm/native/builder/visuals_and_contents_door_visual_profile.ts')
);
const { createTomDoorVisual } = loadTsModule(
  path.join(process.cwd(), 'esm/native/builder/visuals_and_contents_door_visual_tom.ts')
);

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
    this.position = new FakeVector3();
    this.rotation = new FakeVector3();
    this.userData = {};
    this.renderOrder = 0;
  }
  add(child) {
    this.children.push(child);
    return child;
  }
}

class FakeGroup extends FakeObject3D {}
class FakeMesh extends FakeObject3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

function createCountingThree(counts) {
  class BoxGeometry {
    constructor(...args) {
      counts.box += 1;
      this.args = args;
      this.uuid = `box-${counts.box}`;
    }
  }
  class Shape {
    constructor() {
      this.cmds = [];
      this.holes = [];
    }
    moveTo(...args) {
      this.cmds.push(['moveTo', ...args]);
    }
    lineTo(...args) {
      this.cmds.push(['lineTo', ...args]);
    }
    closePath() {
      this.cmds.push(['closePath']);
    }
  }
  class Path extends Shape {}
  class ShapeGeometry {
    constructor(shape) {
      counts.shape += 1;
      this.shape = shape;
      this.uuid = `shape-${counts.shape}`;
    }
  }
  class ExtrudeGeometry {
    constructor(shape, options) {
      counts.extrude += 1;
      this.shape = shape;
      this.options = options;
      this.uuid = `extrude-${counts.extrude}`;
    }
    translate() {}
  }
  class BufferGeometry {
    constructor() {
      counts.buffer += 1;
      this.uuid = `buffer-${counts.buffer}`;
    }
    setFromPoints(points) {
      this.points = points;
    }
  }
  class LineBasicMaterial {
    constructor(props = {}) {
      counts.lineMat += 1;
      Object.assign(this, props);
    }
  }
  class MeshBasicMaterial {
    constructor(props = {}) {
      counts.basicMat += 1;
      Object.assign(this, props);
    }
  }
  class MeshStandardMaterial {
    constructor(props = {}) {
      counts.standardMat += 1;
      Object.assign(this, props);
      this.color = this.color && typeof this.color.setHex === 'function' ? this.color : { setHex() {} };
    }
  }
  class Line extends FakeObject3D {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
    }
  }

  return {
    Group: FakeGroup,
    Mesh: FakeMesh,
    BoxGeometry,
    Shape,
    Path,
    ShapeGeometry,
    ExtrudeGeometry,
    BufferGeometry,
    LineBasicMaterial,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Line,
    Vector3: FakeVector3,
  };
}

function createTagger() {
  return (node, role) => {
    node.userData = node.userData || {};
    node.userData.__doorVisualRole = role;
  };
}

function createArgs(App, THREE) {
  return {
    App,
    THREE,
    visualGroup: new THREE.Group(),
    addOutlines() {},
    tagDoorVisualPart: createTagger(),
    isSketch: false,
    w: 0.7,
    h: 1.9,
    thickness: 0.02,
    mat: { kind: 'wood' },
    hasGrooves: true,
    groovePartId: 'd1',
    zSign: 1,
  };
}

function snapshotCounts(counts) {
  return { ...counts };
}

test('profile door visuals reuse cached heavy geometries and materials across repeated builds', () => {
  const counts = { box: 0, shape: 0, extrude: 0, buffer: 0, lineMat: 0, basicMat: 0, standardMat: 0 };
  const THREE = createCountingThree(counts);
  const App = { services: {}, render: {} };

  createProfileDoorVisual(createArgs(App, THREE));
  const afterFirst = snapshotCounts(counts);
  createProfileDoorVisual(createArgs(App, THREE));

  assert.equal(counts.box, afterFirst.box);
  assert.equal(counts.shape, afterFirst.shape);
  assert.equal(counts.extrude, afterFirst.extrude);
  assert.equal(counts.lineMat, afterFirst.lineMat);
  assert.equal(counts.basicMat, afterFirst.basicMat);
  assert.equal(counts.standardMat, afterFirst.standardMat);
  assert.ok(afterFirst.extrude > 0);
  assert.ok(afterFirst.shape > 0);
});

test('tom door visuals reuse cached heavy geometries and materials across repeated builds', () => {
  const counts = { box: 0, shape: 0, extrude: 0, buffer: 0, lineMat: 0, basicMat: 0, standardMat: 0 };
  const THREE = createCountingThree(counts);
  const App = { services: {}, render: {} };

  createTomDoorVisual(createArgs(App, THREE));
  const afterFirst = snapshotCounts(counts);
  createTomDoorVisual(createArgs(App, THREE));

  assert.equal(counts.box, afterFirst.box);
  assert.equal(counts.shape, afterFirst.shape);
  assert.equal(counts.extrude, afterFirst.extrude);
  assert.equal(counts.lineMat, afterFirst.lineMat);
  assert.equal(counts.basicMat, afterFirst.basicMat);
  assert.equal(counts.standardMat, afterFirst.standardMat);
  assert.ok(afterFirst.extrude > 0);
  assert.ok(afterFirst.shape > 0);
});

test('profile/tom door visual cache writes into canonical render cache/meta maps so prune can see the pressure', () => {
  const counts = { box: 0, shape: 0, extrude: 0, buffer: 0, lineMat: 0, basicMat: 0, standardMat: 0 };
  const THREE = createCountingThree(counts);
  const App = {
    deps: { THREE },
    services: {},
    render: {
      cache: {
        materialCache: new Map(),
        textureCache: new Map(),
        geometryCache: new Map(),
        edgesGeometryCache: new Map(),
      },
      meta: {
        material: new Map(),
        texture: new Map(),
        geometry: new Map(),
        edges: new Map(),
        dimLabel: new Map(),
        mirrors: [],
      },
    },
  };

  createProfileDoorVisual(createArgs(App, THREE));
  createTomDoorVisual(createArgs(App, THREE));

  assert.ok(App.render.cache.geometryCache.size > 0);
  assert.ok(App.render.cache.materialCache.size > 0);
  for (const key of App.render.cache.geometryCache.keys()) {
    assert.equal(App.render.meta.geometry.has(key), true);
  }
  for (const key of App.render.cache.materialCache.keys()) {
    assert.equal(App.render.meta.material.has(key), true);
  }
});
