import type { SketchBoxExtra, SketchDividerExtra } from './render_interior_sketch_shared.js';

import { asRecordArray, readObject, toNormalizedUnit } from './render_interior_sketch_shared.js';

export const resolveSketchBoxDividerPlacement = (args: {
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  dividerXNorm?: number | null;
}) => {
  const boxCenterX = Number(args.boxCenterX);
  const innerW = Number(args.innerW);
  const woodThick = Number(args.woodThick);
  const dividerXNorm = args.dividerXNorm;

  const t = Number.isFinite(woodThick) && woodThick > 0 ? woodThick : 0.018;
  const spanW = Number.isFinite(innerW) && innerW > 0 ? innerW : Math.max(0.02, t * 2 + 0.02);
  const leftX = boxCenterX - spanW / 2;
  const clampTo = (value: number, min: number, max: number) =>
    Math.max(Math.min(min, max), Math.min(max, value));
  const dividerHalf = Math.min(spanW / 2, Math.max(t / 2, 0.006));
  const minX = boxCenterX - spanW / 2 + dividerHalf;
  const maxX = boxCenterX + spanW / 2 - dividerHalf;
  const norm = clampTo(toNormalizedUnit(dividerXNorm), 0, 1);
  const rawCenterX = leftX + norm * spanW;
  const centerX = maxX > minX ? Math.max(minX, Math.min(maxX, rawCenterX)) : boxCenterX;
  return {
    centerX: Number.isFinite(centerX) ? centerX : Number.isFinite(boxCenterX) ? boxCenterX : 0,
    xNorm: spanW > 0 ? clampTo((centerX - leftX) / spanW, 0, 1) : 0.5,
    centered: Math.abs(centerX - boxCenterX) <= 0.001,
  };
};

export const readSketchBoxDividerXNorm = (box: unknown): number | null => {
  const dividers = readSketchBoxDividers(box);
  if (dividers.length) return dividers[0].xNorm;
  return null;
};

export type SketchBoxDividerState = {
  id: string;
  xNorm: number;
  centered: boolean;
};

export type SketchBoxSegment = {
  index: number;
  leftX: number;
  rightX: number;
  centerX: number;
  width: number;
  xNorm: number;
};

export const readSketchBoxDividers = (box: unknown): SketchBoxDividerState[] => {
  const rec = readObject<SketchBoxExtra>(box);
  if (!rec) return [];
  const dividersRaw = asRecordArray<SketchDividerExtra>(rec.dividers);
  const dividers: SketchBoxDividerState[] = [];
  for (let i = 0; i < dividersRaw.length; i++) {
    const it = dividersRaw[i];
    const xNorm = Number(it.xNorm);
    if (!Number.isFinite(xNorm)) continue;
    const idRaw = it.id;
    dividers.push({
      id: idRaw != null && idRaw !== '' ? String(idRaw) : `sbd_${i}`,
      xNorm: Math.max(0, Math.min(1, xNorm)),
      centered: Math.abs(Number(xNorm) - 0.5) <= 0.001,
    });
  }
  if (dividers.length) return dividers.sort((a, b) => a.xNorm - b.xNorm);
  const dividerXNorm = Number(rec.dividerXNorm);
  if (Number.isFinite(dividerXNorm)) {
    const xNorm = Math.max(0, Math.min(1, dividerXNorm));
    return [{ id: 'legacy_divider', xNorm, centered: Math.abs(xNorm - 0.5) <= 0.001 }];
  }
  if (rec.centerDivider === true) return [{ id: 'legacy_divider', xNorm: 0.5, centered: true }];
  return [];
};

export const resolveSketchBoxDividerPlacements = (args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}) => {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  const placements: Array<{ dividerId: string; xNorm: number; centerX: number; centered: boolean }> = [];
  for (let i = 0; i < dividers.length; i++) {
    const divider = dividers[i];
    const placement = resolveSketchBoxDividerPlacement({
      boxCenterX: args.boxCenterX,
      innerW: args.innerW,
      woodThick: args.woodThick,
      dividerXNorm: divider.xNorm,
    });
    placements.push({
      dividerId: divider.id,
      xNorm: placement.xNorm,
      centerX: placement.centerX,
      centered: placement.centered,
    });
  }
  return placements.sort((a, b) => a.centerX - b.centerX);
};

export const resolveSketchBoxSegments = (args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}): SketchBoxSegment[] => {
  const safeInnerW = Number.isFinite(Number(args.innerW)) ? Math.max(0.02, Number(args.innerW)) : 0.02;
  const safeCenterX = Number.isFinite(Number(args.boxCenterX)) ? Number(args.boxCenterX) : 0;
  const safeWoodThick =
    Number.isFinite(Number(args.woodThick)) && Number(args.woodThick) > 0 ? Number(args.woodThick) : 0.018;
  const leftX = safeCenterX - safeInnerW / 2;
  const rightX = safeCenterX + safeInnerW / 2;
  const dividerHalf = Math.min(safeInnerW / 2, Math.max(safeWoodThick / 2, 0.006));
  const placements = resolveSketchBoxDividerPlacements(args);
  const segments: SketchBoxSegment[] = [];
  const pushSegment = (segLeft: number, segRight: number) => {
    if (!(segRight > segLeft + 0.0001)) return;
    const centerX = (segLeft + segRight) / 2;
    const xNorm = safeInnerW > 0 ? Math.max(0, Math.min(1, (centerX - leftX) / safeInnerW)) : 0.5;
    segments.push({
      index: segments.length,
      leftX: segLeft,
      rightX: segRight,
      centerX,
      width: segRight - segLeft,
      xNorm,
    });
  };

  let cursor = leftX;
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    const segRight = Math.max(cursor, Math.min(rightX, placement.centerX - dividerHalf));
    pushSegment(cursor, segRight);
    cursor = Math.max(cursor, Math.min(rightX, placement.centerX + dividerHalf));
  }
  pushSegment(cursor, rightX);
  if (!segments.length) pushSegment(leftX, rightX);
  return segments;
};

export const pickSketchBoxSegment = (args: {
  segments: SketchBoxSegment[];
  boxCenterX: number;
  innerW: number;
  xNorm?: unknown;
}): SketchBoxSegment | null => {
  const segments = Array.isArray(args.segments) ? args.segments : [];
  if (!segments.length) return null;
  const rawXNorm = typeof args.xNorm === 'number' ? args.xNorm : Number(args.xNorm);
  if (!Number.isFinite(rawXNorm)) return null;
  const safeInnerW = Number.isFinite(Number(args.innerW)) ? Math.max(0.02, Number(args.innerW)) : 0.02;
  const safeCenterX = Number.isFinite(Number(args.boxCenterX)) ? Number(args.boxCenterX) : 0;
  const norm = Math.max(0, Math.min(1, rawXNorm));
  const targetX = safeCenterX - safeInnerW / 2 + norm * safeInnerW;
  const edgeEps = 0.0005;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (targetX >= segment.leftX - edgeEps && targetX <= segment.rightX + edgeEps) return segment;
  }
  let best = segments[0] || null;
  let bestDist = Infinity;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const dx = Math.abs(targetX - segment.centerX);
    if (dx < bestDist) {
      bestDist = dx;
      best = segment;
    }
  }
  return best;
};

export const resolveSketchBoxSegmentForContent = (args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  xNorm?: unknown;
}): SketchBoxSegment | null => {
  const segments = resolveSketchBoxSegments(args);
  return pickSketchBoxSegment({
    segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    xNorm: args.xNorm,
  });
};
