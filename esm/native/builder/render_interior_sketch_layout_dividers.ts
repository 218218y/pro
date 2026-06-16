import type { SketchBoxExtra, SketchDividerExtra } from './render_interior_sketch_shared.js';
import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { asRecordArray, readObject, toNormalizedUnit } from './render_interior_sketch_shared.js';

function clampUnit(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}
function safeSpan(value: unknown): number {
  return Number.isFinite(Number(value))
    ? Math.max(SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM, Number(value))
    : SKETCH_BOX_DIMENSIONS.dividers.minInnerWidthM;
}
function safeCenter(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
function safeWood(value: unknown): number {
  return Number.isFinite(Number(value)) && Number(value) > 0
    ? Number(value)
    : SKETCH_BOX_DIMENSIONS.dividers.fallbackWoodThicknessM;
}
function dividerHalf(span: number, woodThick: number): number {
  return Math.min(span / 2, Math.max(woodThick / 2, SKETCH_BOX_DIMENSIONS.dividers.dividerHalfMinM));
}

function resolveAxisPlacement(args: {
  center: number;
  span: number;
  woodThick: number;
  norm?: number | null;
}) {
  const center0 = Number(args.center);
  const span = safeSpan(args.span);
  const t = safeWood(args.woodThick);
  const left = center0 - span / 2;
  const half = dividerHalf(span, t);
  const min = center0 - span / 2 + half;
  const max = center0 + span / 2 - half;
  const raw = left + toNormalizedUnit(args.norm) * span;
  const c = max > min ? Math.max(min, Math.min(max, raw)) : center0;
  const norm =
    span > 0 ? Math.max(0, Math.min(1, (c - left) / span)) : SKETCH_BOX_DIMENSIONS.dividers.defaultCenterNorm;
  return {
    center: Number.isFinite(c) ? c : 0,
    norm,
    centered: Math.abs(c - center0) <= SKETCH_BOX_DIMENSIONS.dividers.centeredEpsilonM,
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
    norm: args.dividerXNorm,
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
    norm: args.dividerYNorm,
  });
  return { centerY: p.center, yNorm: p.norm, centered: p.centered };
};

export type SketchBoxDividerState = {
  id: string;
  xNorm: number;
  centered: boolean;
  frontZ?: number;
  yNorm?: number;
};
export type SketchBoxHorizontalDividerState = {
  id: string;
  yNorm: number;
  centered: boolean;
  frontZ?: number;
  xNorm?: number;
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
  for (let i = 0; i < dividersRaw.length; i++) {
    const it = dividersRaw[i];
    const xNorm = clampUnit(it.xNorm);
    if (xNorm == null) continue;
    const frontZ = Number(it.frontZ);
    const yNorm = clampUnit((it as Record<string, unknown>).yNorm);
    dividers.push({
      id: it.id != null && it.id !== '' ? String(it.id) : `sbd_${i}`,
      xNorm,
      centered: Math.abs(xNorm - 0.5) <= 0.001,
      ...(Number.isFinite(frontZ) ? { frontZ } : {}),
      ...(yNorm != null ? { yNorm } : {}),
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
  for (let i = 0; i < dividersRaw.length; i++) {
    const it = dividersRaw[i];
    const yNorm = clampUnit(it.yNorm);
    if (yNorm == null) continue;
    const frontZ = Number(it.frontZ);
    const xNorm = clampUnit(it.xNorm);
    dividers.push({
      id: it.id != null && it.id !== '' ? String(it.id) : `sbh_${i}`,
      yNorm,
      centered: Math.abs(yNorm - 0.5) <= 0.001,
      ...(Number.isFinite(frontZ) ? { frontZ } : {}),
      ...(xNorm != null ? { xNorm } : {}),
    });
  }
  return dividers.sort((a, b) => (a.xNorm ?? -1) - (b.xNorm ?? -1) || a.yNorm - b.yNorm);
};

export const readSketchBoxDividerXNorm = (box: unknown): number | null => {
  const dividers = readSketchBoxDividers(box);
  return dividers.length ? dividers[0].xNorm : null;
};

export const resolveSketchBoxDividerPlacements = (args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
}) =>
  (Array.isArray(args.dividers) ? args.dividers : [])
    .map(divider => ({
      dividerId: divider.id,
      ...resolveSketchBoxDividerPlacement({
        boxCenterX: args.boxCenterX,
        innerW: args.innerW,
        woodThick: args.woodThick,
        dividerXNorm: divider.xNorm,
      }),
      ...(Number.isFinite(Number(divider.yNorm)) ? { yNorm: Number(divider.yNorm) } : {}),
    }))
    .sort((a, b) => a.centerX - b.centerX);
export const resolveSketchBoxHorizontalDividerPlacements = (args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
}) =>
  (Array.isArray(args.dividers) ? args.dividers : [])
    .map(divider => ({
      dividerId: divider.id,
      ...(Number.isFinite(Number(divider.xNorm)) ? { xNorm: Number(divider.xNorm) } : {}),
      ...resolveSketchBoxHorizontalDividerPlacement({
        boxCenterY: args.boxCenterY,
        innerH: args.innerH,
        woodThick: args.woodThick,
        dividerYNorm: divider.yNorm,
      }),
    }))
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
      verticalDividers: args.verticalDividers,
      boxCenterX: args.boxCenterX,
      innerW: args.innerW,
      xNorm: args.xNorm,
      woodThick: t,
    }),
    boxCenterY: cy,
    innerH: h,
    woodThick: t,
  });
  const segments: SketchBoxVerticalSegment[] = [];
  const push = (bottomY: number, topY: number) => {
    if (topY > bottomY + SKETCH_BOX_DIMENSIONS.dividers.segmentEdgeEpsilonM) {
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
  boxCenterX?: number | null;
  innerW?: number | null;
  xNorm?: unknown;
  woodThick: number;
}): SketchBoxHorizontalDividerState[] {
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  const scopedDividers = dividers.filter(divider => clampUnit(divider.xNorm) != null);
  if (!scopedDividers.length) return dividers;
  const verticalDividers = Array.isArray(args.verticalDividers) ? args.verticalDividers : [];
  if (
    !verticalDividers.length ||
    !Number.isFinite(Number(args.boxCenterX)) ||
    !Number.isFinite(Number(args.innerW))
  ) {
    return dividers.filter(divider => clampUnit(divider.xNorm) == null);
  }
  const segments = resolveSketchBoxSegments({
    dividers: verticalDividers,
    boxCenterX: Number(args.boxCenterX),
    innerW: Number(args.innerW),
    woodThick: args.woodThick,
  });
  const activeSegment = pickSketchBoxSegment({
    segments,
    boxCenterX: Number(args.boxCenterX),
    innerW: Number(args.innerW),
    xNorm: args.xNorm,
  });
  if (!activeSegment) return dividers.filter(divider => clampUnit(divider.xNorm) == null);
  return dividers.filter(divider => {
    const dividerXNorm = clampUnit(divider.xNorm);
    if (dividerXNorm == null) return true;
    const owner = pickSketchBoxSegment({
      segments,
      boxCenterX: Number(args.boxCenterX),
      innerW: Number(args.innerW),
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
    segments.slice().sort((a, b) => Math.abs(a.centerY - targetY) - Math.abs(b.centerY - targetY))[0] || null
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
  const verticalSegments =
    horizontalDividers.length &&
    Number.isFinite(Number(args.boxCenterY)) &&
    Number.isFinite(Number(args.innerH))
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers,
          boxCenterY: Number(args.boxCenterY),
          innerH: Number(args.innerH),
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
        boxCenterY: Number(args.boxCenterY),
        innerH: Number(args.innerH),
        yNorm: args.yNorm,
      })
    : null;
  const rowDividers = (Array.isArray(args.dividers) ? args.dividers : []).filter(divider => {
    if (!verticalSegments.length || !active || divider.yNorm == null) return true;
    return (
      pickSketchBoxVerticalSegment({
        segments: verticalSegments,
        boxCenterY: Number(args.boxCenterY),
        innerH: Number(args.innerH),
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
    if (r > l + SKETCH_BOX_DIMENSIONS.dividers.segmentEdgeEpsilonM) {
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
    segments.slice().sort((a, b) => Math.abs(a.centerX - targetX) - Math.abs(b.centerX - targetX))[0] || null
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
