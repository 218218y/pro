import type {
  ExtrudeGeometryLike,
  RenderCarcassContext,
  ThreeCtorLike,
} from './render_carcass_ops_shared_contracts.js';
import { readGeometryRuntimeNumber } from './geometry_runtime_contracts.js';

export function __backPanelMaterial(
  ctx: RenderCarcassContext,
  THREE: ThreeCtorLike,
  sketchMode: boolean
): unknown {
  return sketchMode
    ? new THREE.MeshBasicMaterial({ color: 0xffffff })
    : [ctx.masoniteMat, ctx.masoniteMat, ctx.masoniteMat, ctx.masoniteMat, ctx.whiteMat, ctx.masoniteMat];
}

function readGeometryIndex(value: unknown): number | null {
  const n = readGeometryRuntimeNumber(value);
  return n != null && n >= 0 && Number.isInteger(n) ? n : null;
}

export function __stripMiterCaps(
  g: Pick<ExtrudeGeometryLike, 'getIndex' | 'setIndex' | 'groups' | 'clearGroups' | 'addGroup'> & {
    getAttribute?: (name: string) => { count: number } | null | undefined;
  },
  stripStart: boolean,
  stripEnd: boolean,
  onError: (err: unknown) => void
): void {
  try {
    if (!stripStart && !stripEnd) return;
    const idx = g.getIndex?.();
    const posAttr = g.getAttribute?.('position');
    if (!posAttr || typeof g.setIndex !== 'function') return;

    // Three.js ExtrudeGeometry is non-indexed. Its first geometry group holds
    // equal-sized start/end cap triangles; the remaining group holds walls.
    // Removing only indexed caps silently left real corner faces in place.
    if (!idx) {
      const group = g.groups?.[0];
      const capCount = group?.count;
      const vertexCount = readGeometryIndex(posAttr.count);
      if (
        !group ||
        group.start !== 0 ||
        typeof capCount !== 'number' ||
        !Number.isInteger(capCount) ||
        !capCount ||
        capCount % 6 !== 0 ||
        vertexCount == null ||
        vertexCount < capCount ||
        vertexCount % 3 !== 0
      )
        return;

      const capHalf = capCount / 2;
      const keepTriangle = (start: number) =>
        !((stripStart && start < capHalf) || (stripEnd && start >= capHalf && start < capCount));
      const kept: number[] = [];
      for (let start = 0; start < vertexCount; start += 3) {
        if (keepTriangle(start)) kept.push(start, start + 1, start + 2);
      }
      if (!kept.length) return;
      g.setIndex(kept);
      if (g.groups && typeof g.clearGroups === 'function' && typeof g.addGroup === 'function') {
        const nextGroups: Array<{ start: number; count: number; materialIndex: number }> = [];
        let nextStart = 0;
        for (const original of g.groups) {
          let count = 0;
          for (let start = original.start; start < original.start + original.count; start += 3) {
            if (keepTriangle(start)) count += 3;
          }
          if (count) nextGroups.push({ start: nextStart, count, materialIndex: original.materialIndex ?? 0 });
          nextStart += count;
        }
        g.clearGroups();
        for (const next of nextGroups) g.addGroup(next.start, next.count, next.materialIndex);
      }
      return;
    }
    if (!idx.array) return;

    const vCount = readGeometryIndex(posAttr.count);
    if (vCount == null || vCount <= 0 || vCount % 2 !== 0) return;
    const layerSize = vCount / 2;

    const arr = idx.array;
    const kept: number[] = [];
    for (let i = 0; i < arr.length; i += 3) {
      const a = readGeometryIndex(arr[i]);
      const b = readGeometryIndex(arr[i + 1]);
      const c = readGeometryIndex(arr[i + 2]);
      if (a == null || b == null || c == null) continue;

      const isStartCap = a < layerSize && b < layerSize && c < layerSize;
      const isEndCap = a >= layerSize && b >= layerSize && c >= layerSize;

      if ((stripStart && isStartCap) || (stripEnd && isEndCap)) continue;
      kept.push(a, b, c);
    }

    if (kept.length > 0) g.setIndex?.(kept);
  } catch (err) {
    onError(err);
  }
}
