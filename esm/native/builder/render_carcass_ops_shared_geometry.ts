import type {
  ExtrudeGeometryLike,
  RenderCarcassContext,
  ThreeCtorLike,
} from './render_carcass_ops_shared_contracts.js';

export function __backPanelMaterial(
  ctx: RenderCarcassContext,
  THREE: ThreeCtorLike,
  sketchMode: boolean
): unknown {
  return sketchMode
    ? new THREE.MeshBasicMaterial({ color: 0xffffff })
    : [ctx.masoniteMat, ctx.masoniteMat, ctx.masoniteMat, ctx.masoniteMat, ctx.whiteMat, ctx.masoniteMat];
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
    if (!idx || !idx.array || !posAttr || !Number.isFinite(posAttr.count)) return;

    const vCount = Number(posAttr.count);
    if (vCount <= 0 || vCount % 2 !== 0) return;
    const layerSize = vCount / 2;

    const arr = idx.array;
    const kept: number[] = [];
    for (let i = 0; i < arr.length; i += 3) {
      const a = Number(arr[i]);
      const b = Number(arr[i + 1]);
      const c = Number(arr[i + 2]);
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue;

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
