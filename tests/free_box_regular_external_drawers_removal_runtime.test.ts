import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleExternalDrawerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_external.ts';
import { tryApplyManualLayoutSketchDirectHitActions } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_direct_hit_actions.ts';
import { tryHandleCanvasPickingManualOrEmptyRoute } from '../esm/native/services/canvas_picking_click_route_manual.ts';
import { firstRenderableHitIsSketchFreeBox } from '../esm/native/services/canvas_picking_sketch_free_box_hit_policy.ts';

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
