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

test('brace-shelves click cancels a brace shelf stored as canonical brace metadata and shelf variant', () => {
  const App = createApp();
  getInternalGridMap(App, false)['0'] = {
    effectiveTopY: 2.4,
    effectiveBottomY: 0,
    gridDivisions: 6,
  };
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: { shelves: [true, true, true, true, true], shelfVariants: ['', 'brace', '', '', ''] },
    braceShelves: [2],
  };
  const patchMetaRef: { current: Record<string, unknown> | null } = { current: null };

  const handled = tryHandleCanvasBraceShelvesClick(baseArgs(App, cfg, patchMetaRef) as never);

  assert.equal(handled, true);
  assert.deepEqual(cfg.braceShelves, []);
  assert.deepEqual((cfg.customData as { shelfVariants: string[] }).shelfVariants, ['', '', '', '', '']);
});

test('brace-shelves click ignores string-encoded brace shelf metadata before toggling', () => {
  const App = createApp();
  getInternalGridMap(App, false)['0'] = {
    effectiveTopY: 2.4,
    effectiveBottomY: 0,
    gridDivisions: 6,
  };
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: { shelves: [true, true, true, true, true], shelfVariants: ['', '', '', '', ''] },
    braceShelves: ['2'],
  };
  const patchMetaRef: { current: Record<string, unknown> | null } = { current: null };

  const handled = tryHandleCanvasBraceShelvesClick(baseArgs(App, cfg, patchMetaRef) as never);

  assert.equal(handled, true);
  assert.deepEqual(cfg.braceShelves, [2]);
  assert.deepEqual((cfg.customData as { shelfVariants: string[] }).shelfVariants, ['', '', '', '', '']);
});

test('brace-shelves click toggles an exact sketch shelf to brace and back to regular', () => {
  const App = createApp();
  getInternalGridMap(App, false)['0'] = {
    effectiveTopY: 2.4,
    effectiveBottomY: 0,
    gridDivisions: 6,
    woodThick: 0.017,
  };
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: { shelves: [false, false, false, false, false], shelfVariants: [] },
    braceShelves: [],
    sketchExtras: { shelves: [{ id: 'exact-1', yNorm: 0.3, variant: 'regular', depthM: 0.4 }] },
  };
  const patchMetaRef: { current: Record<string, unknown> | null } = { current: null };
  const args = {
    ...baseArgs(App, cfg, patchMetaRef),
    moduleHitY: 0.72,
    intersects: [
      {
        object: { userData: { partId: 'sketch_shelf_0_1', moduleIndex: 0, __wpShelfIndex: 1 } },
        point: { y: 0.72 },
      },
      { object: { userData: { isModuleSelector: true, moduleIndex: 0 } }, point: { y: 0.72 } },
    ],
  };

  assert.equal(tryHandleCanvasBraceShelvesClick(args as never), true);
  assert.deepEqual(patchMetaRef.current, { source: 'braceShelves.sketchExtraToggle', immediate: true });
  const shelves = (cfg.sketchExtras as any).shelves as Array<Record<string, unknown>>;
  assert.equal(shelves[0].variant, 'brace');
  assert.deepEqual(cfg.braceShelves, []);

  assert.equal(tryHandleCanvasBraceShelvesClick(args as never), true);
  assert.equal(shelves[0].variant, 'regular');
  assert.deepEqual(cfg.braceShelves, []);
});
