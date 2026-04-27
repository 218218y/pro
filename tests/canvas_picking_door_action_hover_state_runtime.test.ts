import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveDoorLeafOwner,
  shouldApplyGenericDoorActionHoverMarkerFinish,
} from '../esm/native/services/canvas_picking_door_action_hover_state.ts';

test('door action hover generic marker finish only applies to the non-special groove/remove route', () => {
  assert.equal(
    shouldApplyGenericDoorActionHoverMarkerFinish({
      normalizedPaintSelection: null,
      isPaintHoverMode: false,
      isTrimHoverMode: false,
      isHandleHoverMode: false,
      isHingeHoverMode: false,
      isFacePreviewMode: false,
    }),
    true
  );

  assert.equal(
    shouldApplyGenericDoorActionHoverMarkerFinish({
      normalizedPaintSelection: 'oak',
      isPaintHoverMode: true,
      isTrimHoverMode: false,
      isHandleHoverMode: false,
      isHingeHoverMode: false,
      isFacePreviewMode: false,
    }),
    false
  );

  assert.equal(
    shouldApplyGenericDoorActionHoverMarkerFinish({
      normalizedPaintSelection: null,
      isPaintHoverMode: false,
      isTrimHoverMode: true,
      isHandleHoverMode: false,
      isHingeHoverMode: false,
      isFacePreviewMode: false,
    }),
    false
  );

  assert.equal(
    shouldApplyGenericDoorActionHoverMarkerFinish({
      normalizedPaintSelection: null,
      isPaintHoverMode: false,
      isTrimHoverMode: false,
      isHandleHoverMode: true,
      isHingeHoverMode: false,
      isFacePreviewMode: true,
    }),
    false
  );
});

test('door action hover resolves the targeted door leaf owner instead of the first metrics-bearing ancestor', () => {
  const owner = {
    userData: {
      partId: 'd1_full',
      __doorWidth: 1,
      __doorHeight: 2,
    },
    parent: null,
  };
  const nestedMetricsChild = {
    userData: {
      partId: 'd1_full_patch',
      __doorWidth: 0.12,
      __doorHeight: 2,
    },
    parent: owner,
  };

  const resolved = resolveDoorLeafOwner(nestedMetricsChild, 'd1_full');

  assert.equal(resolved.groupRec, owner);
  assert.equal(resolved.userData, owner.userData);
});
