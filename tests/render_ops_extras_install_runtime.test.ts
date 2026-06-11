import test from 'node:test';
import assert from 'node:assert/strict';

import { installBuilderRenderOpsExtras } from '../esm/native/builder/render_ops_extras.ts';
import { ensureRenderNamespace, ensureRenderCacheMaps } from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, any>;

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

function createApp(id: string, renderOps?: AnyRecord) {
  const App: AnyRecord = {
    id,
    deps: { THREE: makeThreeStub(), browser: { window: {} } },
    services: {
      builder: {
        renderOps: renderOps ?? {},
      },
      platform: {
        util: {},
      },
    },
    store: makeStore({ sketchMode: true }),
  };
  const render = ensureRenderNamespace(App) as AnyRecord;
  render.wardrobeGroup = { add() {} };
  return App;
}

function createMesh(id: string): AnyRecord {
  return {
    geometry: { uuid: id, userData: {} },
    material: { id: `old:${id}` },
    userData: {},
    add(node: unknown) {
      this.outline = node;
    },
  };
}

test('render_ops_extras install keeps stable refs live across root replacement installs', () => {
  const AppA = createApp('A');
  const installed = installBuilderRenderOpsExtras(AppA as never) as AnyRecord;
  const heldAddOutlines = installed.addOutlines;
  const heldAddDimensionLine = installed.addDimensionLine;

  assert.equal(typeof heldAddOutlines, 'function');
  assert.equal(typeof heldAddDimensionLine, 'function');

  const meshA = createMesh('geo-A');
  heldAddOutlines(meshA);
  assert.equal(ensureRenderCacheMaps(AppA).edgesGeometryCache.has('edges:geo-A'), true);

  const AppB = createApp('B', installed);
  const reinstalled = installBuilderRenderOpsExtras(AppB as never) as AnyRecord;

  assert.equal(reinstalled, installed);
  assert.equal(reinstalled.addOutlines, heldAddOutlines);
  assert.equal(reinstalled.addDimensionLine, heldAddDimensionLine);

  const meshB = createMesh('geo-B');
  heldAddOutlines(meshB);

  assert.equal(ensureRenderCacheMaps(AppA).edgesGeometryCache.has('edges:geo-B'), false);
  assert.equal(ensureRenderCacheMaps(AppB).edgesGeometryCache.has('edges:geo-B'), true);
});

test('render_ops_extras install heals drift even when the legacy marker is already set', () => {
  const driftedAddOutlines = () => 'drifted';
  const App = createApp('A', {
    __esm_extras_v1: true,
    addOutlines: driftedAddOutlines,
  });

  const installed = installBuilderRenderOpsExtras(App as never) as AnyRecord;
  const canonicalAddOutlines = installed.addOutlines;

  assert.notEqual(canonicalAddOutlines, driftedAddOutlines);
  assert.equal(typeof installed.addDimensionLine, 'function');
  assert.equal(typeof installed.__addOutlinesImpl, 'function');

  installed.addOutlines = () => 'drifted-again';
  installBuilderRenderOpsExtras(App as never);

  assert.equal(installed.addOutlines, canonicalAddOutlines);
});
