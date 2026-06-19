import test from 'node:test';
import assert from 'node:assert/strict';

import { createOutlineBinding } from '../esm/native/builder/render_ops_extras.ts';
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

test('render_ops_extras outline bindings use their captured sketch snapshot and canonical render slots', () => {
  const runtime = { sketchMode: false };
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    store: makeStore(runtime),
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

  const sketchBinding = createOutlineBinding(App as never, { sketchMode: true });
  runtime.sketchMode = false;
  sketchBinding(mesh);

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

  const normalMesh: AnyRecord = {
    geometry: { uuid: 'geo-normal', userData: {} },
    material: { id: 'normal-material' },
    userData: {},
    add(node: unknown) {
      this.outline = node;
    },
  };
  const normalBinding = createOutlineBinding(App as never, { sketchMode: false });
  runtime.sketchMode = true;
  normalBinding(normalMesh);

  assert.equal(normalMesh.outline, undefined);
  assert.equal(normalMesh.material.id, 'normal-material');
  assert.equal(renderCache.edgesGeometryCache.has('edges:geo-normal'), false);
  assert.throws(
    () => createOutlineBinding(App as never, { sketchMode: 'yes' }),
    /outline snapshot with boolean sketchMode is required/
  );
});
