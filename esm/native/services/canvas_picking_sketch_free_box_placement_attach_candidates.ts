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
  const pointX = Number(args.pointX);
  const pointY = Number(args.pointY);
  const targetCenterX = Number(args.targetCenterX);
  const targetCenterY = Number(args.targetCenterY);
  const targetW = Number(args.targetW);
  const targetH = Number(args.targetH);
  const previewW = Number(args.previewW);
  const previewH = Number(args.previewH);
  const gap = Number(args.gap);
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

  const padX = Math.max(0.03, Math.min(0.14, Math.max(targetW, previewW) * 0.18));
  const padY = Math.max(0.03, Math.min(0.14, Math.max(targetH, previewH) * 0.18));
  const edgeX = Math.min(targetHalfW, Math.max(0.02, targetHalfW * 0.45));
  const edgeY = Math.min(targetHalfH, Math.max(0.02, targetHalfH * 0.45));

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
