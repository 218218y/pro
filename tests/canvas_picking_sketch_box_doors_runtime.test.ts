import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readSketchBoxDoors,
  removeSketchBoxDoorForSegment,
  resolveSketchBoxDoorPlacements,
  toggleSketchBoxDoorHingeForSegment,
  upsertSketchBoxDoorForSegment,
  writeSketchBoxDoors,
  upsertSketchBoxDoubleDoorPairForSegment,
} from '../esm/native/services/canvas_picking_sketch_box_doors.ts';
import {
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from '../esm/native/services/canvas_picking_sketch_box_segments.ts';

const segments = resolveSketchBoxSegments({
  dividers: [{ id: 'mid', xNorm: 0.5, centered: true }],
  boxCenterX: 0,
  innerW: 1,
  woodThick: 0.018,
});

test('sketch-box doors upsert single-door records through the canonical id factory and segment placement seam', () => {
  const box: Record<string, unknown> = {};
  const door = upsertSketchBoxDoorForSegment({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
    cursorX: -0.2,
  });

  assert.ok(door);
  assert.match(String(door.id), /^sbdr_d_/);
  assert.equal(door.hinge, 'left');

  const placements = resolveSketchBoxDoorPlacements({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
  });
  assert.equal(placements.length, 1);
  assert.equal(placements[0].segment?.index, 0);
});

test('sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair', () => {
  const box: Record<string, unknown> = {};
  const single = upsertSketchBoxDoorForSegment({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
    cursorX: -0.2,
    hinge: 'left',
  });

  const toggled = toggleSketchBoxDoorHingeForSegment({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
    doorId: single?.id,
  });
  assert.equal(toggled?.hinge, 'right');

  const pair = upsertSketchBoxDoubleDoorPairForSegment({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
    cursorX: 0.25,
  });
  assert.equal(pair.length, 2);

  const blockedToggle = toggleSketchBoxDoorHingeForSegment({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
    cursorX: 0.25,
  });
  assert.equal(blockedToggle, null);
});

test('sketch-box doors remove a focused segment door without disturbing the other segment', () => {
  const box: Record<string, unknown> = {};
  upsertSketchBoxDoorForSegment({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
    cursorX: -0.2,
    hinge: 'left',
  });
  upsertSketchBoxDoorForSegment({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
    cursorX: 0.2,
    hinge: 'right',
  });

  const removed = removeSketchBoxDoorForSegment({
    box,
    segments,
    boxCenterX: 0,
    innerW: 1,
    cursorX: -0.2,
  });

  assert.equal(removed, true);
  const remaining = readSketchBoxDoors(box);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].hinge, 'right');
});

test('sketch-box doors treat rows inside the same divided column as independent cells', () => {
  const box: Record<string, unknown> = {};
  const dividers = [{ id: 'mid', xNorm: 0.5, centered: true }];
  const horizontalDividers = [{ id: 'right-row', yNorm: 0.5, xNorm: 0.75, centered: true }];
  const topSegments = resolveSketchBoxSegments({
    dividers,
    horizontalDividers,
    boxCenterX: 0,
    innerW: 1,
    boxCenterY: 0,
    innerH: 1,
    woodThick: 0.018,
    xNorm: 0.75,
    yNorm: 0.75,
  });
  const bottomSegments = resolveSketchBoxSegments({
    dividers,
    horizontalDividers,
    boxCenterX: 0,
    innerW: 1,
    boxCenterY: 0,
    innerH: 1,
    woodThick: 0.018,
    xNorm: 0.75,
    yNorm: 0.25,
  });
  const verticalSegments = resolveSketchBoxVerticalSegments({
    dividers: horizontalDividers,
    verticalDividers: dividers,
    boxCenterX: 0,
    innerW: 1,
    boxCenterY: 0,
    innerH: 1,
    woodThick: 0.018,
    xNorm: 0.75,
  });

  upsertSketchBoxDoorForSegment({
    box,
    segments: topSegments,
    verticalSegments,
    boxCenterX: 0,
    innerW: 1,
    boxCenterY: 0,
    innerH: 1,
    xNorm: 0.75,
    yNorm: 0.75,
    hinge: 'left',
  });
  upsertSketchBoxDoorForSegment({
    box,
    segments: bottomSegments,
    verticalSegments,
    boxCenterX: 0,
    innerW: 1,
    boxCenterY: 0,
    innerH: 1,
    xNorm: 0.75,
    yNorm: 0.25,
    hinge: 'right',
  });

  const doors = readSketchBoxDoors(box);
  assert.equal(doors.length, 2);
  assert.equal(new Set(doors.map(door => door.yNorm)).size, 2);

  const removedTop = removeSketchBoxDoorForSegment({
    box,
    segments: topSegments,
    verticalSegments,
    boxCenterX: 0,
    innerW: 1,
    boxCenterY: 0,
    innerH: 1,
    xNorm: 0.75,
    yNorm: 0.75,
  });

  assert.equal(removedTop, true);
  const remaining = readSketchBoxDoors(box);
  assert.equal(remaining.length, 1);
  assert.ok(Number(remaining[0].yNorm) < 0.5);
});

test('sketch-box doors preserve stored groove line counts when rewriting door records', () => {
  const box: Record<string, unknown> = {};

  writeSketchBoxDoors(box, [
    {
      id: 'sbdr_saved_count',
      xNorm: 0.5,
      hinge: 'left',
      enabled: true,
      open: false,
      groove: true,
      grooveLinesCount: 7.9,
    },
  ]);

  assert.deepEqual(box.doors, [
    {
      id: 'sbdr_saved_count',
      xNorm: 0.5,
      hinge: 'left',
      enabled: true,
      open: false,
      groove: true,
      grooveLinesCount: 7,
    },
  ]);
  assert.equal(readSketchBoxDoors(box)[0].grooveLinesCount, 7);
});
