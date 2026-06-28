export type SketchStackVerticalAnchor = 'bottom' | 'top' | 'center';

export type SketchStackPositionItem = {
  yNorm?: unknown;
  yNormC?: unknown;
  yAnchor?: unknown;
  verticalAnchor?: unknown;
};

const POSITION_EPSILON = 1e-6;

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampUnit(value: number): number {
  return clamp(value, 0, 1);
}

function normalizeAnchor(value: unknown): SketchStackVerticalAnchor | null {
  return value === 'bottom' || value === 'top' || value === 'center' ? value : null;
}

function readExplicitAnchor(item: SketchStackPositionItem): SketchStackVerticalAnchor | null {
  return normalizeAnchor(item.yAnchor) ?? normalizeAnchor(item.verticalAnchor);
}

function resolveCenterBounds(args: { bottomY: number; topY: number; stackH: number; pad?: number | null }): {
  lo: number;
  hi: number;
  fallbackMin: number;
  fallbackMax: number;
} {
  const pad = readFiniteNumber(args.pad) ?? 0;
  const minY = args.bottomY + Math.max(0, pad);
  const maxY = args.topY - Math.max(0, pad);
  return {
    lo: minY + args.stackH / 2,
    hi: maxY - args.stackH / 2,
    fallbackMin: minY,
    fallbackMax: maxY,
  };
}

function clampCenterY(args: {
  centerY: number;
  bottomY: number;
  topY: number;
  stackH: number;
  pad?: number | null;
}): number {
  const bounds = resolveCenterBounds(args);
  if (!(bounds.hi > bounds.lo)) return clamp(args.centerY, bounds.fallbackMin, bounds.fallbackMax);
  return clamp(args.centerY, bounds.lo, bounds.hi);
}

export function resolveSketchStackVerticalAnchor(args: {
  centerY: number;
  bottomY: number;
  topY: number;
  stackH: number;
  pad?: number | null;
}): SketchStackVerticalAnchor {
  const bounds = resolveCenterBounds(args);
  const centerY = clampCenterY(args);
  if (centerY <= bounds.lo + POSITION_EPSILON) return 'bottom';
  if (centerY >= bounds.hi - POSITION_EPSILON) return 'top';
  return 'center';
}

export function inferSketchStackVerticalAnchorFromNormalizedItem(args: {
  item: SketchStackPositionItem;
  stackH: number;
  totalHeight: number;
}): SketchStackVerticalAnchor {
  const explicit = readExplicitAnchor(args.item);
  if (explicit) return explicit;

  const yNormC = readFiniteNumber(args.item.yNormC);
  const yNormBase = readFiniteNumber(args.item.yNorm);
  if (yNormBase != null && yNormBase <= POSITION_EPSILON) return 'bottom';

  if (yNormC != null && yNormBase != null) {
    const halfStackNorm = yNormC - yNormBase;
    const topGapNorm = 1 - yNormC;
    if (
      halfStackNorm >= -POSITION_EPSILON &&
      topGapNorm >= -POSITION_EPSILON &&
      Math.abs(topGapNorm - halfStackNorm) <= POSITION_EPSILON * 10
    ) {
      return 'top';
    }
  }

  if (yNormC != null) {
    if (yNormC <= POSITION_EPSILON) return 'bottom';
    if (yNormC >= 1 - POSITION_EPSILON) return 'top';
  }

  const totalHeight = readFiniteNumber(args.totalHeight) ?? 0;
  if (totalHeight > 0 && yNormBase != null) {
    const stackNorm = args.stackH / totalHeight;
    if (yNormBase + stackNorm >= 1 - POSITION_EPSILON) return 'top';
  }

  return 'center';
}

export function resolveSketchStackCenterYFromNormalizedItem(args: {
  item: SketchStackPositionItem;
  bottomY: number;
  topY: number;
  totalHeight: number;
  normBottomY?: number;
  normHeight?: number;
  stackH: number;
  pad?: number | null;
}): number | null {
  const totalHeight =
    readFiniteNumber(args.totalHeight) ??
    (Number.isFinite(args.topY - args.bottomY) ? args.topY - args.bottomY : 0);
  const normHeight = readFiniteNumber(args.normHeight) ?? totalHeight;
  const normBottomY = readFiniteNumber(args.normBottomY) ?? args.bottomY;
  if (!(normHeight > 0)) return null;

  const anchor = inferSketchStackVerticalAnchorFromNormalizedItem({
    item: args.item,
    stackH: args.stackH,
    totalHeight: normHeight,
  });
  const bounds = resolveCenterBounds(args);
  if (anchor === 'bottom') return clampCenterY({ ...args, centerY: bounds.lo });
  if (anchor === 'top') return clampCenterY({ ...args, centerY: bounds.hi });

  const yNormC = readFiniteNumber(args.item.yNormC);
  const yNormBase = readFiniteNumber(args.item.yNorm);
  if (yNormC != null) {
    return clampCenterY({
      ...args,
      centerY: normBottomY + clampUnit(yNormC) * normHeight,
    });
  }
  if (yNormBase != null) {
    return clampCenterY({
      ...args,
      centerY: normBottomY + clampUnit(yNormBase) * normHeight + args.stackH / 2,
    });
  }
  return null;
}
