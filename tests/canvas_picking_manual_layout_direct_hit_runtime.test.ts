import test from 'node:test';
import assert from 'node:assert/strict';

import { tryApplyManualLayoutSketchDirectHitActions } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_direct_hit_actions.ts';

test('manual-layout direct hit toggles one base shelf when the hit lands on a shelf board boundary', () => {
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: {
      shelves: [false, false, false, false, false],
      rods: [],
      storage: false,
      shelfVariants: ['', '', '', '', ''],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'shelves',
    __activeModuleKey: 0,
    topY: 2.4,
    bottomY: 0,
    mapKey: 0,
    __gridMap: { '0': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 0.8,
    pad: 0,
    intersects: [{ object: { userData: { partId: 'all_shelves' } }, point: { y: 0.8 } }] as any,
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: false,
    __hoverKind: '',
    __hoverOp: '',
    __hoverRec: null,
  });

  const shelves = ((cfg.customData as { shelves?: boolean[] }) || {}).shelves ?? [];
  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'sketch.toggleBaseShelf', immediate: true });
  assert.deepEqual(shelves, [false, true, false, false, false]);
});

test('manual-layout direct hit removes the nearest sketch shelf instead of toggling the base shelf', () => {
  const cfg: Record<string, unknown> = {
    isCustom: true,
    customData: {
      shelves: [false, false, false, false, false],
      rods: [],
      storage: false,
      shelfVariants: ['', '', '', '', ''],
    },
    sketchExtras: {
      shelves: [
        { id: 'sk1', yNorm: 0.25 },
        { id: 'sk2', yNorm: 0.5 },
      ],
    },
  };

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'shelves',
    __activeModuleKey: 0,
    topY: 2.4,
    bottomY: 0,
    mapKey: 0,
    __gridMap: { '0': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 1.2,
    pad: 0,
    intersects: [{ object: { userData: { partId: 'all_shelves' } }, point: { y: 1.2 } }] as any,
    __patchConfigForKey: (_mk, patchFn) => {
      patchFn(cfg);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: false,
    __hoverKind: '',
    __hoverOp: '',
    __hoverRec: null,
  });

  const shelves = (((cfg.sketchExtras as { shelves?: Array<{ id: string }> }) || {}).shelves ?? []).map(
    entry => entry.id
  );
  assert.equal(applied, true);
  assert.deepEqual(shelves, ['sk1']);
  assert.deepEqual((cfg.customData as { shelves?: boolean[] }).shelves, [false, false, false, false, false]);
});

test('manual-layout direct hit removes a sketch-box external drawer only when hover remove target matches', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'box-1',
          extDrawers: [
            { id: 'ed-1', yNorm: 0.4 },
            { id: 'ed-2', yNorm: 0.7 },
          ],
        },
      ],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const drawerGroup = {
    userData: {
      partId: 'sketch_ext_drawers_box-1',
      __wpSketchModuleKey: '2',
      __wpSketchExtDrawerId: 'ed-2',
      __wpSketchBoxId: 'box-1',
    },
    parent: null,
  };

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_ext_drawers:box_content',
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    mapKey: 2,
    __gridMap: { '2': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 1.0,
    pad: 0,
    intersects: [{ object: drawerGroup, point: { y: 1.0 } }] as any,
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: true,
    __hoverKind: 'box_content',
    __hoverOp: 'remove',
    __hoverRec: {
      contentKind: 'ext_drawers',
      removeId: 'ed-2',
      boxId: 'box-1',
    },
  });

  const extDrawers = (
    ((cfg.sketchExtras as { boxes?: Array<{ extDrawers?: Array<{ id: string }> }> }) || {}).boxes?.[0]
      ?.extDrawers ?? []
  ).map(entry => entry.id);
  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'sketch.removeExternalDrawerByHit', immediate: true });
  assert.deepEqual(extDrawers, ['ed-1']);
});

test('manual-layout direct hit removes an internal drawer slot when the hit stays inside the guarded Y span', () => {
  const cfg: Record<string, unknown> = {
    intDrawersList: [1, 3, 5],
    intDrawersSlot: 3,
  };
  let patchMeta: Record<string, unknown> | null = null;

  const drawerGroup = {
    userData: {
      partId: 'div_int_2_slot_3',
      __wpSketchModuleKey: '2',
      moduleIndex: '2',
    },
    position: { y: 1 },
    parent: null,
  };

  const App = {
    render: {
      drawersArray: [
        {
          id: 'div_int_2_slot_3',
          group: {
            userData: { moduleIndex: '2' },
            position: { y: 1 },
          },
        },
      ],
    },
  } as never;

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App,
    __mt: 'sketch_int_drawers',
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    mapKey: 2,
    __gridMap: { '2': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 1.01,
    pad: 0,
    intersects: [{ object: drawerGroup, point: { y: 1.01 } }] as any,
    __patchConfigForKey: (_mk, patchFn, meta) => {
      patchMeta = { ...meta };
      patchFn(cfg);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: false,
    __hoverKind: '',
    __hoverOp: '',
    __hoverRec: null,
  });

  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'sketch.removeInternalDrawerByHit.guardY', immediate: true });
  assert.deepEqual(cfg.intDrawersList, [1, 5]);
  assert.equal('intDrawersSlot' in cfg, false);
});
