import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
  resolveSketchInternalDrawerMetrics,
  sketchStackFitsAvailableHeight,
} from '../features/sketch_drawer_sizing.js';
import { resolveSketchStackCenterYFromNormalizedItem } from '../features/sketch_stack_positioning.js';
import type { SketchDrawerExtra, SketchExternalDrawerExtra } from './render_interior_sketch_shared.js';

export type SketchStackCollisionRange = {
  minY: number;
  maxY: number;
  id: string;
};

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
}

function rangeFromCenter(centerY: number, stackH: number, id: string): SketchStackCollisionRange {
  return {
    id,
    minY: centerY - stackH / 2,
    maxY: centerY + stackH / 2,
  };
}

export function sketchStackRangeOverlaps(
  range: SketchStackCollisionRange,
  blockers: SketchStackCollisionRange[],
  gap: number = DRAWER_DIMENSIONS.sketch.verticalStackCollisionGapM
): boolean {
  return blockers.some(blocker => range.maxY > blocker.minY - gap && range.minY < blocker.maxY + gap);
}

export function buildSketchInternalDrawerCollisionRanges(args: {
  drawers: SketchDrawerExtra[];
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad?: number;
}): SketchStackCollisionRange[] {
  const availableHeightM = Math.max(0, args.topY - args.bottomY - (args.pad ?? 0) * 2);
  const ranges: SketchStackCollisionRange[] = [];
  for (let i = 0; i < args.drawers.length; i++) {
    const item = args.drawers[i] || null;
    if (!item) continue;
    const metrics = resolveSketchInternalDrawerMetrics({
      drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M),
    });
    if (!sketchStackFitsAvailableHeight(metrics.stackH, availableHeightM)) continue;
    const centerY = resolveSketchStackCenterYFromNormalizedItem({
      item,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      stackH: metrics.stackH,
      pad: args.pad,
    });
    if (centerY == null) continue;
    const id = item.id != null && String(item.id) ? String(item.id) : String(i);
    ranges.push(rangeFromCenter(centerY, metrics.stackH, id));
  }
  return ranges;
}

export function buildSketchExternalDrawerCollisionRanges(args: {
  extDrawers: SketchExternalDrawerExtra[];
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad?: number;
}): SketchStackCollisionRange[] {
  const availableHeightM = Math.max(0, args.topY - args.bottomY);
  const ranges: SketchStackCollisionRange[] = [];
  for (let i = 0; i < args.extDrawers.length; i++) {
    const item = args.extDrawers[i] || null;
    if (!item) continue;
    const metrics = resolveSketchExternalDrawerMetrics({
      drawerCount: readFiniteNumber(item.count),
      drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
    });
    if (!sketchStackFitsAvailableHeight(metrics.stackH, availableHeightM)) continue;
    const centerY = resolveSketchStackCenterYFromNormalizedItem({
      item,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      stackH: metrics.stackH,
      pad: args.pad,
    });
    if (centerY == null) continue;
    const id = item.id != null && String(item.id) ? String(item.id) : String(i);
    ranges.push(rangeFromCenter(centerY, metrics.stackH, id));
  }
  return ranges;
}
