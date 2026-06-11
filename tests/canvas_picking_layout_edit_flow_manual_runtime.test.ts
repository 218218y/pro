import test from 'node:test';
import assert from 'node:assert/strict';

import { getInternalGridMap } from '../esm/native/runtime/cache_access.ts';
import { tryHandleCanvasManualLayoutClick } from '../esm/native/services/canvas_picking_layout_edit_flow_manual.ts';

function createApp(state: Record<string, unknown>) {
  return {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
  } as any;
}

test('manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner', () => {
  const state = {
    ui: {
      currentGridDivisions: 6,
      currentGridShelfVariant: 'brace',
    },
    mode: {
      opts: {
        manualTool: 'shelf',
      },
    },
  };
  const App = createApp(state);
  getInternalGridMap(App, false)['0'] = {
    effectiveTopY: 2.4,
    effectiveBottomY: 0,
    gridDivisions: 6,
  };

  const cfg: Record<string, unknown> = {
    isCustom: false,
    gridDivisions: 4,
  };
  let patchMeta: Record<string, unknown> | null = null;

  const handled = tryHandleCanvasManualLayoutClick({
    App,
    foundModuleIndex: 0,
    __activeModuleKey: 0,
    __isBottomStack: false,
    __isLayoutEditMode: true,
    __isManualLayoutMode: true,
    __isBraceShelvesMode: false,
    moduleHitY: 1.2,
    intersects: [],
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg as never);
      return null;
    },
    __getActiveConfigRef: () => cfg as never,
  });

  const customData = cfg.customData as { shelves: boolean[]; shelfVariants: string[] };
  assert.equal(handled, true);
  assert.deepEqual(patchMeta, { source: 'manualLayout.fillAllShelves', immediate: true });
  assert.deepEqual(customData.shelves, [true, true, true, true, true]);
  assert.deepEqual(customData.shelfVariants, ['brace', 'brace', 'brace', 'brace', 'brace']);
  assert.deepEqual(cfg.braceShelves, [1, 2, 3, 4, 5]);
});

test('manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata', () => {
  const state = {
    ui: {
      currentGridDivisions: 4,
      currentGridShelfVariant: 'regular',
    },
    mode: {
      opts: {
        manualTool: 'rod',
      },
    },
  };
  const App = createApp(state);
  getInternalGridMap(App, false)['0'] = {
    effectiveTopY: 2,
    effectiveBottomY: 0,
    gridDivisions: 4,
  };

  const cfg: Record<string, unknown> = {
    isCustom: true,
    gridDivisions: 4,
    savedDims: { top: 2, bottom: 0 },
    customData: {
      shelves: [],
      rods: [false, true, false, false],
      shelfVariants: [],
      rodOps: [
        { gridIndex: 2, yFactor: 2.3, enableHangingClothes: true },
        { gridIndex: 4, yFactor: 4.1, enableHangingClothes: true },
      ],
      storage: false,
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const handled = tryHandleCanvasManualLayoutClick({
    App,
    foundModuleIndex: 0,
    __activeModuleKey: 0,
    __isBottomStack: false,
    __isLayoutEditMode: true,
    __isManualLayoutMode: true,
    __isBraceShelvesMode: false,
    moduleHitY: 0.75,
    intersects: [],
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg as never);
      return null;
    },
    __getActiveConfigRef: () => cfg as never,
  });

  const customData = cfg.customData as {
    rods: boolean[];
    rodOps: Array<{ gridIndex?: number; yFactor?: number }>;
  };
  assert.equal(handled, true);
  assert.deepEqual(patchMeta, { source: 'manualLayout.toggleItem', immediate: true });
  assert.equal(customData.rods[1], false);
  assert.deepEqual(customData.rodOps, [{ gridIndex: 4, yFactor: 4.1, enableHangingClothes: true }]);
});
