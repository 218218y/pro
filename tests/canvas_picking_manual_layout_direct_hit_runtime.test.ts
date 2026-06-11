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

test('manual-layout direct hit removes standard external drawers while sketch external drawer tool is active', () => {
  const cfg: Record<string, unknown> = {
    extDrawersCount: 3,
    hasShoeDrawer: true,
  };
  let patchMeta: Record<string, unknown> | null = null;

  const drawerGroup = {
    userData: {
      partId: 'd1_draw_2',
      moduleIndex: '2',
    },
    parent: null,
  };

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_ext_drawers:3',
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
    __hoverOk: false,
    __hoverKind: '',
    __hoverOp: '',
    __hoverRec: null,
  });

  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'sketch.removeStandardExternalDrawerByHit', immediate: true });
  assert.equal(cfg.extDrawersCount, 0);
  assert.equal(cfg.hasShoeDrawer, true);
});

test('manual-layout sketch external direct-hit action ignores standard external drawers that are only later non-direct hits', () => {
  const cfg: Record<string, unknown> = {
    extDrawersCount: 3,
  };
  let patched = false;

  const drawerGroup = {
    userData: {
      partId: 'd1_draw_2',
      moduleIndex: '2',
    },
    parent: null,
  };

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_ext_drawers:3',
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    mapKey: 2,
    __gridMap: { '2': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 1.9,
    pad: 0,
    intersects: [
      { object: { userData: { partId: 'module_selector_2' } }, point: { y: 1.9 } },
      { object: drawerGroup },
    ] as any,
    __patchConfigForKey: (_mk, patchFn) => {
      patched = true;
      patchFn(cfg);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: false,
    __hoverKind: '',
    __hoverOp: '',
    __hoverRec: null,
  });

  assert.equal(applied, false);
  assert.equal(patched, false);
  assert.equal(cfg.extDrawersCount, 3);
});

test('manual-layout internal sketch drawer tool removes a sketch external drawer by direct cross hit', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      extDrawers: [
        { id: 'sed-1', yNorm: 0.35 },
        { id: 'sed-2', yNorm: 0.65 },
      ],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const drawerGroup = {
    userData: {
      partId: 'sketch_ext_drawers_2_sed-1_1',
      moduleIndex: '2',
      __wpSketchExtDrawer: true,
      __wpSketchExtDrawerId: 'sed-1',
    },
    parent: null,
  };

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_int_drawers',
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
    __hoverOk: false,
    __hoverKind: '',
    __hoverOp: '',
    __hoverRec: null,
  });

  const extDrawers = (
    ((cfg.sketchExtras as { extDrawers?: Array<{ id: string }> }) || {}).extDrawers ?? []
  ).map(entry => entry.id);
  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'sketch.removeExternalDrawerByCrossHit', immediate: true });
  assert.deepEqual(extDrawers, ['sed-2']);
});

test('manual-layout external sketch drawer tool removes a sketch internal drawer by direct cross hit', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [
        { id: 'sid-1', yNorm: 0.35 },
        { id: 'sid-2', yNorm: 0.65 },
      ],
    },
  };
  let patchMeta: Record<string, unknown> | null = null;

  const drawerGroup = {
    userData: {
      partId: 'div_int_sketch_2_sid-1',
      moduleIndex: '2',
    },
    parent: null,
  };

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_ext_drawers:3',
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
    __hoverOk: false,
    __hoverKind: '',
    __hoverOp: '',
    __hoverRec: null,
  });

  const drawers = (((cfg.sketchExtras as { drawers?: Array<{ id: string }> }) || {}).drawers ?? []).map(
    entry => entry.id
  );
  assert.equal(applied, true);
  assert.deepEqual(patchMeta, { source: 'sketch.removeInternalDrawerByCrossHit', immediate: true });
  assert.deepEqual(drawers, ['sid-2']);
});

test('manual-layout internal drawer tool respects add hover over sketch external drawers instead of deleting the lower drawer', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      extDrawers: [{ id: 'sed-1', yNorm: 0.35 }],
      drawers: [],
    },
  };
  let patched = false;

  const drawerGroup = {
    userData: {
      partId: 'sketch_ext_drawers_2_sed-1_1',
      moduleIndex: '2',
      __wpSketchExtDrawer: true,
      __wpSketchExtDrawerId: 'sed-1',
    },
    parent: null,
  };

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_int_drawers',
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    mapKey: 2,
    __gridMap: { '2': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 1.06,
    pad: 0,
    intersects: [{ object: drawerGroup, point: { y: 1.06 } }] as any,
    __patchConfigForKey: (_mk, patchFn) => {
      patched = true;
      patchFn(cfg);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: true,
    __hoverKind: 'drawers',
    __hoverOp: 'add',
    __hoverRec: {
      kind: 'drawers',
      op: 'add',
      yCenter: 1.2,
    },
  });

  const extDrawers = (
    ((cfg.sketchExtras as { extDrawers?: Array<{ id: string }> }) || {}).extDrawers ?? []
  ).map(entry => entry.id);
  assert.equal(applied, false);
  assert.equal(patched, false);
  assert.deepEqual(extDrawers, ['sed-1']);
});

test('manual-layout external drawer tool respects add hover over sketch internal drawers instead of deleting the lower drawer', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      drawers: [{ id: 'sid-1', yNorm: 0.35 }],
      extDrawers: [],
    },
  };
  let patched = false;

  const drawerGroup = {
    userData: {
      partId: 'div_int_sketch_2_sid-1',
      moduleIndex: '2',
    },
    parent: null,
  };

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_ext_drawers:3',
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    mapKey: 2,
    __gridMap: { '2': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 1.06,
    pad: 0,
    intersects: [{ object: drawerGroup, point: { y: 1.06 } }] as any,
    __patchConfigForKey: (_mk, patchFn) => {
      patched = true;
      patchFn(cfg);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: true,
    __hoverKind: 'ext_drawers',
    __hoverOp: 'add',
    __hoverRec: {
      kind: 'ext_drawers',
      op: 'add',
      yCenter: 1.2,
    },
  });

  const drawers = (((cfg.sketchExtras as { drawers?: Array<{ id: string }> }) || {}).drawers ?? []).map(
    entry => entry.id
  );
  assert.equal(applied, false);
  assert.equal(patched, false);
  assert.deepEqual(drawers, ['sid-1']);
});

test('manual-layout shelf direct hit respects add hover instead of deleting an adjacent shelf', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      shelves: [{ id: 'existing', yNorm: 0.25 }],
    },
  };
  let patched = false;

  const applied = tryApplyManualLayoutSketchDirectHitActions({
    App: {} as never,
    __mt: 'sketch_shelf:glass',
    __activeModuleKey: 2,
    topY: 2.4,
    bottomY: 0,
    mapKey: 2,
    __gridMap: { '2': { gridDivisions: 6 } },
    totalHeight: 2.4,
    hitY0: 0.6,
    pad: 0,
    intersects: [{ object: { userData: { partId: 'all_shelves' } }, point: { y: 0.6 } }] as any,
    __patchConfigForKey: (_mk, patchFn) => {
      patched = true;
      patchFn(cfg);
      return null;
    },
    __wp_isViewportRoot: () => false,
    __hoverOk: true,
    __hoverKind: 'shelf',
    __hoverOp: 'add',
    __hoverRec: { kind: 'shelf', op: 'add', yNorm: 0.5, variant: 'glass' },
  });

  const shelves = (((cfg.sketchExtras as { shelves?: Array<{ id: string }> }) || {}).shelves ?? []).map(
    entry => entry.id
  );
  assert.equal(applied, false);
  assert.equal(patched, false);
  assert.deepEqual(shelves, ['existing']);
});
