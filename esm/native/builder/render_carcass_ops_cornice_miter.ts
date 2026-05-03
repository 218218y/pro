import type {
  CorniceSegment,
  ExtrudeGeometryLike,
  ProfilePoint,
  RenderCarcassRuntime,
} from './render_carcass_ops_shared.js';
import { __asFinite, __stripMiterCaps } from './render_carcass_ops_shared.js';

export function applyMiterTrims(
  geo: ExtrudeGeometryLike,
  profile: ProfilePoint[],
  segLen: number,
  seg: CorniceSegment,
  runtime: RenderCarcassRuntime
): void {
  const miterStartTrim = __asFinite(seg.miterStartTrim);
  const miterEndTrim = __asFinite(seg.miterEndTrim);
  if (
    !(Number.isFinite(miterStartTrim) && miterStartTrim > 0) &&
    !(Number.isFinite(miterEndTrim) && miterEndTrim > 0)
  ) {
    return;
  }

  let xOuter = -Infinity;
  for (let pi = 0; pi < profile.length; pi++) {
    const p = profile[pi] || {};
    const px = __asFinite(p.x);
    if (Number.isFinite(px)) xOuter = Math.max(xOuter, px);
  }
  if (!Number.isFinite(xOuter) || xOuter <= 0) xOuter = 0.001;

  const pos = geo.getAttribute('position');
  const zPos = segLen / 2;
  const zNeg = -segLen / 2;
  const epsZ = 5e-4;

  for (let vi = 0; vi < pos.count; vi++) {
    const vx = Number(pos.getX(vi));
    const vz = Number(pos.getZ(vi));
    if (Number.isFinite(miterEndTrim) && miterEndTrim > 0 && Math.abs(vz - zPos) < epsZ) {
      const tRaw = 1 - vx / xOuter;
      const t = vx < 0 ? Math.min(3, Math.max(0, tRaw)) : Math.min(1, Math.max(0, tRaw));
      pos.setZ(vi, vz - miterEndTrim * t);
    }
    if (Number.isFinite(miterStartTrim) && miterStartTrim > 0 && Math.abs(vz - zNeg) < epsZ) {
      const tRaw = 1 - vx / xOuter;
      const t = vx < 0 ? Math.min(3, Math.max(0, tRaw)) : Math.min(1, Math.max(0, tRaw));
      pos.setZ(vi, vz + miterStartTrim * t);
    }
  }

  __stripMiterCaps(
    geo,
    Number.isFinite(miterStartTrim) && miterStartTrim > 0,
    Number.isFinite(miterEndTrim) && miterEndTrim > 0,
    err =>
      runtime.renderOpsHandleCatch(runtime.App, 'applyCarcassOps.corniceMiter.stripCaps', err, undefined, {
        failFast: false,
        throttleMs: 10000,
      })
  );

  pos.needsUpdate = true;
  computeCorniceVertexNormals(geo, runtime, 'applyCarcassOps.cornice.computeVertexNormals.miter');
}

export function computeCorniceVertexNormals(
  geo: ExtrudeGeometryLike,
  runtime: RenderCarcassRuntime,
  op: string
): void {
  try {
    geo.computeVertexNormals();
  } catch (err) {
    runtime.renderOpsHandleCatch(runtime.App, op, err, undefined, {
      failFast: false,
      throttleMs: 5000,
    });
  }
}
