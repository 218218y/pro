import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleInternalDrawerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_internal.ts';
import { tryHandleExternalDrawerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_external.ts';
import { tryHandleDrawerDividerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_divider.ts';
import { consumeDrawerRebuildIntent } from '../esm/native/runtime/doors_access.ts';

function createApp(
  args: {
    ui?: Record<string, unknown>;
    runtime?: Record<string, unknown>;
    tools?: Record<string, unknown>;
    internalGridMap?: Record<string, unknown>;
    drawersArray?: Array<Record<string, unknown>>;
    dividersToggle?: ((dividerKey: unknown, meta?: unknown) => unknown) | null;
    doorsSetOpen?: ((open: boolean, meta?: unknown) => unknown) | null;
  } = {}
) {
  const state = {
    ui: { ...(args.ui || {}) },
    runtime: { ...(args.runtime || {}) },
    config: {},
    mode: {},
    meta: { version: 0, updatedAt: 0, dirty: false },
  };
  return {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    services: {
      tools: { ...(args.tools || {}) },
      runtimeCache: {
        internalGridMap: { ...(args.internalGridMap || {}) },
      },
      doors: args.doorsSetOpen ? { setOpen: args.doorsSetOpen } : {},
    },
    actions: {
      dividers: args.dividersToggle ? { toggle: args.dividersToggle } : {},
    },
    render: {
      drawersArray: args.drawersArray || [],
    },
  } as never;
}

test('drawer-mode internal click uses manual-layout shelf divisions instead of stale grid defaults', () => {
  let patched: Record<string, unknown> | null = null;
  const handled = tryHandleInternalDrawerModeClick({
    App: createApp({
      ui: { currentGridDivisions: 8 },
      tools: { getInteriorManualTool: () => 'shelf' },
      internalGridMap: { 2: { effectiveBottomY: 0, effectiveTopY: 2, gridDivisions: 4 } },
    }),
    foundModuleIndex: 2,
    activeModuleKey: 2,
    isBottomStack: false,
    isManualLayoutMode: true,
    isIntDrawerEditMode: true,
    moduleHitY: 1.26,
    intersects: [],
    patchConfigForKey: (_mk, patchFn, meta) => {
      const cfg: Record<string, unknown> = { intDrawersList: [], intDrawersSlot: 2 };
      patchFn(cfg as never);
      patched = { cfg, meta };
    },
  });

  assert.equal(handled, true);
  assert.deepEqual((patched?.cfg as any).intDrawersList, [6]);
  assert.equal((patched?.cfg as any).intDrawersSlot, 0);
  assert.deepEqual(patched?.meta as any, { source: 'intDrawers.toggle', immediate: true });
});

test('drawer-mode external click toggles the requested drawer count and turns it off on repeat', () => {
  const snapshots: Array<Record<string, unknown>> = [];
  const args = {
    App: createApp({
      ui: { currentExtDrawerType: 'regular', currentExtDrawerCount: 3 },
    }),
    foundModuleIndex: 1,
    activeModuleKey: 1,
    isExtDrawerEditMode: true,
    patchConfigForKey: (_mk: unknown, patchFn: (cfg: any) => void) => {
      const cfg = snapshots.length ? { ...snapshots[snapshots.length - 1] } : { extDrawersCount: 0 };
      patchFn(cfg);
      snapshots.push(cfg);
    },
  };

  assert.equal(tryHandleExternalDrawerModeClick(args), true);
  assert.equal(snapshots[0].extDrawersCount, 3);
  assert.equal(tryHandleExternalDrawerModeClick(args), true);
  assert.equal(snapshots[1].extDrawersCount, 0);
});

test('drawer-mode divider click resolves drawer by part id, falls back to map toggle, and preserves open state intent', () => {
  const events: Array<[string, unknown?, unknown?]> = [];
  const drawer = {
    id: 'int_4',
    dividerKey: 'div:int_4',
    group: { userData: { partId: 'part-4' } },
    isInternal: true,
    isOpen: false,
  };
  const App = createApp({
    runtime: { globalClickMode: false },
    tools: { setDrawersOpenId: (id: string) => events.push(['open-id', id]) },
    drawersArray: [drawer],
    dividersToggle: null,
    doorsSetOpen: (isOpen: boolean, meta?: unknown) => events.push(['doors-open', isOpen, meta]),
  });

  const handled = tryHandleDrawerDividerModeClick({
    App,
    isDividerEditMode: true,
    foundDrawerId: null,
    foundPartId: 'part-4',
  });

  assert.equal(handled, true);
  assert.equal(drawer.isOpen, true);
  assert.deepEqual(events, [
    ['doors-open', true, undefined],
    ['open-id', 'int_4'],
  ]);
  assert.equal(consumeDrawerRebuildIntent(App), 'int_4');
});

test('regular external drawer edit mode can remove sketch external drawers without toggling regular stack', () => {
  let patched: Record<string, unknown> | null = null;
  const sketchDrawerGroup = {
    userData: {
      partId: 'sketch_ext_drawers_1_sed123',
      moduleIndex: 1,
      __wpSketchExtDrawer: true,
      __wpSketchExtDrawerId: 'sed123',
    },
  };

  const handled = tryHandleExternalDrawerModeClick({
    App: createApp({ ui: { currentExtDrawerType: 'regular', currentExtDrawerCount: 3 } }),
    foundModuleIndex: 1,
    activeModuleKey: 1,
    isExtDrawerEditMode: true,
    intersects: [{ object: sketchDrawerGroup } as any],
    patchConfigForKey: (_mk, patchFn, meta) => {
      const cfg: Record<string, unknown> = {
        extDrawersCount: 2,
        sketchExtras: { extDrawers: [{ id: 'sed123' }] },
      };
      patchFn(cfg as never);
      patched = { cfg, meta };
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(((patched?.cfg as any).sketchExtras as any).extDrawers, []);
  assert.equal((patched?.cfg as any).extDrawersCount, 2);
  assert.deepEqual(patched?.meta as any, { source: 'extDrawers.removeSketchExternalByHit', immediate: true });
});

test('regular internal drawer edit mode can remove sketch internal drawers without toggling regular slots', () => {
  let patched: Record<string, unknown> | null = null;
  const sketchDrawerGroup = {
    userData: {
      partId: 'div_int_sketch_1_sd123',
      moduleIndex: 1,
    },
  };

  const handled = tryHandleInternalDrawerModeClick({
    App: createApp({ internalGridMap: { 1: { effectiveBottomY: 0, effectiveTopY: 2, gridDivisions: 4 } } }),
    foundModuleIndex: 1,
    activeModuleKey: 1,
    isBottomStack: false,
    isManualLayoutMode: false,
    isIntDrawerEditMode: true,
    moduleHitY: 1,
    intersects: [{ object: sketchDrawerGroup } as any],
    patchConfigForKey: (_mk, patchFn, meta) => {
      const cfg: Record<string, unknown> = {
        intDrawersList: [2],
        sketchExtras: { drawers: [{ id: 'sd123' }] },
      };
      patchFn(cfg as never);
      patched = { cfg, meta };
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(((patched?.cfg as any).sketchExtras as any).drawers, []);
  assert.deepEqual((patched?.cfg as any).intDrawersList, [2]);
  assert.deepEqual(patched?.meta as any, { source: 'intDrawers.removeSketchInternalByHit', immediate: true });
});

test('regular external drawer edit mode adds regular drawers when a sketch external drawer is only a later non-direct hit', () => {
  let patched: Record<string, unknown> | null = null;
  const sketchDrawerGroup = {
    userData: {
      partId: 'sketch_ext_drawers_1_sed123',
      moduleIndex: 1,
      __wpSketchExtDrawer: true,
      __wpSketchExtDrawerId: 'sed123',
    },
  };

  const handled = tryHandleExternalDrawerModeClick({
    App: createApp({ ui: { currentExtDrawerType: 'regular', currentExtDrawerCount: 2 } }),
    foundModuleIndex: 1,
    activeModuleKey: 1,
    isExtDrawerEditMode: true,
    intersects: [
      { object: { userData: { partId: 'module_selector_1' } } } as any,
      { object: sketchDrawerGroup } as any,
    ],
    patchConfigForKey: (_mk, patchFn, meta) => {
      const cfg: Record<string, unknown> = {
        extDrawersCount: 0,
        sketchExtras: { extDrawers: [{ id: 'sed123' }] },
      };
      patchFn(cfg as never);
      patched = { cfg, meta };
    },
  });

  assert.equal(handled, true);
  assert.equal((patched?.cfg as any).extDrawersCount, 2);
  assert.deepEqual(((patched?.cfg as any).sketchExtras as any).extDrawers, [{ id: 'sed123' }]);
  assert.deepEqual(patched?.meta as any, { source: 'extDrawers.toggle', immediate: true });
});

test('regular internal drawer edit mode adds a regular slot when a sketch internal drawer is only a later non-direct hit', () => {
  let patched: Record<string, unknown> | null = null;
  const sketchDrawerGroup = {
    userData: {
      partId: 'div_int_sketch_1_sd123',
      moduleIndex: 1,
    },
  };

  const handled = tryHandleInternalDrawerModeClick({
    App: createApp({ internalGridMap: { 1: { effectiveBottomY: 0, effectiveTopY: 2, gridDivisions: 4 } } }),
    foundModuleIndex: 1,
    activeModuleKey: 1,
    isBottomStack: false,
    isManualLayoutMode: false,
    isIntDrawerEditMode: true,
    moduleHitY: 1,
    intersects: [
      { object: { userData: { partId: 'module_selector_1' } }, point: { y: 1 } } as any,
      { object: sketchDrawerGroup } as any,
    ],
    patchConfigForKey: (_mk, patchFn, meta) => {
      const cfg: Record<string, unknown> = {
        intDrawersList: [],
        sketchExtras: { drawers: [{ id: 'sd123' }] },
      };
      patchFn(cfg as never);
      patched = { cfg, meta };
    },
  });

  assert.equal(handled, true);
  assert.deepEqual((patched?.cfg as any).intDrawersList, [2]);
  assert.deepEqual(((patched?.cfg as any).sketchExtras as any).drawers, [{ id: 'sd123' }]);
  assert.deepEqual(patched?.meta as any, { source: 'intDrawers.toggle', immediate: true });
});
