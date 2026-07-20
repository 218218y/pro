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
import {
  SKETCH_BOX_DIVIDER_GEOMETRY_POLICY,
  SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY,
  SKETCH_BOX_DIVIDER_SNAP_POLICY,
} from '../esm/shared/dimensions/sketch_box_divider_policy.js';

test('divider-state records normalize sorted divider lists through the canonical seam', () => {
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
  assert.equal(box.centerDivider, undefined);
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
  assert.deepEqual(box.dividers, [{ id: 'primary_divider', xNorm: 0.4 }]);
  assert.equal(box.centerDivider, undefined);
  assert.equal(box.dividerXNorm, undefined);

  addSketchBoxDividerState(box, 0.7, 'extra');
  assert.deepEqual(
    readSketchBoxDividers(box).map(it => it.id),
    ['primary_divider', 'extra']
  );

  removeSketchBoxDividerState(box, '', 0.69);
  assert.deepEqual(
    readSketchBoxDividers(box).map(it => it.id),
    ['primary_divider']
  );

  removeSketchBoxDividerState(box, 'primary_divider');
  assert.deepEqual(readSketchBoxDividers(box), []);
  assert.equal(box.dividers, undefined);
});

test('divider focused policies preserve fallback, center-snap and remove-hit boundaries', () => {
  const fallback = resolveSketchBoxDividerPlacement({
    boxCenterX: 1,
    innerW: Number.NaN,
    woodThick: 0,
  });
  assert.ok(Math.abs(fallback.xNorm - SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.defaultCenterNorm) <= 1e-12);
  assert.equal(fallback.centerX, 1);
  assert.equal(fallback.centered, true);

  const span = 1;
  const snapTolerance = Math.min(
    SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapMaxM,
    Math.max(
      SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapMinM,
      span * SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapWidthRatio
    )
  );
  assert.equal(
    resolveSketchBoxDividerPlacement({
      boxCenterX: 0,
      innerW: span,
      woodThick: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM,
      cursorX: snapTolerance,
      enableCenterSnap: true,
    }).centered,
    true
  );
  assert.equal(
    resolveSketchBoxDividerPlacement({
      boxCenterX: 0,
      innerW: span,
      woodThick: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM,
      cursorX: snapTolerance + 1e-6,
      enableCenterSnap: true,
    }).centered,
    false
  );

  const removeTolerance = Math.max(
    SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitMinM,
    Math.min(
      SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitMaxM,
      span * SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitWidthRatio
    )
  );
  const divider = [{ id: 'center', xNorm: 0.5, centered: true }];
  assert.equal(
    findNearestSketchBoxDivider({
      dividers: divider,
      boxCenterX: 0,
      innerW: span,
      woodThick: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM,
      cursorX: removeTolerance,
    })?.dividerId,
    'center'
  );
  assert.equal(
    findNearestSketchBoxDivider({
      dividers: divider,
      boxCenterX: 0,
      innerW: span,
      woodThick: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM,
      cursorX: removeTolerance + 1e-6,
    }),
    null
  );
});
