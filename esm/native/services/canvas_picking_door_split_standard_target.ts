import type { AppContainer } from '../../../types';
import type { CanvasDoorSplitBounds } from './canvas_picking_door_split_click_contracts.js';
import {
  readCanvasDoorSketchVisibleSegments,
  readCanvasDoorSplitStandardPosList,
} from './canvas_picking_door_split_click_shared.js';
import { HINGED_DOOR_SPLIT_GEOMETRY_POLICY } from '../../shared/dimensions/door_system_policy.js';

function isUsableBounds(bounds: CanvasDoorSplitBounds | null | undefined): bounds is CanvasDoorSplitBounds {
  return !!(
    bounds &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxY) &&
    bounds.maxY > bounds.minY
  );
}

function isSketchBoxDoorBaseKey(doorBaseKey: string): boolean {
  return /^sketch_box(?:_free)?_.+_door(?:_|$)/i.test(String(doorBaseKey || ''));
}

function mergeSegmentsAcrossStoredSplitCuts(args: {
  segments: CanvasDoorSplitBounds[];
  bounds: CanvasDoorSplitBounds;
  splitPosList: readonly number[];
}): CanvasDoorSplitBounds[] {
  const { segments, bounds, splitPosList } = args;
  if (segments.length <= 1 || !splitPosList.length) return segments;

  const height = bounds.maxY - bounds.minY;
  if (!(height > 0)) return segments;
  const cutYs = splitPosList
    .map(value => Number(value))
    .filter(Number.isFinite)
    .map(value => bounds.minY + Math.max(0, Math.min(1, value)) * height);
  if (!cutYs.length) return segments;

  const tolerance = Math.max(
    HINGED_DOOR_SPLIT_GEOMETRY_POLICY.duplicateCutToleranceMaxM,
    HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM * 2
  );
  const firstSegment = segments[0];
  if (!firstSegment) return segments;

  const merged: CanvasDoorSplitBounds[] = [];
  let current: CanvasDoorSplitBounds = { ...firstSegment };

  for (const next of segments.slice(1)) {
    const gapMidY = (current.maxY + next.minY) / 2;
    const isStoredSplitGap = cutYs.some(cutY => Math.abs(cutY - gapMidY) <= tolerance);
    if (isStoredSplitGap) {
      current.maxY = Math.max(current.maxY, next.maxY);
      continue;
    }
    merged.push(current);
    current = { ...next };
  }
  merged.push(current);
  return merged;
}

export type CanvasDoorStandardSplitTarget = {
  isSketchManaged: boolean;
  isBottomRegion: boolean;
  bottomBounds: CanvasDoorSplitBounds;
  topBounds: CanvasDoorSplitBounds;
};

export function resolveCanvasDoorStandardSplitTarget(args: {
  App: AppContainer;
  doorBaseKey: string;
  bounds: CanvasDoorSplitBounds;
  hitY: number | null;
}): CanvasDoorStandardSplitTarget {
  const { App, doorBaseKey, bounds, hitY } = args;
  const visibleSegments = readCanvasDoorSketchVisibleSegments(App, doorBaseKey).filter(isUsableBounds);
  const isSketchManaged = isSketchBoxDoorBaseKey(doorBaseKey) || visibleSegments.length > 0;
  const splitStableSegments = mergeSegmentsAcrossStoredSplitCuts({
    segments: visibleSegments,
    bounds,
    splitPosList: readCanvasDoorSplitStandardPosList(App, doorBaseKey),
  });

  const bottomBounds = splitStableSegments[0] ?? bounds;
  const topBounds = splitStableSegments.at(-1) ?? bounds;
  const pointerY = typeof hitY === 'number' && Number.isFinite(hitY) ? hitY : null;

  let isBottomRegion = pointerY != null && pointerY <= bounds.minY + (bounds.maxY - bounds.minY) / 3;

  if (pointerY != null && splitStableSegments.length > 1) {
    if (pointerY >= bottomBounds.minY && pointerY <= bottomBounds.maxY) isBottomRegion = true;
    else if (pointerY >= topBounds.minY && pointerY <= topBounds.maxY) isBottomRegion = false;
  } else if (pointerY != null && splitStableSegments.length === 1) {
    isBottomRegion = pointerY <= bottomBounds.minY + (bottomBounds.maxY - bottomBounds.minY) / 3;
  }

  return { isSketchManaged, isBottomRegion, bottomBounds, topBounds };
}
