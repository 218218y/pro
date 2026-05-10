import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveShelfBoardPick } from '../esm/native/services/canvas_picking_shelf_hit_targets.ts';

test('shelf board picking prefers the existing shelf board over the selector fallback', () => {
  const pick = resolveShelfBoardPick({
    intersects: [
      { object: { userData: { isModuleSelector: true, moduleIndex: 0 } }, point: { y: 1.0 } },
      { object: { userData: { partId: 'all_shelves' } }, point: { y: 0.84 } },
    ],
    fallbackHitY: 1.0,
    bottomY: 0,
    topY: 2.4,
    divisions: 6,
    boardToleranceM: 0.05,
    fallbackToleranceM: 0.03,
  });

  assert.equal(pick?.source, 'board');
  assert.equal(pick?.shelfIndex, 2);
  assert.equal(pick?.hitY, 0.84);
  assert.ok(pick && Math.abs(pick.shelfY - 0.8) < 1e-9);
});

test('shelf board picking ignores shelf pins and brace seams before falling back', () => {
  const pick = resolveShelfBoardPick({
    intersects: [
      { object: { userData: { partId: 'all_shelves', __kind: 'shelf_pin' } }, point: { y: 0.8 } },
      { object: { userData: { partId: 'all_shelves', __kind: 'brace_seam' } }, point: { y: 0.8 } },
    ],
    fallbackHitY: 1.2,
    bottomY: 0,
    topY: 2.4,
    divisions: 6,
    boardToleranceM: 0.05,
    fallbackToleranceM: 0.03,
  });

  assert.equal(pick?.source, 'fallback');
  assert.equal(pick?.shelfIndex, 3);
  assert.equal(pick?.hitY, 1.2);
  assert.ok(pick && Math.abs(pick.shelfY - 1.2) < 1e-9);
});
