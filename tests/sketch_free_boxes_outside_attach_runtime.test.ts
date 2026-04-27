import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFreeBoxOutsideWardrobePlacement } from '../esm/native/services/canvas_picking_sketch_free_box_placement.ts';

test('free-box outside placement snaps along X when the box overlaps the wardrobe from the side', () => {
  const snapped = resolveSketchFreeBoxOutsideWardrobePlacement({
    centerX: -1.05,
    centerY: 0,
    boxW: 0.4,
    boxH: 0.4,
    wardrobeCenterX: 0,
    wardrobeCenterY: 0,
    wardrobeWidth: 2,
    wardrobeHeight: 2,
    roomFloorY: -1,
  });

  assert.deepEqual(snapped, { centerX: -1.2, centerY: 0, axis: 'x' });
});

test('free-box outside placement snaps along Y when the box overlaps the wardrobe from above', () => {
  const snapped = resolveSketchFreeBoxOutsideWardrobePlacement({
    centerX: 0,
    centerY: 1.05,
    boxW: 0.4,
    boxH: 0.4,
    wardrobeCenterX: 0,
    wardrobeCenterY: 0,
    wardrobeWidth: 2,
    wardrobeHeight: 2,
    roomFloorY: -1,
  });

  assert.deepEqual(snapped, { centerX: 0, centerY: 1.2, axis: 'y' });
});
