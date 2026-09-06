import type { SketchBoxExtra, SketchDividerExtra } from './render_interior_sketch_shared.js';
import {
  SKETCH_BOX_DIVIDER_GEOMETRY_POLICY,
  findSketchPartitionCellAtNorm,
  resolveSketchPartitionCells,
  resolveSketchPartitionContentCells,
  resolveSketchPartitionDoorCount,
  resolveSketchPartitionMaxOrder,
} from '../../shared/dimensions/sketch_box_divider_policy.js';

export {
  findSketchPartitionCellAtNorm,
  resolveSketchPartitionCells,
  resolveSketchPartitionContentCells,
  resolveSketchPartitionDoorCount,
  resolveSketchPartitionMaxOrder,
};
export type SketchPartitionCell = ReturnType<typeof resolveSketchPartitionCells>[number];
import {
  formatIdentityValue,
  normalizeSketchBoxDividerStructuralOrder,
  readIdentityValue,
  resolveSketchBoxDividerStructuralOrder,
} from '../../shared/identity_value_shared.js';
import {
  asRecordArray,
  readObject,
  toFiniteNumber,
  toNormalizedUnit,
} from './render_interior_sketch_shared.js';

function clampUnit(value: unknown): number | null {
  const n = toFiniteNumber(value);
  if (n == null) return null;
  return Math.max(0, Math.min(1, n));
}
function safeSpan(value: unknown): number {
  const n = toFiniteNumber(value);
  return n != null
    ? Math.max(SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM, n)
    : SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM;
}
function safeCenter(value: unknown): number {
  return toFiniteNumber(value) ?? 0;
}
function safeWood(value: unknown): number {
  const n = toFiniteNumber(value);
  return n != null && n > 0 ? n : SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM;
}
function dividerHalf(span: number, woodThick: number): number {
  return Math.min(span / 2, Math.max(woodThick / 2, SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.dividerHalfMinM));
}

function dividerOrder(value: unknown): number | null {
  return normalizeSketchBoxDividerStructuralOrder(value);
}

function dividerPrecedesOrder(divider: { order?: number }, order: number): boolean {
  const currentOrder = dividerOrder(divider.order);
  return currentOrder == null || currentOrder < order;
}

function segmentContainsX(segment: SketchBoxSegment | null, x: number): boolean {
  if (!segment) return false;
  const eps = SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.pickEdgeEpsilonM;
  return x >= segment.leftX - eps && x <= segment.rightX + eps;
}

function segmentContainsY(segment: SketchBoxVerticalSegment | null, y: number): boolean {
  if (!segment) return false;
  const eps = SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.pickEdgeEpsilonM;
  return y >= segment.bottomY - eps && y <= segment.topY + eps;
}

function resolveAxisPlacement(args: {
  center: number;
  span: number;
  woodThick: number;
  norm?: number | null;
}) {
  const center0 = safeCenter(args.center);
  const span = safeSpan(args.span);
  const t = safeWood(args.woodThick);
  const left = center0 - span / 2;
  const half = dividerHalf(span, t);
  const min = center0 - span / 2 + half;
  const max = center0 + span / 2 - half;
  const raw = left + toNormalizedUnit(args.norm) * span;
  const c = max > min ? Math.max(min, Math.min(max, raw)) : center0;
  const norm =
    span > 0
      ? Math.max(0, Math.min(1, (c - left) / span))
      : SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.defaultCenterNorm;
  return {
    center: Number.isFinite(c) ? c : 0,
    norm,
    centered: Math.abs(c - center0) <= SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.centeredEpsilonM,
  };
}

export const resolveSketchBoxDividerPlacement = (args: {
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  dividerXNorm?: number | null;
}) => {
  const p = resolveAxisPlacement({
    center: args.boxCenterX,
    span: args.innerW,
    woodThick: args.woodThick,
    ...(args.dividerXNorm !== undefined ? { norm: args.dividerXNorm } : {}),
  });
  return { centerX: p.center, xNorm: p.norm, centered: p.centered };
};

export const resolveSketchBoxHorizontalDividerPlacement = (args: {
  boxCenterY: number;
  innerH: number;
  woodThick: number;
  dividerYNorm?: number | null;
}) => {
  const p = resolveAxisPlacement({
    center: args.boxCenterY,
    span: args.innerH,
    woodThick: args.woodThick,
    ...(args.dividerYNorm !== undefined ? { norm: args.dividerYNorm } : {}),
  });
  return { centerY: p.center, yNorm: p.norm, centered: p.centered };
};

export type SketchBoxDividerState = {
  id: string;
  xNorm: number;
  centered: boolean;
  frontZ?: number;
  yNorm?: number;
  order?: number;
};
export type SketchBoxHorizontalDividerState = {
  id: string;
  yNorm: number;
  centered: boolean;
  frontZ?: number;
  xNorm?: number;
  order?: number;
};
export type SketchBoxSegment = {
  index: number;
  leftX: number;
  rightX: number;
  centerX: number;
  width: number;
  xNorm: number;
};
export type SketchBoxVerticalSegment = {
  index: number;
  bottomY: number;
  topY: number;
  centerY: number;
  height: number;
  yNorm: number;
};

export const readSketchBoxDividers = (box: unknown): SketchBoxDividerState[] => {
  const rec = readObject<SketchBoxExtra>(box);
  if (!rec) return [];
  const dividersRaw = asRecordArray<SketchDividerExtra>(rec.dividers);
  const dividers: SketchBoxDividerState[] = [];
  for (const [i, it] of dividersRaw.entries()) {
    const xNorm = clampUnit(it.xNorm);
    if (xNorm == null) continue;
    const id = it.id != null && it.id !== '' ? String(it.id) : `sbd_${i}`;
    const frontZ = toFiniteNumber(it.frontZ);
    const yNorm = clampUnit((it as Record<string, unknown>).yNorm);
    const order = resolveSketchBoxDividerStructuralOrder((it as Record<string, unknown>).order, id);
    dividers.push({
      id,
      xNorm,
      centered: Math.abs(xNorm - 0.5) <= 0.001,
      ...(frontZ != null ? { frontZ } : {}),
      ...(yNorm != null ? { yNorm } : {}),
      ...(order != null ? { order } : {}),
    });
  }
  if (dividers.length) return dividers.sort((a, b) => (a.yNorm ?? -1) - (b.yNorm ?? -1) || a.xNorm - b.xNorm);
  return [];
};

export const readSketchBoxHorizontalDividers = (box: unknown): SketchBoxHorizontalDividerState[] => {
  const rec = readObject<SketchBoxExtra>(box) as (SketchBoxExtra & { horizontalDividers?: unknown }) | null;
  if (!rec) return [];
  const dividersRaw = asRecordArray<Record<string, unknown>>(rec.horizontalDividers);
  const dividers: SketchBoxHorizontalDividerState[] = [];
  for (const [i, it] of dividersRaw.entries()) {
    const yNorm = clampUnit(it.yNorm);
    if (yNorm == null) continue;
    const id = formatIdentityValue(readIdentityValue(it.id)) || `sbh_${i}`;
    const frontZ = toFiniteNumber(it.frontZ);
    const xNorm = clampUnit(it.xNorm);
    const order = resolveSketchBoxDividerStructuralOrder(it.order, id);
    dividers.push({
      id,
      yNorm,
      centered: Math.abs(yNorm - 0.5) <= 0.001,
      ...(frontZ != null ? { frontZ } : {}),
      ...(xNorm != null ? { xNorm } : {}),
      ...(order != null ? { order } : {}),
    });
  }
  return dividers.sort((a, b) => (a.xNorm ?? -1) - (b.xNorm ?? -1) || a.yNorm - b.yNorm);
};

export const readSketchBoxDividerXNorm = (box: unknown): number | null => {
  const dividers = readSketchBoxDividers(box);
  return dividers[0]?.xNorm ?? null;
};

export const resolveSketchBoxDividerPlacements = (args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}) =>
  (Array.isArray(args.dividers) ? args.dividers : [])
    .map(divider => {
      const yNorm = toFiniteNumber(divider.yNorm);
      return {
        dividerId: divider.id,
        ...resolveSketchBoxDividerPlacement({
          boxCenterX: args.boxCenterX,
          innerW: args.innerW,
          woodThick: args.woodThick,
          dividerXNorm: divider.xNorm,
        }),
        ...(yNorm != null ? { yNorm } : {}),
      };
    })
    .sort((a, b) => a.centerX - b.centerX);
export const resolveSketchBoxHorizontalDividerPlacements = (args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
}) =>
  (Array.isArray(args.dividers) ? args.dividers : [])
    .map(divider => {
      const xNorm = toFiniteNumber(divider.xNorm);
      return {
        dividerId: divider.id,
        ...(xNorm != null ? { xNorm } : {}),
        ...resolveSketchBoxHorizontalDividerPlacement({
          boxCenterY: args.boxCenterY,
          innerH: args.innerH,
          woodThick: args.woodThick,
          dividerYNorm: divider.yNorm,
        }),
      };
    })
    .sort((a, b) => a.centerY - b.centerY);

export const resolveSketchBoxVerticalSegments = (args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
  verticalDividers?: SketchBoxDividerState[];
  boxCenterX?: number | null;
  innerW?: number | null;
  xNorm?: unknown;
}): SketchBoxVerticalSegment[] => {
  const h = safeSpan(args.innerH),
    cy = safeCenter(args.boxCenterY),
    t = safeWood(args.woodThick);
  const bottom = cy - h / 2,
    top = cy + h / 2,
    half = dividerHalf(h, t);
  const placements = resolveSketchBoxHorizontalDividerPlacements({
    dividers: filterHorizontalDividersForColumn({
      dividers: args.dividers,
      ...(args.verticalDividers !== undefined ? { verticalDividers: args.verticalDividers } : {}),
      boxCenterY: cy,
      innerH: h,
      ...(args.boxCenterX !== undefined ? { boxCenterX: args.boxCenterX } : {}),
      ...(args.innerW !== undefined ? { innerW: args.innerW } : {}),
      ...(args.xNorm !== undefined ? { xNorm: args.xNorm } : {}),
      woodThick: t,
    }),
    boxCenterY: cy,
    innerH: h,
    woodThick: t,
  });
  const segments: SketchBoxVerticalSegment[] = [];
  const push = (bottomY: number, topY: number) => {
    if (topY > bottomY + SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.segmentEdgeEpsilonM) {
      const centerY = (bottomY + topY) / 2;
      segments.push({
        index: segments.length,
        bottomY,
        topY,
        centerY,
        height: topY - bottomY,
        yNorm: Math.max(0, Math.min(1, (centerY - bottom) / h)),
      });
    }
  };
  let cur = bottom;
  for (const p of placements) {
    push(cur, Math.max(cur, Math.min(top, p.centerY - half)));
    cur = Math.max(cur, Math.min(top, p.centerY + half));
  }
  push(cur, top);
  if (!segments.length) push(bottom, top);
  return segments;
};

function filterHorizontalDividersForColumn(args: {
  dividers: SketchBoxHorizontalDividerState[];
  verticalDividers?: SketchBoxDividerState[];
  boxCenterY: number;
  innerH: number;
  boxCenterX?: number | null;
  innerW?: number | null;
  xNorm?: unknown;
  woodThick: number;
}): SketchBoxHorizontalDividerState[] {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  const scopedDividers = dividers.filter(divider => clampUnit(divider.xNorm) != null);
  if (!scopedDividers.length) return dividers;
  const verticalDividers = Array.isArray(args.verticalDividers) ? args.verticalDividers : [];
  const boxCenterX = toFiniteNumber(args.boxCenterX);
  const innerW = toFiniteNumber(args.innerW);
  if (!verticalDividers.length || boxCenterX == null || innerW == null) {
    return dividers.filter(divider => clampUnit(divider.xNorm) == null);
  }
  const segments = resolveSketchBoxSegments({
    dividers: verticalDividers,
    boxCenterX,
    innerW,
    woodThick: args.woodThick,
  });
  const activeSegment = pickSketchBoxSegment({
    segments,
    boxCenterX,
    innerW,
    xNorm: args.xNorm,
  });
  if (!activeSegment) return dividers.filter(divider => clampUnit(divider.xNorm) == null);
  const targetXNorm = clampUnit(args.xNorm);
  const targetX =
    targetXNorm == null ? activeSegment.centerX : boxCenterX - innerW / 2 + targetXNorm * innerW;
  return dividers.filter(divider => {
    const dividerXNorm = clampUnit(divider.xNorm);
    if (dividerXNorm == null) return true;
    if (dividerOrder(divider.order) != null) {
      const scope = resolveSketchBoxHorizontalDividerScopeSegment({
        divider,
        horizontalDividers: dividers,
        verticalDividers,
        boxCenterX,
        innerW,
        boxCenterY: args.boxCenterY,
        innerH: args.innerH,
        woodThick: args.woodThick,
      });
      return segmentContainsX(scope, targetX);
    }
    const owner = pickSketchBoxSegment({
      segments,
      boxCenterX,
      innerW,
      xNorm: dividerXNorm,
    });
    return owner?.index === activeSegment.index;
  });
}

export const pickSketchBoxVerticalSegment = (args: {
  segments: SketchBoxVerticalSegment[];
  boxCenterY: number;
  innerH: number;
  yNorm?: unknown;
}): SketchBoxVerticalSegment | null => {
  const segments = Array.isArray(args.segments) ? args.segments : [];
  if (!segments.length) return null;
  const yNorm = clampUnit(args.yNorm);
  if (yNorm == null) return segments[0] || null;
  const targetY = safeCenter(args.boxCenterY) - safeSpan(args.innerH) / 2 + yNorm * safeSpan(args.innerH);
  return (
    segments.toSorted((a, b) => Math.abs(a.centerY - targetY) - Math.abs(b.centerY - targetY))[0] || null
  );
};

export const resolveSketchBoxSegments = (args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  horizontalDividers?: SketchBoxHorizontalDividerState[];
  boxCenterY?: number | null;
  innerH?: number | null;
  yNorm?: unknown;
  xNorm?: unknown;
}): SketchBoxSegment[] => {
  const w = safeSpan(args.innerW),
    cx = safeCenter(args.boxCenterX),
    t = safeWood(args.woodThick);
  const left = cx - w / 2,
    right = cx + w / 2,
    half = dividerHalf(w, t);
  const horizontalDividers = Array.isArray(args.horizontalDividers) ? args.horizontalDividers : [];
  const boxCenterY = toFiniteNumber(args.boxCenterY);
  const innerH = toFiniteNumber(args.innerH);
  const verticalSegments =
    horizontalDividers.length && boxCenterY != null && innerH != null
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers,
          boxCenterY,
          innerH,
          woodThick: t,
          verticalDividers: Array.isArray(args.dividers) ? args.dividers : [],
          boxCenterX: cx,
          innerW: w,
          xNorm: args.xNorm,
        })
      : [];
  const active = verticalSegments.length
    ? pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: boxCenterY ?? 0,
        innerH: innerH ?? SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM,
        yNorm: args.yNorm,
      })
    : null;
  const rowDividers = (Array.isArray(args.dividers) ? args.dividers : []).filter(divider => {
    if (!verticalSegments.length || !active || divider.yNorm == null) return true;
    if (dividerOrder(divider.order) != null && boxCenterY != null && innerH != null) {
      const scope = resolveSketchBoxVerticalDividerScopeSegment({
        divider,
        verticalDividers: Array.isArray(args.dividers) ? args.dividers : [],
        horizontalDividers,
        boxCenterX: cx,
        innerW: w,
        boxCenterY,
        innerH,
        woodThick: t,
      });
      return segmentContainsY(scope, active.centerY);
    }
    return (
      pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: boxCenterY ?? 0,
        innerH: innerH ?? SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM,
        yNorm: divider.yNorm,
      })?.index === active.index
    );
  });
  const placements = resolveSketchBoxDividerPlacements({
    dividers: rowDividers,
    boxCenterX: cx,
    innerW: w,
    woodThick: t,
  });
  const segments: SketchBoxSegment[] = [];
  const push = (l: number, r: number) => {
    if (r > l + SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.segmentEdgeEpsilonM) {
      const centerX = (l + r) / 2;
      segments.push({
        index: segments.length,
        leftX: l,
        rightX: r,
        centerX,
        width: r - l,
        xNorm: Math.max(0, Math.min(1, (centerX - left) / w)),
      });
    }
  };
  let cur = left;
  for (const p of placements) {
    push(cur, Math.max(cur, Math.min(right, p.centerX - half)));
    cur = Math.max(cur, Math.min(right, p.centerX + half));
  }
  push(cur, right);
  if (!segments.length) push(left, right);
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
  const xNorm = clampUnit(args.xNorm);
  if (xNorm == null) return null;
  const targetX = safeCenter(args.boxCenterX) - safeSpan(args.innerW) / 2 + xNorm * safeSpan(args.innerW);
  return (
    segments.toSorted((a, b) => Math.abs(a.centerX - targetX) - Math.abs(b.centerX - targetX))[0] || null
  );
};

export const resolveSketchBoxSegmentForContent = (args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  xNorm?: unknown;
  horizontalDividers?: SketchBoxHorizontalDividerState[];
  boxCenterY?: number | null;
  innerH?: number | null;
  yNorm?: unknown;
}): SketchBoxSegment | null => {
  const segments = resolveSketchBoxSegments(args);
  return pickSketchBoxSegment({
    segments,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    xNorm: args.xNorm,
  });
};

export const resolveSketchBoxHorizontalDividerScopeSegment = (args: {
  divider: SketchBoxHorizontalDividerState;
  horizontalDividers: SketchBoxHorizontalDividerState[];
  verticalDividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY: number;
  innerH: number;
  woodThick: number;
}): SketchBoxSegment | null => {
  const xNorm = clampUnit(args.divider.xNorm);
  if (xNorm == null) return null;
  const order = dividerOrder(args.divider.order);
  const verticalDividers = Array.isArray(args.verticalDividers) ? args.verticalDividers : [];
  const horizontalDividers = Array.isArray(args.horizontalDividers) ? args.horizontalDividers : [];
  const priorVerticalDividers =
    order == null
      ? verticalDividers
      : verticalDividers.filter(divider => dividerPrecedesOrder(divider, order));
  const priorHorizontalDividers =
    order == null
      ? []
      : horizontalDividers.filter(
          divider => divider.id !== args.divider.id && dividerPrecedesOrder(divider, order)
        );
  return resolveSketchBoxSegmentForContent({
    dividers: priorVerticalDividers,
    horizontalDividers: priorHorizontalDividers,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    boxCenterY: args.boxCenterY,
    innerH: args.innerH,
    woodThick: args.woodThick,
    xNorm,
    yNorm: args.divider.yNorm,
  });
};

export const resolveSketchBoxVerticalDividerScopeSegment = (args: {
  divider: SketchBoxDividerState;
  verticalDividers: SketchBoxDividerState[];
  horizontalDividers: SketchBoxHorizontalDividerState[];
  boxCenterX: number;
  innerW: number;
  boxCenterY: number;
  innerH: number;
  woodThick: number;
}): SketchBoxVerticalSegment | null => {
  const yNorm = clampUnit(args.divider.yNorm);
  if (yNorm == null) return null;
  const order = dividerOrder(args.divider.order);
  const verticalDividers = Array.isArray(args.verticalDividers) ? args.verticalDividers : [];
  const horizontalDividers = Array.isArray(args.horizontalDividers) ? args.horizontalDividers : [];
  const priorVerticalDividers =
    order == null
      ? verticalDividers
      : verticalDividers.filter(divider => dividerPrecedesOrder(divider, order));
  const priorHorizontalDividers =
    order == null
      ? horizontalDividers
      : horizontalDividers.filter(divider => dividerPrecedesOrder(divider, order));
  const segments = resolveSketchBoxVerticalSegments({
    dividers: priorHorizontalDividers,
    verticalDividers: priorVerticalDividers,
    boxCenterX: args.boxCenterX,
    innerW: args.innerW,
    boxCenterY: args.boxCenterY,
    innerH: args.innerH,
    woodThick: args.woodThick,
    xNorm: args.divider.xNorm,
  });
  return pickSketchBoxVerticalSegment({
    segments,
    boxCenterY: args.boxCenterY,
    innerH: args.innerH,
    yNorm,
  });
};
