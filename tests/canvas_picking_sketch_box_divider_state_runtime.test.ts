import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addSketchBoxDividerState,
  applySketchBoxDividerState,
  findNearestSketchBoxDivider,
  readSketchBoxDividerXNorm,
  readSketchBoxDividers,
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxDividerPlacements,
  removeSketchBoxDividerState,
  writeSketchBoxDividers,
} from '../esm/native/services/canvas_picking_sketch_box_divider_state.ts';

test('divider-state records normalize legacy and sorted divider lists through the canonical seam', () => {
  const box = {
    dividers: [
      { id: 'right', xNorm: 0.85 },
      { id: '', xNorm: 0.2 },
      { id: 'skip', xNorm: 'bad' },
    ],
    dividerXNorm: 0.4,
    centerDivider: true,
  } as Record<string, unknown>;

  const dividers = readSketchBoxDividers(box);
  assert.deepEqual(
    dividers.map(divider => ({ id: divider.id, xNorm: divider.xNorm })),
    [
      { id: 'sbd_1', xNorm: 0.2 },
      { id: 'right', xNorm: 0.85 },
    ]
  );
  assert.equal(readSketchBoxDividerXNorm(box), 0.2);

  writeSketchBoxDividers(box, [{ id: 'mid', xNorm: 0.5, centered: true }]);
  assert.equal(box.centerDivider, false);
  assert.equal(box.dividerXNorm, undefined);
  assert.deepEqual(box.dividers, [{ id: 'mid', xNorm: 0.5 }]);
});

test('divider-state placement snaps to center and resolves nearest dividers by rendered centerX', () => {
  const centered = resolveSketchBoxDividerPlacement({
    boxCenterX: 0,
    innerW: 1.2,
    woodThick: 0.018,
    cursorX: 0.01,
    enableCenterSnap: true,
  });
  assert.equal(centered.centered, true);
  assert.ok(Math.abs(centered.centerX) <= 1e-9);

  const placements = resolveSketchBoxDividerPlacements({
    dividers: [
      { id: 'right', xNorm: 0.75, centered: false },
      { id: 'left', xNorm: 0.25, centered: false },
    ],
    boxCenterX: 0,
    innerW: 1.2,
    woodThick: 0.018,
  });
  assert.deepEqual(
    placements.map(it => it.dividerId),
    ['left', 'right']
  );

  const nearest = findNearestSketchBoxDivider({
    dividers: [
      { id: 'left', xNorm: 0.22, centered: false },
      { id: 'right', xNorm: 0.78, centered: false },
    ],
    boxCenterX: 0,
    innerW: 1.2,
    woodThick: 0.018,
    cursorX: -0.33,
  });
  assert.equal(nearest?.dividerId, 'left');
});

test('divider-state mutations add, remove, and apply canonical divider payloads without leaving legacy fields behind', () => {
  const box = { dividerXNorm: 0.5, centerDivider: true } as Record<string, unknown>;

  applySketchBoxDividerState(box, 0.4);
  assert.deepEqual(box.dividers, [{ id: 'legacy_divider', xNorm: 0.4 }]);
  assert.equal(box.centerDivider, false);
  assert.equal(box.dividerXNorm, undefined);

  addSketchBoxDividerState(box, 0.7, 'extra');
  assert.deepEqual(
    readSketchBoxDividers(box).map(it => it.id),
    ['legacy_divider', 'extra']
  );

  removeSketchBoxDividerState(box, '', 0.69);
  assert.deepEqual(
    readSketchBoxDividers(box).map(it => it.id),
    ['legacy_divider']
  );

  removeSketchBoxDividerState(box, 'legacy_divider');
  assert.deepEqual(readSketchBoxDividers(box), []);
  assert.equal(box.dividers, undefined);
});
