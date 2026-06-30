import test from 'node:test';
import assert from 'node:assert/strict';

import { createApplyHingedDoorsOps } from '../esm/native/builder/render_door_ops_hinged.ts';
import { createBuilderRenderDrawerOps } from '../esm/native/builder/render_drawer_ops.ts';
import { makeDrawerBoxPartId } from '../esm/native/features/part_identity/api.ts';

function createThreeStub() {
  class Group {
    constructor() {
      this.children = [];
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        set(x = 0, y = 0, z = 0) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
        copy(other) {
          this.x = other?.x || 0;
          this.y = other?.y || 0;
          this.z = other?.z || 0;
          return this;
        },
      };
      this.userData = {};
    }
    add(obj) {
      this.children.push(obj);
    }
  }

  class Mesh extends Group {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
    }
  }

  class BoxGeometry {
    constructor(...args) {
      this.args = args;
    }
  }

  class MeshBasicMaterial {
    constructor(props = {}) {
      Object.assign(this, props);
    }
  }

  class MeshStandardMaterial {
    constructor(props = {}) {
      Object.assign(this, props);
    }
  }

  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    copy(other) {
      this.x = other?.x || 0;
      this.y = other?.y || 0;
      this.z = other?.z || 0;
      return this;
    }
  }

  return {
    Group,
    Mesh,
    BoxGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Vector3,
    DoubleSide: 'DoubleSide',
  };
}

function createDoorVisualSpy(calls) {
  return (...args) => {
    calls.push(args);
    return {
      children: [],
      userData: {},
      add() {},
      position: { set() {} },
    };
  };
}

function createInternalDrawerBoxSpy(calls) {
  return (...args) => {
    calls.push(args);
    return { children: [], add() {}, position: { set() {} }, userData: {} };
  };
}

test('hinged door build keeps explicit glass visuals instead of normalizing them back to flat/profile defaults', () => {
  const calls = [];
  const THREE = createThreeStub();
  const wardrobeGroup = new THREE.Group();
  const applyHingedDoorsOps = createApplyHingedDoorsOps({
    __app: input => input.App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup,
    __reg: () => undefined,
    __doors: () => [],
    __markSplitHoverPickablesDirty: () => undefined,
    __tagAndTrackMirrorSurfaces: () => 0,
    getMirrorMaterial: () => ({ kind: 'mirror' }),
  });

  const didApply = applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      {
        partId: 'd1_full',
        width: 0.5,
        height: 1.2,
        x: 0,
        y: 0,
        z: 0,
        pivotX: 0,
        meshOffsetX: 0,
        isLeftHinge: true,
        isRemoved: false,
        isMirror: false,
        hasGroove: true,
        style: 'glass',
        curtain: 'white',
      },
    ],
    cfg: { doorStyleMap: { d1_full: 'profile' } },
    doorStyle: 'profile',
    globalFrontMat: { kind: 'front' },
    createDoorVisual: createDoorVisualSpy(calls),
    getPartMaterial: () => ({ kind: 'wood' }),
  });

  assert.equal(didApply, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][4], 'glass');
  assert.equal(calls[0][7], 'white');
  assert.deepEqual(calls[0][13], { glassFrameStyle: 'profile' });
});

test('split hinged glass doors inherit the full-door glass frame style instead of falling back to full-glass flat style', () => {
  const calls = [];
  const THREE = createThreeStub();
  const wardrobeGroup = new THREE.Group();
  const applyHingedDoorsOps = createApplyHingedDoorsOps({
    __app: input => input.App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup,
    __reg: () => undefined,
    __doors: () => [],
    __markSplitHoverPickablesDirty: () => undefined,
    __tagAndTrackMirrorSurfaces: () => 0,
    getMirrorMaterial: () => ({ kind: 'mirror' }),
  });

  const didApply = applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      {
        partId: 'd1_top',
        width: 0.5,
        height: 0.6,
        x: 0,
        y: 0.3,
        z: 0,
        pivotX: 0,
        meshOffsetX: 0,
        isLeftHinge: true,
        isRemoved: false,
        isMirror: false,
        hasGroove: false,
        style: 'glass',
        curtain: 'none',
      },
      {
        partId: 'd1_bot',
        width: 0.5,
        height: 0.6,
        x: 0,
        y: -0.3,
        z: 0,
        pivotX: 0,
        meshOffsetX: 0,
        isLeftHinge: true,
        isRemoved: false,
        isMirror: false,
        hasGroove: false,
        style: 'glass',
        curtain: 'none',
      },
    ],
    cfg: { doorStyleMap: { d1_full: 'profile' } },
    doorStyle: 'flat',
    globalFrontMat: { kind: 'front' },
    createDoorVisual: createDoorVisualSpy(calls),
    getPartMaterial: () => ({ kind: 'wood' }),
  });

  assert.equal(didApply, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][4], 'glass');
  assert.deepEqual(calls[0][13], { glassFrameStyle: 'profile' });
  assert.equal(calls[1][4], 'glass');
  assert.deepEqual(calls[1][13], { glassFrameStyle: 'profile' });
});

test('hinged door build writes only canonical door ids into runtime userData', () => {
  const THREE = createThreeStub();
  const wardrobeGroup = new THREE.Group();
  const applyHingedDoorsOps = createApplyHingedDoorsOps({
    __app: input => input.App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup,
    __reg: () => undefined,
    __doors: () => [],
    __markSplitHoverPickablesDirty: () => undefined,
    __tagAndTrackMirrorSurfaces: () => 0,
    getMirrorMaterial: () => ({ kind: 'mirror' }),
  });

  const didApply = applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      { partId: 'd1_full', width: 0.5, height: 1.2, isLeftHinge: true },
      { partId: 'd01_full', width: 0.5, height: 1.2, isLeftHinge: true },
      { partId: 'd1x_full', width: 0.5, height: 1.2, isLeftHinge: true },
    ],
    cfg: {},
    globalFrontMat: { kind: 'front' },
    getPartMaterial: () => ({ kind: 'wood' }),
  });

  assert.equal(didApply, true);
  assert.equal(wardrobeGroup.children[0].userData.__wpDoorId, 1);
  assert.equal(wardrobeGroup.children[1].userData.__wpDoorId, null);
  assert.equal(wardrobeGroup.children[2].userData.__wpDoorId, null);
});

test('external drawer build treats glass specials like real glass fronts, keeps the selected frame style, and hides the inner wood front', () => {
  const calls = [];
  const drawerBoxCalls = [];
  const THREE = createThreeStub();
  const wardrobeGroup = new THREE.Group();
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => input.App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup,
    __reg: () => undefined,
    __drawers: () => [],
    getMirrorMaterial: () => ({ kind: 'mirror' }),
  });

  const didApply = renderDrawerOps.applyExternalDrawersOps({
    App: {},
    THREE,
    ops: {
      drawers: [
        {
          partId: 'drawer_1',
          visualW: 0.6,
          visualH: 0.25,
          visualT: 0.02,
          boxW: 0.56,
          boxH: 0.18,
          boxD: 0.5,
        },
      ],
    },
    cfg: {
      isMultiColorMode: true,
      doorSpecialMap: { drawer_1: 'glass' },
      curtainMap: { drawer_1: 'purple' },
      doorStyleMap: { drawer_1: 'double_profile' },
    },
    doorStyle: 'profile',
    globalFrontMat: { kind: 'front' },
    createDoorVisual: createDoorVisualSpy(calls),
    createInternalDrawerBox: createInternalDrawerBoxSpy(drawerBoxCalls),
    getPartMaterial: () => ({ kind: 'wood' }),
    bodyMat: { kind: 'body' },
    addOutlines: () => undefined,
  });

  assert.equal(didApply, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][4], 'glass');
  assert.equal(calls[0][6], false);
  assert.equal(calls[0][7], 'purple');
  assert.deepEqual(calls[0][13], { glassFrameStyle: 'double_profile' });
  assert.equal(drawerBoxCalls.length, 1);
  assert.deepEqual(drawerBoxCalls[0][8], { omitFrontPanel: true });
  assert.equal(wardrobeGroup.children.length, 1);
  assert.equal(
    wardrobeGroup.children[0].children.length,
    2,
    'glass drawer should not keep a wood connector behind the glass'
  );
});

test('external drawer build keeps drawer boxes as independent paint targets', () => {
  const THREE = createThreeStub();
  const wardrobeGroup = new THREE.Group();
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => input.App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup,
    __reg: () => undefined,
    __drawers: () => [],
    getMirrorMaterial: () => ({ kind: 'mirror' }),
  });

  const firstBoxId = makeDrawerBoxPartId('drawer_1');
  const secondBoxId = makeDrawerBoxPartId('drawer_2');
  const colorMap = {
    drawer_1: '#884422',
    [secondBoxId]: '#226688',
  };

  const didApply = renderDrawerOps.applyExternalDrawersOps({
    App: {},
    THREE,
    ops: {
      drawers: [
        {
          partId: 'drawer_1',
          visualW: 0.6,
          visualH: 0.25,
          boxW: 0.56,
          boxH: 0.18,
          boxD: 0.5,
          connectW: 0.5,
          connectH: 0.16,
          connectD: 0.02,
        },
        {
          partId: 'drawer_2',
          visualW: 0.6,
          visualH: 0.25,
          boxW: 0.56,
          boxH: 0.18,
          boxD: 0.5,
          connectW: 0.5,
          connectH: 0.16,
          connectD: 0.02,
        },
      ],
    },
    cfg: { isMultiColorMode: true },
    bodyMat: { kind: 'body' },
    whiteMat: { kind: 'white' },
    getPartColorValue: partId => colorMap[partId],
    getPartMaterial: partId => ({ kind: 'paint', partId }),
  });

  assert.equal(didApply, true);
  const firstDrawer = wardrobeGroup.children[0];
  const secondDrawer = wardrobeGroup.children[1];

  assert.deepEqual(firstDrawer.children[0].material, { kind: 'white' });
  assert.deepEqual(firstDrawer.children[1].material, { kind: 'paint', partId: 'drawer_1' });
  assert.deepEqual(firstDrawer.children[2].material, { kind: 'white' });
  assert.equal(firstDrawer.children[0].userData.partId, firstBoxId);
  assert.equal(firstDrawer.children[2].userData.partId, firstBoxId);
  assert.equal(firstDrawer.children[0].userData.__wpDrawerBox, true);

  assert.deepEqual(secondDrawer.children[0].material, { kind: 'paint', partId: secondBoxId });
  assert.deepEqual(secondDrawer.children[2].material, { kind: 'paint', partId: secondBoxId });
  assert.equal(secondDrawer.children[0].userData.partId, secondBoxId);
});

test('external drawer build appends configured door-trim visuals to drawer fronts', () => {
  const THREE = createThreeStub();
  const wardrobeGroup = new THREE.Group();
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => input.App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup,
    __reg: () => undefined,
    __drawers: () => [],
    getMirrorMaterial: () => ({ kind: 'mirror' }),
  });

  const didApply = renderDrawerOps.applyExternalDrawersOps({
    App: {},
    THREE,
    ops: {
      drawers: [
        {
          partId: 'd1_draw_1',
          visualW: 0.6,
          visualH: 0.25,
          visualT: 0.02,
          boxW: 0.56,
          boxH: 0.18,
          boxD: 0.5,
        },
      ],
    },
    cfg: {
      doorTrimMap: {
        d1_draw_1: [{ id: 'trim-drawer', axis: 'horizontal', color: 'gold', span: 'full' }],
      },
    },
    bodyMat: { kind: 'body' },
  });

  assert.equal(didApply, true);
  const drawerGroup = wardrobeGroup.children[0];
  assert.equal(drawerGroup.children.length, 3);
  assert.equal(drawerGroup.children[2].userData.__wpDoorTrim, true);
  assert.equal(drawerGroup.children[2].userData.partId, 'd1_draw_1');
  assert.equal(drawerGroup.children[2].position.z > 0, true);
});

test('external drawer build emits folded contents inside drawer boxes when contents are enabled', () => {
  const foldedCalls = [];
  const THREE = createThreeStub();
  const wardrobeGroup = new THREE.Group();
  const renderDrawerOps = createBuilderRenderDrawerOps({
    __app: input => input.App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup,
    __reg: () => undefined,
    __drawers: () => [],
    getMirrorMaterial: () => ({ kind: 'mirror' }),
  });

  const didApply = renderDrawerOps.applyExternalDrawersOps({
    App: {},
    THREE,
    ops: {
      drawers: [
        {
          partId: 'drawer_contents_1',
          visualW: 0.6,
          visualH: 0.25,
          boxW: 0.56,
          boxH: 0.18,
          boxD: 0.5,
        },
      ],
    },
    cfg: {},
    bodyMat: { kind: 'body' },
    showContentsEnabled: true,
    addFoldedClothes: (...call) => foldedCalls.push(call),
  });

  assert.equal(didApply, true);
  assert.equal(foldedCalls.length, 1);
  assert.equal(foldedCalls[0][4], wardrobeGroup.children[0].children[0]);
  assert.equal(Number(foldedCalls[0][3].toFixed(3)), 0.51);
  assert.equal(Number(foldedCalls[0][5].toFixed(3)), 0.15);
  assert.equal(foldedCalls[0][6], 0.5);
});
