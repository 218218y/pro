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
