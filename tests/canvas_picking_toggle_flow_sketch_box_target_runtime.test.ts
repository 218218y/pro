import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchBoxToggleTarget } from '../esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts';

type HitNode = {
  userData?: Record<string, unknown>;
  parent?: HitNode | null;
};

function node(userData: Record<string, unknown>, parent: HitNode | null = null): HitNode {
  return { userData, parent };
}

test('sketch-box toggle target accepts only the actual box door surface', () => {
  const doorHit = node({
    partId: 'sketch_box_free_7_sbf_alpha_door_sbdr_1',
    __wpSketchBoxId: 'sbf_alpha',
    __wpSketchBoxDoorId: 'sbdr_1',
    __wpSketchModuleKey: '7',
    __wpSketchBoxDoor: true,
  });

  assert.deepEqual(resolveSketchBoxToggleTarget(doorHit as never, null, null), {
    moduleKey: '7',
    boxId: 'sbf_alpha',
    doorId: 'sbdr_1',
  });
});

test('sketch-box toggle target ignores external drawers that inherit box metadata', () => {
  const drawerGroup = node({
    partId: 'sketch_box_free_7_sbf_alpha_ext_drawers_sed_1_1',
    __wpSketchBoxId: 'sbf_alpha',
    __wpSketchModuleKey: '7',
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: 'sed_1',
    __wpType: 'extDrawer',
  });
  const drawerFront = node(
    {
      partId: 'sketch_box_free_7_sbf_alpha_ext_drawers_sed_1_1',
      __wpSketchBoxId: 'sbf_alpha',
      __wpSketchModuleKey: '7',
      __wpSketchExtDrawer: true,
      __wpSketchExtDrawerId: 'sed_1',
    },
    drawerGroup
  );

  assert.equal(resolveSketchBoxToggleTarget(drawerFront as never, null, null), null);
  assert.equal(
    resolveSketchBoxToggleTarget(drawerFront as never, 'sketch_box_free_7_sbf_alpha_door_sbdr_1', null),
    null
  );
});

test('sketch-box toggle target ignores box frame and content surfaces with only box ownership metadata', () => {
  const boxFrame = node({
    partId: 'sketch_box_free_7_sbf_alpha',
    __wpSketchBoxId: 'sbf_alpha',
    __wpSketchModuleKey: '7',
  });
  const shelf = node(
    {
      partId: 'sketch_box_free_7_sbf_alpha_shelf_s1',
      __wpSketchBoxId: 'sbf_alpha',
      __wpSketchModuleKey: '7',
    },
    boxFrame
  );

  assert.equal(resolveSketchBoxToggleTarget(shelf as never, null, null), null);
});

test('sketch-box toggle target still resolves door identity from a door part id fallback', () => {
  assert.deepEqual(
    resolveSketchBoxToggleTarget(null, 'sketch_box_free_7_sbf_alpha_door_sbdr_1_accent_top', null),
    {
      moduleKey: '7',
      boxId: 'sbf_alpha',
      doorId: 'sbdr_1',
    }
  );
});
