import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseSketchBoxPartId,
  resolveSketchBoxToggleTarget,
} from '../esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts';
import { resolveSketchBoxPatchTargets } from '../esm/native/services/canvas_picking_toggle_flow_sketch_box_target_runtime.ts';
import { parseSketchBoxDoorTarget } from '../esm/native/services/canvas_picking_door_sketch_box_edit.ts';

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

test('sketch-box target identity stays canonical across toggle and door-edit parsers', () => {
  const cases = [
    {
      pid: 'sketch_box_free_7_sbf_alpha_door_sbdr_1_accent_top',
      expected: { moduleKey: '7', boxId: 'sbf_alpha', doorId: 'sbdr_1' },
    },
    {
      pid: 'sketch_box_3_sb_2_door_left_top_groove_left',
      expected: { moduleKey: '3', boxId: 'sb_2', doorId: 'left' },
    },
    {
      pid: 'sketch_box_free_sbf_alpha_door_sbdr_1_bot',
      expected: { moduleKey: null, boxId: 'sbf_alpha', doorId: 'sbdr_1' },
    },
  ];

  for (const entry of cases) {
    assert.deepEqual(parseSketchBoxPartId(entry.pid), entry.expected);
    assert.deepEqual(parseSketchBoxDoorTarget(entry.pid), entry.expected);
  }

  assert.deepEqual(parseSketchBoxPartId('sketch_box_free_7_sbf_alpha'), {
    moduleKey: '7',
    boxId: 'sbf_alpha',
    doorId: null,
  });
  assert.equal(parseSketchBoxDoorTarget('sketch_box_free_7_sbf_alpha'), null);
});

test('sketch-box toggle patch targets reuse the canonical door snapshot and preserve structural indices', () => {
  const state = {
    modulesConfiguration: [null, { id: 'top-a', sketchExtras: { boxes: [{ id: 'sbf_shared' }] } }],
    stackSplitLowerModulesConfiguration: [
      { id: 'bottom-a', sketchExtras: { boxes: [{ id: 'sbf_shared' }] } },
    ],
  };
  const App = { store: { getState: () => state } } as any;

  assert.deepEqual(
    resolveSketchBoxPatchTargets(App, { moduleKey: null, boxId: 'sbf_shared', doorId: null }, 'bottom'),
    [
      { stack: 'bottom', moduleKey: '0' },
      { stack: 'top', moduleKey: '1' },
    ]
  );
});

test('sketch-box toggle patch target with module identity avoids root-state reads', () => {
  const App = {
    store: {
      getState: () => {
        throw new Error('root state must not be read for direct module targets');
      },
    },
  } as any;

  assert.deepEqual(
    resolveSketchBoxPatchTargets(App, { moduleKey: 'module-a', boxId: 'sbf_a', doorId: null }, 'top'),
    [
      { stack: 'top', moduleKey: 'module-a' },
      { stack: 'bottom', moduleKey: 'module-a' },
    ]
  );
});
