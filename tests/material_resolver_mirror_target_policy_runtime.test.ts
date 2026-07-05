import test from 'node:test';
import assert from 'node:assert/strict';

import { makeMaterialResolver } from '../esm/native/builder/material_resolver.ts';

function createResolver(individualColors: Record<string, unknown>, getMirrorCalls: string[] = []) {
  const mirrorMaterial = { kind: 'mirror' };
  const App = {
    services: {
      builder: {
        renderOps: {
          getMirrorMaterial() {
            getMirrorCalls.push('mirror');
            return mirrorMaterial;
          },
        },
      },
    },
  };

  return {
    mirrorMaterial,
    resolver: makeMaterialResolver({
      App: App as never,
      THREE: {} as never,
      cfg: {
        isMultiColorMode: true,
        individualColors,
      },
      materialSnapshot: {} as never,
      getMaterial(color, kind) {
        return `${kind}:${String(color)}`;
      },
      globalFrontMat: 'front:global',
    }),
  };
}

test('material resolver sanitizes stale mirror color values on carcass frame parts', () => {
  const getMirrorCalls: string[] = [];
  const { resolver } = createResolver({ body_left: 'mirror' }, getMirrorCalls);

  assert.equal(resolver.getPartColorValue('body_left'), 'mirror');
  assert.equal(resolver.getPartMaterial('body_left'), 'front:global');
  assert.deepEqual(getMirrorCalls, []);
});

test('material resolver still returns mirror material for mirror-capable front surfaces', () => {
  const getMirrorCalls: string[] = [];
  const { resolver, mirrorMaterial } = createResolver({ chest_drawer_1: 'mirror' }, getMirrorCalls);

  assert.equal(resolver.getPartColorValue('chest_drawer_1'), 'mirror');
  assert.equal(resolver.getPartMaterial('chest_drawer_1'), mirrorMaterial);
  assert.deepEqual(getMirrorCalls, ['mirror']);
});
