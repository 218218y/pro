import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createNoMainSketchModuleConfig,
  maybeRenderNoMainSketchHost,
  syncNoMainSketchWorkspaceMetrics,
} from '../esm/native/builder/build_no_main_sketch_host.ts';
import { __readNoMainWorkspaceBox } from '../esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts';
import {
  createSketchInteriorHarness,
  FakeBoxGeometry,
  FakeMaterial,
  FakeMesh,
  THREE,
} from './sketch_box_runtime_helpers.ts';
import { createTestRoomArchitecturePlan } from './room_architecture_test_helpers.ts';

type AnyRecord = Record<string, any>;

function createApp(overrides: Partial<AnyRecord> = {}): AnyRecord {
  const state = {
    ui: {
      doors: 0,
      width: 0,
      height: 0,
      depth: 0,
      raw: { doors: 0, width: 0, height: 0, depth: 0 },
    },
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false, version: 0, updatedAt: 0 },
    ...(overrides.state || {}),
  };

  return {
    services: {
      runtimeCache: {},
      ...(overrides.services || {}),
    },
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    ...overrides,
  };
}

test('no-main sketch workspace runtime: module config keeps only free-placement boxes and preserves explicit sketch extras', () => {
  const next = createNoMainSketchModuleConfig({
    layout: 'drawers',
    extDrawersCount: 4,
    sketchExtras: {
      boxes: [
        { id: 'free-a', freePlacement: true, absX: -0.5, widthM: 0.6 },
        { id: 'module-a', absX: 0.1, widthM: 0.8 },
        { id: 'free-b', freePlacement: true, absX: 0.7, widthM: 0.4 },
      ],
      shelves: [{ id: 'shelf-1' }],
      storageBarriers: [{ id: 'barrier-1' }],
      rods: [{ id: 'rod-1' }],
      drawers: [{ id: 'drawer-1' }],
    },
  });

  assert.equal(next.layout, 'shelves');
  assert.equal(next.gridDivisions, 6);
  assert.equal(next.extDrawersCount, 0);
  assert.equal(next.hasDrawersInside, false);
  assert.deepEqual(next.sketchExtras?.boxes, [
    { id: 'free-a', freePlacement: true, absX: -0.5, widthM: 0.6 },
    { id: 'free-b', freePlacement: true, absX: 0.7, widthM: 0.4 },
  ]);
  assert.deepEqual(next.sketchExtras?.shelves, [{ id: 'shelf-1' }]);
  assert.deepEqual(next.sketchExtras?.storageBarriers, [{ id: 'barrier-1' }]);
  assert.deepEqual(next.sketchExtras?.rods, [{ id: 'rod-1' }]);
  assert.deepEqual(next.sketchExtras?.drawers, [{ id: 'drawer-1' }]);
});

test('no-main sketch workspace runtime: disabled sync clears cache and missing config uses canonical minima', () => {
  const App = createApp();
  App.services.runtimeCache.noMainSketchWorkspaceMetrics = { stale: true };

  syncNoMainSketchWorkspaceMetrics({
    App,
    enabled: false,
    cfg: null,
    totalW: 0,
    H: 0,
    woodThick: 0.018,
    internalDepth: 0,
    internalZ: 0,
  });
  assert.equal(App.services.runtimeCache.noMainSketchWorkspaceMetrics, null);

  syncNoMainSketchWorkspaceMetrics({
    App,
    enabled: true,
    cfg: null,
    totalW: 0,
    H: 0,
    woodThick: 0.018,
    internalDepth: 0,
    internalZ: 0,
  });
  assert.deepEqual(App.services.runtimeCache.noMainSketchWorkspaceMetrics, {
    centerX: 0,
    centerY: 0.025,
    centerZ: 0,
    width: 1.6,
    height: 0.05,
    depth: 0.018,
    backZ: -0.009,
  });
});

test('no-main sketch workspace runtime: cache metrics and no-main workspace box uses canonical free-box workspace span', () => {
  const App = createApp({
    state: {
      ui: {
        doors: 0,
        width: 0,
        height: 0,
        depth: 0,
        raw: { doors: 0, width: 0, height: 0, depth: 0 },
      },
      config: {
        modulesConfiguration: [
          {
            sketchExtras: {
              boxes: [
                { id: 'free-a', freePlacement: true, absX: -0.5, widthM: 0.6 },
                { id: 'module-a', absX: 0.1, widthM: 0.8 },
                { id: 'free-b', freePlacement: true, absX: 0.7, widthM: 0.4 },
                { id: 'legacy-string-box', freePlacement: true, absX: '5', widthM: '3' },
              ],
            },
          },
        ],
      },
    },
  });

  syncNoMainSketchWorkspaceMetrics({
    App,
    enabled: true,
    cfg: App.store.getState().config,
    totalW: 0,
    H: 2.4,
    woodThick: 0.02,
    internalDepth: 0.56,
    internalZ: -0.31,
  });

  const metrics = App.services.runtimeCache.noMainSketchWorkspaceMetrics;
  assert.equal(metrics.centerX, 0);
  assert.equal(metrics.centerY, 1.2);
  assert.equal(metrics.centerZ, -0.31);
  assert.ok(Math.abs(metrics.width - 1.82) < 1e-9);
  assert.equal(metrics.height, 2.4);
  assert.equal(metrics.depth, 0.56);
  assert.ok(Math.abs(metrics.backZ - -0.59) < 1e-9);

  const cachedBox = __readNoMainWorkspaceBox(App);
  assert.ok(cachedBox);
  assert.equal(cachedBox?.centerX, 0);
  assert.equal(cachedBox?.centerY, 1.2);
  assert.equal(cachedBox?.centerZ, -0.31);
  assert.ok(Math.abs((cachedBox?.width || 0) - 1.82) < 1e-9);
  assert.equal(cachedBox?.height, 2.4);
  assert.equal(cachedBox?.depth, 0.56);

  App.services.runtimeCache.noMainSketchWorkspaceMetrics = null;

  const noMainWorkspaceBox = __readNoMainWorkspaceBox(App);
  assert.ok(noMainWorkspaceBox);
  assert.equal(noMainWorkspaceBox?.centerX, 0);
  assert.equal(noMainWorkspaceBox?.centerY, 1.2);
  assert.equal(noMainWorkspaceBox?.centerZ, -0.275);
  assert.ok(Math.abs((noMainWorkspaceBox?.width || 0) - 1.82) < 1e-9);
  assert.equal(noMainWorkspaceBox?.height, 2.4);
  assert.equal(noMainWorkspaceBox?.depth, 0.55);
});

test('no-main sketch workspace runtime: malformed cache/config falls through to canonical fallback and UI conversions', () => {
  const fallbackApp = createApp({
    services: {
      runtimeCache: {
        noMainSketchWorkspaceMetrics: {
          centerX: 0,
          centerY: 1,
          centerZ: -0.3,
          width: 0,
          height: 2,
          depth: 0.5,
        },
      },
    },
  });
  assert.deepEqual(__readNoMainWorkspaceBox(fallbackApp), {
    centerX: 0,
    centerY: 1.2,
    centerZ: -0.275,
    width: 1.6,
    height: 2.4,
    depth: 0.55,
  });

  const uiOverrideApp = createApp({
    state: {
      ui: {
        doors: 0,
        width: 190,
        height: 250,
        depth: 60,
        raw: { doors: 0 },
      },
      config: { modulesConfiguration: [{ sketchExtras: { boxes: 'invalid' } }] },
    },
  });
  assert.deepEqual(__readNoMainWorkspaceBox(uiOverrideApp), {
    centerX: 0,
    centerY: 1.25,
    centerZ: -0.3,
    width: 1.9,
    height: 2.5,
    depth: 0.6,
  });

  const optionalBackZApp = createApp({
    services: {
      runtimeCache: {
        noMainSketchWorkspaceMetrics: {
          centerX: 0.1,
          centerY: 1.1,
          centerZ: -0.2,
          width: 2,
          height: 2.2,
          depth: 0.6,
          backZ: 'invalid',
        },
      },
    },
  });
  assert.deepEqual(__readNoMainWorkspaceBox(optionalBackZApp), {
    centerX: 0.1,
    centerY: 1.1,
    centerZ: -0.2,
    width: 2,
    height: 2.2,
    depth: 0.6,
  });
});

test('no-main sketch workspace runtime: nonzero or invalid doors reject even valid cached metrics', () => {
  for (const doors of [1, 'invalid']) {
    const App = createApp({
      state: {
        ui: {
          doors,
          width: 0,
          height: 0,
          depth: 0,
          raw: { doors },
        },
        config: {},
      },
      services: {
        runtimeCache: {
          noMainSketchWorkspaceMetrics: {
            centerX: 0,
            centerY: 1,
            centerZ: -0.3,
            width: 2,
            height: 2,
            depth: 0.6,
          },
        },
      },
    });
    assert.equal(__readNoMainWorkspaceBox(App), null);
  }
});

test('no-main sketch workspace runtime: free-box doors receive the same door visual factory as the main build', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, createBoard } = createSketchInteriorHarness();
  const captured: Array<{ partId: unknown; style: unknown }> = [];
  const createDoorVisual = (
    w: number,
    h: number,
    d: number,
    mat: FakeMaterial,
    style: unknown,
    _hasGrooves: boolean,
    _isMirror: boolean,
    _curtainType: string | null,
    _baseMaterial: FakeMaterial | null,
    _frontFaceSign: number,
    _forceCurtainFix: boolean,
    _mirrorLayout: unknown,
    partId: unknown
  ) => {
    captured.push({ partId, style });
    const mesh = new FakeMesh(new FakeBoxGeometry(w, h, d), mat);
    mesh.userData.partId = partId;
    return mesh;
  };
  const App = {
    services: {
      builder: {
        renderOps: { applyInteriorCustomOps: () => true, applyInteriorSketchExtras },
      },
    },
    render: {
      wardrobeGroup,
      doorsArray: [],
      drawersArray: [],
      moduleHitBoxes: [],
      _partObjects: [],
    },
  } as AnyRecord;

  const rendered = maybeRenderNoMainSketchHost({
    App,
    THREE,
    roomArchitecturePlan: createTestRoomArchitecturePlan({ widthM: 1.6, heightM: 2.4, depthM: 0.6 }),
    cfg: {
      modulesConfiguration: [
        {
          sketchExtras: {
            boxes: [
              {
                id: 'freeVisual',
                freePlacement: true,
                absX: 0,
                absY: 1.1,
                heightM: 0.7,
                widthM: 0.8,
                depthM: 0.48,
                doors: [{ id: 'doorA', enabled: true, hinge: 'left' }],
              },
            ],
          },
        },
      ],
    },
    ui: { doorStyle: 'profile' },
    totalW: 0,
    H: 2.4,
    D: 0.6,
    woodThick: 0.018,
    depthReduction: 0,
    internalDepth: 0.56,
    internalZ: 0,
    bodyMat: new FakeMaterial(),
    legMat: new FakeMaterial(),
    createBoard,
    getPartMaterial: () => new FakeMaterial(),
    getPartColorValue: () => null,
    createDoorVisual,
    createInternalDrawerBox: null,
    addOutlines: null,
    addHangingClothes: null,
    addFoldedClothes: null,
    addRealisticHanger: null,
    isInternalDrawersEnabled: false,
    showHangerEnabled: false,
    showContentsEnabled: false,
  });

  assert.equal(rendered, true);
  assert.ok(
    captured.some(
      entry => entry.partId === 'sketch_box_free_0_freeVisual_door_doorA' && entry.style === 'profile'
    ),
    'no-main free-box door should not fall back to a plain post slab when a styled door visual is available'
  );
});
