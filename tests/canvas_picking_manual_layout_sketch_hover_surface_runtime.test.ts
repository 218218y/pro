import test from 'node:test';
import assert from 'node:assert/strict';

import {
  handleManualLayoutSketchHoverModuleSurfacePreview,
  tryHandleManualLayoutSketchHoverExistingVerticalRemovePreview,
} from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_surface.ts';
import { tryHandleManualLayoutSketchHoverModulePreviewFlow } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_flow.ts';
import { resolveDoorLeafOwner } from '../esm/native/services/canvas_picking_door_action_hover_state.ts';

function createSurfaceContext(overrides: Record<string, unknown> = {}) {
  const calls = {
    hover: [] as any[],
    previews: [] as any[],
    hides: 0,
  };

  const ctx = {
    App: {},
    tool: 'sketch_shelf:glass',
    hitModuleKey: 2,
    hitSelectorObj: { id: 'selector-1' },
    hitLocalX: 0,
    intersects: [],
    setPreview(args: unknown) {
      calls.previews.push(args);
    },
    hidePreview() {
      calls.hides += 1;
    },
    __wp_writeSketchHover(_app: unknown, hover: unknown) {
      calls.hover.push(hover);
    },
    __wp_isCornerKey: () => false,
    __wp_resolveSketchBoxGeometry: () => ({
      xNorm: 0.5,
      centered: true,
      centerX: 0,
      centerZ: 0,
      innerCenterZ: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
      outerW: 1,
      outerD: 0.55,
    }),
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [],
    __hideSketchPreviewAndClearHover: () => undefined,
    __wp_isDefaultCornerCellCfgLike: () => false,
    isBottom: false,
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: false },
    bottomY: 0,
    topY: 1.2,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    spanH: 1.2,
    pad: 0.003,
    yClamped: 0.8,
    isBox: false,
    isStorage: false,
    isShelf: true,
    isRod: false,
    isDrawers: false,
    isExtDrawers: false,
    variant: 'glass',
    shelfDepthM: null,
    shelfDepthOverrideM: null,
    boxSpec: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    rods: [],
    drawers: [],
    extDrawers: [],
    activeModuleBox: null,
    ...overrides,
  } as any;

  return { ctx, calls };
}

test('module surface hover writes preview-only shelf add results instead of dropping them', () => {
  const { ctx, calls } = createSurfaceContext({
    tool: 'sketch_shelf:glass',
    isShelf: true,
    yClamped: 0.76,
  });

  const handled = handleManualLayoutSketchHoverModuleSurfacePreview(ctx);
  assert.equal(handled, true);
  assert.equal(calls.hover.length, 0);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.previews[0].kind, 'shelf');
  assert.equal(calls.previews[0].op, 'add');
  assert.equal(calls.hides, 0);
});

test('module preview flow probes existing shelf removal before drawer stack add previews', () => {
  const { ctx, calls } = createSurfaceContext({
    tool: 'sketch_int_drawers',
    isShelf: false,
    isDrawers: true,
    intersects: [
      {
        object: { userData: { partId: 'all_shelves' } },
        point: { y: 0.6 },
      },
    ],
  });

  const handled = tryHandleManualLayoutSketchHoverModulePreviewFlow(ctx);
  assert.equal(handled, true);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.hover[0].kind, 'shelf');
  assert.equal(calls.hover[0].op, 'remove');
  assert.equal(calls.previews[0].kind, 'shelf');
  assert.equal(calls.previews[0].op, 'remove');
});

test('existing vertical remove helper is a no-op when nothing removable is under the cursor', () => {
  const { ctx, calls } = createSurfaceContext({
    tool: 'sketch_ext_drawers:4',
    isShelf: false,
    isDrawers: false,
    isExtDrawers: true,
    intersects: [],
  });

  const handled = tryHandleManualLayoutSketchHoverExistingVerticalRemovePreview(ctx);
  assert.equal(handled, false);
  assert.equal(calls.hover.length, 0);
  assert.equal(calls.previews.length, 0);
  assert.equal(calls.hides, 0);
});

test('door action hover state resolves the nearest door leaf owner with metrics', () => {
  const leafOwner = {
    userData: {
      partId: 'd1',
      __doorWidth: 1.1,
      __doorHeight: 2,
      __hingeLeft: true,
    },
    parent: null,
  } as any;
  const childHit = {
    userData: {
      partId: 'd1',
    },
    parent: leafOwner,
  } as any;

  const resolved = resolveDoorLeafOwner(childHit);
  assert.equal(resolved.groupRec, leafOwner);
  assert.equal(resolved.userData?.partId, 'd1');
  assert.equal(resolved.userData?.__doorWidth, 1.1);
  assert.equal(childHit.userData.__doorWidth, undefined);
});
