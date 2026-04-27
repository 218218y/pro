import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePreferredManualLayoutSketchSelectorHit } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_selector.ts';
import { readManualLayoutSketchHoverRuntime } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_shared.ts';

function createApp(overrides: Record<string, unknown> = {}) {
  const state = {
    mode: { opts: {} },
    ...(overrides.state as object),
  };
  return {
    store: {
      getState() {
        return state;
      },
    },
    render: {
      renderer: {},
      camera: { updateMatrixWorld() {} },
      wardrobeGroup: { children: [] as unknown[] },
      ...(overrides.render as object),
    },
    services: {
      builder: {
        renderOps: {},
        ...((overrides.services as any)?.builder || {}),
      },
      ...(overrides.services as object),
    },
  } as any;
}

function createSharedArgs(overrides: Record<string, unknown> = {}) {
  return {
    App: createApp(),
    ndcX: 0.1,
    ndcY: -0.2,
    __pm: 'manual_layout',
    __hideLayoutPreview: undefined,
    __wpRaycaster: {
      setFromCamera() {},
      intersectObjects() {
        return [];
      },
    },
    __wpMouse: { x: 0, y: 0 },
    __wp_getViewportRoots: (App: any) => ({
      camera: App.render.camera,
      wardrobeGroup: App.render.wardrobeGroup,
    }),
    __wp_raycastReuse: () => [],
    __wp_toModuleKey: (value: unknown) =>
      typeof value === 'number' || typeof value === 'string' ? (value as any) : null,
    __wp_projectWorldPointToLocal: () => null,
    __wp_parseSketchBoxToolSpec: () => null,
    __wp_pickSketchFreeBoxHost: () => null,
    __wp_measureWardrobeLocalBox: () => null,
    __wp_intersectScreenWithLocalZPlane: () => null,
    __wp_readInteriorModuleConfigRef: () => null,
    __wp_resolveSketchFreeBoxGeometry: () => ({}) as any,
    __wp_getSketchFreeBoxPartPrefix: () => '',
    __wp_findSketchFreeBoxLocalHit: () => null,
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [],
    __wp_pickSketchBoxSegment: () => null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({}) as any,
    __wp_findSketchModuleBoxAtPoint: () => null,
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_isCornerKey: () => false,
    __wp_isDefaultCornerCellCfgLike: () => false,
    __wp_resolveSketchBoxGeometry: () => ({}) as any,
    __wp_resolveSketchFreeBoxHoverPlacement: () => null,
    __wp_writeSketchHover: () => undefined,
    __wp_clearSketchHover: () => undefined,
    ...overrides,
  } as any;
}

test('manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors', () => {
  const wardrobeGroup = { name: 'wardrobe' };
  const genericSelector = {
    parent: { name: 'genericParent' },
    userData: { isModuleSelector: true, moduleIndex: 'corner', __wpStack: 'top' },
  };
  const specificSelector = {
    parent: { name: 'specificParent' },
    userData: { isModuleSelector: true, moduleIndex: 'corner:2', __wpStack: 'bottom' },
  };
  const intersects = [
    { object: genericSelector, point: { x: 10, z: 1, y: 3 } },
    { object: specificSelector, point: { x: 20, z: 2, y: -4 } },
  ];

  const hit = resolvePreferredManualLayoutSketchSelectorHit({
    App: createApp(),
    ndcX: 0,
    ndcY: 0,
    camera: {},
    wardrobeGroup,
    intersects: intersects as any,
    raycaster: {} as any,
    mouse: { x: 0, y: 0 },
    toModuleKey: value => value as any,
    projectWorldPointToLocal: (_App, point, parent) => ({
      x: parent === specificSelector.parent ? 12 : 5,
      z: parent === specificSelector.parent ? 8 : 4,
      sourcePoint: point,
    }),
    intersectScreenWithLocalZPlane: ({ localParent, planeZ }) => ({
      x: localParent === specificSelector.parent ? 33 : 11,
      y: planeZ,
      z: planeZ,
    }),
  });

  assert.ok(hit);
  assert.equal(hit?.moduleKey, 'corner:2');
  assert.equal(hit?.stack, 'bottom');
  assert.equal(hit?.hitY, -4);
  assert.equal(hit?.hitLocalX, 33);
  assert.equal(hit?.obj, specificSelector);
});

test('manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool', () => {
  const calls: string[] = [];
  const App = createApp({
    state: { mode: { opts: { manualTool: 'paint_bucket' } } },
    services: {
      builder: {
        renderOps: {
          hideSketchPlacementPreview() {
            calls.push('hideSketch');
          },
        },
      },
    },
  });

  const runtime = readManualLayoutSketchHoverRuntime(
    createSharedArgs({
      App,
      __hideLayoutPreview: () => calls.push('hideLayout'),
      __wp_clearSketchHover: () => calls.push('clearHover'),
    })
  );

  assert.equal(runtime, null);
  assert.deepEqual(calls, ['hideLayout', 'hideSketch', 'clearHover']);
});

test('manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout', () => {
  const calls: string[] = [];
  const App = createApp({
    state: { mode: { opts: { manualTool: 'sketch_box:120:80:50' } } },
    services: {
      builder: {
        renderOps: {
          hideSketchPlacementPreview() {
            calls.push('hideSketch');
          },
        },
      },
    },
  });

  const runtime = readManualLayoutSketchHoverRuntime(
    createSharedArgs({
      App,
      __pm: 'paint',
      __hideLayoutPreview: () => calls.push('hideLayout'),
      __wp_clearSketchHover: () => calls.push('clearHover'),
    })
  );

  assert.equal(runtime, null);
  assert.deepEqual(calls, ['hideSketch', 'clearHover', 'hideLayout']);
});
