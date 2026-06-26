import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleExternalDrawerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_external.ts';
import { tryApplyManualLayoutSketchDirectHitActions } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_direct_hit_actions.ts';
import { tryHandleCanvasPickingManualOrEmptyRoute } from '../esm/native/services/canvas_picking_click_route_manual.ts';
import { firstRenderableHitIsSketchFreeBox } from '../esm/native/services/canvas_picking_sketch_free_box_hit_policy.ts';
import { EXT_DRAWER_MODE_HOVER_TOOL } from '../esm/native/services/canvas_picking_ext_drawer_mode_hover.ts';

function createRegularFreeBoxDrawerHit(boxId = 'free-1', drawerId = 'sbrd-1') {
  return {
    type: 'Mesh',
    userData: {
      partId: `sketch_box_free_2_${boxId}_ext_drawers_${drawerId}_1`,
      moduleIndex: '2',
      __wpSketchModuleKey: '2',
      __wpSketchBoxId: boxId,
      __wpSketchExtDrawer: true,
      __wpRegularExternalDrawer: true,
      __wpSketchExtDrawerId: drawerId,
    },
    parent: null,
  };
}

test('free-box regular external drawer mode direct hit removes regularExtDrawers instead of consuming the click', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-1',
          freePlacement: true,
          regularExtDrawers: [
            { id: 'sbrd-1', count: 3 },
            { id: 'sbrd-2', count: 2 },
          ],
        },
      ],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const handled = tryHandleExternalDrawerModeClick({
    App: {} as never,
    foundModuleIndex: 2,
    activeModuleKey: 2,
    isExtDrawerEditMode: true,
    intersects: [{ object: createRegularFreeBoxDrawerHit(), point: { x: 0, y: 0.4, z: 0 } }] as never,
    patchConfigForKey: (_key, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg as never);
      return null;
    },
  });

  const regularIds = (((cfg.sketchExtras as any).boxes[0].regularExtDrawers as any[]) || []).map(
    item => item.id
  );
  assert.equal(handled, true);
  assert.deepEqual(patchMeta, { source: 'extDrawers.removeSketchExternalByHit', immediate: true });
  assert.deepEqual(regularIds, ['sbrd-2']);
});

test('regular external drawer edit mode direct hit removes sketch internal drawers', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [
        { id: 'sid-1', yNormC: 0.25 },
        { id: 'sid-2', yNormC: 0.55 },
      ],
      extDrawers: [],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const handled = tryHandleExternalDrawerModeClick({
    App: {} as never,
    foundModuleIndex: 2,
    activeModuleKey: 2,
    isExtDrawerEditMode: true,
    intersects: [{ object: createSketchInternalDrawerHit(), point: { x: 0, y: 0.4, z: 0 } }] as never,
    patchConfigForKey: (_key, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg as never);
      return null;
    },
  });

  const drawerIds = (((cfg.sketchExtras as any).drawers as any[]) || []).map(item => item.id);
  assert.equal(handled, true);
  assert.deepEqual(patchMeta, { source: 'extDrawers.removeSketchInternalByHit', immediate: true });
  assert.deepEqual(drawerIds, ['sid-2']);
});

test('regular external drawer edit mode removes sketch internal drawers from the active remove hover even when direct hit misses the drawer mesh', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [
        { id: 'sid-1', yNormC: 0.25 },
        { id: 'sid-2', yNormC: 0.55 },
      ],
      extDrawers: [],
    },
  };
  const App = {
    render: {
      cache: {
        __lastSketchHover: {
          ts: Date.now(),
          tool: EXT_DRAWER_MODE_HOVER_TOOL,
          moduleKey: 2,
          isBottom: false,
          hostModuleKey: 2,
          hostIsBottom: false,
          kind: 'drawers',
          op: 'remove',
          removeKind: 'sketch',
          removeId: 'sid-1',
        },
      },
    },
  } as never;
  let patchMeta: Record<string, unknown> | null = null;

  const handled = tryHandleExternalDrawerModeClick({
    App,
    foundModuleIndex: 2,
    activeModuleKey: 2,
    isExtDrawerEditMode: true,
    intersects: [{ object: { userData: { partId: 'module_selector_2' } }, point: { y: 0.4 } }] as never,
    patchConfigForKey: (_key, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg as never);
      return null;
    },
  });

  const drawerIds = (((cfg.sketchExtras as any).drawers as any[]) || []).map(item => item.id);
  assert.equal(handled, true);
  assert.deepEqual(patchMeta, { source: 'extDrawers.hoverRemoveSketchInternal', immediate: true });
  assert.deepEqual(drawerIds, ['sid-2']);
});

test('regular external drawer edit mode respects an add hover beside sketch internal drawers instead of direct-hit removing them', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'sid-1', yNormC: 0.25 }],
      extDrawers: [],
    },
  };
  const App = {
    render: {
      cache: {
        __lastSketchHover: {
          ts: Date.now(),
          tool: EXT_DRAWER_MODE_HOVER_TOOL,
          moduleKey: 2,
          isBottom: false,
          hostModuleKey: 2,
          hostIsBottom: false,
          kind: 'ext_drawers',
          op: 'add',
          yCenter: 0.8,
        },
      },
    },
  } as never;
  let patched = false;

  const handled = tryHandleExternalDrawerModeClick({
    App,
    foundModuleIndex: null,
    activeModuleKey: 2,
    isExtDrawerEditMode: true,
    intersects: [
      { object: createSketchInternalDrawerHit(2, 'sid-1'), point: { x: 0, y: 0.4, z: 0 } },
    ] as never,
    patchConfigForKey: (_key, patchFn) => {
      patched = true;
      patchFn(cfg as never);
      return null;
    },
  });

  const drawerIds = (((cfg.sketchExtras as any).drawers as any[]) || []).map(item => item.id);
  assert.equal(handled, false);
  assert.equal(patched, false);
  assert.deepEqual(drawerIds, ['sid-1']);
});

test('manual sketch external drawer tool direct hit removes regularExtDrawers in a free box', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-1',
          freePlacement: true,
          regularExtDrawers: [
            { id: 'sbrd-1', count: 3 },
            { id: 'sbrd-2', count: 2 },
          ],
        },
      ],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_ext_drawers:3',
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    mapKey: 2,
    __gridMap: { '2': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 0.4,
    pad: 0,
    intersects: [{ object: createRegularFreeBoxDrawerHit(), point: { x: 0, y: 0.4, z: 0 } }] as never,
    __patchConfigForKey: (_key, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg as never);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: true,
    __hoverKind: 'box_content',
    __hoverOp: 'remove',
    __hoverRec: {
      kind: 'box_content',
      contentKind: 'regular_ext_drawers',
      boxId: 'free-1',
      op: 'remove',
      removeId: 'sbrd-1',
    },
  });

  const regularIds = (((cfg.sketchExtras as any).boxes[0].regularExtDrawers as any[]) || []).map(
    item => item.id
  );
  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'sketch.removeExternalDrawerByHit', immediate: true });
  assert.deepEqual(regularIds, ['sbrd-2']);
});

test('free-box regular external drawer mode direct hit removes even when the free box is outside any module selector', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-1',
          freePlacement: true,
          regularExtDrawers: [
            { id: 'sbrd-1', count: 3 },
            { id: 'sbrd-2', count: 2 },
          ],
        },
      ],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const handled = tryHandleExternalDrawerModeClick({
    App: {} as never,
    foundModuleIndex: null,
    activeModuleKey: 2,
    isExtDrawerEditMode: true,
    intersects: [{ object: createRegularFreeBoxDrawerHit(), point: { x: 0, y: 0.4, z: 0 } }] as never,
    patchConfigForKey: (_key, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg as never);
      return null;
    },
  });

  const regularIds = (((cfg.sketchExtras as any).boxes[0].regularExtDrawers as any[]) || []).map(
    item => item.id
  );
  assert.equal(handled, true);
  assert.deepEqual(patchMeta, { source: 'extDrawers.removeSketchExternalByHit', immediate: true });
  assert.deepEqual(regularIds, ['sbrd-2']);
});

test('manual free-box route removes regular external drawers before stale hover can consume the click', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-1',
          freePlacement: true,
          regularExtDrawers: [
            { id: 'sbrd-1', count: 3 },
            { id: 'sbrd-2', count: 2 },
          ],
        },
      ],
    },
  };
  const App = {
    store: {
      getState: () => ({ mode: { opts: { manualTool: 'sketch_ext_drawers:3' } } }),
    },
  } as never;
  let patchMeta: Record<string, unknown> | null = null;

  const handled = tryHandleCanvasPickingManualOrEmptyRoute({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: null as never,
    mouse: null as never,
    modeState: {
      __pm: null,
      __isPaintMode: false,
      __isGrooveEditMode: false,
      __isSplitEditMode: false,
      __isLayoutEditMode: false,
      __isManualLayoutMode: true,
      __isBraceShelvesMode: false,
      __isExtDrawerEditMode: false,
      __isIntDrawerEditMode: false,
      __isDividerEditMode: false,
      __isHandleEditMode: false,
      __isHingeEditMode: false,
      __isRemoveDoorMode: false,
      __isDoorTrimMode: false,
      __isCellDimsMode: false,
    },
    hitState: {
      intersects: [{ object: createRegularFreeBoxDrawerHit(), point: { x: 0, y: 0.4, z: 0 } }] as never,
      foundPartId: null,
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: null,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: null,
      doorHitPoint: null,
      moduleHitY: null,
      doorHitY: null,
      primaryHitY: null,
    },
    moduleRefs: {
      __activeModuleKey: 2,
      __activeStack: 'top',
      __isBottomStack: false,
      __ensureConfigRefForKey: () => cfg as never,
      __patchConfigForKey: (_key, patchFn, meta) => {
        patchMeta = { ...meta };
        patchFn(cfg as never);
      },
      __getActiveConfigRef: () => cfg as never,
      __ensureCornerCellConfigRef: () => null,
    },
  });

  const regularIds = (((cfg.sketchExtras as any).boxes[0].regularExtDrawers as any[]) || []).map(
    item => item.id
  );
  assert.equal(handled, true);
  assert.deepEqual(patchMeta, { source: 'sketch.removeExternalDrawerByHit', immediate: true });
  assert.deepEqual(regularIds, ['sbrd-2']);
});

function createSketchInternalDrawerHit(moduleKey = 2, drawerId = 'sid-1') {
  return {
    type: 'Mesh',
    userData: {
      partId: `div_int_sketch_${moduleKey}_${drawerId}`,
      moduleIndex: String(moduleKey),
      __wpSketchModuleKey: String(moduleKey),
    },
    parent: null,
  };
}

function createManualRouteState() {
  return {
    __pm: null,
    __isPaintMode: false,
    __isGrooveEditMode: false,
    __isSplitEditMode: false,
    __isLayoutEditMode: false,
    __isManualLayoutMode: true,
    __isBraceShelvesMode: false,
    __isExtDrawerEditMode: false,
    __isIntDrawerEditMode: false,
    __isDividerEditMode: false,
    __isHandleEditMode: false,
    __isHingeEditMode: false,
    __isRemoveDoorMode: false,
    __isDoorTrimMode: false,
    __isCellDimsMode: false,
  };
}

function createManualRouteHitState(drawerGroup: Record<string, unknown>) {
  return {
    intersects: [{ object: drawerGroup, point: { x: 0, y: 0.4, z: 0 } }] as never,
    foundPartId: null,
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: null,
    foundDrawerId: null,
    primaryHitObject: drawerGroup as never,
    doorHitObject: null,
    doorHitGroup: null,
    primaryHitPoint: null,
    doorHitPoint: null,
    moduleHitY: null,
    doorHitY: null,
    primaryHitY: null,
  };
}

test('manual sketch external drawer route removes an internal sketch drawer when the active hover is the same drawer', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [
        { id: 'sid-1', yNorm: 0.35 },
        { id: 'sid-2', yNorm: 0.65 },
      ],
    },
  };
  const drawerGroup = createSketchInternalDrawerHit(2, 'sid-1');
  const App = {
    render: {
      cache: {
        __lastSketchHover: {
          ts: Date.now(),
          tool: 'sketch_ext_drawers:3',
          moduleKey: 2,
          isBottom: false,
          hostModuleKey: 2,
          hostIsBottom: false,
          kind: 'drawers',
          op: 'remove',
          removeId: 'sid-1',
        },
      },
    },
    store: {
      getState: () => ({ mode: { opts: { manualTool: 'sketch_ext_drawers:3' } } }),
    },
  } as never;
  let patchMeta: Record<string, unknown> | null = null;

  const handled = tryHandleCanvasPickingManualOrEmptyRoute({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: null as never,
    mouse: null as never,
    modeState: createManualRouteState(),
    hitState: createManualRouteHitState(drawerGroup),
    moduleRefs: {
      __activeModuleKey: 2,
      __activeStack: 'top',
      __isBottomStack: false,
      __ensureConfigRefForKey: () => cfg as never,
      __patchConfigForKey: (_key, patchFn, meta) => {
        patchMeta = { ...meta };
        patchFn(cfg as never);
      },
      __getActiveConfigRef: () => cfg as never,
      __ensureCornerCellConfigRef: () => null,
    },
  });

  const drawers = (((cfg.sketchExtras as any).drawers as any[]) || []).map(item => item.id);
  assert.equal(handled, true);
  assert.deepEqual(patchMeta, { source: 'sketch.removeInternalDrawerByHoverDirectHit', immediate: true });
  assert.deepEqual(drawers, ['sid-2']);
});

test('manual sketch external drawer route does not remove an internal drawer when hover is an add preview above it', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'sid-1', yNorm: 0.35 }],
      extDrawers: [],
    },
  };
  const drawerGroup = createSketchInternalDrawerHit(2, 'sid-1');
  const App = {
    render: {
      cache: {
        __lastSketchHover: {
          ts: Date.now(),
          tool: 'sketch_ext_drawers:3',
          moduleKey: 2,
          isBottom: false,
          hostModuleKey: 2,
          hostIsBottom: false,
          kind: 'ext_drawers',
          op: 'add',
          yCenter: 1.2,
        },
      },
    },
    store: {
      getState: () => ({ mode: { opts: { manualTool: 'sketch_ext_drawers:3' } } }),
    },
  } as never;
  let patched = false;

  const handled = tryHandleCanvasPickingManualOrEmptyRoute({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: null as never,
    mouse: null as never,
    modeState: createManualRouteState(),
    hitState: createManualRouteHitState(drawerGroup),
    moduleRefs: {
      __activeModuleKey: 2,
      __activeStack: 'top',
      __isBottomStack: false,
      __ensureConfigRefForKey: () => cfg as never,
      __patchConfigForKey: (_key, patchFn) => {
        patched = true;
        patchFn(cfg as never);
      },
      __getActiveConfigRef: () => cfg as never,
      __ensureCornerCellConfigRef: () => null,
    },
  });

  const drawers = (((cfg.sketchExtras as any).drawers as any[]) || []).map(item => item.id);
  assert.equal(handled, false);
  assert.equal(patched, false);
  assert.deepEqual(drawers, ['sid-1']);
});

test('free-box shell hit policy does not swallow actionable drawer fronts', () => {
  assert.equal(
    firstRenderableHitIsSketchFreeBox([
      { object: { type: 'Mesh', userData: { partId: 'sketch_box_free_2_free-1' } } },
    ]),
    true
  );
  assert.equal(
    firstRenderableHitIsSketchFreeBox([
      {
        object: {
          type: 'Mesh',
          userData: { partId: 'sketch_box_free_2_free-1_ext_drawers_sbrd-1_1' },
        },
      },
    ]),
    false
  );
});
