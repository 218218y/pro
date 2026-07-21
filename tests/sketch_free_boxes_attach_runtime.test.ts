import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFreeBoxAttachPlacement } from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';
import { resolveSketchFreeBoxPlacementGap } from '../esm/native/services/canvas_picking_sketch_free_box_gap.ts';
import { resolveSketchFreeBoxAttachPlacementCandidates } from '../esm/native/services/canvas_picking_sketch_free_box_placement_attach_candidates.ts';
import {
  addSketchFreeAttachIntentBias,
  resolveSketchFreeAttachIntent,
} from '../esm/native/services/canvas_picking_sketch_free_box_placement_intent.ts';
import {
  SKETCH_BOX_FREE_ATTACH_INTENT_POLICY,
  SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY,
} from '../esm/shared/dimensions/sketch_box_free_placement_policy.ts';

test('free-box attach keeps side attachment stable near upper corner while preserving asymmetric offset', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.31,
    pointY: 0.45,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.8,
    previewW: 0.4,
    previewH: 0.4,
    gap: 0.005,
  });

  assert.ok(placement);
  assert.equal(placement.fixedAxis, 'x');
  assert.equal(placement.direction, 1);
  assert.ok(Math.abs(placement.centerX - 0.505) <= 1e-9);
  assert.ok(Math.abs(placement.centerY - 0.45) <= 1e-9);
  assert.equal(placement.snappedToCenter, false);
});

test('free-box attach still prefers top/bottom when the cursor is only outside vertically', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.25,
    pointY: 0.42,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.8,
    previewW: 0.4,
    previewH: 0.4,
    gap: 0.005,
  });

  assert.ok(placement);
  assert.equal(placement.fixedAxis, 'y');
  assert.equal(placement.direction, 1);
  assert.ok(Math.abs(placement.centerX - 0.25) <= 1e-9);
  assert.ok(Math.abs(placement.centerY - 0.605) <= 1e-9);
  assert.equal(placement.snappedToCenter, false);
});

test('free-box attach near the lower corners still prefers vertical stacking symmetrically on the left and right', () => {
  const left = resolveSketchFreeBoxAttachPlacement({
    pointX: -0.5,
    pointY: -0.18,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });
  const right = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.5,
    pointY: -0.18,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });

  assert.ok(left);
  assert.ok(right);
  assert.equal(left.fixedAxis, 'y');
  assert.equal(right.fixedAxis, 'y');
  assert.equal(left.direction, -1);
  assert.equal(right.direction, -1);
  assert.ok(Math.abs(left.centerX - -0.5) <= 1e-9);
  assert.ok(Math.abs(right.centerX - 0.5) <= 1e-9);
  assert.ok(Math.abs(left.centerY - -0.356) <= 1e-9);
  assert.ok(Math.abs(right.centerY - -0.356) <= 1e-9);
});

test('free-box attach below still allows a true staircase corner touch before detaching', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.6,
    pointY: -0.18,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });

  assert.ok(placement);
  assert.equal(placement.fixedAxis, 'y');
  assert.equal(placement.direction, -1);
  assert.ok(Math.abs(placement.centerX - 0.6) <= 1e-9);
  assert.ok(Math.abs(placement.centerY - -0.356) <= 1e-9);
  assert.equal(placement.snappedToCenter, false);
});

test('free-box attach still prefers side attachment when the cursor is clearly outside only on X', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.68,
    pointY: 0,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });

  assert.ok(placement);
  assert.equal(placement.fixedAxis, 'x');
  assert.equal(placement.direction, 1);
  assert.ok(Math.abs(placement.centerX - 0.606) <= 1e-9);
  assert.ok(Math.abs(placement.centerY - 0) <= 1e-9);
});

test('free-box attach rejects string-encoded geometry inputs', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: '0.68' as any,
    pointY: 0,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });

  assert.equal(placement, null);
});

test('focused free-placement gap policy preserves fallback, ratio, and clamp boundaries', () => {
  assert.equal(
    resolveSketchFreeBoxPlacementGap({ boxW: Number.NaN, boxH: Number.NaN }),
    SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapDefaultM
  );
  assert.equal(
    resolveSketchFreeBoxPlacementGap({ boxW: 0, boxH: -1 }),
    SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapDefaultM
  );
  assert.equal(
    resolveSketchFreeBoxPlacementGap({ boxW: 0.1, boxH: 0.1 }),
    SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapMinM
  );
  assert.ok(Math.abs(resolveSketchFreeBoxPlacementGap({ boxW: 0.5, boxH: 0.8 }) - 0.003) <= 1e-12);
  assert.equal(
    resolveSketchFreeBoxPlacementGap({ boxW: 1, boxH: 1 }),
    SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapMaxM
  );
  assert.equal(
    resolveSketchFreeBoxPlacementGap({ boxW: Number.POSITIVE_INFINITY, boxH: Number.POSITIVE_INFINITY }),
    SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapDefaultM
  );
});

test('focused attach-candidate policy preserves horizontal, vertical, dual, none, and invalid outcomes', () => {
  const common = {
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.2,
    previewH: 0.2,
    gap: 0.004,
  };

  const horizontal = resolveSketchFreeBoxAttachPlacementCandidates({ ...common, pointX: 0.3, pointY: 0 });
  assert.ok(horizontal.horizontal);
  assert.equal(horizontal.vertical, null);
  assert.equal(horizontal.horizontal.fixedAxis, 'x');
  assert.ok(Math.abs(horizontal.horizontal.centerX - 0.404) <= 1e-12);

  const vertical = resolveSketchFreeBoxAttachPlacementCandidates({ ...common, pointX: 0, pointY: 0.2 });
  assert.equal(vertical.horizontal, null);
  assert.ok(vertical.vertical);
  assert.equal(vertical.vertical.fixedAxis, 'y');
  assert.ok(Math.abs(vertical.vertical.centerY - 0.304) <= 1e-12);

  const dual = resolveSketchFreeBoxAttachPlacementCandidates({ ...common, pointX: 0.3, pointY: 0.2 });
  assert.ok(dual.horizontal);
  assert.ok(dual.vertical);

  assert.deepEqual(resolveSketchFreeBoxAttachPlacementCandidates({ ...common, pointX: 0, pointY: 0 }), {
    horizontal: null,
    vertical: null,
  });
  assert.deepEqual(
    resolveSketchFreeBoxAttachPlacementCandidates({ ...common, pointX: Number.NaN, pointY: 0 }),
    { horizontal: null, vertical: null }
  );
});

test('focused attach-intent policy preserves outside preference, ambiguity, and score bias', () => {
  const common = {
    targetHalfW: 0.3,
    targetHalfH: 0.2,
    previewW: 0.2,
    previewH: 0.2,
  };
  assert.equal(resolveSketchFreeAttachIntent({ ...common, dx: 0.4, dy: 0.1 }), 'x');
  assert.equal(resolveSketchFreeAttachIntent({ ...common, dx: 0.1, dy: 0.3 }), 'y');
  assert.equal(resolveSketchFreeAttachIntent({ ...common, dx: 0.4, dy: 0.3 }), null);
  assert.equal(resolveSketchFreeAttachIntent({ ...common, dx: Number.NaN, dy: 0 }), null);

  assert.equal(
    addSketchFreeAttachIntentBias({
      score: 1,
      fixedAxis: 'x',
      preferredFixedAxis: 'x',
      previewW: 0.4,
      previewH: 0.2,
    }),
    1
  );
  const expectedBias = Math.max(
    SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentScoreBiasMinM,
    Math.min(
      SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentScoreBiasMaxM,
      0.4 * SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentScoreBiasRatio
    )
  );
  assert.ok(
    Math.abs(
      addSketchFreeAttachIntentBias({
        score: 1,
        fixedAxis: 'y',
        preferredFixedAxis: 'x',
        previewW: 0.4,
        previewH: 0.2,
      }) -
        (1 + expectedBias)
    ) <= 1e-12
  );
});
