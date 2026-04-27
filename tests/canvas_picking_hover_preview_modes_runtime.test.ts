import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tryHandleCellDimsHoverPreview,
  tryHandleDrawerDividerHoverPreview,
  tryHandleExtDrawersHoverPreview,
} from '../esm/native/services/canvas_picking_hover_preview_modes.ts';

function createApp(overrides: Record<string, unknown> = {}) {
  const state = {
    config: {
      modulesConfiguration: [{}],
      ...((overrides.state as any)?.config || {}),
    },
    ...((overrides.state as object) || {}),
  };
  return {
    deps: { THREE: { tag: 'THREE' }, ...((overrides.deps as object) || {}) },
    store: {
      getState: () => state,
      patch() {},
    },
    services: {
      builder: {
        renderOps: {
          ...((overrides.renderOps as object) || {}),
        },
      },
      ...((overrides.services as object) || {}),
    },
    render: {
      camera: { id: 'camera' },
      wardrobeGroup: { id: 'wardrobe' },
      ...((overrides.render as object) || {}),
    },
  } as any;
}

test('ext-drawers hover preview uses canonical preview wiring and toggles remove when drawer count already matches', () => {
  const previews: any[] = [];
  const hidden: any[] = [];
  const App = createApp({
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
      hideSketchPlacementPreview(args: unknown) {
        hidden.push(args);
      },
    },
  });

  const handled = tryHandleExtDrawersHoverPreview({
    App,
    ndcX: 0.2,
    ndcY: -0.1,
    raycaster: {},
    mouse: {},
    isExtDrawerEditMode: true,
    hideLayoutPreview(args: unknown) {
      hidden.push(args);
    },
    readUi: () => ({ currentExtDrawerType: 'regular', currentExtDrawerCount: 3 }),
    resolveInteriorHoverTarget: () => ({
      hitModuleKey: 0,
      hitSelectorObj: { id: 'selector-1' },
      isBottom: false,
      hitY: 0.5,
      info: {},
      bottomY: 0,
      topY: 2,
      spanH: 2,
      woodThick: 0.018,
      innerW: 0.9,
      internalCenterX: 0.1,
      internalDepth: 0.5,
      internalZ: -0.05,
      backZ: -0.3,
      regularDepth: 0.45,
      intersects: [],
    }),
    measureObjectLocalBox: () => ({
      centerX: 0.1,
      centerY: 1,
      centerZ: -0.02,
      width: 0.92,
      height: 2,
      depth: 0.55,
    }),
    readInteriorModuleConfigRef: () => ({ extDrawersCount: 3, hasShoeDrawer: false }),
  });

  assert.equal(handled, true);
  assert.equal(hidden.length, 1);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'ext_drawers');
  assert.equal(previews[0].op, 'remove');
  assert.equal(previews[0].drawers.length, 3);
  assert.equal(previews[0].anchor.id, 'selector-1');
});

test('drawer-divider hover preview resolves add/remove directly from canonical config state', () => {
  const previews: any[] = [];
  const hidden: any[] = [];
  const App = createApp({
    state: {
      config: {
        drawerDividersMap: { 'div:int_4': true },
      },
    },
    renderOps: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
      hideSketchPlacementPreview(args: unknown) {
        hidden.push(args);
      },
    },
  });

  const handled = tryHandleDrawerDividerHoverPreview({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {},
    mouse: {},
    isDividerEditMode: true,
    hideLayoutPreview(args: unknown) {
      hidden.push(args);
    },
    resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'int_4', dividerKey: 'div:int_4', group: { id: 'drawer-group' } },
      parent: { id: 'wardrobe-parent' },
      box: { centerX: 0.2, centerY: 0.7, centerZ: -0.1, width: 0.4, height: 0.3, depth: 0.25 },
    }),
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'drawer_divider');
  assert.equal(previews[0].op, 'remove');
  assert.equal(previews[0].anchor.id, 'drawer-group');
  assert.equal(previews[0].anchorParent.id, 'wardrobe-parent');
});

test('cell-dims hover preview projects resized selector bounds through the canonical preview seam', () => {
  const previews: any[] = [];
  const hidden: any[] = [];
  const App = createApp({
    state: {
      config: {
        modulesConfiguration: [{ specialDims: { baseWidthCm: 90, widthCm: 90 } }],
      },
    },
  });

  const handled = tryHandleCellDimsHoverPreview({
    App,
    ndcX: 0.1,
    ndcY: 0.2,
    raycaster: {},
    mouse: {},
    isCellDimsMode: true,
    hideLayoutPreview(args: unknown) {
      hidden.push(['layout', args]);
    },
    hideSketchPreview(args: unknown) {
      hidden.push(['sketch', args]);
    },
    previewRo: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
    resolveInteriorHoverTarget: () => ({
      hitModuleKey: 0,
      hitSelectorObj: { id: 'selector-2' },
      isBottom: false,
      hitY: 0.5,
      info: {},
      bottomY: 0,
      topY: 2,
      spanH: 2,
      woodThick: 0.018,
      innerW: 0.864,
      internalCenterX: 0,
      internalDepth: 0.5,
      internalZ: 0,
      backZ: -0.25,
      regularDepth: 0.45,
      intersects: [],
    }),
    measureObjectLocalBox: () => ({
      centerX: 0,
      centerY: 0.5,
      centerZ: 0,
      width: 0.9,
      height: 1,
      depth: 0.5,
    }),
    readCellDimsDraft: () => ({ applyW: 100, applyH: 140, applyD: 60 }),
    estimateVisibleModuleFrontZ: () => 0.25,
    getCellDimsHoverOp: () => 'add',
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'box');
  assert.equal(previews[0].op, 'add');
  assert.equal(previews[0].anchor.id, 'selector-2');
  assert.ok(previews[0].w > 0.88 && previews[0].w < 0.99);
  assert.ok(previews[0].boxH > 1.39 && previews[0].boxH < 1.41);
  assert.ok(previews[0].d >= 0.59 && previews[0].d <= 0.61);
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0][0], 'layout');
});
