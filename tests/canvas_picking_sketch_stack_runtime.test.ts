import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleManualLayoutSketchHoverModuleStackPreview } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_stack.ts';
import { buildManualLayoutSketchInternalDrawerBlockers } from '../esm/native/services/canvas_picking_manual_layout_sketch_stack_placement.ts';
import { resolveSketchFreeStackContentPreview } from '../esm/native/services/canvas_picking_sketch_free_box_content_preview_stack.ts';
import { tryCommitSketchModuleStackTool } from '../esm/native/services/canvas_picking_sketch_module_stack_apply.ts';

function createModuleStackContext(overrides: Record<string, unknown> = {}) {
  const calls = {
    hover: [] as Array<Record<string, unknown> | null>,
    previews: [] as Array<Record<string, unknown>>,
    hides: 0,
  };

  const ctx = {
    App: {},
    tool: 'sketch_int_drawers',
    hitModuleKey: 2,
    hitSelectorObj: { id: 'selector-1' },
    hitLocalX: 0,
    intersects: [],
    setPreview(args: Record<string, unknown>) {
      calls.previews.push(args);
    },
    hidePreview() {
      calls.hides += 1;
    },
    __wp_writeSketchHover(_app: unknown, hover: Record<string, unknown> | null) {
      calls.hover.push(hover);
    },
    __wp_isCornerKey: () => false,
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [{ index: 0, centerX: 0, width: 0.8, xNorm: 0.5 }],
    __wp_pickSketchBoxSegment: ({ segments }: { segments: Array<Record<string, unknown>> }) =>
      segments[0] ?? null,
    activeModuleBox: null,
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
    isDrawers: true,
    isExtDrawers: false,
    drawers: [],
    extDrawers: [],
    cfgRef: {},
    ...overrides,
  } as any;

  return { ctx, calls };
}

test('manual-layout module stack preview routes focused box drawers through the box-stack owner', () => {
  const { ctx, calls } = createModuleStackContext({
    activeModuleBox: {
      boxId: 'box-1',
      box: { id: 'box-1', drawers: [] },
      geo: {
        centerX: 0,
        innerW: 0.8,
        innerD: 0.5,
        innerBackZ: -0.25,
        outerW: 0.836,
        centerZ: 0,
        outerD: 0.536,
      },
      centerY: 1,
      height: 0.9,
    },
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);
  assert.equal(handled, true);
  assert.equal(calls.hides, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.previews.length, 1);

  const hoverRecord = calls.hover[0] as Record<string, unknown>;
  const preview = calls.previews[0];
  assert.equal(hoverRecord.kind, 'box_content');
  assert.equal(hoverRecord.contentKind, 'drawers');
  assert.equal(hoverRecord.boxId, 'box-1');
  assert.equal(hoverRecord.freePlacement, false);
  assert.equal(preview.anchor, ctx.hitSelectorObj);
  assert.equal(preview.kind, 'drawers');
  assert.deepEqual(
    (preview.clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['25 ס"מ', '25 ס"מ']
  );
});

test('sketch free stack preview routes ext drawers through the canonical box-stack owner with free placement', () => {
  const result = resolveSketchFreeStackContentPreview({
    tool: 'sketch_ext_drawers:4@30',
    contentKind: 'ext_drawers',
    host: { moduleKey: 2, isBottom: false },
    target: {
      boxId: 'free-1',
      targetBox: { id: 'free-1', freePlacement: true, extDrawers: [] },
      targetGeo: {
        centerX: 0.3,
        innerW: 0.8,
        innerD: 0.5,
        innerBackZ: -0.25,
        outerW: 0.836,
        centerZ: 0,
        outerD: 0.536,
      },
      targetCenterY: 1,
      targetHeight: 1.4,
      pointerX: 0.31,
      pointerY: 1.08,
    },
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [{ index: 0, centerX: 0.3, width: 0.8, xNorm: 0.5 }],
    pickSketchBoxSegment: ({ segments }: { segments: Array<Record<string, unknown>> }) => segments[0] ?? null,
  });

  assert.equal(result.mode, 'preview');
  assert.equal(result.hoverRecord.kind, 'box_content');
  assert.equal(result.hoverRecord.contentKind, 'ext_drawers');
  assert.equal(result.hoverRecord.boxId, 'free-1');
  assert.equal(result.hoverRecord.freePlacement, true);
  assert.equal(result.hoverRecord.drawerCount, 4);
  assert.equal(result.preview.kind, 'ext_drawers');
  assert.equal(Array.isArray(result.preview.drawers), true);
  assert.equal(result.preview.drawers.length, 4);
  assert.deepEqual(
    (result.preview.clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['16 ס"מ']
  );
});

test('sketch free external drawer removal preview does not emit a full-cell front overlay', () => {
  const segment = { index: 0, centerX: 0.3, width: 0.8, xNorm: 0.5, leftX: -0.1, rightX: 0.7 };
  const result = resolveSketchFreeStackContentPreview({
    tool: 'sketch_ext_drawers:4@30',
    contentKind: 'ext_drawers',
    host: { moduleKey: 2, isBottom: false },
    target: {
      boxId: 'free-1',
      targetBox: {
        id: 'free-1',
        freePlacement: true,
        extDrawers: [{ id: 'sed-existing', xNorm: 0.5, yNormC: 0.5, count: 2, drawerHeightM: 0.2 }],
      },
      targetGeo: {
        centerX: 0.3,
        innerW: 0.8,
        innerD: 0.5,
        innerBackZ: -0.25,
        outerW: 0.836,
        centerZ: 0,
        outerD: 0.536,
      },
      targetCenterY: 1,
      targetHeight: 1.4,
      pointerX: 0.31,
      pointerY: 1,
    },
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [segment],
    pickSketchBoxSegment: ({ segments }: { segments: Array<Record<string, unknown>> }) => segments[0] ?? null,
  });

  assert.equal(result.mode, 'preview');
  assert.equal(result.hoverRecord.op, 'remove');
  assert.equal(result.hoverRecord.removeId, 'sed-existing');
  assert.equal(result.preview.kind, 'ext_drawers');
  assert.equal(result.preview.op, 'remove');
  assert.equal(result.preview.drawers.length, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(result.preview, 'frontOverlayZ'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.preview, 'frontOverlayH'), false);
});

test('manual-layout module sketch external drawer preview keeps exact size and marks no-room hover red when it cannot fit', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_ext_drawers:4@30',
    isDrawers: false,
    isExtDrawers: true,
    topY: 0.9,
    spanH: 0.9,
    yClamped: 0.45,
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.hides, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.hover[0]?.kind, 'ext_drawers');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.drawerCount, 4);
  assert.equal(calls.hover[0]?.drawerH, 0.3);
  assert.equal(calls.hover[0]?.stackH, 1.2);
  assert.equal(calls.hover[0]?.__wpBlockedReason, 'no-room');
  assert.equal(calls.previews[0]?.kind, 'ext_drawers');
  assert.equal(calls.previews[0]?.op, 'blocked');
  assert.equal(calls.previews[0]?.blockedReason, 'no-room');
  assert.equal(calls.previews[0]?.drawers.length, 4);
});

test('sketch internal drawer blockers reserve the cassette frame using real wood thickness', () => {
  const woodThick = 0.018;
  const pad = 0.006;
  const blockers = buildManualLayoutSketchInternalDrawerBlockers({
    drawers: [{ id: 'sid-1', drawerHeightM: 0.2 }],
    bottomY: 0,
    topY: 2.4,
    pad,
    woodThick,
    readCenterY: () => 1.2,
  });

  assert.equal(blockers.length, 1);
  const blocker = blockers[0];
  assert.ok(blocker.pointerMinY != null);
  assert.ok(blocker.pointerMaxY != null);
  assert.ok(Math.abs(blocker.pointerMinY - blocker.minY - woodThick) < 1e-9);
  assert.ok(Math.abs(blocker.maxY - blocker.pointerMaxY - woodThick) < 1e-9);
});

test('manual-layout module sketch internal drawer preview snaps into the crossed shelf cell without jumping to another cell', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_int_drawers',
    isDrawers: true,
    isExtDrawers: false,
    topY: 2.4,
    spanH: 2.4,
    pad: 0.006,
    woodThick: 0.018,
    yClamped: 0.45,
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: false, gridDivisions: 6 },
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.hides, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.hover[0]?.kind, 'drawers');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.__wpBlockedReason, undefined);
  assert.ok(Math.abs(Number(calls.hover[0]?.yCenter) - 0.589) < 1e-9);
  assert.equal(calls.previews[0]?.kind, 'drawers');
  assert.equal(calls.previews[0]?.op, 'add');
  assert.equal(calls.previews[0]?.blockedReason, undefined);
});

test('manual-layout module sketch internal drawer preview marks no-room hover red when it cannot fit', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_int_drawers@30',
    isDrawers: true,
    isExtDrawers: false,
    topY: 0.55,
    spanH: 0.55,
    yClamped: 0.25,
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.hides, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.hover[0]?.kind, 'drawers');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.drawerH, 0.3);
  assert.equal(calls.hover[0]?.__wpBlockedReason, 'no-room');
  assert.equal(calls.previews[0]?.kind, 'drawers');
  assert.equal(calls.previews[0]?.op, 'blocked');
  assert.equal(calls.previews[0]?.blockedReason, 'no-room');
  assert.equal(calls.previews[0]?.drawerH, 0.3);
});

test('manual-layout module sketch external drawer preview allows clear cell placement', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_ext_drawers:2@30',
    isDrawers: false,
    isExtDrawers: true,
    topY: 0.9,
    spanH: 0.9,
    yClamped: 0.45,
    cfgRef: { gridDivisions: 3 },
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.hides, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.hover[0]?.kind, 'ext_drawers');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.__wpBlockedReason, undefined);
  assert.equal(calls.previews[0]?.kind, 'ext_drawers');
  assert.notEqual(calls.previews[0]?.op, 'blocked');
  assert.equal(calls.previews[0]?.blockedReason, undefined);
});

test('manual-layout module sketch external drawer preview marks collision with shelves red', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_ext_drawers:2@30',
    isDrawers: false,
    isExtDrawers: true,
    topY: 0.9,
    spanH: 0.9,
    yClamped: 0.45,
    shelves: [{ yNorm: 0.5, variant: 'regular' }],
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.hover[0]?.kind, 'ext_drawers');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.__wpBlockedReason, 'collision');
  assert.equal(calls.previews[0]?.kind, 'ext_drawers');
  assert.equal(calls.previews[0]?.op, 'blocked');
  assert.equal(calls.previews[0]?.blockedReason, 'collision');
});

test('manual-layout module sketch external drawer preview uses the same crossed-cell snap as internal drawers', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_ext_drawers:2@16.5',
    isDrawers: false,
    isExtDrawers: true,
    topY: 2.4,
    spanH: 2.4,
    pad: 0.006,
    woodThick: 0.018,
    yClamped: 0.45,
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: false, gridDivisions: 6 },
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.hover[0]?.kind, 'ext_drawers');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.__wpBlockedReason, undefined);
  assert.ok(Math.abs(Number(calls.hover[0]?.yCenter) - 0.574) < 1e-9);
  assert.equal(calls.previews[0]?.kind, 'ext_drawers');
  assert.equal(calls.previews[0]?.op, 'add');
  assert.equal(calls.previews[0]?.blockedReason, undefined);
});

test('manual-layout module sketch external drawer preview marks collision with sketch rods red', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_ext_drawers:2@30',
    isDrawers: false,
    isExtDrawers: true,
    topY: 0.9,
    spanH: 0.9,
    yClamped: 0.45,
    rods: [{ yNorm: 0.5 }],
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.hover[0]?.kind, 'ext_drawers');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.__wpBlockedReason, 'collision');
  assert.equal(calls.previews[0]?.kind, 'ext_drawers');
  assert.equal(calls.previews[0]?.op, 'blocked');
  assert.equal(calls.previews[0]?.blockedReason, 'collision');
});

test('manual-layout module sketch internal drawer preview marks collision with base storage red', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_int_drawers@20',
    isDrawers: true,
    isExtDrawers: false,
    topY: 0.9,
    spanH: 0.9,
    yClamped: 0.25,
    cfgRef: { layout: 'storage', isCustom: false },
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.hover[0]?.kind, 'drawers');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.__wpBlockedReason, 'collision');
  assert.equal(calls.previews[0]?.kind, 'drawers');
  assert.equal(calls.previews[0]?.op, 'blocked');
  assert.equal(calls.previews[0]?.blockedReason, 'collision');
});

test('manual-layout focused box sketch internal drawer preview marks no-room hover red when it cannot fit', () => {
  const { ctx, calls } = createModuleStackContext({
    tool: 'sketch_int_drawers@30',
    isDrawers: true,
    isExtDrawers: false,
    yClamped: 0.25,
    activeModuleBox: {
      boxId: 'box-small',
      box: { id: 'box-small', drawers: [] },
      geo: {
        centerX: 0,
        innerW: 0.8,
        innerD: 0.5,
        innerBackZ: -0.25,
        outerW: 0.836,
        centerZ: 0,
        outerD: 0.536,
      },
      centerY: 0.275,
      height: 0.55,
    },
  });

  const handled = tryHandleManualLayoutSketchHoverModuleStackPreview(ctx);

  assert.equal(handled, true);
  assert.equal(calls.previews.length, 1);
  assert.equal(calls.hides, 0);
  assert.equal(calls.hover.length, 1);
  assert.equal(calls.hover[0]?.kind, 'box_content');
  assert.equal(calls.hover[0]?.contentKind, 'drawers');
  assert.equal(calls.hover[0]?.boxId, 'box-small');
  assert.equal(calls.hover[0]?.op, 'add');
  assert.equal(calls.hover[0]?.__wpBlockedReason, 'no-room');
  assert.equal(calls.previews[0]?.kind, 'drawers');
  assert.equal(calls.previews[0]?.op, 'blocked');
  assert.equal(calls.previews[0]?.blockedReason, 'no-room');
});

test('stack tool consumes opposite-family remove hover without adding internal drawers', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [],
      extDrawers: [{ id: 'sed-1', count: 2, yNormC: 0.5 }],
    },
  };
  const writes: Array<Record<string, unknown> | null> = [];

  const handled = tryCommitSketchModuleStackTool({
    App: {},
    cfg,
    tool: 'sketch_int_drawers',
    hoverOk: true,
    hoverRec: {
      kind: 'ext_drawers',
      op: 'remove',
      removeId: 'sed-1',
      yCenter: 1.2,
      baseY: 0.9,
      stackH: 0.4,
      drawerH: 0.2,
    },
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.006,
    woodThick: 0.018,
    hitYClamped: 1.2,
    hoverHost: { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      writes.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  assert.deepEqual((cfg.sketchExtras as any).drawers, []);
  assert.equal(writes.length, 0);
});

test('stack tool consumes opposite-family remove hover without adding external drawers', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'sid-1', yNormC: 0.5 }],
      extDrawers: [],
    },
  };
  const writes: Array<Record<string, unknown> | null> = [];

  const handled = tryCommitSketchModuleStackTool({
    App: {},
    cfg,
    tool: 'sketch_ext_drawers:2',
    hoverOk: true,
    hoverRec: {
      kind: 'drawers',
      op: 'remove',
      removeId: 'sid-1',
      yCenter: 1.2,
      baseY: 0.9,
      stackH: 0.4,
      drawerH: 0.2,
    },
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.006,
    woodThick: 0.018,
    hitYClamped: 1.2,
    hoverHost: { tool: 'sketch_ext_drawers:2', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      writes.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  assert.deepEqual((cfg.sketchExtras as any).extDrawers, []);
  assert.equal(writes.length, 0);
});

test('stack tool toggles focused box drawers through the box-content owner', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [{ id: 'box-1', heightM: 0.9, drawers: [] }],
    },
  };
  let nextHover: Record<string, unknown> | null = null;

  const handled = tryCommitSketchModuleStackTool({
    App: {},
    cfg,
    tool: 'sketch_int_drawers',
    hoverOk: true,
    hoverRec: {
      kind: 'box_content',
      contentKind: 'drawers',
      boxId: 'box-1',
      op: 'add',
      boxYNorm: 0.35,
      boxBaseYNorm: 0.21,
      contentXNorm: 0.45,
      yCenter: 0.8,
      baseY: 0.58,
      stackH: 0.44,
      drawerH: 0.2,
      drawerGap: 0.03,
    },
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 0.8,
    hoverHost: { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      nextHover = hover as Record<string, unknown> | null;
    },
  });

  assert.equal(handled, true);
  const boxes = (cfg.sketchExtras as any).boxes;
  assert.equal(Array.isArray(boxes), true);
  assert.equal(Array.isArray(boxes[0].drawers), true);
  assert.equal(boxes[0].drawers.length, 1);
  assert.equal(nextHover?.kind, 'box_content');
  assert.equal(nextHover?.contentKind, 'drawers');
  assert.equal(nextHover?.boxId, 'box-1');
  assert.equal(nextHover?.op, 'remove');
});

test('stack tool toggles focused box ext drawers through the box-content owner', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [{ id: 'box-1', heightM: 1.2, extDrawers: [] }],
    },
  };
  let nextHover: Record<string, unknown> | null = null;

  const handled = tryCommitSketchModuleStackTool({
    App: {},
    cfg,
    tool: 'sketch_ext_drawers:4',
    hoverOk: true,
    hoverRec: {
      kind: 'box_content',
      contentKind: 'ext_drawers',
      boxId: 'box-1',
      op: 'add',
      boxYNorm: 0.4,
      boxBaseYNorm: 0.22,
      contentXNorm: 0.5,
      drawerCount: 4,
      drawerHeightM: 0.3,
      drawerH: 0.3,
      yCenter: 0.9,
      baseY: 0.46,
      stackH: 1.2,
    },
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 0.9,
    hoverHost: { tool: 'sketch_ext_drawers:4@30', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      nextHover = hover as Record<string, unknown> | null;
    },
  });

  assert.equal(handled, true);
  const boxes = (cfg.sketchExtras as any).boxes;
  assert.equal(Array.isArray(boxes[0].extDrawers), true);
  assert.equal(boxes[0].extDrawers.length, 1);
  assert.equal(boxes[0].extDrawers[0].count, 4);
  assert.equal(boxes[0].extDrawers[0].drawerHeightM, 0.3);
  assert.equal(nextHover?.kind, 'box_content');
  assert.equal(nextHover?.contentKind, 'ext_drawers');
  assert.equal(nextHover?.boxId, 'box-1');
  assert.equal(nextHover?.op, 'remove');
  assert.equal(nextHover?.drawerCount, 4);
  assert.equal(nextHover?.drawerHeightM, 0.3);
});

test('stack tool remove hover for focused box ext drawers never falls back to add or collision toast', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'box-1',
          heightM: 1.2,
          extDrawers: [{ id: 'sed-existing', yNormC: 0.5, count: 4, drawerHeightM: 0.3 }],
        },
      ],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  let nextHover: Record<string, unknown> | null = null;

  const handled = tryCommitSketchModuleStackTool({
    App: {
      services: {
        uiFeedback: {
          toast: (message: string, type?: string) => toasts.push([message, type]),
        },
      },
    } as any,
    cfg,
    tool: 'sketch_ext_drawers:4@30',
    hoverOk: true,
    hoverRec: {
      kind: 'box_content',
      contentKind: 'ext_drawers',
      boxId: 'box-1',
      op: 'remove',
      removeId: 'sed-existing',
      blockedReason: 'collision',
      drawerCount: 4,
      drawerHeightM: 0.3,
      drawerH: 0.3,
      yCenter: 0.9,
      baseY: 0.3,
      stackH: 1.2,
    },
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 0.9,
    hoverHost: { tool: 'sketch_ext_drawers:4@30', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      nextHover = hover as Record<string, unknown> | null;
    },
  });

  assert.equal(handled, true);
  const box = ((cfg.sketchExtras as any).boxes as any[])[0];
  assert.equal(box.extDrawers.length, 0);
  assert.equal(toasts.length, 0);
  assert.equal(nextHover?.kind, 'box_content');
  assert.equal(nextHover?.contentKind, 'ext_drawers');
  assert.equal(nextHover?.op, 'add');
});

test('stack tool remove hover for module ext drawers never falls back to collision placement', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      extDrawers: [{ id: 'sed-existing', yNormC: 0.5, count: 4, drawerHeightM: 0.3 }],
      drawers: [{ id: 'internal-blocker', yNormC: 0.5, yNorm: 0.15, drawerHeightM: 0.3 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  let nextHover: Record<string, unknown> | null = null;

  const handled = tryCommitSketchModuleStackTool({
    App: {
      services: {
        uiFeedback: {
          toast: (message: string, type?: string) => toasts.push([message, type]),
        },
      },
    } as any,
    cfg,
    tool: 'sketch_ext_drawers:4@30',
    hoverOk: true,
    hoverRec: {
      kind: 'ext_drawers',
      op: 'remove',
      removeId: 'sed-existing',
      blockedReason: 'collision',
      yCenter: 0.9,
      drawerCount: 4,
      drawerHeightM: 0.3,
      drawerH: 0.3,
      stackH: 1.2,
    },
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 0.9,
    hoverHost: { tool: 'sketch_ext_drawers:4@30', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      nextHover = hover as Record<string, unknown> | null;
    },
  });

  assert.equal(handled, true);
  assert.equal(((cfg.sketchExtras as any).extDrawers as any[]).length, 0);
  assert.equal(toasts.length, 0);
  assert.equal(nextHover?.kind, 'ext_drawers');
  assert.equal(nextHover?.op, 'add');
});

test('stack tool commits module ext drawers through the canonical stack owner when no focused box hover exists', () => {
  const cfg: Record<string, unknown> = {};
  let nextHover: Record<string, unknown> | null = null;

  const handled = tryCommitSketchModuleStackTool({
    App: {},
    cfg,
    tool: 'sketch_ext_drawers:4@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 1.1,
    hoverHost: { tool: 'sketch_ext_drawers:4@30', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      nextHover = hover as Record<string, unknown> | null;
    },
  });

  assert.equal(handled, true);
  assert.equal(Array.isArray((cfg.sketchExtras as any).extDrawers), true);
  assert.equal((cfg.sketchExtras as any).extDrawers.length, 1);
  assert.equal((cfg.sketchExtras as any).extDrawers[0].count, 4);
  assert.equal((cfg.sketchExtras as any).extDrawers[0].drawerHeightM, 0.3);
  assert.equal(nextHover?.kind, 'ext_drawers');
  assert.equal(nextHover?.op, 'remove');
  assert.equal(nextHover?.drawerCount, 4);
  assert.equal(nextHover?.drawerHeightM, 0.3);
});

test('stack tool rejects module sketch external drawers instead of shrinking exact custom heights', () => {
  const cfg: Record<string, unknown> = {};
  const toasts: Array<[string, string | undefined]> = [];
  const hoverWrites: Array<Record<string, unknown> | null> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_ext_drawers:4@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 0.9,
    totalHeight: 0.9,
    pad: 0.02,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_ext_drawers:4@30', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      hoverWrites.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  assert.equal(cfg.sketchExtras, undefined);
  assert.equal(hoverWrites.length, 1);
  assert.equal(hoverWrites[0], null);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /אין מקום בארון זה ל-4 מגירות חיצוניות לפי סקיצה בגובה 30 ס"מ/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool commits module sketch internal drawers snapped inside the crossed shelf cell', () => {
  const cfg: Record<string, unknown> = { layout: 'shelves', isCustom: false, gridDivisions: 6 };
  const toasts: Array<[string, string | undefined]> = [];
  let nextHover: Record<string, unknown> | null = null;
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_int_drawers',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.006,
    woodThick: 0.018,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      nextHover = hover as Record<string, unknown> | null;
    },
  });

  assert.equal(handled, true);
  const extras = cfg.sketchExtras as Record<string, unknown>;
  assert.equal(Array.isArray(extras?.drawers), true);
  const drawer = (extras.drawers as Record<string, unknown>[])[0];
  assert.ok(Math.abs(Number(drawer.yNormC) - 0.24541666666666667) < 1e-9);
  assert.equal(nextHover?.kind, 'drawers');
  assert.equal(nextHover?.op, 'remove');
  assert.equal(toasts.length, 0);
});

test('stack tool rejects module sketch internal drawers instead of shrinking exact custom heights', () => {
  const cfg: Record<string, unknown> = {};
  const toasts: Array<[string, string | undefined]> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_int_drawers@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 0.55,
    totalHeight: 0.55,
    pad: 0.02,
    hitYClamped: 0.25,
    hoverHost: { tool: 'sketch_int_drawers@30', moduleKey: 2, isBottom: true },
    writeSketchHover: () => {},
  });

  assert.equal(handled, true);
  assert.equal(cfg.sketchExtras, undefined);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /אין מקום בארון זה ל-2 מגירות פנימיות בגובה 30 ס"מ/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool rejects focused box sketch external drawers without falling back to module placement', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [{ id: 'box-1', heightM: 0.9, extDrawers: [] }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_ext_drawers:4@30',
    hoverOk: true,
    hoverRec: {
      kind: 'box_content',
      contentKind: 'ext_drawers',
      boxId: 'box-1',
      op: 'add',
      freePlacement: false,
      drawerCount: 4,
      drawerHeightM: 0.3,
      drawerH: 0.3,
      stackH: 1.2,
    },
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 1,
    hoverHost: { tool: 'sketch_ext_drawers:4@30', moduleKey: 2, isBottom: false },
    writeSketchHover: () => {},
  });

  assert.equal(handled, true);
  const boxes = (cfg.sketchExtras as any).boxes;
  assert.equal(boxes[0].extDrawers.length, 0);
  assert.equal((cfg.sketchExtras as any).extDrawers, undefined);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /אין מקום בארון זה ל-4 מגירות חיצוניות לפי סקיצה בגובה 30 ס"מ/);
});

test('stack tool rejects module sketch external drawers that collide with existing internal sketch drawers', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'internal', yNormC: 0.5, yNorm: 0.15, drawerHeightM: 0.3 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const hoverWrites: Array<Record<string, unknown> | null> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_ext_drawers:2@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 0.9,
    totalHeight: 0.9,
    pad: 0.02,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_ext_drawers:2@30', moduleKey: 2, isBottom: true },
    writeSketchHover: (_app, hover) => {
      hoverWrites.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  assert.equal(Array.isArray((cfg.sketchExtras as any).extDrawers), false);
  assert.equal(hoverWrites.length, 1);
  assert.equal(hoverWrites[0], null);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /מתנגשות במגירות קיימות/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool commits module sketch external drawers into an empty cell', () => {
  const cfg: Record<string, unknown> = {
    gridDivisions: 3,
  };
  const toasts: Array<[string, string | undefined]> = [];
  const hoverWrites: Array<Record<string, unknown> | null> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_ext_drawers:2@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 0.9,
    totalHeight: 0.9,
    pad: 0.02,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_ext_drawers:2@30', moduleKey: 2, isBottom: true },
    writeSketchHover: (_app, hover) => {
      hoverWrites.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  const extras = cfg.sketchExtras as Record<string, unknown> | undefined;
  assert.equal(Array.isArray(extras?.extDrawers), true);
  assert.equal((extras?.extDrawers as unknown[]).length, 1);
  assert.equal(toasts.length, 0);
});

test('stack tool rejects module sketch external drawers that collide with existing shelves', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      shelves: [{ id: 'shelf-blocker', yNorm: 0.5, variant: 'regular' }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const hoverWrites: Array<Record<string, unknown> | null> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_ext_drawers:2@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 0.9,
    totalHeight: 0.9,
    pad: 0.02,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_ext_drawers:2@30', moduleKey: 2, isBottom: true },
    writeSketchHover: (_app, hover) => {
      hoverWrites.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  assert.equal(Array.isArray((cfg.sketchExtras as any).extDrawers), false);
  assert.equal(hoverWrites[0], null);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /פריטים קיימים/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool rejects module sketch internal drawers that collide with existing external sketch drawers', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      extDrawers: [{ id: 'external', yNormC: 0.5, yNorm: 0.17, count: 2, drawerHeightM: 0.3 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_int_drawers@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 0.9,
    totalHeight: 0.9,
    pad: 0.02,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_int_drawers@30', moduleKey: 2, isBottom: true },
    writeSketchHover: () => {},
  });

  assert.equal(handled, true);
  assert.equal(Array.isArray((cfg.sketchExtras as any).drawers), false);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /מתנגשות במגירות קיימות/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool rejects module sketch internal drawers that collide with base storage', () => {
  const cfg: Record<string, unknown> = {
    layout: 'storage',
    isCustom: false,
  };
  const toasts: Array<[string, string | undefined]> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_int_drawers@20',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 0.9,
    totalHeight: 0.9,
    pad: 0.02,
    hitYClamped: 0.25,
    hoverHost: { tool: 'sketch_int_drawers@20', moduleKey: 2, isBottom: true },
    writeSketchHover: () => {},
  });

  assert.equal(handled, true);
  assert.equal(Array.isArray(((cfg.sketchExtras as any) || {}).drawers), false);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /פריטים קיימים/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool rejects module sketch internal drawers that collide with existing sketch rods', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      rods: [{ id: 'rod-blocker', yNorm: 0.5 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_int_drawers@20',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 0.9,
    totalHeight: 0.9,
    pad: 0.02,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_int_drawers@20', moduleKey: 2, isBottom: true },
    writeSketchHover: () => {},
  });

  assert.equal(handled, true);
  assert.equal(Array.isArray(((cfg.sketchExtras as any) || {}).drawers), false);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /פריטים קיימים/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool rejects module sketch external drawers that collide with a base hanging rod', () => {
  const cfg: Record<string, unknown> = {
    layout: 'hanging_top2',
    isCustom: false,
    gridDivisions: 6,
  };
  const toasts: Array<[string, string | undefined]> = [];
  const hoverWrites: Array<Record<string, unknown> | null> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_ext_drawers:2@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 1.52,
    hoverHost: { tool: 'sketch_ext_drawers:2@30', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      hoverWrites.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  assert.equal(cfg.sketchExtras, undefined);
  assert.equal(hoverWrites.length, 1);
  assert.equal(hoverWrites[0], null);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /פריטים קיימים/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool commits module internal drawers with a custom sketch drawer height', () => {
  const cfg: Record<string, unknown> = {};
  let nextHover: Record<string, unknown> | null = null;

  const handled = tryCommitSketchModuleStackTool({
    App: {},
    cfg,
    tool: 'sketch_int_drawers@24',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 1.1,
    hoverHost: { tool: 'sketch_int_drawers@24', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      nextHover = hover as Record<string, unknown> | null;
    },
  });

  assert.equal(handled, true);
  assert.equal(Array.isArray((cfg.sketchExtras as any).drawers), true);
  assert.equal((cfg.sketchExtras as any).drawers.length, 1);
  assert.equal((cfg.sketchExtras as any).drawers[0].drawerHeightM, 0.24);
  assert.equal(nextHover?.kind, 'drawers');
  assert.equal(nextHover?.op, 'remove');
  assert.equal(nextHover?.drawerHeightM, 0.24);
});

test('sketch free stack preview emits vertical clearance labels for external drawers when the stack does not fill the box', () => {
  const result = resolveSketchFreeStackContentPreview({
    tool: 'sketch_ext_drawers:3',
    contentKind: 'ext_drawers',
    host: { moduleKey: 2, isBottom: false },
    target: {
      boxId: 'free-2',
      targetBox: { id: 'free-2', freePlacement: true, extDrawers: [] },
      targetGeo: {
        centerX: 0.2,
        innerW: 0.8,
        innerD: 0.5,
        innerBackZ: -0.25,
        outerW: 0.836,
        centerZ: 0,
        outerD: 0.536,
      },
      targetCenterY: 1,
      targetHeight: 1.1,
      pointerX: 0.21,
      pointerY: 1.02,
    },
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [{ index: 0, centerX: 0.2, width: 0.8, xNorm: 0.5 }],
    pickSketchBoxSegment: ({ segments }: { segments: Array<Record<string, unknown>> }) => segments[0] ?? null,
  });

  assert.equal(result.preview.kind, 'ext_drawers');
  assert.deepEqual(
    (result.preview.clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['18 ס"מ', '22 ס"מ']
  );
});

test('stack tool rejects sketch external drawers in a hex cell with a clear toast', () => {
  const cfg: Record<string, unknown> = { hexCell: { enabled: true } };
  const toasts: Array<[string, string | undefined]> = [];
  const hoverWrites: Array<Record<string, unknown> | null> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_ext_drawers:2@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_ext_drawers:2@30', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      hoverWrites.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  assert.equal(cfg.sketchExtras, undefined);
  assert.deepEqual(hoverWrites, [null]);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /אי אפשר לבנות מגירות בתא משושה/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool rejects sketch internal drawers in a hex cell with a clear toast', () => {
  const cfg: Record<string, unknown> = { hexCell: { enabled: true } };
  const toasts: Array<[string, string | undefined]> = [];
  const hoverWrites: Array<Record<string, unknown> | null> = [];
  const App: any = {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App,
    cfg,
    tool: 'sketch_int_drawers@30',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.02,
    hitYClamped: 0.45,
    hoverHost: { tool: 'sketch_int_drawers@30', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      hoverWrites.push(hover as Record<string, unknown> | null);
    },
  });

  assert.equal(handled, true);
  assert.equal(cfg.sketchExtras, undefined);
  assert.deepEqual(hoverWrites, [null]);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /אי אפשר לבנות מגירות בתא משושה/);
  assert.equal(toasts[0]![1], 'error');
});

test('stack tool removes base shelf when an internal drawer cassette replaces the shelf plane', () => {
  const cfg: Record<string, unknown> = {
    isCustom: true,
    gridDivisions: 5,
    customData: {
      shelves: [false, true, false, false],
      shelfVariants: ['', 'regular', '', ''],
    },
  };
  let nextHover: Record<string, unknown> | null = null;

  const handled = tryCommitSketchModuleStackTool({
    App: { services: { uiFeedback: { toast: () => {} } } } as any,
    cfg,
    tool: 'sketch_int_drawers',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 1,
    totalHeight: 1,
    pad: 0.02,
    woodThick: 0.02,
    hitYClamped: 0.6,
    hoverHost: { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false },
    writeSketchHover: (_app, hover) => {
      nextHover = hover as Record<string, unknown> | null;
    },
  });

  assert.equal(handled, true);
  assert.equal((cfg.customData as Record<string, unknown>).shelves?.[1], false);
  assert.equal((cfg.customData as Record<string, unknown>).shelfVariants?.[1], '');
  assert.equal(Array.isArray((cfg.sketchExtras as Record<string, unknown>).drawers), true);
  assert.equal(nextHover?.op, 'remove');
});

test('stack tool removes sketch shelf when an internal drawer cassette touches it', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      shelves: [{ id: 'sh1', yNorm: 0.4 }],
    },
  };

  const handled = tryCommitSketchModuleStackTool({
    App: { services: { uiFeedback: { toast: () => {} } } } as any,
    cfg,
    tool: 'sketch_int_drawers',
    hoverOk: false,
    hoverRec: {},
    bottomY: 0,
    topY: 1,
    totalHeight: 1,
    pad: 0.02,
    woodThick: 0.02,
    hitYClamped: 0.6,
    hoverHost: { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false },
    writeSketchHover: () => {},
  });

  assert.equal(handled, true);
  const extras = cfg.sketchExtras as Record<string, unknown>;
  assert.deepEqual(extras.shelves, []);
  assert.equal(Array.isArray(extras.drawers), true);
});
