import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEdgesGeometryCache,
  getGeometryCache,
  installThreeGeometryCachePatch,
} from '../esm/native/platform/three_geometry_cache_patch.ts';
import { ensureRenderMetaMaps } from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

test('three_geometry_cache_patch caches geometries under canonical render cache/meta seams', () => {
  let id = 0;
  const mk = (prefix: string) => `${prefix}-${++id}`;

  class BoxGeometry {
    uuid = mk('box');
    userData: AnyRecord = {};
    constructor(..._args: unknown[]) {}
  }
  class PlaneGeometry {
    uuid = mk('plane');
    userData: AnyRecord = {};
    constructor(..._args: unknown[]) {}
  }
  class CylinderGeometry {
    uuid = mk('cyl');
    userData: AnyRecord = {};
    constructor(..._args: unknown[]) {}
  }
  class SphereGeometry {
    uuid = mk('sphere');
    userData: AnyRecord = {};
    constructor(..._args: unknown[]) {}
  }
  class EdgesGeometry {
    uuid = mk('edges');
    userData: AnyRecord = {};
    constructor(_geo: unknown, _angle: unknown) {}
  }

  const App: AnyRecord = {
    deps: {
      THREE: {
        BoxGeometry,
        PlaneGeometry,
        CylinderGeometry,
        SphereGeometry,
        EdgesGeometry,
      },
      flags: { enableThreeGeometryCachePatch: true },
    },
  };

  assert.equal(installThreeGeometryCachePatch(App), true);

  // First creation caches
  const THREE = (App.deps as AnyRecord).THREE as AnyRecord;
  const a = new (THREE.BoxGeometry as any)(1, 2, 3, 1, 1, 1);
  const b = new (THREE.BoxGeometry as any)(1, 2, 3, 1, 1, 1);
  assert.equal(a, b);
  assert.equal((a.userData as AnyRecord).isCached, true);

  const geoCache = getGeometryCache(App);
  assert.ok(geoCache);
  assert.equal(geoCache!.size, 1);

  const meta = ensureRenderMetaMaps(App);
  assert.equal(meta.geometry instanceof Map, true);
  assert.equal((meta.geometry as Map<string, unknown>).size >= 1, true);

  // Edges go to edges cache and do not touch meta (touchMeta:false)
  const e1 = new (THREE.EdgesGeometry as any)(a, 1);
  const e2 = new (THREE.EdgesGeometry as any)(a, 1);
  assert.equal(e1, e2);

  const edgesCache = getEdgesGeometryCache(App);
  assert.ok(edgesCache);
  assert.equal(edgesCache!.size, 1);
});
