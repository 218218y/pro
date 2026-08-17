import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasManualSketchFreeContentClick } from '../esm/native/services/canvas_picking_click_manual_sketch_free_content.ts';
import {
  commitSketchFreePlacementHoverRecord,
  createSketchFreePlacementBoxHoverRecord,
} from '../esm/native/services/canvas_picking_sketch_free_commit.ts';
import { withSketchBoxContentCommand } from './_sketch_box_content_command_fixture.ts';
import { withSketchStructuralCommand } from './_sketch_structural_command_fixture.ts';

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
    hostModuleKey: 3,
    hostIsBottom: true,
    kind: 'box',
    freePlacement: true,
    freeBoxPlacementCommand: {
      version: 1,
      command: {
        kind: 'create-free-box',
        geometry: {
          centerX: 0.25,
          centerY: 1.1,
          heightM: 0.9,
          widthM: 0.7,
          depthM: 0.4,
        },
      },
    },
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

test('sketch-free placement remove fails closed when its target id is missing', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-existing',
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
  const App = {
    actions: {
      modules: {
        patchForStack: (
          _side: string,
          _moduleKey: unknown,
          patcher: (cfgRef: Record<string, unknown>) => void
        ) => patcher(cfg),
      },
    },
  } as never;

  const missingTargetHover = createSketchFreePlacementBoxHoverRecord({
    tool: 'sketch_box_free',
    host: { moduleKey: 7, isBottom: false },
    op: 'remove',
    previewX: 0.15,
    previewY: 0.95,
    previewH: 0.9,
    previewW: 0.72,
    previewD: 0.42,
    removeId: null,
    ts: 1,
  });
  assert.equal(missingTargetHover, null);

  const legacyAmbiguousHover = {
    ts: 1,
    tool: 'sketch_box_free',
    hostModuleKey: 7,
    hostIsBottom: false,
    kind: 'box',
    op: 'remove',
    freePlacement: true,
    xCenter: 0.15,
    yCenter: 0.95,
    heightM: 0.9,
    widthM: 0.72,
    depthM: 0.42,
    removeId: null,
  } as never;
  assert.deepEqual(
    commitSketchFreePlacementHoverRecord({
      App,
      host: { moduleKey: 7, isBottom: false },
      hoverRec: legacyAmbiguousHover,
    }),
    { committed: false }
  );

  const boxes = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>) || [];
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0]?.id, 'free-existing');
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
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'single-door',
        boxId: 'free-1',
        freePlacement: true,
        blockedReason: null,
        op: 'remove',
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        hinge: 'right',
        doorId: 'door-1',
      }
    ) as never,
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
    hoverRec: withSketchStructuralCommand(
      {
        kind: 'add-shelf',
        op: 'add',
        boxId: 'free-1',
        freePlacement: true,
        blockedReason: 'no-room',
        boxYNorm: 0.5,
        contentXNorm: 0.5,
        variant: 'regular',
        depthM: 0.4,
      },
      { tool: 'sketch_shelf:regular', moduleKey: 3 }
    ) as never,
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
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'sketch-external-drawers',
        boxId: 'free-regular-1',
        freePlacement: true,
        blockedReason: null,
        op: 'remove',
        removeId: 'sbrd-1',
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0,
        drawerCount: 3,
        drawerHeightM: 0.2,
        drawerH: 0.2,
        stackH: 0.6,
      }
    ) as never,
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
    __wp_readSketchHover: () =>
      withSketchStructuralCommand(
        {
          kind: 'remove-rod',
          op: 'remove',
          boxId: 'free-cross-kind',
          freePlacement: true,
          blockedReason: null,
          removeId: 'rod-1',
          removeIdx: null,
        },
        { tool: 'sketch_shelf:regular', moduleKey: 2 }
      ),
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
  const hover = withSketchStructuralCommand(
    {
      kind: 'remove-shelf',
      op: 'remove',
      boxId: 'free-shelf-1',
      freePlacement: true,
      blockedReason: null,
      removeId: 'shelf-1',
      removeIdx: null,
    },
    { tool: 'sketch_ext_drawers:3', moduleKey: 2 }
  );
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

test('sketch-free drawer commit consumes a room-column collision without mutating the free box', () => {
  const box: Record<string, unknown> = {
    id: 'free-column-blocked',
    freePlacement: true,
    absX: 0,
    absY: 1,
    widthM: 0.8,
    depthM: 0.5,
    heightM: 1,
  };
  const cfg: Record<string, unknown> = { sketchExtras: { boxes: [box] } };
  const toasts: Array<{ message: string; type?: string }> = [];
  const state = {
    config: {
      roomArchitecture: {
        backWall: { enabled: true, widthCm: 240, heightCm: 280, wardrobeOffsetLeftCm: 0 },
        column: {
          enabled: true,
          offsetLeftCm: 115,
          widthCm: 10,
          depthCm: 25,
          heightCm: 180,
          bottomOffsetCm: 10,
        },
        surfacesHidden: false,
      },
    },
    ui: { raw: { width: 240, height: 240, depth: 60 } },
    runtime: { wardrobeWidthM: null, wardrobeHeightM: null, wardrobeDepthM: null },
    mode: {},
    meta: {},
  };
  const App = {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    actions: {
      modules: {
        patchForStack: (
          _side: string,
          _moduleKey: unknown,
          patcher: (cfgRef: Record<string, unknown>) => void
        ) => patcher(cfg),
      },
    },
    services: {
      uiFeedback: {
        toast(message: string, type?: string) {
          toasts.push({ message, type });
        },
      },
    },
  } as never;

  const result = commitSketchFreePlacementHoverRecord({
    App,
    host: { moduleKey: 2, isBottom: false },
    hoverRec: withSketchBoxContentCommand(
      { tool: 'sketch_int_drawers', moduleKey: 2 },
      {
        kind: 'internal-drawers',
        boxId: 'free-column-blocked',
        freePlacement: true,
        blockedReason: null,
        op: 'add',
        removeId: null,
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0.4,
        drawerHeightM: 0.18,
        drawerH: 0.18,
        stackH: 0.38,
        drawerGap: 0.02,
      }
    ) as never,
    freeBoxContentKind: 'drawers',
    floorY: 0,
  });

  assert.deepEqual(result, { committed: true, nextHover: null, blockedByRoomColumn: true });
  assert.equal(box.drawers, undefined);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'error');
  assert.match(toasts[0]?.message || '', /העמוד חודר לתוך התא/);
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
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'regular-external-drawers',
        boxId: 'free-shoe-1',
        freePlacement: true,
        blockedReason: null,
        op: 'add',
        removeId: null,
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0,
        drawerCount: 0,
        hasShoeDrawer: true,
        drawerHeightM: 0.2,
      }
    ) as never,
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
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'sketch-external-drawers',
        boxId: 'free-sketch-ext-1',
        freePlacement: true,
        blockedReason: null,
        op: 'add',
        removeId: null,
        contentXNorm: 0.5,
        boxYNorm: 0.5342857143,
        boxBaseYNorm: 0.22,
        drawerCount: 4,
        drawerHeightM: 0.22,
        drawerH: 0.22,
        stackH: 0.88,
      }
    ) as never,
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
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'regular-external-drawers',
        boxId: 'free-combo-1',
        freePlacement: true,
        blockedReason: null,
        op: 'remove',
        removeId: 'sbrd-combo',
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0,
        drawerCount: 0,
        hasShoeDrawer: true,
        drawerHeightM: 0.2,
      }
    ) as never,
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
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'regular-external-drawers',
        boxId: 'free-combo-1',
        freePlacement: true,
        blockedReason: null,
        op: 'remove',
        removeId: 'sbrd-combo',
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0,
        drawerCount: 0,
        hasShoeDrawer: false,
        drawerHeightM: 0.2,
      }
    ) as never,
    freeBoxContentKind: 'regular_ext_drawers',
    floorY: 0,
  });

  box = ((cfg.sketchExtras as Record<string, unknown>).boxes as Array<Record<string, unknown>>)[0];
  drawers = (box?.regularExtDrawers as Array<Record<string, unknown>>) || [];
  assert.equal(removeShoe.committed, true);
  assert.deepEqual(drawers, []);
});
