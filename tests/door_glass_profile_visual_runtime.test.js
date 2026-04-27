import test from 'node:test';
import assert from 'node:assert/strict';

import { createDoorVisual } from '../esm/native/builder/visuals_and_contents_door_visual.ts';
import { createGlassDoorVisual } from '../esm/native/builder/visuals_and_contents_door_visual_glass.ts';
import { createProfileDoorVisual } from '../esm/native/builder/visuals_and_contents_door_visual_profile.ts';
import { createStyledMirrorDoorVisual } from '../esm/native/builder/visuals_and_contents_door_visual_mirror_styled.ts';

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

class FakeNativeBoxGeometry {
  constructor(width, height, depth) {
    this.type = 'BoxGeometry';
    this.parameters = {
      width,
      height,
      depth,
      widthSegments: 1,
      heightSegments: 1,
      depthSegments: 1,
    };
  }
}

class FakePlaneGeometry {
  constructor(...args) {
    this.type = 'PlaneGeometry';
    this.args = args;
    this.attributes = {
      position: {
        count: 4,
        getX(index) {
          return [-0.5, 0.5, -0.5, 0.5][index] || 0;
        },
        setZ() {},
      },
    };
  }
  computeVertexNormals() {}
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
class FakeColor {
  constructor(value) {
    this.value = value;
  }
}

function createTagger() {
  return (node, role) => {
    node.userData = node.userData || {};
    if (role) node.userData.__doorVisualRole = role;
  };
}

function createThree() {
  return {
    Group: FakeGroup,
    Mesh: FakeMesh,
    BoxGeometry: FakeBoxGeometry,
    PlaneGeometry: FakePlaneGeometry,
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
    Color: FakeColor,
    DoubleSide: 2,
  };
}

function createThreeWithNativeBoxParameters() {
  return {
    ...createThree(),
    BoxGeometry: FakeNativeBoxGeometry,
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
    w: 0.6,
    h: 1,
    thickness: 0.02,
    mat: { kind: 'wood' },
    zSign: 1,
  };
}

test('glass door visual reuses the exact profile frame and only swaps the center insert to glass', () => {
  const glassArgs = createCommonArgs();
  const glassVisual = createGlassDoorVisual({
    ...glassArgs,
    curtainType: 'none',
    forceCurtainFix: false,
  });
  const profileArgs = createCommonArgs();
  const profileVisual = createProfileDoorVisual({
    App: {},
    ...profileArgs,
    hasGrooves: false,
    groovePartId: null,
  });

  const glassRoles = collectRoles(glassVisual);
  const profileRoles = collectRoles(profileVisual);
  const onlyFrameRoles = roles =>
    [
      ...new Set(
        roles.filter(role => role.startsWith('door_profile_outer_') || role.startsWith('door_profile_inner_'))
      ),
    ].sort();

  assert.deepEqual(onlyFrameRoles(glassRoles), onlyFrameRoles(profileRoles));
  assert.ok(glassRoles.includes('door_glass_center_panel'));
  assert.ok(!glassRoles.includes('door_profile_center_panel'));

  const glassPane = glassVisual.children.find(
    child => child.userData?.__doorVisualRole === 'door_glass_center_panel'
  );
  assert.ok(glassPane);
  assert.equal(glassPane.geometry?.type, 'BoxGeometry');
  assert.ok(glassPane.geometry.args[0] < glassArgs.w);
  assert.ok(glassPane.geometry.args[1] < glassArgs.h);
  assert.equal(glassPane.material.transparent, true);
});

test('styled mirror door keeps the profile frame and reads center-panel dimensions from Three.js BoxGeometry parameters', () => {
  const THREE = createThreeWithNativeBoxParameters();
  const visual = createStyledMirrorDoorVisual({
    App: {},
    THREE,
    style: 'profile',
    w: 0.8,
    h: 1.8,
    thickness: 0.02,
    mat: { kind: 'mirror' },
    baseMaterial: { kind: 'wood' },
    zSign: 1,
    isSketch: false,
    mirrorLayout: [{ widthCm: 200, heightCm: 200 }],
    addOutlines() {},
    tagDoorVisualPart: createTagger(),
  });

  const roles = collectRoles(visual);
  assert.ok(roles.some(role => role.startsWith('door_profile_outer_')));
  assert.ok(roles.some(role => role.startsWith('door_profile_inner_')));
  assert.ok(roles.includes('door_profile_center_panel'));
  assert.ok(roles.includes('door_mirror_center_panel'));

  const woodCenterPanel = findRole(visual, 'door_profile_center_panel');
  const mirrorPane = findRole(visual, 'door_mirror_center_panel');
  assert.ok(woodCenterPanel);
  assert.ok(mirrorPane);
  assert.equal(woodCenterPanel.material.kind, 'wood');
  assert.equal(mirrorPane.material.kind, 'mirror');
  assert.ok(Array.isArray(woodCenterPanel.children) && woodCenterPanel.children.includes(mirrorPane));
  assert.ok(
    mirrorPane.geometry.parameters.width < 0.7,
    'sized mirror should be clamped to the wood center panel, not the outer door slab'
  );
  assert.ok(mirrorPane.geometry.parameters.height < 1.7);
});

test('full mirror on a profile-styled door uses the flat full-door mirror route even when a stale center-only layout is present', () => {
  const THREE = createThreeWithNativeBoxParameters();
  const visual = createDoorVisual(
    { deps: { THREE }, services: { builder: { modules: {}, contents: {} } } },
    0.8,
    1.8,
    0.02,
    { kind: 'mirror' },
    'profile',
    false,
    true,
    'none',
    { kind: 'wood' },
    1,
    false,
    [{ centerXNorm: 0.25 }],
    'd1_full'
  );

  const roles = collectRoles(visual);
  assert.ok(!roles.includes('door_profile_center_panel'));
  assert.ok(!roles.includes('door_mirror_center_panel'));
  assert.equal(visual.children.length, 2);
  assert.equal(visual.children[0].material.kind, 'wood');
  assert.equal(visual.children[1].material.kind, 'mirror');
  assert.equal(visual.children[1].geometry.parameters.width, 0.8 - 0.002);
});
