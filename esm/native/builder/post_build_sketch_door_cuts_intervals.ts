// Post-build sketch external-drawer door-cut interval helpers (Pure ESM)
//
// Owns interval normalization/subtraction and grouped drawer-stack bounds helpers.

import type {
  SketchDrawerCutSegment,
  SketchDrawerStackBounds,
} from './post_build_sketch_door_cuts_contracts.js';

export function normalizeSketchDrawerCutIntervals(list: SketchDrawerCutSegment[]): SketchDrawerCutSegment[] {
  const sorted = list
    .filter(seg => Number.isFinite(seg.yMin) && Number.isFinite(seg.yMax) && seg.yMax - seg.yMin > 0.01)
    .sort((a, b) => a.yMin - b.yMin);
  if (!sorted.length) return [];
  const merged: SketchDrawerCutSegment[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.yMin <= prev.yMax + 0.002) {
      prev.yMax = Math.max(prev.yMax, cur.yMax);
      continue;
    }
    merged.push({ ...cur });
  }
  return merged;
}

export function subtractSketchDrawerIntervals(
  doorMin: number,
  doorMax: number,
  cuts: SketchDrawerCutSegment[]
): SketchDrawerCutSegment[] {
  let cursor = doorMin;
  const visible: SketchDrawerCutSegment[] = [];
  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i];
    if (cut.yMax <= cursor) continue;
    if (cut.yMin >= doorMax) break;
    if (cut.yMin > cursor + 0.012) {
      visible.push({ yMin: cursor, yMax: Math.min(doorMax, cut.yMin) });
    }
    cursor = Math.max(cursor, cut.yMax);
    if (cursor >= doorMax) break;
  }
  if (cursor < doorMax - 0.012) visible.push({ yMin: cursor, yMax: doorMax });
  return visible;
}

export function groupSketchDrawerStackBounds<TKey extends string>(
  entries: Array<SketchDrawerStackBounds & { key: TKey }>
): Map<TKey, SketchDrawerStackBounds[]> {
  const grouped = new Map<TKey, SketchDrawerStackBounds[]>();
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    const list = grouped.get(item.key);
    const bounds = { xMin: item.xMin, xMax: item.xMax, yMin: item.yMin, yMax: item.yMax };
    if (list) list.push(bounds);
    else grouped.set(item.key, [bounds]);
  }
  return grouped;
}

export function expandSketchDrawerCutBounds(
  bounds: SketchDrawerStackBounds,
  gap: number
): SketchDrawerStackBounds {
  return { xMin: bounds.xMin, xMax: bounds.xMax, yMin: bounds.yMin - gap, yMax: bounds.yMax + gap };
}
