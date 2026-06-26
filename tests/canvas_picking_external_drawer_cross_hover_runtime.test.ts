import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleSketchHoverOverStandardDrawer } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_standard_drawer.ts';

function makeExternalDrawerGroup(partId: string, y: number, parent: Record<string, unknown>) {
  return {
    id: partId,
    parent,
    userData: {
      partId,
      moduleIndex: 1,
    },
    geometry: { parameters: { width: 0.82, height: 0.18, depth: 0.08 } },
    position: { x: 0.1, y, z: 0.25 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

test('sketch external drawer hover removal previews the entire standard external regular stack', () => {
  const parent = { id: 'wardrobe-parent' };
  const g1 = makeExternalDrawerGroup('d1_draw_1', 0.35, parent);
  const g2 = makeExternalDrawerGroup('d1_draw_2', 0.55, parent);
  const g3 = makeExternalDrawerGroup('d1_draw_3', 0.75, parent);
  const shoe = makeExternalDrawerGroup('d1_draw_shoe', 0.15, parent);
  const previews: any[] = [];
  const hoverRecords: any[] = [];
  const App = {
    render: {
      drawersArray: [
        { id: 'd1_draw_1', group: g1 },
        { id: 'd1_draw_2', group: g2 },
        { id: 'd1_draw_3', group: g3 },
        { id: 'd1_draw_shoe', group: shoe },
      ],
    },
  } as any;

  const handled = tryHandleSketchHoverOverStandardDrawer({
    App,
    tool: 'sketch_ext_drawers:3',
    ndcX: 0,
    ndcY: 0,
    __wpRaycaster: {},
    __wpMouse: {},
    __wp_toModuleKey: (value: unknown) => Number(value),
    __wp_writeSketchHover: (_App: unknown, hover: unknown) => hoverRecords.push(hover),
    __wp_resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'd1_draw_2', group: g2 },
      parent,
      box: { centerX: 0.1, centerY: 0.55, centerZ: 0.25, width: 0.82, height: 0.18, depth: 0.08 },
    }),
    setPreview: (preview: unknown) => previews.push(preview),
  } as any);

  assert.equal(handled, true);
  assert.equal(hoverRecords.length, 1);
  assert.equal(hoverRecords[0].kind, 'ext_drawers');
  assert.equal(hoverRecords[0].op, 'remove');
  assert.equal(hoverRecords[0].drawerCount, 3);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'ext_drawers');
  assert.equal(previews[0].op, 'remove');
  assert.deepEqual(
    previews[0].drawers.map((drawer: any) => drawer.y),
    [0.35, 0.55, 0.75]
  );
});

test('sketch internal drawer tool hovering a sketch external drawer shows removable external stack', () => {
  const parent = { id: 'wardrobe-parent' };
  const g1 = makeExternalDrawerGroup('sketch_ext_drawers_1_sed-1_1', 0.35, parent);
  const g2 = makeExternalDrawerGroup('sketch_ext_drawers_1_sed-1_2', 0.55, parent);
  g1.userData = {
    ...g1.userData,
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: 'sed-1',
    __wpSketchModuleKey: '1',
  };
  g2.userData = {
    ...g2.userData,
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: 'sed-1',
    __wpSketchModuleKey: '1',
  };
  const previews: any[] = [];
  const hoverRecords: any[] = [];
  const App = {
    render: {
      drawersArray: [
        { id: 'sketch_ext_drawers_1_sed-1_1', group: g1 },
        { id: 'sketch_ext_drawers_1_sed-1_2', group: g2 },
      ],
    },
  } as any;

  const handled = tryHandleSketchHoverOverStandardDrawer({
    App,
    tool: 'sketch_int_drawers',
    ndcX: 0,
    ndcY: 0,
    __wpRaycaster: {},
    __wpMouse: {},
    __wp_toModuleKey: (value: unknown) => String(value),
    __wp_writeSketchHover: (_App: unknown, hover: unknown) => hoverRecords.push(hover),
    __wp_resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'sketch_ext_drawers_1_sed-1_2', group: g2 },
      parent,
      box: { centerX: 0.1, centerY: 0.55, centerZ: 0.25, width: 0.82, height: 0.18, depth: 0.08 },
    }),
    setPreview: (preview: unknown) => previews.push(preview),
  } as any);

  assert.equal(handled, true);
  assert.equal(hoverRecords.length, 1);
  assert.equal(hoverRecords[0].kind, 'ext_drawers');
  assert.equal(hoverRecords[0].op, 'remove');
  assert.equal(hoverRecords[0].removeKind, 'sketch');
  assert.equal(hoverRecords[0].removeId, 'sed-1');
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'ext_drawers');
  assert.equal(previews[0].op, 'remove');
});

test('sketch external drawer tool hovering a sketch internal drawer shows removable internal stack', () => {
  const parent = { id: 'wardrobe-parent' };
  const bottom = makeExternalDrawerGroup('div_int_sketch_1_sid-1', 0.35, parent);
  const top = makeExternalDrawerGroup('div_int_sketch_1_sid-1', 0.55, parent);
  bottom.userData = { ...bottom.userData, moduleIndex: '1' };
  top.userData = { ...top.userData, moduleIndex: '1' };
  const previews: any[] = [];
  const hoverRecords: any[] = [];
  const App = {
    render: {
      drawersArray: [
        { id: 'div_int_sketch_1_sid-1', group: bottom },
        { id: 'div_int_sketch_1_sid-1', group: top },
      ],
    },
  } as any;

  const handled = tryHandleSketchHoverOverStandardDrawer({
    App,
    tool: 'sketch_ext_drawers:3',
    ndcX: 0,
    ndcY: 0,
    __wpRaycaster: {},
    __wpMouse: {},
    __wp_toModuleKey: (value: unknown) => String(value),
    __wp_writeSketchHover: (_App: unknown, hover: unknown) => hoverRecords.push(hover),
    __wp_resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'div_int_sketch_1_sid-1', group: top },
      parent,
      box: { centerX: 0.1, centerY: 0.55, centerZ: 0.25, width: 0.82, height: 0.18, depth: 0.08 },
    }),
    setPreview: (preview: unknown) => previews.push(preview),
  } as any);

  assert.equal(handled, true);
  assert.equal(hoverRecords.length, 1);
  assert.equal(hoverRecords[0].kind, 'drawers');
  assert.equal(hoverRecords[0].op, 'remove');
  assert.equal(hoverRecords[0].removeKind, 'sketch');
  assert.equal(hoverRecords[0].removeId, 'sid-1');
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'drawers');
  assert.equal(previews[0].op, 'remove');
});

test('sketch external drawer tool hovering an internal drawer box maps to the whole internal drawer stack', () => {
  const parent = { id: 'wardrobe-parent' };
  const lower = makeExternalDrawerGroup('drawer_box__div_int_sketch_1_sid-box_lower', 0.35, parent);
  const upper = makeExternalDrawerGroup('drawer_box__div_int_sketch_1_sid-box_upper', 0.55, parent);
  lower.userData = {
    ...lower.userData,
    partId: 'drawer_box__div_int_sketch_1_sid-box_lower',
    __wpDrawerOwnerPartId: 'div_int_sketch_1_sid-box_lower',
    moduleIndex: '1',
  };
  upper.userData = {
    ...upper.userData,
    partId: 'drawer_box__div_int_sketch_1_sid-box_upper',
    __wpDrawerOwnerPartId: 'div_int_sketch_1_sid-box_upper',
    moduleIndex: '1',
  };
  const previews: any[] = [];
  const hoverRecords: any[] = [];
  const App = {
    render: {
      drawersArray: [
        { id: 'div_int_sketch_1_sid-box_lower', group: lower },
        { id: 'div_int_sketch_1_sid-box_upper', group: upper },
      ],
    },
  } as any;

  const handled = tryHandleSketchHoverOverStandardDrawer({
    App,
    tool: 'sketch_ext_drawers:3',
    ndcX: 0,
    ndcY: 0,
    __wpRaycaster: {},
    __wpMouse: {},
    __wp_toModuleKey: (value: unknown) => String(value),
    __wp_writeSketchHover: (_App: unknown, hover: unknown) => hoverRecords.push(hover),
    __wp_resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'drawer_box__div_int_sketch_1_sid-box_upper', group: upper },
      parent,
      box: { centerX: 0.1, centerY: 0.55, centerZ: 0.25, width: 0.82, height: 0.18, depth: 0.08 },
    }),
    setPreview: (preview: unknown) => previews.push(preview),
  } as any);

  assert.equal(handled, true);
  assert.equal(hoverRecords.length, 1);
  assert.equal(hoverRecords[0].kind, 'drawers');
  assert.equal(hoverRecords[0].op, 'remove');
  assert.equal(hoverRecords[0].removeId, 'sid-box');
  assert.equal(previews.length, 1);
  assert.equal(previews[0].kind, 'drawers');
  assert.equal(previews[0].op, 'remove');
  assert.ok(Math.abs(Number(hoverRecords[0].stackH) - 0.38) < 1e-9);
});

test('sketch external drawer tool hovering an internal drawer cassette maps to the internal drawer id', () => {
  const parent = { id: 'wardrobe-parent' };
  const cassette = makeExternalDrawerGroup('div_int_sketch_1_sid-cassette_cassette', 0.45, parent);
  cassette.userData = {
    ...cassette.userData,
    partId: 'div_int_sketch_1_sid-cassette_cassette',
    __wpInternalDrawerCassette: true,
    __wpInternalDrawerCassetteStackPartId: 'div_int_sketch_1_sid-cassette',
  };
  const previews: any[] = [];
  const hoverRecords: any[] = [];
  const App = { render: { drawersArray: [] } } as any;

  const handled = tryHandleSketchHoverOverStandardDrawer({
    App,
    tool: 'sketch_ext_drawers:3',
    ndcX: 0,
    ndcY: 0,
    __wpRaycaster: {},
    __wpMouse: {},
    __wp_toModuleKey: (value: unknown) => String(value),
    __wp_writeSketchHover: (_App: unknown, hover: unknown) => hoverRecords.push(hover),
    __wp_resolveDrawerHoverPreviewTarget: () => ({
      drawer: { id: 'div_int_sketch_1_sid-cassette_cassette', group: cassette, moduleIndex: '1' },
      parent,
      box: { centerX: 0.1, centerY: 0.45, centerZ: 0.25, width: 0.9, height: 0.42, depth: 0.38 },
    }),
    setPreview: (preview: unknown) => previews.push(preview),
  } as any);

  assert.equal(handled, true);
  assert.equal(hoverRecords[0].kind, 'drawers');
  assert.equal(hoverRecords[0].op, 'remove');
  assert.equal(hoverRecords[0].removeId, 'sid-cassette');
  assert.equal(previews[0].kind, 'drawers');
  assert.equal(previews[0].op, 'remove');
});
