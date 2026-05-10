import test from 'node:test';
import assert from 'node:assert/strict';

import { getInternalGridMap } from '../esm/native/runtime/cache_access.ts';
import { tryHandleCanvasBraceShelvesClick } from '../esm/native/services/canvas_picking_layout_edit_flow_brace.ts';

function createApp() {
  return {
    store: {
      getState: () => ({}),
      patch: () => undefined,
    },
  } as any;
}

function baseArgs(
  App: any,
  cfg: Record<string, unknown>,
  patchMetaRef: { current: Record<string, unknown> | null }
) {
  return {
    App,
    foundModuleIndex: 0,
    __activeModuleKey: 0,
    __isBottomStack: false,
    __isLayoutEditMode: false,
    __isManualLayoutMode: false,
    __isBraceShelvesMode: true,
    moduleHitY: 1.0,
    intersects: [
      { object: { userData: { isModuleSelector: true, moduleIndex: 0 } }, point: { y: 1.0 } },
      { object: { userData: { partId: 'all_shelves' } }, point: { y: 0.84 } },
    ],
    __patchConfigForKey: (
      _mk: unknown,
      patchFn: (cfg: Record<string, unknown>) => void,
      meta: Record<string, unknown>
    ) => {
      patchMetaRef.current = { ...meta };
      patchFn(cfg);
      return null;
    },
    __getActiveConfigRef: () => cfg as never,
  };
}

test('brace-shelves click toggles the shelf under the existing board hit, not only the selector line', () => {
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
  const patchMetaRef: { current: Record<string, unknown> | null } = { current: null };

  const handled = tryHandleCanvasBraceShelvesClick(baseArgs(App, cfg, patchMetaRef) as never);

  assert.equal(handled, true);
  assert.deepEqual(patchMetaRef.current, { source: 'braceShelves.toggle', immediate: true });
  assert.deepEqual(cfg.braceShelves, [2]);
});

test('brace-shelves click cancels a brace shelf stored as both brace metadata and shelf variant', () => {
  const App = createApp();
  getInternalGridMap(App, false)['0'] = {
    effectiveTopY: 2.4,
    effectiveBottomY: 0,
    gridDivisions: 6,
  };
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: { shelves: [true, true, true, true, true], shelfVariants: ['', 'brace', '', '', ''] },
    braceShelves: ['2'],
  };
  const patchMetaRef: { current: Record<string, unknown> | null } = { current: null };

  const handled = tryHandleCanvasBraceShelvesClick(baseArgs(App, cfg, patchMetaRef) as never);

  assert.equal(handled, true);
  assert.deepEqual(cfg.braceShelves, []);
  assert.deepEqual((cfg.customData as { shelfVariants: string[] }).shelfVariants, ['', '', '', '', '']);
});
