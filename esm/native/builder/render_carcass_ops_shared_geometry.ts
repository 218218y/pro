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
  g: ExtrudeGeometryLike,
  stripStart: boolean,
  stripEnd: boolean,
  onError: (err: unknown) => void
): void {
  try {
    if (!stripStart && !stripEnd) return;
    const idx = g.getIndex?.();
    const posAttr = g.getAttribute?.('position');
    if (!idx || !idx.array || !posAttr) return;

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
