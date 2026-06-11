import test from 'node:test';
import assert from 'node:assert/strict';

import { getInternalGridMap } from '../esm/native/runtime/cache_access.ts';
import { tryHandleCanvasLayoutEditClick } from '../esm/native/services/canvas_picking_layout_edit_flow.ts';
import { tryHandleCanvasManualLayoutClick } from '../esm/native/services/canvas_picking_layout_edit_flow_manual.ts';
import { tryHandleCanvasBraceShelvesClick } from '../esm/native/services/canvas_picking_layout_edit_flow_brace.ts';

function createApp(state: Record<string, unknown> = {}) {
  return {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
  } as any;
}

function freeBoxThenWardrobeIntersects() {
  return [
    {
      object: {
        type: 'Mesh',
        userData: {
          partId: 'sketch_box_free_0_free-box_back',
          moduleIndex: 0,
          __wpSketchBoxId: 'free-box',
          __wpSketchModuleKey: 0,
        },
      },
      point: { x: 1.4, y: 1.1, z: -0.32 },
    },
    { object: { type: 'Mesh', userData: { isModuleSelector: true, moduleIndex: 0 } }, point: { y: 1.1 } },
    { object: { type: 'Mesh', userData: { partId: 'all_shelves' } }, point: { y: 0.84 } },
  ];
}

test('layout preset click on a free-box surface is consumed and does not patch the main wardrobe', () => {
  const App = createApp({ ui: { currentLayoutType: 'shelves' } });
  const cfg: Record<string, unknown> = { layout: 'hanging', isCustom: true };
  let patchCalled = false;

  const handled = tryHandleCanvasLayoutEditClick({
    App,
    foundModuleIndex: 0,
    __activeModuleKey: 0,
    __isBottomStack: false,
    __isLayoutEditMode: true,
    __isManualLayoutMode: false,
    __isBraceShelvesMode: false,
    moduleHitY: 1.1,
    intersects: freeBoxThenWardrobeIntersects() as never,
    __patchConfigForKey: (_mk, patchFn) => {
      patchCalled = true;
      patchFn(cfg as never);
      return null;
    },
    __getActiveConfigRef: () => cfg as never,
  });

  assert.equal(handled, true);
  assert.equal(patchCalled, false);
  assert.equal(cfg.layout, 'hanging');
  assert.equal(cfg.isCustom, true);
});

test('manual-layout click on a free-box surface is consumed and does not toggle the main wardrobe cell', () => {
  const App = createApp({
    ui: { currentGridDivisions: 6, currentGridShelfVariant: 'regular' },
    mode: { opts: { manualTool: 'shelf' } },
  });
  getInternalGridMap(App, false)['0'] = {
    effectiveTopY: 2.4,
    effectiveBottomY: 0,
    gridDivisions: 6,
  };
  const cfg: Record<string, unknown> = { isCustom: false, gridDivisions: 4 };
  let patchCalled = false;

  const handled = tryHandleCanvasManualLayoutClick({
    App,
    foundModuleIndex: 0,
    __activeModuleKey: 0,
    __isBottomStack: false,
    __isLayoutEditMode: false,
    __isManualLayoutMode: true,
    __isBraceShelvesMode: false,
    moduleHitY: 1.1,
    intersects: freeBoxThenWardrobeIntersects() as never,
    __patchConfigForKey: (_mk, patchFn) => {
      patchCalled = true;
      patchFn(cfg as never);
      return null;
    },
    __getActiveConfigRef: () => cfg as never,
  });

  assert.equal(handled, true);
  assert.equal(patchCalled, false);
  assert.equal(cfg.customData, undefined);
});

test('brace-shelves click on a free-box surface is consumed and does not toggle a shelf in the main wardrobe', () => {
  const App = createApp();
  getInternalGridMap(App, false)['0'] = {
    effectiveTopY: 2.4,
    effectiveBottomY: 0,
    gridDivisions: 6,
  };
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: { shelves: [true, true, true, true, true], shelfVariants: ['', '', '', '', ''] },
    braceShelves: [],
  };
  let patchCalled = false;

  const handled = tryHandleCanvasBraceShelvesClick({
    App,
    foundModuleIndex: 0,
    __activeModuleKey: 0,
    __isBottomStack: false,
    __isLayoutEditMode: false,
    __isManualLayoutMode: false,
    __isBraceShelvesMode: true,
    moduleHitY: 1.1,
    intersects: freeBoxThenWardrobeIntersects() as never,
    __patchConfigForKey: (_mk, patchFn) => {
      patchCalled = true;
      patchFn(cfg as never);
      return null;
    },
    __getActiveConfigRef: () => cfg as never,
  });

  assert.equal(handled, true);
  assert.equal(patchCalled, false);
  assert.deepEqual(cfg.braceShelves, []);
});
