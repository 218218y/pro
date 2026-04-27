import type {
  ResolveSketchBoxGeometryFn,
  ResolvedModuleBoxLike,
} from './canvas_picking_sketch_box_overlap_contracts.js';
import {
  clampSketchModuleBoxCenterY,
  isWithinModuleVerticalBounds,
} from './canvas_picking_sketch_box_overlap_bounds.js';
import { collectOverlaps } from './canvas_picking_sketch_box_overlap_geometry.js';
import { resolveModuleBoxes } from './canvas_picking_sketch_box_overlap_resolved_boxes.js';

function pickNextAnchor(direction: 1 | -1, overlaps: ResolvedModuleBoxLike[]): ResolvedModuleBoxLike | null {
  let nextAnchor: ResolvedModuleBoxLike | null = null;
  for (let overlapIndex = 0; overlapIndex < overlaps.length; overlapIndex++) {
    const overlap = overlaps[overlapIndex];
    if (!nextAnchor) {
      nextAnchor = overlap;
      continue;
    }
    nextAnchor =
      direction === 1
        ? overlap.centerY > nextAnchor.centerY
          ? overlap
          : nextAnchor
        : overlap.centerY < nextAnchor.centerY
          ? overlap
          : nextAnchor;
  }
  return nextAnchor;
}

function resolvePlacementCandidateY(args: {
  desiredCenterX: number;
  desiredCenterY: number;
  boxW: number;
  boxH: number;
  bottomY: number;
  spanH: number;
  pad: number;
  resolved: ResolvedModuleBoxLike[];
  initialAnchor: ResolvedModuleBoxLike;
  direction: 1 | -1;
}): number | null {
  let anchor = args.initialAnchor;
  let candidateY = args.desiredCenterY;

  for (let pass = 0; pass < args.resolved.length + 2; pass++) {
    candidateY = anchor.centerY + args.direction * (anchor.boxH / 2 + args.boxH / 2);
    if (
      !isWithinModuleVerticalBounds({
        centerY: candidateY,
        boxH: args.boxH,
        bottomY: args.bottomY,
        spanH: args.spanH,
        pad: args.pad,
      })
    ) {
      return null;
    }
    const overlaps = collectOverlaps({
      centerX: args.desiredCenterX,
      centerY: candidateY,
      boxW: args.boxW,
      boxH: args.boxH,
      boxes: args.resolved,
      gap: 0,
    });
    if (!overlaps.length) return candidateY;
    const nextAnchor = pickNextAnchor(args.direction, overlaps);
    if (!nextAnchor || nextAnchor.id === anchor.id) return null;
    anchor = nextAnchor;
    if (pass === args.resolved.length + 1) return null;
  }

  return null;
}

export function resolveSketchModuleBoxPlacement(args: {
  boxes: unknown[];
  desiredCenterX: number;
  desiredCenterY: number;
  boxW: number;
  boxH: number;
  bottomY: number;
  spanH: number;
  pad: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
  ignoreBoxId?: unknown;
}): {
  centerX: number;
  centerY: number;
  adjusted: boolean;
  blocked: boolean;
  anchorBoxId: string | null;
} {
  const desiredCenterX = Number(args.desiredCenterX);
  const desiredCenterY = clampSketchModuleBoxCenterY({
    centerY: Number(args.desiredCenterY),
    boxH: Number(args.boxH),
    bottomY: Number(args.bottomY),
    spanH: Number(args.spanH),
    pad: Number(args.pad),
  });
  const boxW = Number(args.boxW);
  const boxH = Number(args.boxH);
  const bottomY = Number(args.bottomY);
  const spanH = Number(args.spanH);
  const pad = Number(args.pad);
  if (
    !Number.isFinite(desiredCenterX) ||
    !Number.isFinite(desiredCenterY) ||
    !Number.isFinite(boxW) ||
    !(boxW > 0) ||
    !Number.isFinite(boxH) ||
    !(boxH > 0) ||
    !Number.isFinite(bottomY) ||
    !Number.isFinite(spanH) ||
    !(spanH > 0)
  ) {
    return {
      centerX: desiredCenterX,
      centerY: desiredCenterY,
      adjusted: false,
      blocked: false,
      anchorBoxId: null,
    };
  }

  const resolved = resolveModuleBoxes(args);
  if (!resolved.length) {
    return {
      centerX: desiredCenterX,
      centerY: desiredCenterY,
      adjusted: false,
      blocked: false,
      anchorBoxId: null,
    };
  }

  const initialOverlaps = collectOverlaps({
    centerX: desiredCenterX,
    centerY: desiredCenterY,
    boxW,
    boxH,
    boxes: resolved,
    gap: 0,
  });
  if (!initialOverlaps.length) {
    return {
      centerX: desiredCenterX,
      centerY: desiredCenterY,
      adjusted: false,
      blocked: false,
      anchorBoxId: null,
    };
  }

  const preferDirection: 1 | -1 = initialOverlaps.some(box => desiredCenterY >= box.centerY) ? 1 : -1;
  const directionOrder: Array<1 | -1> = preferDirection === 1 ? [1, -1] : [-1, 1];

  let best: {
    centerY: number;
    score: number;
    anchorBoxId: string | null;
  } | null = null;

  for (let oi = 0; oi < initialOverlaps.length; oi++) {
    const initialAnchor = initialOverlaps[oi];
    for (let di = 0; di < directionOrder.length; di++) {
      const direction = directionOrder[di];
      const candidateY = resolvePlacementCandidateY({
        desiredCenterX,
        desiredCenterY,
        boxW,
        boxH,
        bottomY,
        spanH,
        pad,
        resolved,
        initialAnchor,
        direction,
      });
      if (candidateY == null) continue;

      const remaining = collectOverlaps({
        centerX: desiredCenterX,
        centerY: candidateY,
        boxW,
        boxH,
        boxes: resolved,
        gap: 0,
      });
      if (remaining.length) continue;

      const score = Math.abs(candidateY - desiredCenterY) + di * 10 + oi * 0.01;
      if (!best || score < best.score) {
        best = {
          centerY: candidateY,
          score,
          anchorBoxId: initialAnchor.id,
        };
      }
    }
  }

  if (!best) {
    return {
      centerX: desiredCenterX,
      centerY: desiredCenterY,
      adjusted: false,
      blocked: true,
      anchorBoxId: initialOverlaps[0]?.id ?? null,
    };
  }

  return {
    centerX: desiredCenterX,
    centerY: best.centerY,
    adjusted: Math.abs(best.centerY - desiredCenterY) > 1e-6,
    blocked: false,
    anchorBoxId: best.anchorBoxId,
  };
}
