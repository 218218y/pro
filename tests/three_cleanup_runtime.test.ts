import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanGroup,
  installThreeCleanup,
  type CleanGroupDiagnostics,
} from '../esm/native/platform/three_cleanup.ts';
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

test('cleanGroup diagnostics expose cached skips and duplicate disposal attempts without changing lifetime policy', () => {
  const sharedGeometry = makeDisposable();
  const sharedMaterial = makeDisposable({ __keepMaterial: true });
  const sharedTexture = makeDisposable();
  sharedMaterial.map = sharedTexture;
  const cachedMaterial = makeDisposable({ userData: { isCached: true } });
  const children = [
    { geometry: sharedGeometry, material: sharedMaterial, userData: {} },
    { geometry: sharedGeometry, material: [sharedMaterial, cachedMaterial], userData: {} },
  ];
  const group = {
    children,
    remove(child: unknown) {
      const index = children.indexOf(child as (typeof children)[number]);
      if (index >= 0) children.splice(index, 1);
    },
  };
  let diagnostics: CleanGroupDiagnostics | null = null;

  cleanGroup(group, {
    onDiagnostics(value) {
      diagnostics = value;
    },
  });

  assert.equal(sharedMaterial.disposeCount, 2, '__keepMaterial must not become a lifetime exemption');
  assert.equal(sharedGeometry.disposeCount, 2);
  assert.equal(sharedTexture.disposeCount, 2);
  assert.equal(cachedMaterial.disposeCount, 0);
  assert.equal(diagnostics?.materialsDisposed, 2);
  assert.equal(diagnostics?.uniqueMaterialsDisposed, 1);
  assert.equal(diagnostics?.duplicateMaterialDisposeAttempts, 1);
  assert.equal(diagnostics?.cachedMaterialSkips, 1);
  assert.equal(diagnostics?.geometriesDisposed, 2);
  assert.equal(diagnostics?.uniqueGeometriesDisposed, 1);
  assert.equal(diagnostics?.duplicateGeometryDisposeAttempts, 1);
  assert.equal(diagnostics?.texturesDisposed, 2);
  assert.equal(diagnostics?.uniqueTexturesDisposed, 1);
  assert.equal(diagnostics?.duplicateTextureDisposeAttempts, 1);
});
