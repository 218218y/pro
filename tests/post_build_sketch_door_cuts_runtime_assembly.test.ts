import test from 'node:test';
import assert from 'node:assert/strict';

import { createSketchDoorCutsRuntime } from '../esm/native/builder/post_build_sketch_door_cuts_runtime.ts';

test('sketch door cuts runtime resolves canonical style, curtain, mirror layout, and removal state', () => {
  const createDoorVisual = () => ({ kind: 'door-visual' });
  const createHandleMesh = () => ({ kind: 'handle' });
  const getPartMaterial = (partId: string) => `mat:${partId}`;
  const runtime = createSketchDoorCutsRuntime({
    THREE: { tag: 'THREE' } as any,
    ctx: {
      create: {
        createDoorVisual,
        createHandleMesh,
      },
      resolvers: {
        getHandleType(partId: string) {
          return partId === 'd7_full' ? 'profile' : '';
        },
        getPartMaterial,
      },
      strings: {
        doorStyle: 'flat',
      },
    } as any,
    cfg: {
      groovesMap: { groove_d7_full: true },
      curtainMap: { d7_full: 'linen' },
      doorSpecialMap: { d7_full: 'mirror' },
      mirrorLayoutMap: {
        d7_full: [
          {
            kind: 'mirror',
            widthCm: 42,
            heightCm: 88,
            centerNorm: 0.5,
          },
        ],
      },
      doorStyleMap: { d7: 'tom', drawer_1: 'profile', bad: 'glass' },
      removedDoorsMap: { removed_d7_full: true },
    },
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    getMirrorMaterial: () => ({ name: 'mirror' }),
  });

  assert.equal(runtime.THREE.tag, 'THREE');
  assert.deepEqual(runtime.createDoorVisual(), { kind: 'door-visual' });
  assert.deepEqual(runtime.createHandleMesh(), { kind: 'handle' });
  assert.equal(runtime.getPartMaterial('d7_full'), 'mat:d7_full');
  assert.equal(runtime.resolveHandleType('d7_full'), 'profile');
  assert.equal(runtime.resolveHandleType('drawer_1'), 'standard');
  assert.equal(runtime.resolveCurtain('d7'), 'linen');
  assert.equal(runtime.resolveSpecial('d7', null), 'mirror');
  assert.equal(runtime.resolveSpecial('drawer_1', 'linen'), 'glass');
  assert.equal(runtime.resolveSpecial('drawer_1', null), null);
  assert.equal(runtime.isDoorRemoved('d7'), true);
  assert.equal(runtime.isDoorRemoved('d7_top'), true);
  assert.equal(runtime.isDoorRemoved('drawer_1'), false);
  assert.equal(runtime.doorStyle, 'flat');
  assert.equal(runtime.doorStyleMap.d7, undefined);
  assert.equal(runtime.doorStyleMap.d7_full, 'tom');
  assert.equal(runtime.doorStyleMap.drawer_1, 'profile');
  assert.deepEqual(runtime.resolveMirrorLayout('d7'), [
    {
      widthCm: 42,
      heightCm: 88,
    },
  ]);
});
