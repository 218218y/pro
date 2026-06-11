import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleManualLayoutSketchHoverModuleBoxPreview } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_box.ts';
import { tryHandleManualLayoutSketchHoverModuleStackPreview } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_stack.ts';

function createBaseContext(overrides: Record<string, unknown> = {}) {
  const calls = {
    hover: [] as any[],
    previews: [] as any[],
    hides: 0,
  };

  const ctx = {
    App: {},
    tool: 'sketch_shelf',
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
      centerX: 0,
      centerZ: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
    }),
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [{ index: 0, centerX: 0, width: 0.8, xNorm: 0.5 }],
    __wp_pickSketchBoxSegment: ({ segments }: any) => segments[0] ?? null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({ dividerX: 0 }),
    __wp_readSketchBoxDividerXNorm: () => null,
    __hideSketchPreviewAndClearHover: () => undefined,
    __wp_isDefaultCornerCellCfgLike: () => false,
    isBottom: false,
    info: {},
    bottomY: 0,
    topY: 2,
    woodThick: 0.02,
    innerW: 0.96,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: -0.1,
    spanH: 2,
    pad: 0.02,
    yClamped: 1,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    isDrawers: false,
    isExtDrawers: false,
    variant: 'glass',
    shelfDepthM: null,
    shelfDepthOverrideM: null,
    boxSpec: null,
    boxH: 0.6,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.24,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    rods: [],
    drawers: [],
    extDrawers: [],
    cfgRef: {},
    activeModuleBox: null,
    ...overrides,
  } as any;

  return { ctx, calls };
}

test('manual-layout module box preview routes shelf hover through the focused box owner', () => {
  const { ctx, calls } = createBaseContext({
    isShelf: true,
    activeModuleBox: {
      boxId: 'box-1',
      box: { shelves: [] },
      geo: { centerX: 0, innerW: 0.8, innerD: 0.5, innerBackZ: -0.25 },
      centerY: 1,
      height: 0.8,
    },
  });

  const handled = tryHandleManualLayoutSketchHoverModuleBoxPreview(ctx);
  assert.equal(handled, true);
  assert.equal(calls.hides, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.previews.length, 1);

  const hoverRecord = calls.hover[0];
  const preview = calls.previews[0];
  assert.equal(hoverRecord.kind, 'box_content');
  assert.equal(hoverRecord.contentKind, 'shelf');
  assert.equal(hoverRecord.boxId, 'box-1');
  assert.equal(preview.anchor, ctx.hitSelectorObj);
  assert.equal(preview.kind, 'shelf');
  assert.equal(preview.variant, 'glass');
});

test('manual-layout module stack preview routes ext drawers through the focused stack owner', () => {
  const { ctx, calls } = createBaseContext({
    tool: 'sketch_ext_drawers:4',
    isExtDrawers: true,
    yClamped: 1.15,
    bottomY: 0,
    topY: 2.4,
    spanH: 2.4,
    internalDepth: 0.58,
    internalZ: -0.08,
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);
  assert.equal(handled, true);
  assert.equal(calls.hides, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.previews.length, 1);

  const hoverRecord = calls.hover[0];
  const preview = calls.previews[0];
  assert.equal(hoverRecord.kind, 'ext_drawers');
  assert.equal(hoverRecord.drawerCount, 4);
  assert.equal(preview.anchor, ctx.hitSelectorObj);
  assert.equal(preview.kind, 'ext_drawers');
  assert.equal(preview.drawers.length, 4);
});
