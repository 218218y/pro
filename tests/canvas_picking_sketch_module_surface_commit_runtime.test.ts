import test from 'node:test';
import assert from 'node:assert/strict';

import { tryCommitSketchModuleSurfaceTool } from '../esm/native/services/canvas_picking_sketch_module_surface_commit.ts';

function resolveSketchBoxGeometry(args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
  centerXHint?: number | null;
}) {
  const outerW = args.widthM != null && args.widthM > 0 ? args.widthM : args.innerW;
  const outerD = args.depthM != null && args.depthM > 0 ? args.depthM : 0.5;
  const leftX = args.internalCenterX - args.innerW / 2;
  const xNorm =
    args.xNorm != null
      ? args.xNorm
      : args.centerXHint != null && Number.isFinite(args.centerXHint)
        ? (args.centerXHint - leftX) / args.innerW
        : 0.5;
  return {
    outerW,
    innerW: Math.max(0.01, outerW - 0.036),
    centerX: args.xNorm != null ? leftX + xNorm * args.innerW : (args.centerXHint ?? args.internalCenterX),
    xNorm,
    centered: false,
    outerD,
    innerD: Math.max(0.01, outerD - 0.036),
    centerZ: args.internalZ,
    innerCenterZ: args.internalZ,
    innerBackZ: args.internalZ - outerD / 2,
  };
}

function makeToastApp(toasts: Array<[string, string | undefined]>) {
  return {
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };
}

function makeArgs(overrides: Record<string, unknown> = {}) {
  return {
    cfg: {},
    tool: 'sketch_box:40',
    hoverOk: false,
    hoverRec: {},
    bottomY: -1,
    topY: 1,
    totalHeight: 2,
    hitY0: 0.2,
    hitYClamped: 0.2,
    yNorm: 0.6,
    pad: 0.02,
    woodThick: 0.018,
    resolveSketchBoxPlacementMetrics: () => ({
      innerW: 1.2,
      internalCenterX: 0,
      internalDepth: 0.55,
      internalZ: 0,
      hitLocalX: 0.18,
    }),
    parseSketchBoxToolSpec: () => ({ heightCm: 40, widthCm: 36, depthCm: 32 }),
    resolveSketchBoxGeometry,
    sketchBoxToolPrefix: 'sketch_box:',
    ...overrides,
  };
}

test('tryCommitSketchModuleSurfaceTool adds a module sketch box through the focused box owner', () => {
  const args = makeArgs();
  const handled = tryCommitSketchModuleSurfaceTool(args as never);
  assert.equal(handled, true);

  const boxes = (args.cfg as Record<string, unknown>).sketchExtras as {
    boxes?: Array<Record<string, unknown>>;
  };
  assert.ok(Array.isArray(boxes?.boxes));
  assert.equal(boxes?.boxes?.length, 1);
  assert.equal(boxes?.boxes?.[0]?.heightM, 0.4);
  assert.equal(boxes?.boxes?.[0]?.widthM, 0.36);
  assert.equal(boxes?.boxes?.[0]?.depthM, 0.32);
});

test('tryCommitSketchModuleSurfaceTool removes a hovered module sketch box by removeId intent', () => {
  const cfg = {
    sketchExtras: {
      boxes: [
        {
          id: 'sb_remove',
          yNorm: 0.6,
          heightM: 0.4,
          widthM: 0.36,
          depthM: 0.32,
          xNorm: 0.65,
        },
      ],
    },
  };
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      cfg,
      hoverOk: true,
      hoverRec: {
        kind: 'box',
        op: 'remove',
        removeId: 'sb_remove',
        xCenter: 0.18,
        yCenter: 0.2,
      },
    }) as never
  );

  assert.equal(handled, true);
  assert.deepEqual(cfg.sketchExtras.boxes, []);
});

test('tryCommitSketchModuleSurfaceTool routes sketch_shelf tools through the canonical vertical-content owner', () => {
  const cfg: Record<string, unknown> = {};
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      cfg,
      tool: 'sketch_shelf:glass@33',
      hitY0: 0.7,
      yNorm: 0.85,
    }) as never
  );

  assert.equal(handled, true);
  const shelves =
    ((cfg.sketchExtras as Record<string, unknown>)?.shelves as Array<Record<string, unknown>>) ?? [];
  assert.equal(shelves.length, 1);
  assert.equal(shelves[0]?.variant, 'glass');
  assert.equal(shelves[0]?.depthM, 0.33);
});

test('tryCommitSketchModuleSurfaceTool routes sketch_storage tools through the canonical vertical-content owner', () => {
  const cfg: Record<string, unknown> = {};
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      cfg,
      tool: 'sketch_storage:80',
      hitYClamped: 0.95,
      yNorm: 0.9,
      topY: 1.4,
    }) as never
  );

  assert.equal(handled, true);
  const barriers =
    ((cfg.sketchExtras as Record<string, unknown>)?.storageBarriers as Array<Record<string, unknown>>) ?? [];
  assert.equal(barriers.length, 1);
  assert.equal(barriers[0]?.heightM, 0.8);
  assert.match(String(barriers[0]?.id ?? ''), /^ss_/);
});

test('tryCommitSketchModuleSurfaceTool ignores unrelated tools once the canonical owners decline them', () => {
  const cfg: Record<string, unknown> = {};
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      cfg,
      tool: 'paint_bucket',
    }) as never
  );

  assert.equal(handled, false);
  assert.deepEqual(cfg, {});
});

test('tryCommitSketchModuleSurfaceTool blocks sketch shelves over internal drawer stacks', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'drawers-1', yNormC: 0.6, drawerHeightM: 0.18 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      App: makeToastApp(toasts),
      cfg,
      tool: 'sketch_shelf:glass@33',
      hitY0: 0.2,
      hitYClamped: 0.2,
      yNorm: 0.6,
    }) as never
  );

  assert.equal(handled, true);
  assert.equal(
    ((cfg.sketchExtras as Record<string, unknown>).shelves as unknown[] | undefined)?.length ?? 0,
    0
  );
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /לא ניתן לבנות מדף לפי סקיצה/);
  assert.match(toasts[0]![0], /מתנגש במגירות לפי סקיצה קיימות/);
  assert.equal(toasts[0]![1], 'error');
});

test('tryCommitSketchModuleSurfaceTool blocks sketch rods over external drawer stacks', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      extDrawers: [{ id: 'ext-drawers-1', yNormC: 0.6, count: 2, drawerHeightM: 0.18 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      App: makeToastApp(toasts),
      cfg,
      tool: 'sketch_rod',
      hitY0: 0.2,
      hitYClamped: 0.2,
      yNorm: 0.6,
    }) as never
  );

  assert.equal(handled, true);
  assert.equal(((cfg.sketchExtras as Record<string, unknown>).rods as unknown[] | undefined)?.length ?? 0, 0);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /לא ניתן לבנות מוט תלייה לפי סקיצה/);
  assert.match(toasts[0]![0], /מתנגש במגירות לפי סקיצה קיימות/);
  assert.equal(toasts[0]![1], 'error');
});

test('tryCommitSketchModuleSurfaceTool snaps storage barriers to first free slot above internal drawer stacks', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'drawers-1', yNormC: 0.5, drawerHeightM: 0.18 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      App: makeToastApp(toasts),
      cfg,
      tool: 'sketch_storage:50',
      bottomY: 0,
      topY: 2,
      totalHeight: 2,
      hitY0: 1.21,
      hitYClamped: 1.21,
      yNorm: 0.605,
      pad: 0.02,
    }) as never
  );

  assert.equal(handled, true);
  assert.equal(toasts.length, 0);
  const barriers =
    ((cfg.sketchExtras as Record<string, unknown>).storageBarriers as Array<Record<string, unknown>>) ?? [];
  assert.equal(barriers.length, 1);
  assert.ok(Number(barriers[0]?.yNorm) > 0.72);
  assert.ok(Number(barriers[0]?.yNorm) < 0.74);
});

test('tryCommitSketchModuleSurfaceTool snaps storage barriers to first free slot above external drawer stacks', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      extDrawers: [{ id: 'ext-drawers-1', yNormC: 0.5, count: 2, drawerHeightM: 0.18 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      App: makeToastApp(toasts),
      cfg,
      tool: 'sketch_storage:50',
      bottomY: 0,
      topY: 2,
      totalHeight: 2,
      hitY0: 1.19,
      hitYClamped: 1.19,
      yNorm: 0.595,
      pad: 0.02,
    }) as never
  );

  assert.equal(handled, true);
  assert.equal(toasts.length, 0);
  const barriers =
    ((cfg.sketchExtras as Record<string, unknown>).storageBarriers as Array<Record<string, unknown>>) ?? [];
  assert.equal(barriers.length, 1);
  assert.ok(Number(barriers[0]?.yNorm) > 0.71);
  assert.ok(Number(barriers[0]?.yNorm) < 0.73);
});

test('tryCommitSketchModuleSurfaceTool blocks storage barriers over internal drawer stacks', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'drawers-1', yNormC: 0.6, drawerHeightM: 0.18 }],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      App: makeToastApp(toasts),
      cfg,
      tool: 'sketch_storage:50',
      hitY0: 0.2,
      hitYClamped: 0.2,
      yNorm: 0.6,
    }) as never
  );

  assert.equal(handled, true);
  assert.equal(
    ((cfg.sketchExtras as Record<string, unknown>).storageBarriers as unknown[] | undefined)?.length ?? 0,
    0
  );
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /לא ניתן לבנות אוגר מצעים לפי סקיצה/);
  assert.match(toasts[0]![0], /מתנגש במגירות לפי סקיצה קיימות/);
  assert.equal(toasts[0]![1], 'error');
});

test('tryCommitSketchModuleSurfaceTool blocks module boxes when vertical content leaves no valid slot', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      storageBarriers: [
        { id: 'storage-bottom', yNorm: 0.2, heightM: 0.7 },
        { id: 'storage-middle', yNorm: 0.5, heightM: 0.7 },
        { id: 'storage-top', yNorm: 0.8, heightM: 0.7 },
      ],
    },
  };
  const toasts: Array<[string, string | undefined]> = [];
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      App: makeToastApp(toasts),
      cfg,
      hitYClamped: 0,
      yNorm: 0.5,
    }) as never
  );

  assert.equal(handled, true);
  assert.equal(
    ((cfg.sketchExtras as Record<string, unknown>).boxes as unknown[] | undefined)?.length ?? 0,
    0
  );
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /לא ניתן לבנות קופסא/);
  assert.match(toasts[0]![0], /מתנגשת/);
  assert.equal(toasts[0]![1], 'error');
});

test('tryCommitSketchModuleSurfaceTool preserves tall module box height instead of shrinking it to the legacy 120cm cap', () => {
  const args = makeArgs({
    tool: 'sketch_box:170',
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    hitY0: 1.2,
    hitYClamped: 1.2,
    yNorm: 0.5,
    parseSketchBoxToolSpec: () => ({ heightCm: 170, widthCm: 36, depthCm: 32 }),
  });

  const handled = tryCommitSketchModuleSurfaceTool(args as never);
  assert.equal(handled, true);

  const boxes = (
    (args.cfg as Record<string, unknown>).sketchExtras as { boxes?: Array<Record<string, unknown>> }
  )?.boxes;
  assert.equal(boxes?.length, 1);
  assert.equal(boxes?.[0]?.heightM, 1.7);
  assert.equal(boxes?.[0]?.widthM, 0.36);
  assert.equal(boxes?.[0]?.depthM, 0.32);
});

test('tryCommitSketchModuleSurfaceTool refuses a blocked box hover instead of recomputing a smaller fitting box on click', () => {
  const cfg: Record<string, unknown> = {};
  const toasts: Array<[string, string | undefined]> = [];
  const handled = tryCommitSketchModuleSurfaceTool(
    makeArgs({
      App: makeToastApp(toasts),
      cfg,
      hoverOk: true,
      hoverRec: {
        kind: 'box',
        op: 'add',
        xCenter: 0,
        yCenter: 1.2,
        xNorm: 0.5,
        __wpBlockedReason: 'collision',
      },
    }) as never
  );

  assert.equal(handled, true);
  assert.equal(
    ((cfg.sketchExtras as Record<string, unknown>).boxes as unknown[] | undefined)?.length ?? 0,
    0
  );
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /לא ניתן לבנות קופסא/);
  assert.equal(toasts[0]![1], 'error');
});
