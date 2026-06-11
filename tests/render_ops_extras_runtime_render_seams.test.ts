import test from 'node:test';
import assert from 'node:assert/strict';

import { addOutlines } from '../esm/native/builder/render_ops_extras.ts';
import {
  ensureRenderCacheMaps,
  ensureRenderMaterialSlots,
  ensureRenderMetaMaps,
  ensureRenderNamespace,
} from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

function makeStore(runtime: AnyRecord) {
  return {
    getState() {
      return { runtime };
    },
    subscribe() {
      return () => undefined;
    },
  };
}

function makeThreeStub() {
  class LineBasicMaterial {
    userData: AnyRecord = {};
    constructor(public opts: AnyRecord) {}
  }

  class MeshBasicMaterial {
    userData: AnyRecord = {};
    constructor(public opts: AnyRecord) {}
  }

  class EdgesGeometry {
    userData: AnyRecord = {};
    constructor(public base: unknown) {}
  }

  class LineSegments {
    parent: unknown = null;
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }

  return {
    LineBasicMaterial,
    MeshBasicMaterial,
    EdgesGeometry,
    LineSegments,
  };
}

test('render_ops_extras uses canonical render slots and caches even when legacy compat refs were never prebound', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore({ sketchMode: true }),
  };
  const render = ensureRenderNamespace(App) as AnyRecord;
  render.wardrobeGroup = { add() {} };

  const mesh: AnyRecord = {
    geometry: { uuid: 'geo-1', userData: {} },
    material: { id: 'old-material' },
    userData: {},
    add(node: unknown) {
      this.outline = node;
    },
  };

  addOutlines(mesh, { App });

  const renderCache = ensureRenderCacheMaps(App);
  const renderMeta = ensureRenderMetaMaps(App);
  const renderMaterials = ensureRenderMaterialSlots(App) as AnyRecord;

  assert.equal(renderCache.edgesGeometryCache instanceof Map, true);
  assert.equal(renderMeta.edges instanceof Map, true);
  assert.equal(renderCache.edgesGeometryCache.has('edges:geo-1'), true);
  assert.equal(renderMeta.edges.has('edges:geo-1'), true);
  assert.ok(renderMaterials.outlineLineMaterial);
  assert.ok(renderMaterials.sketchFillMaterial);
  assert.ok(mesh.outline);
  assert.equal(mesh.material, renderMaterials.sketchFillMaterial);
});
