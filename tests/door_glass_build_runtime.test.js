import test from 'node:test';
import assert from 'node:assert/strict';

import { createApplyHingedDoorsOps } from '../esm/native/builder/render_door_ops_hinged.ts';
import { createBuilderRenderDrawerOps } from '../esm/native/builder/render_drawer_ops.ts';

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

  return { Group, Mesh, BoxGeometry, MeshBasicMaterial, Vector3, DoubleSide: 'DoubleSide' };
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
      doorStyleMap: { drawer_1: 'tom' },
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
  assert.deepEqual(calls[0][13], { glassFrameStyle: 'tom' });
  assert.equal(drawerBoxCalls.length, 1);
  assert.deepEqual(drawerBoxCalls[0][8], { omitFrontPanel: true });
  assert.equal(wardrobeGroup.children.length, 1);
  assert.equal(wardrobeGroup.children[0].children.length, 2, 'glass drawer should not keep a wood connector behind the glass');
});
