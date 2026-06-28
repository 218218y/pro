import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasManualSketchFreeContentClick } from '../esm/native/services/canvas_picking_click_manual_sketch_free_content.ts';
import {
  commitSketchFreePlacementHoverRecord,
  createSketchFreePlacementBoxHoverRecord,
} from '../esm/native/services/canvas_picking_sketch_free_commit.ts';

test('sketch-free placement hover record keeps canonical host/free-placement fields', () => {
  const hoverRecord = createSketchFreePlacementBoxHoverRecord({
    tool: 'sketch_box_free',
    host: { moduleKey: 3, isBottom: true },
    op: 'add',
    previewX: 0.25,
    previewY: 1.1,
    previewH: 0.9,
    previewW: 0.7,
    previewD: 0.4,
    ts: 123,
  });

  assert.deepEqual(hoverRecord, {
    ts: 123,
    tool: 'sketch_box_free',
    moduleKey: 3,
    isBottom: true,
    hostModuleKey: 3,
    hostIsBottom: true,
    kind: 'box',
    op: 'add',
    freePlacement: true,
    xCenter: 0.25,
    yCenter: 1.1,
    heightM: 0.9,
    widthM: 0.7,
    depthM: 0.4,
    removeId: null,
  });
});

test('sketch-free placement commit adds a free-placement box through the canonical modules patch seam', () => {
  const cfg: Record<string, unknown> = {};
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: Record<string, unknown> }> = [];

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            side: string,
            moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void,
            options: Record<string, unknown>
          ) => {
            patchCalls.push({ side, moduleKey, options });
            patcher(cfg);
          },
        },
      },
    } as never,
    host: { moduleKey: 7, isBottom: false },
    hoverRec: createSketchFreePlacementBoxHoverRecord({
      tool: 'sketch_box_free',
      host: { moduleKey: 7, isBottom: false },
      op: 'add',
      previewX: 0.15,
      previewY: 0.95,
      previewH: 0.9,
      previewW: 0.72,
      previewD: 0.42,
      ts: 1,
    }) as never,
  });

  assert.deepEqual(result, { committed: true, nextHover: null });
  assert.equal(patchCalls.length, 1);
  assert.equal(patchCalls[0]?.side, 'top');
  assert.equal(patchCalls[0]?.moduleKey, 7);
  assert.deepEqual(patchCalls[0]?.options, { source: 'manualSketchBoxFree', immediate: true });

  const boxes =
    ((cfg.sketchExtras as Record<string, unknown> | undefined)?.boxes as Array<Record<string, unknown>>) ||
    [];
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0]?.freePlacement, true);
  assert.equal(boxes[0]?.absX, 0.15);
  assert.equal(boxes[0]?.absY, 0.95);
  assert.equal(boxes[0]?.heightM, 0.9);
  assert.equal(boxes[0]?.widthM, 0.72);
  assert.equal(boxes[0]?.depthM, 0.42);
  assert.match(String(boxes[0]?.id || ''), /^sbf_/);
});

test('sketch-free placement commit rejects string-encoded internal hover geometry', () => {
  const cfg: Record<string, unknown> = {};

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            _side: string,
            _moduleKey: unknown,
            patcher: (cfgRef: Record<string, unknown>) => void
          ) => patcher(cfg),
        },
      },
    } as never,
    host: { moduleKey: 7, isBottom: false },
    hoverRec: {
      ts: 1,
      tool: 'sketch_box_free',
      moduleKey: 7,
      isBottom: false,
      hostModuleKey: 7,
      hostIsBottom: false,
      kind: 'box',
      op: 'add',
      freePlacement: true,
      xCenter: '0.15',
      yCenter: '0.95',
      heightM: '0.9',
      widthM: '0.72',
      depthM: '0.42',
      removeId: null,
    } as never,
  });

  assert.deepEqual(result, { committed: false });
  const boxes =
    ((cfg.sketchExtras as Record<string, unknown> | undefined)?.boxes as Array<Record<string, unknown>>) ||
    [];
  assert.equal(boxes.length, 0);
});

test('sketch-free placement content commit routes free-placement door removal through the canonical content seam', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-1',
          freePlacement: true,
          absX: 0,
          absY: 1,
          widthM: 0.8,
          depthM: 0.4,
          heightM: 1,
          doors: [{ id: 'door-1', xNorm: 0.5, hinge: 'right', enabled: true }],
        },
      ],
    },
  };
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: Record<string, unknown> }> = [];

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            side: string,
            moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void,
            options: Record<string, unknown>
          ) => {
            patchCalls.push({ side, moduleKey, options });
            patcher(cfg);
          },
        },
      },
    } as never,
    host: { moduleKey: 'corner', isBottom: true },
    hoverRec: {
      kind: 'box_content',
      freePlacement: true,
      boxId: 'free-1',
      contentKind: 'door',
      op: 'remove',
      contentXNorm: 0.5,
      doorId: 'door-1',
      hinge: 'right',
    } as never,
    freeBoxContentKind: 'door',
    floorY: 0,
  });

  assert.deepEqual(result, { committed: true, nextHover: null });
  assert.equal(patchCalls.length, 1);
  assert.equal(patchCalls[0]?.side, 'bottom');
  assert.equal(patchCalls[0]?.moduleKey, 'corner');
  assert.deepEqual(patchCalls[0]?.options, { source: 'manualSketchBoxContentFree', immediate: true });
  const boxes =
    ((cfg.sketchExtras as Record<string, unknown> | undefined)?.boxes as Array<Record<string, unknown>>) ||
    [];
  assert.deepEqual((boxes[0]?.doors as unknown[]) || [], []);
});

test('sketch-free placement content commit consumes blocked no-room hovers without mutating', () => {
  const toasts: Array<[string, string | undefined]> = [];
  let patchCalls = 0;

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      services: {
        uiFeedback: {
          toast: (message: string, type?: string) => {
            toasts.push([message, type]);
          },
        },
      },
      actions: {
        modules: {
          patchForStack: () => {
            patchCalls += 1;
            throw new Error('blocked hover should not patch config');
          },
        },
      },
    } as never,
    host: { moduleKey: 3, isBottom: false },
    hoverRec: {
      kind: 'box_content',
      freePlacement: true,
      boxId: 'free-1',
      contentKind: 'shelf',
      op: 'add',
      __wpBlockedReason: 'no-room',
    } as never,
    freeBoxContentKind: 'shelf',
    floorY: 0,
  });

  assert.deepEqual(result, { committed: true, nextHover: null });
  assert.equal(patchCalls, 0);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.[1], 'error');
});

test('sketch-free placement ext-drawer removal also removes regular external drawers in the same free box', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-regular-1',
          freePlacement: true,
          absX: 0,
          absY: 1,
          widthM: 0.8,
          depthM: 0.4,
          heightM: 1,
          extDrawers: [],
          regularExtDrawers: [
            { id: 'sbrd-1', count: 3 },
            { id: 'sbrd-2', count: 2 },
          ],
        },
      ],
    },
  };

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            _side: string,
            _moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void
          ) => patcher(cfg),
        },
      },
    } as never,
    host: { moduleKey: 2, isBottom: false },
    hoverRec: {
      kind: 'box_content',
      freePlacement: true,
      boxId: 'free-regular-1',
      contentKind: 'ext_drawers',
      op: 'remove',
      removeId: 'sbrd-1',
      drawerCount: 3,
    } as never,
    freeBoxContentKind: 'ext_drawers',
    floorY: 0,
  });

  const boxes = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>) || [];
  assert.equal(result.committed, true);
  assert.deepEqual(
    ((boxes[0]?.regularExtDrawers as Array<Record<string, unknown>>) || []).map(it => it.id),
    ['sbrd-2']
  );
});

test('sketch-free vertical tools commit cross-kind vertical-content removal hovers', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-cross-kind',
          freePlacement: true,
          absX: 0,
          absY: 1,
          widthM: 0.8,
          depthM: 0.4,
          heightM: 1,
          rods: [{ id: 'rod-1', yNorm: 0.5, xNorm: 0.5 }],
          storageBarriers: [{ id: 'storage-1', yNorm: 0.5, xNorm: 0.5, heightM: 0.12 }],
        },
      ],
    },
  };
  const host = { moduleKey: 2, isBottom: false } as const;
  let cleared = false;

  const handled = tryHandleCanvasManualSketchFreeContentClick({
    App: {
      actions: {
        modules: {
          patchForStack: (
            _side: string,
            _moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void
          ) => patcher(cfg),
        },
      },
    } as never,
    tool: 'sketch_shelf:regular',
    foundModuleIndex: null,
    host,
    floorY: 0,
    __wp_readSketchHover: () => ({
      ts: Date.now(),
      tool: 'sketch_shelf:regular',
      moduleKey: 2,
      isBottom: false,
      hostModuleKey: 2,
      hostIsBottom: false,
      kind: 'box_content',
      contentKind: 'rod',
      freePlacement: true,
      boxId: 'free-cross-kind',
      op: 'remove',
      removeId: 'rod-1',
    }),
    __wp_writeSketchHover: () => {
      throw new Error('cross-kind vertical removal should clear hover after commit');
    },
    __wp_clearSketchHover: () => {
      cleared = true;
    },
    __wp_getSketchFreeBoxContentKind: () => 'shelf',
  });

  const boxes = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>) || [];
  assert.equal(handled, true);
  assert.equal(cleared, true);
  assert.deepEqual(boxes[0]?.rods, []);
  assert.equal(((boxes[0]?.storageBarriers as unknown[]) || []).length, 1);
});

test('sketch-free stack tools commit existing vertical-content removal hovers before adding drawers', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-shelf-1',
          freePlacement: true,
          absX: 0,
          absY: 1,
          widthM: 0.8,
          depthM: 0.4,
          heightM: 1,
          shelves: [{ id: 'shelf-1', yNorm: 0.5, variant: 'regular' }],
          extDrawers: [],
        },
      ],
    },
  };
  const host = { moduleKey: 2, isBottom: false } as const;
  const hover = {
    ts: Date.now(),
    tool: 'sketch_ext_drawers:3',
    moduleKey: 2,
    isBottom: false,
    hostModuleKey: 2,
    hostIsBottom: false,
    kind: 'box_content',
    contentKind: 'shelf',
    freePlacement: true,
    boxId: 'free-shelf-1',
    op: 'remove',
    removeId: 'shelf-1',
  };
  let cleared = false;

  const handled = tryHandleCanvasManualSketchFreeContentClick({
    App: {
      actions: {
        modules: {
          patchForStack: (
            _side: string,
            _moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void
          ) => patcher(cfg),
        },
      },
    } as never,
    tool: 'sketch_ext_drawers:3',
    foundModuleIndex: null,
    host,
    floorY: 0,
    __wp_readSketchHover: () => hover,
    __wp_writeSketchHover: () => {
      throw new Error('vertical removal should clear hover after commit');
    },
    __wp_clearSketchHover: () => {
      cleared = true;
    },
    __wp_getSketchFreeBoxContentKind: () => 'ext_drawers',
  });

  const boxes = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>) || [];
  assert.equal(handled, true);
  assert.equal(cleared, true);
  assert.deepEqual(boxes[0]?.shelves, []);
});

test('sketch-free regular external drawers can add a shoe drawer without falling back to module drawers', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-shoe-1',
          freePlacement: true,
          absX: 0,
          absY: 1,
          widthM: 0.8,
          depthM: 0.4,
          heightM: 1,
        },
      ],
    },
  };

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            _side: string,
            _moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void
          ) => patcher(cfg),
        },
      },
    } as never,
    host: { moduleKey: 2, isBottom: false },
    hoverRec: {
      kind: 'box_content',
      freePlacement: true,
      boxId: 'free-shoe-1',
      contentKind: 'regular_ext_drawers',
      op: 'add',
      contentXNorm: 0.5,
      boxYNorm: 0.5,
      boxBaseYNorm: 0,
      drawerCount: 0,
      hasShoeDrawer: true,
    } as never,
    freeBoxContentKind: 'regular_ext_drawers',
    floorY: 0,
  });

  const boxes = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>) || [];
  const drawers = (boxes[0]?.regularExtDrawers as Array<Record<string, unknown>>) || [];
  assert.equal(result.committed, true);
  assert.equal(drawers.length, 1);
  assert.equal(drawers[0]?.count, 0);
  assert.equal(drawers[0]?.hasShoeDrawer, true);
  assert.equal(drawers[0]?.xNorm, 0.5);
  assert.match(String(drawers[0]?.id || ''), /^sbrd_/);
});

test('sketch-free sketch external drawers commit preserves hover vertical center instead of anchoring to top', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-sketch-ext-1',
          freePlacement: true,
          absX: 0,
          absY: 1,
          widthM: 0.8,
          depthM: 0.4,
          heightM: 1.4,
          extDrawers: [],
        },
      ],
    },
  };

  const result = commitSketchFreePlacementHoverRecord({
    App: {
      actions: {
        modules: {
          patchForStack: (
            _side: string,
            _moduleKey: unknown,
            patcher: (cfg: Record<string, unknown>) => void
          ) => patcher(cfg),
        },
      },
    } as never,
    host: { moduleKey: 2, isBottom: false },
    hoverRec: {
      kind: 'box_content',
      freePlacement: true,
      boxId: 'free-sketch-ext-1',
      contentKind: 'ext_drawers',
      op: 'add',
      contentXNorm: 0.5,
      boxYNorm: 0.5342857143,
      boxBaseYNorm: 0.22,
      drawerCount: 4,
      drawerHeightM: 0.22,
      drawerH: 0.22,
      stackH: 0.88,
    } as never,
    freeBoxContentKind: 'ext_drawers',
    floorY: 0,
  });

  const boxes = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>) || [];
  const drawers = (boxes[0]?.extDrawers as Array<Record<string, unknown>>) || [];
  assert.equal(result.committed, true);
  assert.equal(drawers.length, 1);
  assert.equal(drawers[0]?.yNormC, 0.5342857143);
  assert.equal(drawers[0]?.yNorm, 0.22);
  assert.equal(drawers[0]?.yAnchor, 'center');
});

test('sketch-free regular external drawers update shoe and regular count independently in the same cell', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-combo-1',
          freePlacement: true,
          absX: 0,
          absY: 1,
          widthM: 0.8,
          depthM: 0.4,
          heightM: 1,
          regularExtDrawers: [
            {
              id: 'sbrd-combo',
              xNorm: 0.5,
              yNormC: 0.5,
              yNorm: 0,
              count: 3,
              hasShoeDrawer: true,
            },
          ],
        },
      ],
    },
  };
  const App = {
    actions: {
      modules: {
        patchForStack: (
          _side: string,
          _moduleKey: unknown,
          patcher: (cfg: Record<string, unknown>) => void
        ) => patcher(cfg),
      },
    },
  } as never;

  const removeRegular = commitSketchFreePlacementHoverRecord({
    App,
    host: { moduleKey: 2, isBottom: false },
    hoverRec: {
      kind: 'box_content',
      freePlacement: true,
      boxId: 'free-combo-1',
      contentKind: 'regular_ext_drawers',
      op: 'remove',
      removeId: 'sbrd-combo',
      contentXNorm: 0.5,
      boxYNorm: 0.5,
      boxBaseYNorm: 0,
      drawerCount: 0,
      hasShoeDrawer: true,
    } as never,
    freeBoxContentKind: 'regular_ext_drawers',
    floorY: 0,
  });

  let box = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>)[0];
  let drawers = (box?.regularExtDrawers as Array<Record<string, unknown>>) || [];
  assert.equal(removeRegular.committed, true);
  assert.equal(drawers.length, 1);
  assert.equal(drawers[0]?.id, 'sbrd-combo');
  assert.equal(drawers[0]?.count, 0);
  assert.equal(drawers[0]?.hasShoeDrawer, true);

  const removeShoe = commitSketchFreePlacementHoverRecord({
    App,
    host: { moduleKey: 2, isBottom: false },
    hoverRec: {
      kind: 'box_content',
      freePlacement: true,
      boxId: 'free-combo-1',
      contentKind: 'regular_ext_drawers',
      op: 'remove',
      removeId: 'sbrd-combo',
      contentXNorm: 0.5,
      boxYNorm: 0.5,
      boxBaseYNorm: 0,
      drawerCount: 0,
      hasShoeDrawer: false,
    } as never,
    freeBoxContentKind: 'regular_ext_drawers',
    floorY: 0,
  });

  box = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>)[0];
  drawers = (box?.regularExtDrawers as Array<Record<string, unknown>>) || [];
  assert.equal(removeShoe.committed, true);
  assert.deepEqual(drawers, []);
});
