import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

import {
  normalizeSketchFreeBoxDimensionEntry,
  resolveSketchFreeBoxDimensionTolerance,
  type SketchFreeBoxDimensionEntry,
  type SketchFreeBoxDimensionSegment,
  type SketchFreeBoxDimensionSpan,
} from './render_interior_sketch_layout_dimensions_shared.js';

export function areSketchFreeBoxDimensionSegmentsAdjacent(
  left: SketchFreeBoxDimensionSegment,
  right: SketchFreeBoxDimensionSegment
): boolean {
  const tolX = resolveSketchFreeBoxDimensionTolerance(
    Math.min(left.width, right.width),
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupAdjacentToleranceXMinM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupAdjacentToleranceXMaxM
  );
  const tolY = resolveSketchFreeBoxDimensionTolerance(
    Math.min(left.height, right.height),
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupAdjacentToleranceYMinM,
    SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupAdjacentToleranceYMaxM
  );
  const gapX = Math.max(0, Math.max(left.minX, right.minX) - Math.min(left.maxX, right.maxX));
  const gapY = Math.max(0, Math.max(left.bottomY, right.bottomY) - Math.min(left.topY, right.topY));
  const overlapX = Math.min(left.maxX, right.maxX) - Math.max(left.minX, right.minX);
  const overlapY = Math.min(left.topY, right.topY) - Math.max(left.bottomY, right.bottomY);
  const horizontallyConnected = gapX <= tolX && overlapY >= -tolY;
  const verticallyConnected = gapY <= tolY && overlapX >= -tolX;
  return horizontallyConnected || verticallyConnected;
}

export function groupSketchFreeBoxDimensionEntries(
  entries: SketchFreeBoxDimensionEntry[]
): SketchFreeBoxDimensionSegment[][] {
  const segments = entries
    .map(normalizeSketchFreeBoxDimensionEntry)
    .filter((entry): entry is SketchFreeBoxDimensionSegment => !!entry);
  if (!segments.length) return [];

  const visited = new Array(segments.length).fill(false);
  const groups: SketchFreeBoxDimensionSegment[][] = [];

  for (let i = 0; i < segments.length; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const queue = [i];
    const group: SketchFreeBoxDimensionSegment[] = [];

    while (queue.length) {
      const currentIndex = queue.shift();
      if (currentIndex == null) continue;
      const current = segments[currentIndex];
      if (!current) continue;
      group.push(current);

      for (let nextIndex = 0; nextIndex < segments.length; nextIndex++) {
        if (visited[nextIndex]) continue;
        const candidate = segments[nextIndex];
        if (!candidate) continue;
        if (!areSketchFreeBoxDimensionSegmentsAdjacent(current, candidate)) continue;
        visited[nextIndex] = true;
        queue.push(nextIndex);
      }
    }

    group.sort((a, b) => (a.minX === b.minX ? a.bottomY - b.bottomY : a.minX - b.minX));
    groups.push(group);
  }

  groups.sort((a, b) => {
    const aMinX = a.length ? a[0].minX : 0;
    const bMinX = b.length ? b[0].minX : 0;
    return aMinX - bMinX;
  });

  return groups;
}

export function mergeSketchFreeBoxDimensionSpans(
  spans: SketchFreeBoxDimensionSpan[]
): SketchFreeBoxDimensionSpan[] {
  if (!spans.length) return [];
  const sorted = [...spans].sort((a, b) => (a.min === b.min ? a.max - b.max : a.min - b.min));
  const merged: SketchFreeBoxDimensionSpan[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const span = sorted[i];
    if (!span) continue;
    const spanWidth = span.max - span.min;
    const tol = resolveSketchFreeBoxDimensionTolerance(
      spanWidth,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupSpanMergeToleranceMinM,
      SKETCH_BOX_DIMENSIONS.dimensionOverlay.groupSpanMergeToleranceMaxM
    );
    let matched = false;

    for (let j = 0; j < merged.length; j++) {
      const existing = merged[j];
      if (!existing) continue;
      const minClose = Math.abs(span.min - existing.min) <= tol;
      const maxClose = Math.abs(span.max - existing.max) <= tol;
      if (!minClose || !maxClose) continue;
      existing.min = (existing.min + span.min) / 2;
      existing.max = (existing.max + span.max) / 2;
      matched = true;
      break;
    }

    if (!matched) merged.push({ min: span.min, max: span.max });
  }

  merged.sort((a, b) => (a.min === b.min ? a.max - b.max : a.min - b.min));
  return merged;
}
