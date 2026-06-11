import type { CorniceOp, CorniceSegment, RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import {
  __asBool,
  __asFinite,
  __asString,
  __isCorniceSegment,
  __profilePoints,
  __readArray,
} from './render_carcass_ops_shared.js';
import { finalizeCorniceMesh } from './render_carcass_ops_cornice_finalize.js';
import { applyLegacyCornice } from './render_carcass_ops_cornice_legacy.js';
import {
  createProfileSegment,
  createWaveFrontSegment,
  createWaveSideSegment,
} from './render_carcass_ops_cornice_segments.js';

export function createApplyCarcassCorniceOps() {
  function applyCarcassCorniceOps(
    cornice: CorniceOp | null | undefined,
    runtime: RenderCarcassRuntime
  ): void {
    if (!cornice || cornice.kind !== 'cornice') return;

    const { ctx, getPartMaterial } = runtime;
    const pid = __asString(cornice.partId, 'cornice_color');
    const corniceMat = ctx.corniceMat || (getPartMaterial ? getPartMaterial(pid) : null) || ctx.bodyMat;
    const segments = __readArray(cornice.segments, __isCorniceSegment);

    if (segments && segments.length) {
      for (let si = 0; si < segments.length; si++) {
        applyCorniceSegment(segments[si], pid, corniceMat, runtime);
      }
      return;
    }

    applyLegacyCornice(cornice, pid, corniceMat, runtime);
  }

  return {
    applyCarcassCorniceOps,
  };
}

export function applyCorniceSegment(
  seg: CorniceSegment | null | undefined,
  pid: string,
  corniceMat: unknown,
  runtime: RenderCarcassRuntime
): void {
  const { THREE, ctx } = runtime;
  if (!seg || typeof seg !== 'object') return;

  const x = __asFinite(seg.x);
  const y = __asFinite(seg.y);
  const z = __asFinite(seg.z);
  const segPid = __asString(seg.partId, pid);
  // Main wardrobe cornice now paints as one canonical group.
  // All classic/wave cornice segments inherit the shared corniceMat
  // instead of resolving per-segment part colors.
  const segMat = corniceMat || ctx.bodyMat;
  const profile = __profilePoints(seg.profile);
  const segLen = __asFinite(seg.length);
  const rotY = __asFinite(seg.rotationY);
  const flipX = __asBool(seg.flipX);
  const kind = __asString(seg.kind);

  if (
    kind === 'cornice_wave_front' &&
    typeof THREE.Shape === 'function' &&
    typeof THREE.ExtrudeGeometry === 'function'
  ) {
    const mesh = createWaveFrontSegment({ THREE, seg, segMat });
    if (!mesh) return;
    finalizeCorniceMesh(mesh, { x, y, z, flipX, rotY, segPid }, runtime);
    return;
  }

  if (
    kind === 'cornice_wave_side' &&
    typeof THREE.Shape === 'function' &&
    typeof THREE.ExtrudeGeometry === 'function'
  ) {
    const mesh = createWaveSideSegment({ THREE, seg, segMat });
    if (!mesh) return;
    finalizeCorniceMesh(mesh, { x, y, z, flipX, rotY, segPid }, runtime);
    return;
  }

  if (
    profile &&
    profile.length >= 2 &&
    Number.isFinite(segLen) &&
    segLen > 0 &&
    typeof THREE.Shape === 'function' &&
    typeof THREE.ExtrudeGeometry === 'function'
  ) {
    const mesh = createProfileSegment({ THREE, seg, segMat, profile, segLen }, runtime);
    if (!mesh) return;
    finalizeCorniceMesh(mesh, { x, y, z, flipX, rotY, segPid }, runtime);
    return;
  }

  const w = __asFinite(seg.width);
  const h = __asFinite(seg.height);
  const d = __asFinite(seg.depth);
  if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(d)) return;

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), segMat);
  finalizeCorniceMesh(
    mesh,
    { x, y, z: Number.isFinite(z) ? z : 0, flipX, rotY, segPid, fallbackY: h / 2 },
    runtime
  );
}
