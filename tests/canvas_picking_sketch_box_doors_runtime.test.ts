import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readSketchBoxDoors,
  removeSketchBoxDoorForSegment,
  resolveSketchBoxDoorPlacements,
  toggleSketchBoxDoorHingeForSegment,
  upsertSketchBoxDoorForSegment,
  upsertSketchBoxDoubleDoorPairForSegment,
} from '../esm/native/services/canvas_picking_sketch_box_doors.ts';
import { resolveSketchBoxSegments } from '../esm/native/services/canvas_picking_sketch_box_segments.ts';

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
