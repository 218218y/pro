import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readCameraLike,
  readControlsLike,
  readObject3DLike,
  readRendererLike,
  setControlsEnableDamping,
} from '../esm/native/services/render_surface_runtime_support.ts';

function makeVec3() {
  return {
    x: 0,
    y: 0,
    z: 0,
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    },
    copy(v: { x: number; y: number; z: number }) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    },
    clone() {
      return makeVec3();
    },
    sub() {
      return this;
    },
    add() {
      return this;
    },
    multiplyScalar() {
      return this;
    },
    addVectors(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
      this.x = a.x + b.x;
      this.y = a.y + b.y;
      this.z = a.z + b.z;
      return this;
    },
    lerp(v: { x: number; y: number; z: number }, alpha: number) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      this.z += (v.z - this.z) * alpha;
      return this;
    },
  };
}

test('render surface runtime support: rejects loose records that miss structural 3D fields', () => {
  assert.equal(readCameraLike({ updateProjectionMatrix() {} }), null);
  assert.equal(readControlsLike({ update() {} }), null);
  assert.equal(readRendererLike({ setSize() {}, setPixelRatio() {}, setClearColor() {}, render() {} }), null);
  assert.equal(readObject3DLike({ add() {}, remove() {}, children: [] }), null);
});

test('render surface runtime support: accepts structurally valid camera/controls/renderer/object3d surfaces', () => {
  const position = makeVec3();
  const target = makeVec3();
  const scale = makeVec3();
  const camera = { position, fov: 45, updateProjectionMatrix() {} };
  const controls = {
    target,
    update() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true;
    },
  };
  const renderer = {
    domElement: {},
    shadowMap: { autoUpdate: true },
    setClearColor() {},
    setSize() {},
    setPixelRatio() {},
    render() {},
  };
  const obj = {
    parent: null,
    children: [],
    position,
    rotation: {},
    scale,
    userData: {},
    add() {},
    remove() {},
  };

  assert.equal(readCameraLike(camera), camera);
  assert.equal(readControlsLike(controls), controls);
  assert.equal(readRendererLike(renderer), renderer);
  assert.equal(readObject3DLike(obj), obj);
});

test('render surface runtime support: sets damping only on control-like surfaces', () => {
  const controls = { target: makeVec3(), update() {}, enableDamping: false };
  assert.equal(setControlsEnableDamping(controls, true), true);
  assert.equal(controls.enableDamping, true);
  assert.equal(setControlsEnableDamping({}, true), false);
});
