import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEdgesGeometryCache,
  getGeometryCache,
  installThreeGeometryCachePatch,
} from '../esm/native/platform/three_geometry_cache_patch.ts';

type AnyRecord = Record<string, unknown>;

type GeometryCtor = new (...args: unknown[]) => { uuid: string; userData: AnyRecord };

function createPatchedApp() {
  let id = 0;
  const mk = (prefix: string) => `${prefix}-${++id}`;

  class BoxGeometry {
    uuid = mk('box');
    userData: AnyRecord = {};
    args: unknown[];
    constructor(...args: unknown[]) {
      this.args = args;
    }
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
    args: unknown[];
    constructor(...args: unknown[]) {
      this.args = args;
    }
  }

  const App: AnyRecord = {
    platform: { util: { cacheLimits: { geometries: 256, edges: 128 } } },
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
  return {
    App,
    THREE: App.deps!.THREE as AnyRecord & { BoxGeometry: GeometryCtor; EdgesGeometry: GeometryCtor },
  };
}

test('three geometry cache patch normalizes integer-like segments and rounded edge angles for cache reuse', () => {
  const { App, THREE } = createPatchedApp();

  const geoA = new THREE.BoxGeometry(1, 2, 3, 2.9, 1.2, 4.8) as AnyRecord & { args: unknown[] };
  const geoB = new THREE.BoxGeometry(1, 2, 3, 2.1, 1.9, 4.1) as AnyRecord & { args: unknown[] };
  assert.equal(geoA, geoB);
  assert.deepEqual(geoA.args, [1, 2, 3, 2, 1, 4]);

  const edgesA = new THREE.EdgesGeometry(geoA, 1 + 1e-8) as AnyRecord & { args: unknown[] };
  const edgesB = new THREE.EdgesGeometry(geoA, 1) as AnyRecord & { args: unknown[] };
  assert.equal(edgesA, edgesB);
  assert.equal(edgesA.args[1], 1);

  const geoCache = getGeometryCache(App);
  const edgesCache = getEdgesGeometryCache(App);
  assert.ok(geoCache);
  assert.ok(edgesCache);
  assert.equal(geoCache!.has('box:1:2:3:2:1:4'), true);
  assert.equal(edgesCache!.has('edges:box-1:1'), true);
});
