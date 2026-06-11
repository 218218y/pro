import test from 'node:test';
import assert from 'node:assert/strict';

import { getCameraAndControls, getRenderContext } from '../esm/native/runtime/render_context_access.ts';

type AnyRecord = Record<string, unknown>;

function makeElement(id: string): HTMLElement {
  return {
    id,
    nodeType: 1,
    appendChild: () => undefined,
  } as unknown as HTMLElement;
}

test('render context access returns the canonical viewport surface plus viewer container', () => {
  const viewer = makeElement('viewer-container');
  const camera = { position: { x: 1, y: 2, z: 3 }, fov: 45, updateProjectionMatrix: () => undefined };
  const controls = { target: { x: 4, y: 5, z: 6 }, update: () => undefined };
  const scene = {
    parent: null,
    children: [],
    position: {
      x: 0,
      y: 0,
      z: 0,
      set: () => undefined,
      copy: () => undefined,
      clone: () => ({ x: 0, y: 0, z: 0 }),
      sub: () => undefined,
      add: () => undefined,
      multiplyScalar: () => undefined,
      addVectors: () => undefined,
      lerp: () => undefined,
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: {
      x: 1,
      y: 1,
      z: 1,
      set: () => undefined,
      copy: () => undefined,
      clone: () => ({ x: 1, y: 1, z: 1 }),
      sub: () => undefined,
      add: () => undefined,
      multiplyScalar: () => undefined,
      addVectors: () => undefined,
      lerp: () => undefined,
    },
    userData: {},
    add: () => undefined,
    remove: () => undefined,
  };
  const wardrobeGroup = { ...scene };
  const roomGroup = { ...scene };
  const renderer = {
    domElement: viewer,
    setClearColor: () => undefined,
    setSize: () => undefined,
    setPixelRatio: () => undefined,
    render: () => undefined,
    shadowMap: { autoUpdate: false },
  };

  const doc = {
    getElementById: (id: string) => (id === 'viewer-container' ? viewer : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => viewer,
    body: viewer,
    documentElement: viewer,
  };

  const App: AnyRecord = {
    deps: { browser: { document: doc } },
    browser: { getDocument: () => doc },
    render: { renderer, scene, camera, controls, wardrobeGroup, roomGroup },
  };

  const ctx = getRenderContext(App as never);
  assert.equal(ctx.container, viewer);
  assert.equal(ctx.renderer, renderer);
  assert.equal(ctx.scene, scene);
  assert.equal(ctx.camera, camera);
  assert.equal(ctx.controls, controls);
  assert.equal(ctx.wardrobeGroup, wardrobeGroup);
  assert.equal(ctx.roomGroup, roomGroup);

  const pair = getCameraAndControls(App as never);
  assert.deepEqual(pair, { camera, controls });
});
