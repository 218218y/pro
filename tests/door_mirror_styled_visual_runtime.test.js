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
const { createStyledMirrorDoorVisual } = loadTsModule(
  path.join(process.cwd(), 'esm/native/builder/visuals_and_contents_door_visual_mirror_styled.ts')
);
const { createDoorVisual } = loadTsModule(
  path.join(process.cwd(), 'esm/native/builder/visuals_and_contents_door_visual.ts')
);
const { FULL_MIRROR_INSET_M } = loadTsModule(
  path.join(process.cwd(), 'esm/shared/mirror_layout_contracts_shared.ts')
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
class FakeBoxGeometry {
  constructor(...args) {
    this.type = 'BoxGeometry';
    this.args = args;
  }
}
class FakeShape {
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
class FakePath extends FakeShape {}
class FakeShapeGeometry {
  constructor(shape) {
    this.type = 'ShapeGeometry';
    this.shape = shape;
  }
}
class FakeExtrudeGeometry {
  constructor(shape, options) {
    this.type = 'ExtrudeGeometry';
    this.shape = shape;
    this.options = options;
  }
  translate() {}
}
class FakeBufferGeometry {
  setFromPoints(points) {
    this.points = points;
  }
}
class FakeLineBasicMaterial {
  constructor(props = {}) {
    Object.assign(this, props);
  }
}
class FakeLine extends FakeObject3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}
class FakeMeshBasicMaterial {
  constructor(props = {}) {
    Object.assign(this, props);
  }
}
class FakeMeshStandardMaterial {
  constructor(props = {}) {
    Object.assign(this, props);
  }
}

function createThree() {
  return {
    Group: FakeGroup,
    Mesh: FakeMesh,
    BoxGeometry: FakeBoxGeometry,
    Shape: FakeShape,
    Path: FakePath,
    ShapeGeometry: FakeShapeGeometry,
    ExtrudeGeometry: FakeExtrudeGeometry,
    BufferGeometry: FakeBufferGeometry,
    LineBasicMaterial: FakeLineBasicMaterial,
    Line: FakeLine,
    MeshBasicMaterial: FakeMeshBasicMaterial,
    MeshStandardMaterial: FakeMeshStandardMaterial,
    Vector3: FakeVector3,
    DoubleSide: 2,
  };
}

function createTagger() {
  return (node, role) => {
    node.userData = node.userData || {};
    if (role) node.userData.__doorVisualRole = role;
  };
}

function collectRoles(node, out = []) {
  if (node?.userData?.__doorVisualRole) out.push(node.userData.__doorVisualRole);
  if (Array.isArray(node?.children)) {
    for (const child of node.children) collectRoles(child, out);
  }
  return out;
}

function findRole(node, role) {
  if (node?.userData?.__doorVisualRole === role) return node;
  if (Array.isArray(node?.children)) {
    for (const child of node.children) {
      const match = findRole(child, role);
      if (match) return match;
    }
  }
  return null;
}

function createCommonArgs() {
  const THREE = createThree();
  const visualGroup = new THREE.Group();
  return {
    THREE,
    visualGroup,
    addOutlines() {},
    tagDoorVisualPart: createTagger(),
    isSketch: false,
    w: 0.7,
    h: 1.9,
    thickness: 0.02,
    zSign: 1,
  };
}

function createDoorVisualApp(THREE) {
  return { deps: { THREE }, services: {} };
}

function uniqueSortedRoles(roles, prefix) {
  return [...new Set(roles.filter(role => role.startsWith(prefix)))].sort();
}

function readRectSpan(node) {
  return {
    width: Number(node.userData.__mirrorRectMaxX) - Number(node.userData.__mirrorRectMinX),
    height: Number(node.userData.__mirrorRectMaxY) - Number(node.userData.__mirrorRectMinY),
  };
}

test('styled mirror profile visual keeps the decorative frame, preserves the wood center panel, and adds the mirror above it', () => {
  const mirrorArgs = createCommonArgs();
  const mirrorVisual = createStyledMirrorDoorVisual({
    App: {},
    ...mirrorArgs,
    style: 'profile',
    mat: { kind: 'mirror' },
    baseMaterial: { kind: 'wood' },
    mirrorLayout: null,
  });
  const profileArgs = createCommonArgs();
  const profileVisual = createProfileDoorVisual({
    App: {},
    ...profileArgs,
    mat: { kind: 'wood' },
    hasGrooves: false,
    groovePartId: null,
  });

  const mirrorRoles = collectRoles(mirrorVisual);
  const profileRoles = collectRoles(profileVisual);
  assert.deepEqual(
    uniqueSortedRoles(mirrorRoles, 'door_profile_'),
    uniqueSortedRoles(profileRoles, 'door_profile_')
  );
  assert.ok(mirrorRoles.includes('door_mirror_center_panel'));
  assert.ok(mirrorRoles.includes('door_profile_center_panel'));

  const woodCenter = findRole(mirrorVisual, 'door_profile_center_panel');
  const mirrorPane = findRole(mirrorVisual, 'door_mirror_center_panel');
  assert.ok(woodCenter);
  assert.ok(mirrorPane);
  assert.equal(woodCenter.material.kind, 'wood');
  assert.equal(mirrorPane.geometry?.type, 'BoxGeometry');
  assert.ok(mirrorPane.geometry.args[0] < mirrorArgs.w);
  assert.ok(mirrorPane.geometry.args[1] < mirrorArgs.h);
  assert.equal(mirrorPane.material.kind, 'mirror');
  assert.ok(Array.isArray(woodCenter.children) && woodCenter.children.includes(mirrorPane));
});

test('styled mirror tom visual keeps the tom frame, preserves the wood center panel, and adds the mirror above it', () => {
  const mirrorArgs = createCommonArgs();
  const mirrorVisual = createStyledMirrorDoorVisual({
    App: {},
    ...mirrorArgs,
    style: 'tom',
    mat: { kind: 'mirror' },
    baseMaterial: { kind: 'wood' },
    mirrorLayout: null,
  });
  const tomArgs = createCommonArgs();
  const tomVisual = createTomDoorVisual({
    App: {},
    ...tomArgs,
    mat: { kind: 'wood' },
    hasGrooves: false,
    groovePartId: null,
  });

  const mirrorRoles = collectRoles(mirrorVisual);
  const tomRoles = collectRoles(tomVisual);
  assert.deepEqual(uniqueSortedRoles(mirrorRoles, 'door_tom_'), uniqueSortedRoles(tomRoles, 'door_tom_'));
  assert.ok(mirrorRoles.includes('door_mirror_center_panel'));
  assert.ok(mirrorRoles.includes('door_tom_center_panel'));

  const woodCenter = findRole(mirrorVisual, 'door_tom_center_panel');
  const mirrorPane = findRole(mirrorVisual, 'door_mirror_center_panel');
  assert.ok(woodCenter);
  assert.ok(mirrorPane);
  assert.equal(woodCenter.material.kind, 'wood');
  assert.equal(mirrorPane.geometry?.type, 'BoxGeometry');
  assert.ok(mirrorPane.geometry.args[0] < mirrorArgs.w);
  assert.ok(mirrorPane.geometry.args[1] < mirrorArgs.h);
  assert.equal(mirrorPane.material.kind, 'mirror');
  assert.ok(Array.isArray(woodCenter.children) && woodCenter.children.includes(mirrorPane));
});

test('profile and tom center panels publish mirror placement metadata for sized mirror clicks', () => {
  const profileArgs = createCommonArgs();
  const profileVisual = createProfileDoorVisual({
    App: {},
    ...profileArgs,
    mat: { kind: 'wood' },
    hasGrooves: false,
    groovePartId: null,
  });
  const profileCenter = profileVisual.children.find(
    child => child.userData?.__doorVisualRole === 'door_profile_center_panel'
  );
  assert.ok(profileCenter);
  assert.equal(profileCenter.userData.__mirrorRectMinX, -(profileCenter.geometry.args[0] / 2));
  assert.equal(profileCenter.userData.__mirrorRectMaxX, profileCenter.geometry.args[0] / 2);
  assert.equal(profileCenter.userData.__mirrorRectMinY, -(profileCenter.geometry.args[1] / 2));
  assert.equal(profileCenter.userData.__mirrorRectMaxY, profileCenter.geometry.args[1] / 2);

  const tomArgs = createCommonArgs();
  const tomVisual = createTomDoorVisual({
    App: {},
    ...tomArgs,
    mat: { kind: 'wood' },
    hasGrooves: false,
    groovePartId: null,
  });
  const tomCenter = tomVisual.children.find(
    child => child.userData?.__doorVisualRole === 'door_tom_center_panel'
  );
  assert.ok(tomCenter);
  const rawFrameW = 0.045;
  const frameW = Math.max(0.02, Math.min(rawFrameW, tomArgs.w / 2 - 0.02, tomArgs.h / 2 - 0.02));
  const innerW = Math.max(0.02, tomArgs.w - 2 * frameW);
  const innerH = Math.max(0.02, tomArgs.h - 2 * frameW);
  const innerRaisedInset = Math.max(0.006, Math.min(frameW * 0.22, 0.014));
  const innerRaisedOuterW = Math.max(0.02, innerW - 2 * innerRaisedInset);
  const innerRaisedOuterH = Math.max(0.02, innerH - 2 * innerRaisedInset);
  const innerRaisedBandW = Math.max(
    0.006,
    Math.min(frameW * 0.24, innerRaisedOuterW / 2 - 0.012, innerRaisedOuterH / 2 - 0.012)
  );
  const expectedMirrorW = Math.max(0.02, innerRaisedOuterW - 2 * innerRaisedBandW);
  const expectedMirrorH = Math.max(0.02, innerRaisedOuterH - 2 * innerRaisedBandW);
  assert.equal(tomCenter.userData.__mirrorRectMinX, -(expectedMirrorW / 2));
  assert.equal(tomCenter.userData.__mirrorRectMaxX, expectedMirrorW / 2);
  assert.equal(tomCenter.userData.__mirrorRectMinY, -(expectedMirrorH / 2));
  assert.equal(tomCenter.userData.__mirrorRectMaxY, expectedMirrorH / 2);
  assert.ok(expectedMirrorW < tomCenter.geometry.args[0]);
  assert.ok(expectedMirrorH < tomCenter.geometry.args[1]);
});

test('styled mirror tom visual clamps sized mirror placements to the inner raised opening instead of the full wood center panel', () => {
  const mirrorArgs = createCommonArgs();
  const mirrorVisual = createStyledMirrorDoorVisual({
    App: {},
    ...mirrorArgs,
    style: 'tom',
    mat: { kind: 'mirror' },
    baseMaterial: { kind: 'wood' },
    mirrorLayout: [{ widthCm: 200, heightCm: 200 }],
  });

  const woodCenter = findRole(mirrorVisual, 'door_tom_center_panel');
  const mirrorPane = findRole(mirrorVisual, 'door_mirror_center_panel');
  assert.ok(woodCenter);
  assert.ok(mirrorPane);

  const rectSpan = readRectSpan(woodCenter);
  assert.ok(rectSpan.width < woodCenter.geometry.args[0]);
  assert.ok(rectSpan.height < woodCenter.geometry.args[1]);
  assert.ok(Math.abs(mirrorPane.geometry.args[0] - (rectSpan.width - FULL_MIRROR_INSET_M)) < 1e-9);
  assert.ok(Math.abs(mirrorPane.geometry.args[1] - (rectSpan.height - FULL_MIRROR_INSET_M)) < 1e-9);
});

test('createDoorVisual routes default outside full mirror on a profile door through the full-door mirror slab path', () => {
  const THREE = createThree();
  const visual = createDoorVisual(
    createDoorVisualApp(THREE),
    0.7,
    1.9,
    0.02,
    { kind: 'mirror' },
    'profile',
    false,
    true,
    null,
    { kind: 'wood' },
    1,
    false,
    null,
    'd1_full'
  );

  const roles = collectRoles(visual);
  assert.equal(
    roles.some(role => role.startsWith('door_profile_')),
    false
  );
  assert.equal(visual.children[0].geometry.args[0], 0.7);
  assert.equal(visual.children[0].geometry.args[1], 1.9);
  assert.equal(visual.children[1].material.kind, 'mirror');
});

test('createDoorVisual keeps profile styling when the only full mirror is on the inside face', () => {
  const THREE = createThree();
  const visual = createDoorVisual(
    createDoorVisualApp(THREE),
    0.7,
    1.9,
    0.02,
    { kind: 'mirror' },
    'profile',
    false,
    true,
    null,
    { kind: 'wood' },
    1,
    false,
    [{ faceSign: -1 }],
    'd1_full'
  );

  const roles = collectRoles(visual);
  assert.ok(roles.some(role => role.startsWith('door_profile_')));
  assert.ok(roles.includes('door_mirror_inside_full_panel'));
  assert.equal(
    roles.includes('door_mirror_center_panel'),
    false,
    'inside full mirror should not be treated as a sized center-panel mirror'
  );

  const mirrorPane = findRole(visual, 'door_mirror_inside_full_panel');
  assert.ok(mirrorPane);
  assert.equal(mirrorPane.geometry.args[0], 0.7 - FULL_MIRROR_INSET_M);
  assert.equal(mirrorPane.geometry.args[1], 1.9 - FULL_MIRROR_INSET_M);
  const mirrorThickness = mirrorPane.geometry.args[2];
  assert.ok(
    mirrorPane.position.z + mirrorThickness / 2 < -0.02 / 2,
    'inside full mirror should protrude from the back face, not flatten the front profile'
  );
});

test('createDoorVisual keeps styled side profiles when mirror placements are explicitly sized', () => {
  const THREE = createThree();
  const visual = createDoorVisual(
    createDoorVisualApp(THREE),
    0.7,
    1.9,
    0.02,
    { kind: 'mirror' },
    'profile',
    false,
    true,
    null,
    { kind: 'wood' },
    1,
    false,
    [{ widthCm: 30, heightCm: 60 }],
    'd1_full'
  );

  const roles = collectRoles(visual);
  assert.ok(roles.some(role => role.startsWith('door_profile_')));
  assert.ok(roles.includes('door_mirror_center_panel'));
});

test('createDoorVisual mounts explicitly sized inside mirrors on the back side of the styled center panel', () => {
  const THREE = createThree();
  const visual = createDoorVisual(
    createDoorVisualApp(THREE),
    0.7,
    1.9,
    0.02,
    { kind: 'mirror' },
    'profile',
    false,
    true,
    null,
    { kind: 'wood' },
    1,
    false,
    [{ widthCm: 30, heightCm: 60, faceSign: -1 }],
    'd1_full'
  );

  const center = findRole(visual, 'door_profile_center_panel');
  const mirrorPane = findRole(visual, 'door_mirror_center_panel');
  assert.ok(center);
  assert.ok(mirrorPane);
  assert.ok(center.children.includes(mirrorPane));

  const centerDepth = center.geometry.args[2];
  const mirrorThickness = mirrorPane.geometry.args[2];
  assert.ok(
    mirrorPane.position.z + mirrorThickness / 2 < -centerDepth / 2,
    'sized inside mirror should be mounted outside the center panel back face'
  );
});
