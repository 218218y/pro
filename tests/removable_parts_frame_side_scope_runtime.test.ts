import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalRemovablePartKey,
  isCanvasRemovablePartId,
  isDoorLikeRemovablePartId,
  isDrawerLikeRemovablePartId,
  readRemovedFrameSidePartIds,
  readRemovedFrameSideShelfState,
  readRemovableSketchBoxSideFromPartId,
  readSketchBoxRemovedSideShelfState,
  sketchBoxSideToPartId,
} from '../esm/native/features/removable_parts.ts';

test('canvas removable non-door scope includes stack-aware frame sides and sketch-box side walls', () => {
  assert.equal(isCanvasRemovablePartId('body_left'), true);
  assert.equal(isCanvasRemovablePartId('body_right'), true);
  assert.equal(isCanvasRemovablePartId('lower_body_left'), true);
  assert.equal(isCanvasRemovablePartId('lower_body_right'), true);
  assert.equal(isCanvasRemovablePartId('removed_body_left'), false);
  assert.equal(isCanvasRemovablePartId('sketch_box_free_sbf_1_side_left'), true);
  assert.equal(isCanvasRemovablePartId('sketch_box_0_sb_1_side_right'), true);

  for (const partId of [
    'body_ceil',
    'body_floor',
    'plinth_color',
    'corner_plinth',
    'chest_left',
    'chest_right',
    'all_shelves',
    'all_rods',
    'divider_inter_0',
    'body_left_selector',
    'body_right_hitbox',
    'body_left_dimension',
  ]) {
    assert.equal(isCanvasRemovablePartId(partId), false, `${partId} must not be removable`);
  }
});

test('door and drawer identity stays separate from canvas side removal', () => {
  assert.equal(isDoorLikeRemovablePartId('d0_left'), true);
  assert.equal(isDrawerLikeRemovablePartId('d0_draw_0'), true);
  assert.equal(isCanvasRemovablePartId('d0_left'), false);
  assert.equal(isCanvasRemovablePartId('d0_draw_0'), false);
});

test('removed-map keys are canonicalized only at the call sites that explicitly request it', () => {
  assert.equal(canonicalRemovablePartKey('removed_body_left'), 'body_left');
  assert.equal(canonicalRemovablePartKey('removed_lower_body_left'), 'lower_body_left');
  assert.equal(canonicalRemovablePartKey(' body_right '), 'body_right');
});

test('removed frame side shelf state aggregates top and lower frame side ids without aliasing them', () => {
  const cfg = {
    removedDoorsMap: {
      removed_body_left: true,
      removed_lower_body_left: true,
      removed_lower_body_right: true,
    },
    roundedFrameSideShelvesMap: {
      body_left: true,
      lower_body_right: true,
    },
  };

  assert.deepEqual(readRemovedFrameSidePartIds(cfg), ['body_left', 'lower_body_left', 'lower_body_right']);
  assert.deepEqual(readRemovedFrameSideShelfState(cfg), {
    leftRemoved: true,
    rightRemoved: true,
    leftRounded: false,
    rightRounded: true,
  });
});

test('sketch-box side part ids are parsed and aggregated for brace shelf rounding', () => {
  const boxPid = 'sketch_box_free_0_sbf_1';
  const leftPartId = sketchBoxSideToPartId(boxPid, 'left');
  const rightPartId = sketchBoxSideToPartId(boxPid, 'right');
  const cfg = {
    removedDoorsMap: {
      [`removed_${leftPartId}`]: true,
      [`removed_${rightPartId}`]: true,
    },
    roundedFrameSideShelvesMap: {
      [leftPartId]: true,
    },
  };

  assert.equal(leftPartId, 'sketch_box_free_0_sbf_1_side_left');
  assert.deepEqual(readRemovableSketchBoxSideFromPartId(leftPartId), {
    partId: leftPartId,
    boxPartId: boxPid,
    side: 'left',
  });
  assert.deepEqual(readSketchBoxRemovedSideShelfState(cfg, boxPid), {
    leftRemoved: true,
    rightRemoved: true,
    leftRounded: true,
    rightRounded: false,
  });
  assert.deepEqual(readRemovedFrameSideShelfState(cfg), {
    leftRemoved: true,
    rightRemoved: true,
    leftRounded: true,
    rightRounded: false,
  });
  assert.deepEqual(readRemovedFrameSidePartIds(cfg), [leftPartId, rightPartId]);
});
