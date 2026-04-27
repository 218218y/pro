import test from 'node:test';
import assert from 'node:assert/strict';

import { commitSketchModuleBoxContent } from '../esm/native/services/canvas_picking_sketch_box_content_commit.ts';

function createBox(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sb1',
    absX: 1,
    absY: 1,
    widthM: 1,
    heightM: 1,
    depthM: 0.6,
    ...overrides,
  } as any;
}

test('sketch-box content commit refreshes manual drawer toggle hover through the shared manual-toggle seam', () => {
  const box = createBox();
  const nextHover = commitSketchModuleBoxContent({
    box,
    boxId: 'sb1',
    contentKind: 'drawers',
    hoverMode: 'manual-toggle',
    hoverHost: { tool: 'sketch_drawers', moduleKey: 2, isBottom: false } as any,
    hoverRec: {
      kind: 'box_content',
      contentKind: 'drawers',
      boxId: 'sb1',
      op: 'add',
      boxYNorm: 0.3,
      boxBaseYNorm: 0.2,
      contentXNorm: 0.4,
      yCenter: 0.5,
      baseY: 0.25,
      stackH: 0.4,
      drawerH: 0.1,
      drawerGap: 0.02,
    },
  });

  assert.equal(Array.isArray(box.drawers), true);
  assert.equal(box.drawers.length, 1);
  assert.equal(box.drawers[0].yNormC, 0.3);
  assert.equal(box.drawers[0].yNorm, 0.2);
  assert.equal(box.drawers[0].xNorm, 0.4);
  assert.equal(nextHover?.kind, 'box_content');
  assert.equal(nextHover?.contentKind, 'drawers');
  assert.equal(nextHover?.op, 'remove');
  assert.equal(nextHover?.boxId, 'sb1');
  assert.equal(typeof nextHover?.removeId, 'string');
});

test('sketch-box content commit keeps free ext-drawer toggle semantics and clamps drawer count', () => {
  const box = createBox({
    extDrawers: [{ id: 'ed1', yNormC: 0.5, yNorm: 0.4, count: 2 }],
  });
  const nextHover = commitSketchModuleBoxContent({
    box,
    boxId: 'sb1',
    contentKind: 'ext_drawers',
    hoverMode: 'free-toggle',
    hoverRec: {
      kind: 'box_content',
      contentKind: 'ext_drawers',
      boxId: 'sb1',
      op: 'remove',
      removeId: 'ed1',
      drawerCount: 8,
      freePlacement: true,
    },
  });

  assert.equal(box.extDrawers.length, 0);
  assert.equal(nextHover?.kind, 'box_content');
  assert.equal(nextHover?.contentKind, 'ext_drawers');
  assert.equal(nextHover?.op, 'add');
  assert.equal(nextHover?.freePlacement, true);
  assert.equal(nextHover?.drawerCount, 5);
});

test('sketch-box content commit routes base/door/storage mutations through focused owners without changing outward behavior', () => {
  const box = createBox({ absY: 0.58, heightM: 1, baseType: 'none' });

  commitSketchModuleBoxContent({
    box,
    contentKind: 'base',
    floorY: 0.08,
    hoverRec: {
      kind: 'box_content',
      contentKind: 'base',
      op: 'add',
      baseType: 'plinth',
    },
  });
  assert.equal(box.baseType, 'plinth');
  assert.ok(Math.abs(box.absY - 0.66) < 1e-9);

  commitSketchModuleBoxContent({
    box,
    contentKind: 'door',
    hoverRec: {
      kind: 'box_content',
      contentKind: 'door',
      op: 'add',
      contentXNorm: 0.61,
      hinge: 'right',
      doorId: 'door_1',
    },
  });
  assert.equal(Array.isArray(box.doors), true);
  assert.equal(box.doors.length, 1);
  assert.equal(box.doors[0].id, 'door_1');
  assert.equal(box.doors[0].hinge, 'right');
  assert.equal(typeof box.doors[0].xNorm, 'number');

  commitSketchModuleBoxContent({
    box,
    contentKind: 'storage',
    hoverRec: {
      kind: 'box_content',
      contentKind: 'storage',
      op: 'add',
      boxYNorm: 0.35,
      contentXNorm: 0.2,
      heightM: 0.42,
    },
  });
  assert.equal(Array.isArray(box.storageBarriers), true);
  assert.equal(box.storageBarriers.length, 1);
  assert.equal(box.storageBarriers[0].yNorm, 0.35);
  assert.equal(box.storageBarriers[0].xNorm, 0.2);
  assert.equal(box.storageBarriers[0].heightM, 0.42);
});

test('sketch-box base commit stores leg style color and custom height', () => {
  const box = createBox({ absY: 0.58, heightM: 1, baseType: 'none' });

  commitSketchModuleBoxContent({
    box,
    contentKind: 'base',
    floorY: 0.08,
    hoverRec: {
      kind: 'box_content',
      contentKind: 'base',
      op: 'add',
      baseType: 'legs',
      baseLegStyle: 'round',
      baseLegColor: 'gold',
      baseLegHeightCm: 18,
      baseLegWidthCm: 6,
    },
  });

  assert.equal(box.baseType, 'legs');
  assert.equal(box.baseLegStyle, 'round');
  assert.equal(box.baseLegColor, 'gold');
  assert.equal(box.baseLegHeightCm, 18);
  assert.equal(box.baseLegWidthCm, 6);
  assert.ok(Math.abs(box.absY - 0.76) < 1e-9);
});
