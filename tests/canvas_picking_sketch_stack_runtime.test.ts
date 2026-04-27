import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleManualLayoutSketchHoverModuleStackPreview } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_stack.ts';
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
      targetHeight: 0.9,
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
    ['6 ס"מ']
  );
});

test('stack tool toggles focused box drawers through the box-content owner', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [{ id: 'box-1', drawers: [] }],
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
      boxes: [{ id: 'box-1', extDrawers: [] }],
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
