import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearThreeGeometryCacheReferences,
  getEdgesGeometryCache,
  getGeometryCache,
  installThreeGeometryCachePatch,
  readThreeGeometryCacheStats,
} from '../esm/native/platform/three_geometry_cache_patch.ts';
import { ensureRenderMetaMaps } from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

type GeometryCtor = new (...args: unknown[]) => { uuid: string; userData: AnyRecord };

function createPatchedApp(limits?: Partial<Record<'geometries' | 'edges', number>>) {
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
    platform: { util: { cacheLimits: { geometries: 256, edges: 128, ...(limits || {}) } } },
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
    THREE: App.deps!.THREE as AnyRecord & {
      BoxGeometry: GeometryCtor;
      EdgesGeometry: GeometryCtor;
    },
  };
}

test('three geometry cache patch keeps separate stats + meta for geometry and edges hits', () => {
  const { App, THREE } = createPatchedApp();
  const geoA = new THREE.BoxGeometry(1, 2, 3, 1, 1, 1);
  const geoB = new THREE.BoxGeometry(1, 2, 3, 1, 1, 1);
  assert.equal(geoA, geoB);

  const edgeA = new THREE.EdgesGeometry(geoA, 1);
  const edgeB = new THREE.EdgesGeometry(geoA, 1);
  assert.equal(edgeA, edgeB);

  const stats = readThreeGeometryCacheStats(App);
  assert.equal(stats.geometryMissCount, 1);
  assert.equal(stats.geometryHitCount, 1);
  assert.equal(stats.edgesMissCount, 1);
  assert.equal(stats.edgesHitCount, 1);
  assert.equal(stats.geometrySizeHighWater, 1);
  assert.equal(stats.edgesSizeHighWater, 1);

  const meta = ensureRenderMetaMaps(App);
  assert.equal(meta.geometry.size, 1);
  assert.equal(meta.edges.size, 1);
});

test('three geometry cache patch trims cold cache references to configured limits and can clear lifecycle state', () => {
  const { App, THREE } = createPatchedApp({ geometries: 2, edges: 1 });
  const geo1 = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const geo2 = new THREE.BoxGeometry(2, 1, 1, 1, 1, 1);
  const geo3 = new THREE.BoxGeometry(3, 1, 1, 1, 1, 1);
  void geo2;
  void geo3;

  const geoCache = getGeometryCache(App);
  assert.ok(geoCache);
  assert.equal(geoCache!.size, 2);
  assert.equal(
    geoCache!.has('box:1:1:1:1:1:1'),
    false,
    'oldest geometry cache entry should be dropped first'
  );

  const edge1 = new THREE.EdgesGeometry(geo1, 1);
  const edge2 = new THREE.EdgesGeometry(geo3, 1);
  void edge1;
  void edge2;

  const edgesCache = getEdgesGeometryCache(App);
  assert.ok(edgesCache);
  assert.equal(edgesCache!.size, 1);

  const statsAfterTrim = readThreeGeometryCacheStats(App);
  assert.equal(statsAfterTrim.geometryEvictionCount, 1);
  assert.equal(statsAfterTrim.edgesEvictionCount, 1);
  assert.equal(statsAfterTrim.geometrySizeHighWater, 3);
  assert.equal(statsAfterTrim.edgesSizeHighWater, 2);

  const metaBeforeClear = ensureRenderMetaMaps(App);
  assert.equal(metaBeforeClear.geometry.size, 2);
  assert.equal(metaBeforeClear.edges.size, 1);

  assert.equal(clearThreeGeometryCacheReferences(App), true);
  assert.equal(getGeometryCache(App)!.size, 0);
  assert.equal(getEdgesGeometryCache(App)!.size, 0);

  const statsAfterClear = readThreeGeometryCacheStats(App);
  assert.equal(statsAfterClear.geometryHitCount, 0);
  assert.equal(statsAfterClear.geometryMissCount, 0);
  assert.equal(statsAfterClear.geometryEvictionCount, 0);
  assert.equal(statsAfterClear.edgesHitCount, 0);
  assert.equal(statsAfterClear.edgesMissCount, 0);
  assert.equal(statsAfterClear.edgesEvictionCount, 0);

  const metaAfterClear = ensureRenderMetaMaps(App);
  assert.equal(metaAfterClear.geometry.size, 0);
  assert.equal(metaAfterClear.edges.size, 0);
});
