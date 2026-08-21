import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasSketchBoxDoorOpenTarget,
  mutateSketchBoxDoorOpenState,
} from '../esm/native/services/canvas_picking_sketch_box_door_open_mutation.js';
import {
  toggleSketchBoxDoorWithCapabilities,
  type SketchBoxDoorToggleCapabilities,
} from '../esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.js';

test('canonical sketch-box door-open mutation toggles every enabled door and preserves disabled entries', () => {
  const disabledDoor = { id: 'disabled', enabled: false, open: false, marker: 'keep' };
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        {
          id: 'boxA',
          door: { legacy: true },
          doors: [
            { id: 'left', enabled: true, open: false, marker: 1 },
            { enabled: true, open: false, marker: 2 },
            disabledDoor,
          ],
        },
      ],
    },
  };

  assert.equal(hasSketchBoxDoorOpenTarget(cfg, { boxId: 'boxA' }), true);
  const opened = mutateSketchBoxDoorOpenState(cfg, { boxId: 'boxA' });
  assert.deepEqual(opened, {
    matchedBox: true,
    changed: true,
    nextOpen: true,
    doorIds: ['left', 'sketch_box_door_1'],
  });

  const box = (cfg.sketchExtras as any).boxes[0];
  assert.deepEqual(box.doors[0], { id: 'left', enabled: true, open: true, marker: 1 });
  assert.deepEqual(box.doors[1], {
    id: 'sketch_box_door_1',
    enabled: true,
    open: true,
    marker: 2,
  });
  assert.equal(box.doors[2], disabledDoor);
  assert.equal(Object.hasOwn(box, 'door'), false);

  const closed = mutateSketchBoxDoorOpenState(cfg, { boxId: 'boxA' });
  assert.equal(closed.nextOpen, false);
  assert.equal(box.doors[0].open, false);
  assert.equal(box.doors[1].open, false);
});

test('canonical sketch-box door-open mutation respects free-placement scope and explicit next state', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      boxes: [
        { id: 'nested', freePlacement: false, doors: [{ id: 'n1', enabled: true, open: false }] },
        { id: 'free', freePlacement: true, doors: [{ id: 'f1', enabled: true, open: true }] },
      ],
    },
  };

  assert.equal(hasSketchBoxDoorOpenTarget(cfg, { boxId: 'nested', requireFreePlacement: true }), false);
  assert.deepEqual(
    mutateSketchBoxDoorOpenState(cfg, {
      boxId: 'nested',
      nextOpen: true,
      requireFreePlacement: true,
    }),
    { matchedBox: false, changed: false, nextOpen: null, doorIds: [] }
  );

  const result = mutateSketchBoxDoorOpenState(cfg, {
    boxId: 'free',
    nextOpen: false,
    requireFreePlacement: true,
  });
  assert.deepEqual(result, {
    matchedBox: true,
    changed: true,
    nextOpen: false,
    doorIds: ['f1'],
  });
  assert.equal((cfg.sketchExtras as any).boxes[1].doors[0].open, false);
});

test('sketch-box toggle capability flow publishes no motion effects when structural commit rejects', () => {
  const events: string[] = [];
  const capabilities: SketchBoxDoorToggleCapabilities = {
    commitToggle() {
      events.push('commit');
      return {
        committed: false,
        changed: false,
        nextOpen: null,
        doorIds: [],
        runtimeModuleKey: null,
      };
    },
    seedDoorMotion() {
      events.push('seed');
    },
    applyRuntimeStateForBox() {
      events.push('apply');
      return 0;
    },
    setPendingState() {
      events.push('pending');
    },
    markLocalMotion() {
      events.push('mark');
    },
  };

  assert.equal(
    toggleSketchBoxDoorWithCapabilities(capabilities, {
      moduleKey: '2',
      boxId: 'boxA',
      doorId: null,
    }),
    false
  );
  assert.deepEqual(events, ['commit']);
});

test('sketch-box toggle capability flow seeds and applies runtime state only after an accepted commit', () => {
  const events: string[] = [];
  const capabilities: SketchBoxDoorToggleCapabilities = {
    commitToggle() {
      events.push('commit');
      return {
        committed: true,
        changed: true,
        nextOpen: true,
        doorIds: ['left', 'right'],
        runtimeModuleKey: '4',
      };
    },
    seedDoorMotion(target, nextOpen) {
      events.push(`seed:${target.moduleKey}:${target.doorId}:${nextOpen}`);
    },
    applyRuntimeStateForBox(target, nextOpen) {
      events.push(`apply:${target.moduleKey}:${target.boxId}:${nextOpen}`);
      return 1;
    },
    setPendingState(target, nextOpen) {
      events.push(`pending:${target.moduleKey}:${target.boxId}:${nextOpen}`);
    },
    markLocalMotion() {
      events.push('mark');
    },
  };

  assert.equal(
    toggleSketchBoxDoorWithCapabilities(
      capabilities,
      { moduleKey: null, boxId: 'boxA', doorId: null },
      'bottom'
    ),
    true
  );
  assert.deepEqual(events, [
    'commit',
    'seed:4:left:true',
    'seed:4:right:true',
    'apply:4:boxA:true',
    'pending:4:boxA:true',
    'mark',
  ]);
});
