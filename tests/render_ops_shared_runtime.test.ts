import test from 'node:test';
import assert from 'node:assert/strict';

import { __boardArgs, __commonArgs } from '../esm/native/builder/render_ops_shared_args.js';
import { __tagAndTrackMirrorSurfaces } from '../esm/native/builder/render_ops_shared_mirror.js';
import { __matCache } from '../esm/native/builder/render_ops_shared_state.js';

function createApp() {
  return {
    services: {
      builder: {},
    },
    render: {},
  } as any;
}

test('render_ops_shared arg parsing keeps finite geometry fields and addOutlines wiring', () => {
  const App = createApp();
  const seen: unknown[] = [];
  const args = __boardArgs({
    App,
    w: 50,
    h: 80,
    d: Number.NaN,
    x: 1,
    y: 2,
    z: 3,
    mat: { k: 1 },
    partId: 'p1',
    sketchMode: 1,
    addOutlines: (obj: unknown) => seen.push(obj),
  });

  assert.equal(args.App, App);
  assert.equal(args.w, 50);
  assert.equal(args.h, 80);
  assert.equal(args.d, undefined);
  assert.equal(args.x, 1);
  assert.equal(args.y, 2);
  assert.equal(args.z, 3);
  assert.equal(args.partId, 'p1');
  assert.equal(args.sketchMode, true);
  args.addOutlines?.('mesh');
  assert.deepEqual(seen, ['mesh']);

  const common = __commonArgs({ App, THREE: { Mesh: null } });
  assert.equal(common.App, App);
  assert.equal(common.THREE, null);
});

test('render_ops_shared matCache reuses the same builder render bag cache object', () => {
  const App = createApp();
  const a = __matCache(App);
  a.shadowMat = { id: 1 };
  const b = __matCache(App);
  assert.equal(a, b);
  assert.deepEqual(b.shadowMat, { id: 1 });
});

test('render_ops_shared mirror tracking tags matching surfaces once even through traverse', () => {
  const App = createApp();
  const mirrorMat = { kind: 'mirror' };
  const tagged = { isMesh: true, material: mirrorMat, userData: {} as Record<string, unknown> };
  const alreadyTagged = { isMesh: true, material: { kind: 'other' }, userData: { __wpMirrorSurface: true } };
  const ignored = { isMesh: true, material: { kind: 'wood' }, userData: {} };
  const root = {
    traverse(fn: (value: unknown) => void) {
      fn(tagged);
      fn(tagged);
      fn(alreadyTagged);
      fn(ignored);
    },
  };

  const count = __tagAndTrackMirrorSurfaces(App, root, mirrorMat);
  assert.equal(count, 2);
  assert.equal(tagged.userData.__wpMirrorSurface, true);
  assert.equal(alreadyTagged.userData.__wpMirrorSurface, true);
  assert.equal((App.render.meta.mirrors as unknown[]).length, 2);
});
