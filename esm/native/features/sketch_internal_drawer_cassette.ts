import { DRAWER_DIMENSIONS, MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export const SKETCH_INTERNAL_DRAWER_CASSETTE_TOUCH_EPSILON_M = 1e-6;
export const SKETCH_INTERNAL_DRAWER_CASSETTE_PANEL_SUFFIXES = ['bottom', 'top', 'left', 'right'] as const;

export type SketchInternalDrawerCassettePanelSuffix =
  (typeof SKETCH_INTERNAL_DRAWER_CASSETTE_PANEL_SUFFIXES)[number];

type DrawerCassetteRangeArgs = {
  baseY: number;
  stackH: number;
  woodThick?: unknown;
};

export type SketchInternalDrawerCassetteRange = {
  minY: number;
  maxY: number;
  height: number;
  woodThick: number;
};

function readPositiveFinite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : value != null && value !== '' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isCassettePanelSuffix(value: string): value is SketchInternalDrawerCassettePanelSuffix {
  return (SKETCH_INTERNAL_DRAWER_CASSETTE_PANEL_SUFFIXES as readonly string[]).includes(value);
}

export function createSketchInternalDrawerCassettePanelPartId(args: {
  stackPartId: string;
  panel: SketchInternalDrawerCassettePanelSuffix;
}): string {
  return `${args.stackPartId}_cassette_${args.panel}`;
}

export function readSketchInternalDrawerCassettePanelPartId(partId: unknown): {
  stackPartId: string;
  panel: SketchInternalDrawerCassettePanelSuffix;
} | null {
  const text = typeof partId === 'string' ? String(partId) : '';
  if (!text) return null;
  const marker = '_cassette_';
  const at = text.lastIndexOf(marker);
  if (at <= 0) return null;
  const stackPartId = text.slice(0, at);
  const panel = text.slice(at + marker.length);
  if (!stackPartId || !isCassettePanelSuffix(panel)) return null;
  return { stackPartId, panel };
}

export function isSketchInternalDrawerCassettePanelPartId(partId: unknown): boolean {
  return !!readSketchInternalDrawerCassettePanelPartId(partId);
}

export function resolveSketchInternalDrawerCassettePanelPaintTargetKeys(partId: unknown): string[] | null {
  const parsed = readSketchInternalDrawerCassettePanelPartId(partId);
  if (!parsed) return null;
  return SKETCH_INTERNAL_DRAWER_CASSETTE_PANEL_SUFFIXES.map(panel =>
    createSketchInternalDrawerCassettePanelPartId({ stackPartId: parsed.stackPartId, panel })
  );
}

export function resolveSketchInternalDrawerCassetteWoodThick(value: unknown): number {
  return readPositiveFinite(value) ?? MATERIAL_DIMENSIONS.wood.thicknessM;
}

export function resolveSketchInternalDrawerCassetteRange(
  args: DrawerCassetteRangeArgs
): SketchInternalDrawerCassetteRange {
  const woodThick = resolveSketchInternalDrawerCassetteWoodThick(args.woodThick);
  const baseY = Number.isFinite(args.baseY) ? args.baseY : 0;
  const stackH = Number.isFinite(args.stackH) && args.stackH > 0 ? args.stackH : 0;
  return {
    minY: baseY - woodThick,
    maxY: baseY + stackH + woodThick,
    height: stackH + woodThick * 2,
    woodThick,
  };
}

export function verticalRangesTouchOrOverlap(args: {
  minY: number;
  maxY: number;
  otherMinY: number;
  otherMaxY: number;
  epsilonM?: number;
}): boolean {
  const epsilonM =
    typeof args.epsilonM === 'number' && Number.isFinite(args.epsilonM) && args.epsilonM >= 0
      ? args.epsilonM
      : SKETCH_INTERNAL_DRAWER_CASSETTE_TOUCH_EPSILON_M;
  const aMin = Math.min(args.minY, args.maxY);
  const aMax = Math.max(args.minY, args.maxY);
  const bMin = Math.min(args.otherMinY, args.otherMaxY);
  const bMax = Math.max(args.otherMinY, args.otherMaxY);
  return aMax >= bMin - epsilonM && aMin <= bMax + epsilonM;
}

export function resolveSketchInternalDrawerCassetteDrawerWidth(args: {
  outerWidth: number;
  woodThick?: unknown;
  clearanceM?: number;
  minWidthM?: number;
}): number {
  const outerWidth = Number.isFinite(args.outerWidth) && args.outerWidth > 0 ? args.outerWidth : 0;
  const woodThick = resolveSketchInternalDrawerCassetteWoodThick(args.woodThick);
  const clearanceM =
    typeof args.clearanceM === 'number' && Number.isFinite(args.clearanceM) && args.clearanceM >= 0
      ? args.clearanceM
      : DRAWER_DIMENSIONS.sketch.internalWidthClearanceM;
  const minWidthM =
    typeof args.minWidthM === 'number' && Number.isFinite(args.minWidthM) && args.minWidthM > 0
      ? args.minWidthM
      : DRAWER_DIMENSIONS.sketch.internalWidthMinM;
  return Math.max(minWidthM, outerWidth - woodThick * 2 - clearanceM);
}
