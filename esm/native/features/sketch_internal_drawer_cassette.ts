import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

export type SketchInternalDrawerCassetteMetrics = {
  panelThicknessM: number;
  drawerStackH: number;
  outerH: number;
  drawerMinY: number;
  drawerMaxY: number;
  minY: number;
  maxY: number;
  centerY: number;
};

function readPositiveFinite(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function resolveInternalDrawerCassettePanelThickness(value: unknown): number {
  return readPositiveFinite(value, MATERIAL_DIMENSIONS.wood.thicknessM);
}

export function resolveInternalDrawerWidthInsideCassette(args: {
  outerWidth: number;
  panelThicknessM: number;
  minWidthM: number;
}): number {
  const outerWidth = readPositiveFinite(args.outerWidth, 0);
  const panelThicknessM = resolveInternalDrawerCassettePanelThickness(args.panelThicknessM);
  const minWidthM = Math.max(0, readPositiveFinite(args.minWidthM, 0));
  return Math.max(minWidthM, outerWidth - panelThicknessM * 2);
}

export function internalDrawerCassetteHasUsableWidth(args: {
  outerWidth: number;
  panelThicknessM: number;
  minWidthM: number;
}): boolean {
  const outerWidth = readPositiveFinite(args.outerWidth, 0);
  const panelThicknessM = resolveInternalDrawerCassettePanelThickness(args.panelThicknessM);
  const minWidthM = Math.max(0, readPositiveFinite(args.minWidthM, 0));
  return outerWidth > panelThicknessM * 2 + minWidthM;
}

export function resolveInternalDrawerCassetteMetrics(args: {
  baseY: number;
  drawerStackH: number;
  panelThicknessM: number;
}): SketchInternalDrawerCassetteMetrics {
  const panelThicknessM = resolveInternalDrawerCassettePanelThickness(args.panelThicknessM);
  const drawerStackH = Math.max(0, readPositiveFinite(args.drawerStackH, 0));
  const drawerMinY = Number.isFinite(args.baseY) ? args.baseY : 0;
  const drawerMaxY = drawerMinY + drawerStackH;
  const minY = drawerMinY - panelThicknessM;
  const maxY = drawerMaxY + panelThicknessM;
  return {
    panelThicknessM,
    drawerStackH,
    outerH: Math.max(0, maxY - minY),
    drawerMinY,
    drawerMaxY,
    minY,
    maxY,
    centerY: (minY + maxY) / 2,
  };
}

export function resolveInternalDrawerCassetteMetricsFromCenter(args: {
  centerY: number;
  drawerStackH: number;
  panelThicknessM: number;
}): SketchInternalDrawerCassetteMetrics {
  const drawerStackH = Math.max(0, readPositiveFinite(args.drawerStackH, 0));
  const centerY = Number.isFinite(args.centerY) ? args.centerY : 0;
  return resolveInternalDrawerCassetteMetrics({
    baseY: centerY - drawerStackH / 2,
    drawerStackH,
    panelThicknessM: args.panelThicknessM,
  });
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function resolveSketchShelfCassetteCollisionHeight(args: {
  variant?: unknown;
  woodThick?: unknown;
}): number {
  const woodThick = resolveInternalDrawerCassettePanelThickness(args.woodThick);
  const variant = typeof args.variant === 'string' && args.variant ? args.variant : 'regular';
  if (variant === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  if (variant === 'double') {
    return Math.max(woodThick, woodThick * INTERIOR_FITTINGS_DIMENSIONS.shelves.doubleThicknessMultiplier);
  }
  return woodThick;
}

function shelfMatchesOptionalXNorm(args: {
  shelf: Record<string, unknown>;
  xNorm?: number | null;
  matchXNorm?: boolean;
}): boolean {
  if (!args.matchXNorm) return true;
  const xNorm = readFiniteNumber(args.xNorm);
  const shelfXNorm = readFiniteNumber(args.shelf.xNorm);
  if (xNorm == null || shelfXNorm == null) return true;
  return Math.abs(clampUnit(xNorm) - clampUnit(shelfXNorm)) <= 1e-6;
}

export function removeSketchShelvesOverlappingInternalDrawerCassette(args: {
  shelves: unknown[];
  cassetteMinY: number;
  cassetteMaxY: number;
  bottomY: number;
  spanH: number;
  woodThick?: unknown;
  xNorm?: number | null;
  matchXNorm?: boolean;
}): number {
  if (!Array.isArray(args.shelves) || !args.shelves.length) return 0;
  if (!(Number.isFinite(args.spanH) && args.spanH > 0)) return 0;
  const cassetteMinY = Math.min(args.cassetteMinY, args.cassetteMaxY);
  const cassetteMaxY = Math.max(args.cassetteMinY, args.cassetteMaxY);
  if (!(cassetteMaxY > cassetteMinY)) return 0;

  let removed = 0;
  for (let i = args.shelves.length - 1; i >= 0; i -= 1) {
    const shelf = readRecord(args.shelves[i]);
    if (!shelf || !shelfMatchesOptionalXNorm({ shelf, xNorm: args.xNorm, matchXNorm: args.matchXNorm })) {
      continue;
    }
    const yNorm = readFiniteNumber(shelf.yNorm);
    if (yNorm == null) continue;
    const shelfCenterY = args.bottomY + clampUnit(yNorm) * args.spanH;
    const shelfH = resolveSketchShelfCassetteCollisionHeight({
      variant: shelf.variant,
      woodThick: args.woodThick,
    });
    if (
      verticalRangesOverlap({
        minA: shelfCenterY - shelfH / 2,
        maxA: shelfCenterY + shelfH / 2,
        minB: cassetteMinY,
        maxB: cassetteMaxY,
      })
    ) {
      args.shelves.splice(i, 1);
      removed += 1;
    }
  }
  return removed;
}

export function verticalRangesOverlap(args: {
  minA: number;
  maxA: number;
  minB: number;
  maxB: number;
  epsilonM?: number;
}): boolean {
  const epsilonM = typeof args.epsilonM === 'number' && Number.isFinite(args.epsilonM) ? args.epsilonM : 1e-9;
  const minA = Math.min(args.minA, args.maxA);
  const maxA = Math.max(args.minA, args.maxA);
  const minB = Math.min(args.minB, args.maxB);
  const maxB = Math.max(args.minB, args.maxB);
  return maxA > minB + epsilonM && minA < maxB - epsilonM;
}
