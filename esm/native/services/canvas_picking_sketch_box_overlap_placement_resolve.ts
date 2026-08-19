import type {
  ResolveSketchBoxGeometryFn,
  ResolvedModuleBoxLike,
} from './canvas_picking_sketch_box_overlap_contracts.js';
import type { VerticalOccupancyRange } from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import {
  clampSketchModuleBoxCenterY,
  isWithinModuleVerticalBounds,
} from './canvas_picking_sketch_box_overlap_bounds.js';
import { collectOverlaps } from './canvas_picking_sketch_box_overlap_geometry.js';
import { resolveModuleBoxes } from './canvas_picking_sketch_box_overlap_resolved_boxes.js';

function resolvePlacementBlockersAsBoxes(args: {
  blockers?: VerticalOccupancyRange[] | null;
  desiredCenterX: number;
  boxW: number;
}): ResolvedModuleBoxLike[] {
  const blockers = Array.isArray(args.blockers) ? args.blockers : [];
  const desiredCenterX = Number(args.desiredCenterX);
  const boxW = Number(args.boxW);
  if (!Number.isFinite(desiredCenterX) || !Number.isFinite(boxW) || !(boxW > 0)) return [];

  const resolved: ResolvedModuleBoxLike[] = [];
  for (let i = 0; i < blockers.length; i += 1) {
    const blocker = blockers[i];
    if (!blocker) continue;
    const minY0 = Number(blocker.minY);
    const maxY0 = Number(blocker.maxY);
    if (!Number.isFinite(minY0) || !Number.isFinite(maxY0)) continue;
    const minY = Math.min(minY0, maxY0);
    const maxY = Math.max(minY0, maxY0);
    if (!(maxY > minY)) continue;
    const gap =
      typeof blocker.collisionGapM === 'number' && Number.isFinite(blocker.collisionGapM)
        ? Math.max(0, blocker.collisionGapM)
        : 0;
    const id = blocker.id != null && blocker.id !== '' ? String(blocker.id) : `blocker_${i}`;
    const inflatedMinY = minY - gap;
    const inflatedMaxY = maxY + gap;
    resolved.push({
      id: `blocker:${id}`,
      box: { id: `blocker:${id}` },
      centerX: desiredCenterX,
      centerY: (inflatedMinY + inflatedMaxY) / 2,
      boxW,
      boxH: inflatedMaxY - inflatedMinY,
      widthM: null,
      depthM: null,
      xNorm: null,
    });
  }
  return resolved;
}

function pickNextAnchor(direction: 1 | -1, overlaps: ResolvedModuleBoxLike[]): ResolvedModuleBoxLike | null {
  let nextAnchor: ResolvedModuleBoxLike | null = null;
  for (const overlap of overlaps) {
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

function boxXOverlaps(args: { centerX: number; boxW: number; other: ResolvedModuleBoxLike }): boolean {
  const centerX = Number(args.centerX);
  const boxW = Number(args.boxW);
  const otherCenterX = Number(args.other.centerX);
  const otherW = Number(args.other.boxW);
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(boxW) ||
    !(boxW > 0) ||
    !Number.isFinite(otherCenterX) ||
    !Number.isFinite(otherW) ||
    !(otherW > 0)
  ) {
    return false;
  }

  return Math.abs(centerX - otherCenterX) < boxW / 2 + otherW / 2 - 1e-7;
}

function alignCenterWithinPointerSlot(args: {
  desiredCenterX: number;
  desiredCenterY: number;
  boxW: number;
  boxH: number;
  bottomY: number;
  spanH: number;
  pad: number;
  resolved: ResolvedModuleBoxLike[];
}): number {
  const desiredCenterY = Number(args.desiredCenterY);
  const boxH = Number(args.boxH);
  const bottomY = Number(args.bottomY);
  const spanH = Number(args.spanH);
  const pad = Number(args.pad);
  if (
    !Number.isFinite(desiredCenterY) ||
    !Number.isFinite(boxH) ||
    !(boxH > 0) ||
    !Number.isFinite(bottomY) ||
    !Number.isFinite(spanH) ||
    !(spanH > 0)
  ) {
    return desiredCenterY;
  }

  const freeBottomY = bottomY + pad;
  const freeTopY = bottomY + spanH - pad;
  if (!(freeTopY > freeBottomY)) return desiredCenterY;

  const blockersByY = args.resolved
    .filter(box => boxXOverlaps({ centerX: args.desiredCenterX, boxW: args.boxW, other: box }))
    .map(box => ({
      minY: box.centerY - box.boxH / 2,
      maxY: box.centerY + box.boxH / 2,
    }))
    .filter(
      box =>
        Number.isFinite(box.minY) &&
        Number.isFinite(box.maxY) &&
        box.maxY > freeBottomY &&
        box.minY < freeTopY
    )
    .sort((a, b) => a.minY - b.minY);

  let slotBottomY = freeBottomY;
  for (const blocker of blockersByY) {
    const blockerMinY = Math.max(freeBottomY, blocker.minY);
    const blockerMaxY = Math.min(freeTopY, blocker.maxY);

    if (desiredCenterY >= blockerMinY && desiredCenterY <= blockerMaxY) {
      return desiredCenterY;
    }

    if (desiredCenterY < blockerMinY) {
      const lo = slotBottomY + boxH / 2;
      const hi = blockerMinY - boxH / 2;
      return hi >= lo ? Math.max(lo, Math.min(hi, desiredCenterY)) : desiredCenterY;
    }

    slotBottomY = Math.max(slotBottomY, blockerMaxY);
  }

  const lo = slotBottomY + boxH / 2;
  const hi = freeTopY - boxH / 2;
  return hi >= lo ? Math.max(lo, Math.min(hi, desiredCenterY)) : desiredCenterY;
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
  blockers?: VerticalOccupancyRange[] | null;
  confineToPointerSlot?: boolean;
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

  const resolved = resolveModuleBoxes(args).concat(
    resolvePlacementBlockersAsBoxes({
      ...(args.blockers !== undefined ? { blockers: args.blockers } : {}),
      desiredCenterX,
      boxW,
    })
  );
  if (!resolved.length) {
    return {
      centerX: desiredCenterX,
      centerY: desiredCenterY,
      adjusted: false,
      blocked: false,
      anchorBoxId: null,
    };
  }

  const alignedCenterY = args.confineToPointerSlot
    ? alignCenterWithinPointerSlot({
        desiredCenterX,
        desiredCenterY,
        boxW,
        boxH,
        bottomY,
        spanH,
        pad,
        resolved,
      })
    : desiredCenterY;

  const initialOverlaps = collectOverlaps({
    centerX: desiredCenterX,
    centerY: alignedCenterY,
    boxW,
    boxH,
    boxes: resolved,
    gap: 0,
  });
  if (!initialOverlaps.length) {
    return {
      centerX: desiredCenterX,
      centerY: alignedCenterY,
      adjusted: Math.abs(alignedCenterY - desiredCenterY) > 1e-6,
      blocked: false,
      anchorBoxId: null,
    };
  }

  if (args.confineToPointerSlot) {
    return {
      centerX: desiredCenterX,
      centerY: alignedCenterY,
      adjusted: Math.abs(alignedCenterY - desiredCenterY) > 1e-6,
      blocked: true,
      anchorBoxId: initialOverlaps[0]?.id ?? null,
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
    if (!initialAnchor) continue;
    for (let di = 0; di < directionOrder.length; di++) {
      const direction = directionOrder[di];
      if (direction === undefined) continue;
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
