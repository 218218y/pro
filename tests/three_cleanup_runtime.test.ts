import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanGroup, installThreeCleanup } from '../esm/native/platform/three_cleanup.ts';
import { getPlatformUtil } from '../esm/native/runtime/platform_access.ts';

type AnyRecord = Record<string, unknown>;

type DisposableResource = {
  userData?: AnyRecord;
  disposeCount: number;
  dispose: () => void;
} & AnyRecord;

function makeDisposable(extra: AnyRecord = {}): DisposableResource {
  return {
    ...extra,
    disposeCount: 0,
    dispose() {
      this.disposeCount += 1;
    },
  };
}

test('installThreeCleanup attaches cleanGroup on canonical platform util seam', () => {
  const App: AnyRecord = {};
  installThreeCleanup(App);

  const util = getPlatformUtil(App);
  assert.ok(util);
  assert.equal(typeof util?.cleanGroup, 'function');
  assert.equal(util?.cleanGroup, cleanGroup);
});

test('cleanGroup disposes non-cached resources and preserves cached/custom textures', () => {
  const customTexture = makeDisposable();
  const disposedTexture = makeDisposable();
  const cachedTexture = makeDisposable();
  const geometry = makeDisposable();
  const cachedGeometry = makeDisposable({ userData: { isCached: true } });
  const material = makeDisposable({ map: disposedTexture, normalMap: customTexture });
  const cachedMaterial = makeDisposable({ map: cachedTexture, userData: { isCached: true } });

  const nestedMesh: AnyRecord = {
    geometry: cachedGeometry,
    material: cachedMaterial,
    userData: {},
  };
  const nestedGroupChildren = [nestedMesh];
  const nestedGroup: AnyRecord = {
    children: nestedGroupChildren,
    userData: {},
    remove(child: unknown) {
      const idx = nestedGroupChildren.indexOf(child);
      if (idx >= 0) nestedGroupChildren.splice(idx, 1);
    },
  };

  const rootChildren = [
    {
      children: [],
      geometry,
      material,
      userData: {},
    },
    nestedGroup,
  ];

  const group: AnyRecord = {
    children: rootChildren,
    remove(child: unknown) {
      const idx = rootChildren.indexOf(child);
      if (idx >= 0) rootChildren.splice(idx, 1);
    },
  };

  cleanGroup(group, { getCustomTexture: () => customTexture });

  assert.equal(geometry.disposeCount, 1);
  assert.equal(material.disposeCount, 1);
  assert.equal(disposedTexture.disposeCount, 1);
  assert.equal(customTexture.disposeCount, 0);

  assert.equal(cachedGeometry.disposeCount, 0);
  assert.equal(cachedMaterial.disposeCount, 0);
  assert.equal(cachedTexture.disposeCount, 0);

  assert.equal(rootChildren.length, 0);
  assert.equal(nestedGroupChildren.length, 0);
});

test('installThreeCleanup restores the canonical cleanGroup helper if the util surface drifts', () => {
  const App: AnyRecord = {};
  installThreeCleanup(App);

  const util = getPlatformUtil(App) as AnyRecord;
  const first = util.cleanGroup;

  util.cleanGroup = () => 'stale';
  installThreeCleanup(App);

  assert.equal(util.cleanGroup, cleanGroup);
  assert.equal(first, cleanGroup);
});
