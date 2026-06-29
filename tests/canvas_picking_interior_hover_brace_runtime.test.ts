import test from 'node:test';
import assert from 'node:assert/strict';

import { getInternalGridMap } from '../esm/native/runtime/cache_access.ts';
import { tryHandleCanvasBraceShelvesHover } from '../esm/native/services/canvas_picking_interior_hover_brace_mode.ts';

type AnyRecord = Record<string, any>;

function makeSelector(moduleIndex: string, y: number): AnyRecord {
  return {
    userData: { isModuleSelector: true, moduleIndex, __wpStack: 'top' },
    geometry: { parameters: { width: 1, height: 2.4, depth: 0.55 } },
    position: { x: moduleIndex === 'corner:1' ? 1.5 : 0, y: 1.2, z: 0 },
    material: { visible: true, opacity: 0 },
    parent: null,
    __hitY: y,
  };
}

function createApp(intersects: AnyRecord[], stateOverrides: { config?: AnyRecord; ui?: AnyRecord } = {}) {
  const wardrobeGroup: AnyRecord = { children: [] };
  const state = {
    config: stateOverrides.config || {
      cornerConfiguration: {
        modulesConfiguration: [
          {
            isCustom: true,
            gridDivisions: 6,
            customData: { shelves: [false, false, false, false, false], shelfVariants: [] },
            braceShelves: [],
          },
          {
            isCustom: true,
            gridDivisions: 6,
            customData: { shelves: [false, true, false, false, false], shelfVariants: [] },
            braceShelves: [],
          },
        ],
      },
    },
    ui: stateOverrides.ui || {},
    mode: {},
    runtime: {},
    meta: {},
  };
  const App: AnyRecord = {
    store: { getState: () => state, patch: () => undefined },
    render: { camera: {}, wardrobeGroup },
    services: { runtimeCache: {} },
  };
  for (const hit of intersects) {
    if (hit.object && !hit.object.parent) hit.object.parent = wardrobeGroup;
  }
  wardrobeGroup.children = intersects.map(hit => hit.object);
  const raycaster = {
    setFromCamera: () => undefined,
    intersectObjects: (_objects: unknown, _recursive?: boolean, target?: AnyRecord[]) => {
      if (Array.isArray(target)) {
        target.push(...intersects);
        return target;
      }
      return intersects;
    },
  };
  return { App, raycaster, mouse: { x: 0, y: 0 } };
}

test('brace-shelves hover uses the specific corner-cell selector and the click-aligned shelf proximity tolerance', () => {
  const genericSelector = makeSelector('corner', 0.91);
  const specificSelector = makeSelector('corner:1', 0.91);
  const intersects = [
    { object: genericSelector, point: { x: 0, y: genericSelector.__hitY, z: 0 } },
    { object: specificSelector, point: { x: 1.5, y: specificSelector.__hitY, z: 0 } },
  ];
  const { App, raycaster, mouse } = createApp(intersects);
  getInternalGridMap(App, false)['corner'] = {
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    woodThick: 0.017,
  };
  getInternalGridMap(App, false)['corner:1'] = {
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    woodThick: 0.017,
  };

  let preview: AnyRecord | null = null;
  const handled = tryHandleCanvasBraceShelvesHover({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster,
    mouse,
    previewRo: {
      setSketchPlacementPreview: (_args: AnyRecord) => {
        preview = _args;
      },
    },
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  } as never);

  assert.equal(handled, true);
  assert.equal(preview?.kind, 'shelf');
  assert.equal(preview?.variant, 'brace');
  assert.equal(preview?.op, 'add');
  assert.ok(preview && Math.abs(Number(preview.y) - 0.8) < 1e-9);
  assert.equal(preview?.anchor, specificSelector);
});

test('brace-shelves hover materializes a missing corner-cell config before the first corner click', () => {
  const selector = makeSelector('corner:0', 0.91);
  const intersects = [{ object: selector, point: { x: 0, y: selector.__hitY, z: 0 } }];
  const { App, raycaster, mouse } = createApp(intersects, {
    config: { cornerConfiguration: {} },
    ui: { cornerSide: 'left', cornerDoors: 4 },
  });
  getInternalGridMap(App, false)['corner:0'] = {
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    woodThick: 0.017,
  };

  let preview: AnyRecord | null = null;
  const handled = tryHandleCanvasBraceShelvesHover({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster,
    mouse,
    previewRo: {
      setSketchPlacementPreview: (_args: AnyRecord) => {
        preview = _args;
      },
    },
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  } as never);

  assert.equal(handled, true);
  assert.equal(preview?.kind, 'shelf');
  assert.equal(preview?.variant, 'brace');
  assert.equal(preview?.op, 'add');
  assert.equal(preview?.anchor, selector);
});

test('brace-shelves hover does not require a prior click in the other corner cell', () => {
  const selector = makeSelector('corner:1', 0.91);
  const intersects = [{ object: selector, point: { x: 1.5, y: selector.__hitY, z: 0 } }];
  const { App, raycaster, mouse } = createApp(intersects, {
    config: {
      cornerConfiguration: {
        modulesConfiguration: [
          {
            isCustom: true,
            gridDivisions: 6,
            customData: { shelves: [false, true, false, false, false], shelfVariants: [] },
            braceShelves: [2],
          },
        ],
      },
    },
    ui: { cornerSide: 'right', cornerDoors: 4 },
  });
  getInternalGridMap(App, false)['corner:1'] = {
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    woodThick: 0.017,
  };

  let preview: AnyRecord | null = null;
  const handled = tryHandleCanvasBraceShelvesHover({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster,
    mouse,
    previewRo: {
      setSketchPlacementPreview: (_args: AnyRecord) => {
        preview = _args;
      },
    },
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  } as never);

  assert.equal(handled, true);
  assert.equal(preview?.kind, 'shelf');
  assert.equal(preview?.variant, 'brace');
  assert.equal(preview?.op, 'add');
  assert.equal(preview?.anchor, selector);
});

test('brace-shelves hover targets exact sketch shelves stored in sketchExtras', () => {
  const selector = makeSelector('0', 1.21);
  const shelfBoard = {
    userData: { partId: 'sketch_shelf_0_1', moduleIndex: 0, __wpShelfIndex: 1 },
    parent: null,
  };
  const intersects = [
    { object: shelfBoard, point: { x: 0, y: 0.72, z: 0 } },
    { object: selector, point: { x: 0, y: selector.__hitY, z: 0 } },
  ];
  const { App, raycaster, mouse } = createApp(intersects, {
    config: {
      modulesConfiguration: [
        {
          isCustom: true,
          gridDivisions: 6,
          customData: { shelves: [false, false, false, false, false], shelfVariants: [] },
          braceShelves: [],
          sketchExtras: { shelves: [{ id: 'exact-1', yNorm: 0.3, variant: 'regular', depthM: 0.4 }] },
        },
      ],
    },
  });
  getInternalGridMap(App, false)['0'] = {
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    woodThick: 0.017,
  };

  let preview: AnyRecord | null = null;
  const handled = tryHandleCanvasBraceShelvesHover({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster,
    mouse,
    previewRo: {
      setSketchPlacementPreview: (_args: AnyRecord) => {
        preview = _args;
      },
    },
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  } as never);

  assert.equal(handled, true);
  assert.equal(preview?.kind, 'shelf');
  assert.equal(preview?.variant, 'brace');
  assert.equal(preview?.op, 'add');
  assert.ok(preview && Math.abs(Number(preview.y) - 0.72) < 1e-9);
});
