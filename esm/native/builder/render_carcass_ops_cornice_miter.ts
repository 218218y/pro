import type {
  CorniceSegment,
  ExtrudeGeometryLike,
  ProfilePoint,
  RenderCarcassRuntime,
} from './render_carcass_ops_shared.js';
import { __asFinite, __asString, __stripMiterCaps } from './render_carcass_ops_shared.js';

type CorniceMiterMode = 'inner_trim' | 'outer_extend';

function readGeometryAttrNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
}

function readCorniceMiterMode(seg: CorniceSegment): CorniceMiterMode {
  return __asString(seg.miterMode) === 'outer_extend' ? 'outer_extend' : 'inner_trim';
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function applyMiterTrims(
  geo: ExtrudeGeometryLike,
  profile: ProfilePoint[],
  segLen: number,
  seg: CorniceSegment,
  runtime: RenderCarcassRuntime
): void {
  const miterStartTrim = __asFinite(seg.miterStartTrim);
  const miterEndTrim = __asFinite(seg.miterEndTrim);
  const miterMode = readCorniceMiterMode(seg);
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

  const profileBaseY = (() => {
    let minPositiveY = Infinity;
    for (let pi = 0; pi < profile.length; pi++) {
      const p = profile[pi] || {};
      const py = __asFinite(p.y);
      if (Number.isFinite(py) && py > 0) minPositiveY = Math.min(minPositiveY, py);
    }
    return Number.isFinite(minPositiveY) ? minPositiveY + 1e-6 : 1e-6;
  })();
  const baseSealEps = 0.003;

  for (let vi = 0; vi < pos.count; vi++) {
    const vx = readGeometryAttrNumber(pos.getX(vi));
    const vy = typeof pos.getY === 'function' ? readGeometryAttrNumber(pos.getY(vi)) : NaN;
    const vz = readGeometryAttrNumber(pos.getZ(vi));
    if (!Number.isFinite(vx) || !Number.isFinite(vz)) continue;
    const innerTrimT = clamp01(1 - vx / xOuter);
    const outerExtendT = clamp01(vx / xOuter);
    const sealBase = Number.isFinite(vy) && vy <= profileBaseY && Number.isFinite(vx) && vx <= 0;
    if (Number.isFinite(miterEndTrim) && miterEndTrim > 0 && Math.abs(vz - zPos) < epsZ) {
      if (miterMode === 'outer_extend') {
        pos.setZ(vi, vz + miterEndTrim * outerExtendT);
      } else {
        let zNew = vz - miterEndTrim * innerTrimT;
        if (sealBase) zNew = Math.min(zPos, zNew + baseSealEps);
        pos.setZ(vi, zNew);
      }
    }
    if (Number.isFinite(miterStartTrim) && miterStartTrim > 0 && Math.abs(vz - zNeg) < epsZ) {
      if (miterMode === 'outer_extend') {
        pos.setZ(vi, vz - miterStartTrim * outerExtendT);
      } else {
        let zNew = vz + miterStartTrim * innerTrimT;
        if (sealBase) zNew = Math.max(zNeg, zNew - baseSealEps);
        pos.setZ(vi, zNew);
      }
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
