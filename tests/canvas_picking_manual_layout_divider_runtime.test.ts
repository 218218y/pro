import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleManualLayoutSketchHoverModuleDividerFlow } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_divider_flow.ts';

function createContext(overrides: Record<string, unknown> = {}) {
  const previews: any[] = [];
  const hovers: any[] = [];

  const ctx = {
    App: {},
    tool: 'sketch_box_divider',
    boxes: [{ id: 'box-1', yNorm: 0.5, heightM: 0.8, widthM: 0.7, depthM: 0.45, xNorm: 0.5 }],
    setPreview(preview: unknown) {
      previews.push(preview);
    },
    hitModuleKey: 3,
    hitSelectorObj: { id: 'selector-1' },
    hitLocalX: 0,
    internalCenterX: 0,
    woodThick: 0.02,
    innerW: 0.9,
    internalDepth: 0.5,
    internalZ: -0.1,
    bottomY: 0,
    spanH: 2,
    yClamped: 1,
    isBottom: false,
    __wp_resolveSketchBoxGeometry: () => ({
      outerW: 0.72,
      innerW: 0.68,
      centerX: 0,
      outerD: 0.48,
      innerD: 0.44,
      centerZ: -0.12,
      innerBackZ: -0.34,
    }),
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [{ index: 0, centerX: 0, width: 0.34, xNorm: 0.5 }],
    __wp_pickSketchBoxSegment: ({ segments }: any) => segments[0] ?? null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({ xNorm: 0.18, centerX: -0.12, centered: false }),
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_writeSketchHover: (_app: unknown, hover: unknown) => {
      hovers.push(hover);
    },
    ...overrides,
  } as any;

  return { ctx, previews, hovers };
}

test('manual-layout divider hover snaps to the active segment center when the cursor is close enough', () => {
  const { ctx, previews, hovers } = createContext();

  const handled = tryHandleManualLayoutSketchHoverModuleDividerFlow(ctx);
  assert.equal(handled, true);
  assert.equal(hovers.length, 1);
  assert.equal(previews.length, 1);

  assert.equal(hovers[0].kind, 'box_content');
  assert.equal(hovers[0].contentKind, 'divider');
  assert.equal(hovers[0].op, 'add');
  assert.equal(hovers[0].tool, 'sketch_box_divider');
  assert.equal(hovers[0].moduleKey, 3);
  assert.equal(hovers[0].isBottom, false);
  assert.equal(hovers[0].hostModuleKey, 3);
  assert.equal(hovers[0].hostIsBottom, false);
  assert.equal(hovers[0].boxId, 'box-1');
  assert.equal(hovers[0].dividerId ?? null, null);
  assert.equal(hovers[0].dividerXNorm, 0.5);
  assert.equal(hovers[0].snapToCenter, true);
  assert.equal(Number.isFinite(hovers[0].ts), true);

  assert.equal(previews[0].kind, 'drawer_divider');
  assert.equal(previews[0].x, 0);
  assert.equal(previews[0].y, 1);
  assert.equal(previews[0].h, 0.76);
});

test('manual-layout divider hover switches into remove mode when an existing divider is nearest', () => {
  const { ctx, previews, hovers } = createContext({
    __wp_findNearestSketchBoxDivider: () => ({ dividerId: 'div-1', xNorm: 0.22, centerX: -0.11 }),
    __wp_pickSketchBoxSegment: () => null,
  });

  const handled = tryHandleManualLayoutSketchHoverModuleDividerFlow(ctx);
  assert.equal(handled, true);
  assert.equal(hovers.length, 1);
  assert.equal(previews.length, 1);

  assert.equal(hovers[0].kind, 'box_content');
  assert.equal(hovers[0].contentKind, 'divider');
  assert.equal(hovers[0].op, 'remove');
  assert.equal(hovers[0].boxId, 'box-1');
  assert.equal(hovers[0].dividerId, 'div-1');
  assert.equal(hovers[0].dividerXNorm, 0.22);
  assert.equal(hovers[0].snapToCenter, false);
  assert.equal(previews[0].kind, 'drawer_divider');
  assert.equal(previews[0].x, -0.11);
});
