import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleManualLayoutSketchHoverPreviewImpl } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_router.ts';

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
      wardrobeGroup: { id: 'wardrobe-root', children: [] as unknown[] },
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

function createBaseArgs(overrides: Record<string, unknown> = {}) {
  return {
    App: createApp(),
    ndcX: 0.05,
    ndcY: -0.15,
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
    __wp_projectWorldPointToLocal: () => ({ x: 0, z: 0 }),
    __wp_parseSketchBoxToolSpec: () => null,
    __wp_pickSketchFreeBoxHost: () => null,
    __wp_measureWardrobeLocalBox: () => ({ centerX: 0, centerZ: 0, width: 2, depth: 0.6 }),
    __wp_intersectScreenWithLocalZPlane: ({ planeZ }: any) => ({ x: 0.1, y: 0.9, z: planeZ }),
    __wp_readInteriorModuleConfigRef: () => ({ sketchExtras: { boxes: [] } }),
    __wp_resolveSketchFreeBoxGeometry: () => ({ centerX: 0, centerZ: -0.15, innerW: 0.8, innerD: 0.5 }),
    __wp_getSketchFreeBoxPartPrefix: () => 'free_box',
    __wp_findSketchFreeBoxLocalHit: () => null,
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [{ index: 0, centerX: 0, width: 0.8, xNorm: 0.5 }],
    __wp_pickSketchBoxSegment: ({ segments }: any) => segments[0] ?? null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({ dividerX: 0 }),
    __wp_findSketchModuleBoxAtPoint: () => null,
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_isCornerKey: () => false,
    __wp_isDefaultCornerCellCfgLike: () => false,
    __wp_resolveSketchBoxGeometry: () => ({
      centerX: 0,
      centerZ: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
    }),
    __wp_resolveSketchFreeBoxHoverPlacement: () => null,
    __wp_resolveDrawerHoverPreviewTarget: () => null,
    __wp_writeSketchHover: () => undefined,
    __wp_clearSketchHover: () => undefined,
    ...overrides,
  } as any;
}

test('manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools', () => {
  const calls = {
    previews: [] as any[],
    hover: [] as any[],
    hideSketch: 0,
    hideLayout: 0,
  };
  const selectorObj = {
    parent: { id: 'selector-parent' },
    userData: { isModuleSelector: true, moduleIndex: 2, __wpStack: 'top' },
    geometry: { boundingBox: { min: { x: -0.5, y: 0, z: -0.2 }, max: { x: 0.5, y: 1, z: 0.2 } } },
    updateWorldMatrix() {},
    updateMatrixWorld() {},
    localToWorld(v: any) {
      return v;
    },
  };
  const App = createApp({
    state: {
      mode: { opts: { manualTool: 'sketch_shelf:glass' } },
      config: { modulesConfiguration: [{ sketchExtras: { boxes: [{ id: 'box-1', shelves: [] }] } }] },
    },
    services: {
      runtimeCache: {
        internalGridMap: {
          '2': {
            effectiveBottomY: 0,
            effectiveTopY: 2,
            woodThick: 0.02,
            innerW: 0.96,
            internalCenterX: 0,
            internalDepth: 0.5,
            internalZ: -0.1,
          },
        },
      },
      builder: {
        renderOps: {
          setSketchPlacementPreview(args: unknown) {
            calls.previews.push(args);
          },
          hideSketchPlacementPreview() {
            calls.hideSketch += 1;
          },
        },
      },
    },
  });

  const handled = tryHandleManualLayoutSketchHoverPreviewImpl(
    createBaseArgs({
      App,
      __hideLayoutPreview: () => {
        calls.hideLayout += 1;
      },
      __wp_raycastReuse: () => [{ object: selectorObj, point: { x: 0, y: 0.6, z: 0 } }],
      __wp_projectWorldPointToLocal: () => ({ x: 0.12, z: 0 }),
      __wp_intersectScreenWithLocalZPlane: ({ planeZ }: any) => ({ x: 0.12, y: 0.9, z: planeZ }),
      __wp_findSketchModuleBoxAtPoint: () => ({
        boxId: 'box-1',
        box: { shelves: [] },
        geo: { centerX: 0, innerW: 0.8, innerD: 0.5, innerBackZ: -0.25 },
        centerY: 1,
        height: 0.8,
      }),
      __wp_writeSketchHover: (_App: unknown, hover: unknown) => {
        calls.hover.push(hover);
      },
    })
  );

  assert.equal(handled, true);
  assert.equal(calls.hideLayout, 1);
  assert.equal(calls.hideSketch, 0);
  assert.equal(calls.hover.length, 0);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.previews[0].kind, 'shelf');
  assert.equal(calls.previews[0].anchor, selectorObj);
});

test('manual-layout sketch hover falls back to standalone free placement when no selector is hit', () => {
  const calls = {
    previews: [] as any[],
    hover: [] as any[],
    hideSketch: 0,
    hideLayout: 0,
  };
  const App = createApp({
    state: { mode: { opts: { manualTool: 'sketch_box:80:45:35' } } },
    services: {
      builder: {
        renderOps: {
          setSketchPlacementPreview(args: unknown) {
            calls.previews.push(args);
          },
          hideSketchPlacementPreview() {
            calls.hideSketch += 1;
          },
        },
      },
    },
  });

  const handled = tryHandleManualLayoutSketchHoverPreviewImpl(
    createBaseArgs({
      App,
      __hideLayoutPreview: () => {
        calls.hideLayout += 1;
      },
      __wp_parseSketchBoxToolSpec: () => ({ heightCm: 80, widthCm: 45, depthCm: 35 }),
      __wp_pickSketchFreeBoxHost: () => ({ moduleKey: 4, isBottom: false }),
      __wp_resolveSketchFreeBoxHoverPlacement: () => ({
        previewX: 0.2,
        previewY: 0.4,
        previewW: 0.45,
        previewD: 0.35,
        previewH: 0.8,
        snapToCenter: false,
        op: 'add',
        boxId: null,
        x: 0.2,
        y: 0.4,
        w: 0.45,
        d: 0.35,
        h: 0.8,
      }),
      __wp_writeSketchHover: (_App: unknown, hover: unknown) => {
        calls.hover.push(hover);
      },
    })
  );

  assert.equal(handled, true);
  assert.equal(calls.hideLayout, 1);
  assert.equal(calls.hideSketch, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.hover[0].kind, 'box');
  assert.equal(calls.hover[0].moduleKey, 4);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.previews[0].kind, 'box');
  assert.equal(calls.previews[0].anchorParent, App.render.wardrobeGroup);
  assert.equal(calls.previews[0].w, 0.45);
  assert.equal(calls.previews[0].boxH, 0.8);
});

test('manual-layout sketch external drawer hover marks standard external drawers for removal only', () => {
  const calls = { previews: [] as any[], hover: [] as any[] };
  const drawerGroup = { userData: { partId: 'd1_draw_2', moduleIndex: 1 } };
  const parent = { id: 'module-parent' };
  const App = createApp({
    state: { mode: { opts: { manualTool: 'sketch_ext_drawers:3' } } },
    services: {
      builder: {
        renderOps: {
          setSketchPlacementPreview(args: unknown) {
            calls.previews.push(args);
          },
        },
      },
    },
  });

  const handled = tryHandleManualLayoutSketchHoverPreviewImpl(
    createBaseArgs({
      App,
      __wp_resolveDrawerHoverPreviewTarget: () => ({
        drawer: { id: 'd1_draw_2', group: drawerGroup },
        parent,
        box: { centerX: 0.1, centerY: 0.4, centerZ: 0.2, width: 0.6, height: 0.18, depth: 0.03 },
      }),
      __wp_writeSketchHover: (_App: unknown, hover: unknown) => {
        calls.hover.push(hover);
      },
    })
  );

  assert.equal(handled, true);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.hover[0].kind, 'ext_drawers');
  assert.equal(calls.hover[0].op, 'remove');
  assert.equal(calls.hover[0].removeKind, 'std');
  assert.equal(calls.hover[0].removePid, 'd1_draw_2');
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.previews[0].kind, 'ext_drawers');
  assert.equal(calls.previews[0].op, 'remove');
  assert.equal(calls.previews[0].anchor, drawerGroup);
});

test('manual-layout sketch internal drawer hover ignores standard external drawers', () => {
  const calls = { previews: [] as any[], hover: [] as any[] };
  const drawerGroup = { userData: { partId: 'd1_draw_2', moduleIndex: 1 } };
  const App = createApp({
    state: { mode: { opts: { manualTool: 'sketch_drawers' } } },
    services: {
      builder: {
        renderOps: {
          setSketchPlacementPreview(args: unknown) {
            calls.previews.push(args);
          },
        },
      },
    },
  });

  const handled = tryHandleManualLayoutSketchHoverPreviewImpl(
    createBaseArgs({
      App,
      __wp_resolveDrawerHoverPreviewTarget: () => ({
        drawer: { id: 'd1_draw_2', group: drawerGroup },
        parent: { id: 'module-parent' },
        box: { centerX: 0.1, centerY: 0.4, centerZ: 0.2, width: 0.6, height: 0.18, depth: 0.03 },
      }),
      __wp_writeSketchHover: (_App: unknown, hover: unknown) => {
        calls.hover.push(hover);
      },
    })
  );

  assert.equal(handled, false);
  assert.equal(calls.hover.length, 0);
  assert.equal(calls.previews.length, 0);
});
