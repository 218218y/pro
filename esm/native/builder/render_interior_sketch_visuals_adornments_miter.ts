import type { InteriorGeometryLike } from './render_interior_ops_contracts.js';

import { readObject, toFiniteNumber } from './render_interior_sketch_shared.js';
import type { IndexedGeometryLike } from './render_interior_sketch_visuals_adornments_contracts.js';

export function stripSketchCorniceMiterCaps(
  geometry: InteriorGeometryLike | null | undefined,
  stripStart: boolean,
  stripEnd: boolean
): void {
  try {
    if (!stripStart && !stripEnd) return;
    const indexedGeometry = readObject<IndexedGeometryLike>(geometry);
    const getIndex = indexedGeometry?.getIndex;
    const getAttribute = indexedGeometry?.getAttribute;
    const setIndex = indexedGeometry?.setIndex;
    if (
      typeof getIndex !== 'function' ||
      typeof getAttribute !== 'function' ||
      typeof setIndex !== 'function'
    ) {
      return;
    }
    const index = getIndex.call(indexedGeometry);
    const position = getAttribute.call(indexedGeometry, 'position');
    if (!index || !index.array || !position || !Number.isFinite(position.count)) return;

    const vertexCount = Number(position.count);
    if (vertexCount <= 0 || vertexCount % 2 !== 0) return;
    const layerSize = vertexCount / 2;
    const kept: number[] = [];
    for (let i = 0; i < index.array.length; i += 3) {
      const a = Number(index.array[i]);
      const b = Number(index.array[i + 1]);
      const c = Number(index.array[i + 2]);
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue;
      const isStartCap = a < layerSize && b < layerSize && c < layerSize;
      const isEndCap = a >= layerSize && b >= layerSize && c >= layerSize;
      if ((stripStart && isStartCap) || (stripEnd && isEndCap)) continue;
      kept.push(a, b, c);
    }
    if (kept.length > 0) setIndex.call(indexedGeometry, kept);
  } catch {
    // ignore sketch-only miter-cap cleanup failures
  }
}

export function readCorniceSegmentTrim(value: unknown): number | null {
  return toFiniteNumber(value);
}
