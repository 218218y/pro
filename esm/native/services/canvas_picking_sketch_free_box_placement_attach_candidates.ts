import { SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY } from '../../shared/dimensions/sketch_box_free_placement_policy.js';
import { asFiniteNumberOrNaN } from './canvas_picking_sketch_free_box_contracts.js';
import {
  addSketchFreeAttachIntentBias,
  resolveSketchFreeAttachIntent,
  resolveSketchFreeSoftAttachAxisCenter,
} from './canvas_picking_sketch_free_box_placement_shared.js';
import type { SketchFreeBoxAttachPlacement } from './canvas_picking_sketch_free_box_placement_shared.js';

export function resolveSketchFreeBoxAttachPlacementCandidates(args: {
  pointX: number;
  pointY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetW: number;
  targetH: number;
  previewW: number;
  previewH: number;
  gap: number;
}): {
  horizontal: SketchFreeBoxAttachPlacement | null;
  vertical: SketchFreeBoxAttachPlacement | null;
} {
  const pointX = asFiniteNumberOrNaN(args.pointX);
  const pointY = asFiniteNumberOrNaN(args.pointY);
  const targetCenterX = asFiniteNumberOrNaN(args.targetCenterX);
  const targetCenterY = asFiniteNumberOrNaN(args.targetCenterY);
  const targetW = asFiniteNumberOrNaN(args.targetW);
  const targetH = asFiniteNumberOrNaN(args.targetH);
  const previewW = asFiniteNumberOrNaN(args.previewW);
  const previewH = asFiniteNumberOrNaN(args.previewH);
  const gap = asFiniteNumberOrNaN(args.gap);
  if (
    !Number.isFinite(pointX) ||
    !Number.isFinite(pointY) ||
    !Number.isFinite(targetCenterX) ||
    !Number.isFinite(targetCenterY) ||
    !Number.isFinite(targetW) ||
    !(targetW > 0) ||
    !Number.isFinite(targetH) ||
    !(targetH > 0) ||
    !Number.isFinite(previewW) ||
    !(previewW > 0) ||
    !Number.isFinite(previewH) ||
    !(previewH > 0)
  ) {
    return { horizontal: null, vertical: null };
  }

  const targetHalfW = targetW / 2;
  const targetHalfH = targetH / 2;
  const previewHalfW = previewW / 2;
  const previewHalfH = previewH / 2;
  const dx = pointX - targetCenterX;
  const dy = pointY - targetCenterY;

  const padX = Math.max(
    SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadMinM,
    Math.min(
      SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadMaxM,
      Math.max(targetW, previewW) * SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadSizeRatio
    )
  );
  const padY = Math.max(
    SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadMinM,
    Math.min(
      SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadMaxM,
      Math.max(targetH, previewH) * SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadSizeRatio
    )
  );
  const edgeX = Math.min(
    targetHalfW,
    Math.max(
      SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachEdgeMinM,
      targetHalfW * SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachEdgeHalfRatio
    )
  );
  const edgeY = Math.min(
    targetHalfH,
    Math.max(
      SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachEdgeMinM,
      targetHalfH * SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachEdgeHalfRatio
    )
  );

  const horizontalAlign = resolveSketchFreeSoftAttachAxisCenter({
    rawCenter: pointY,
    targetCenter: targetCenterY,
    targetSpan: targetH,
    previewSpan: previewH,
  });
  const verticalAlign = resolveSketchFreeSoftAttachAxisCenter({
    rawCenter: pointX,
    targetCenter: targetCenterX,
    targetSpan: targetW,
    previewSpan: previewW,
  });

  const horizontalDirection: -1 | 1 = dx >= 0 ? 1 : -1;
  const verticalDirection: -1 | 1 = dy >= 0 ? 1 : -1;
  const preferredFixedAxis = resolveSketchFreeAttachIntent({
    dx,
    dy,
    targetHalfW,
    targetHalfH,
    previewW,
    previewH,
  });

  const horizontal: SketchFreeBoxAttachPlacement | null =
    Math.abs(dy) <= targetHalfH + previewHalfH + padY &&
    Math.abs(dx) <= targetHalfW + previewHalfW + padX &&
    Math.abs(dx) >= edgeX
      ? {
          centerX: targetCenterX + horizontalDirection * (targetHalfW + previewHalfW + gap),
          centerY: horizontalAlign.center,
          score: addSketchFreeAttachIntentBias({
            score:
              Math.abs(pointX - (targetCenterX + horizontalDirection * (targetHalfW + previewHalfW + gap))) +
              Math.abs(pointY - horizontalAlign.center),
            fixedAxis: 'x',
            preferredFixedAxis,
            previewW,
            previewH,
          }),
          fixedAxis: 'x',
          slideAxis: 'y',
          direction: horizontalDirection,
          snappedToCenter: horizontalAlign.snapped,
        }
      : null;

  const vertical: SketchFreeBoxAttachPlacement | null =
    Math.abs(dx) <= targetHalfW + previewHalfW + padX &&
    Math.abs(dy) <= targetHalfH + previewHalfH + padY &&
    Math.abs(dy) >= edgeY
      ? {
          centerX: verticalAlign.center,
          centerY: targetCenterY + verticalDirection * (targetHalfH + previewHalfH + gap),
          score: addSketchFreeAttachIntentBias({
            score:
              Math.abs(pointX - verticalAlign.center) +
              Math.abs(pointY - (targetCenterY + verticalDirection * (targetHalfH + previewHalfH + gap))),
            fixedAxis: 'y',
            preferredFixedAxis,
            previewW,
            previewH,
          }),
          fixedAxis: 'y',
          slideAxis: 'x',
          direction: verticalDirection,
          snappedToCenter: verticalAlign.snapped,
        }
      : null;

  return { horizontal, vertical };
}
