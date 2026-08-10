import type { CorniceOp, CorniceSegment, RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import { finalizeCorniceMesh } from './render_carcass_ops_cornice_finalize.js';
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
    const pid = cornice.partId || 'cornice_color';
    const corniceMat = (getPartMaterial ? getPartMaterial(pid) : null) || ctx.corniceMat || ctx.bodyMat;
    const segments = cornice.segments;

    if (!segments.length) return;

    for (let si = 0; si < segments.length; si++) {
      applyCorniceSegment(segments[si], pid, corniceMat, runtime);
    }
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
  const { THREE, ctx, getPartMaterial } = runtime;
  if (!seg) return;

  const segPid = seg.partId || pid;
  const segMat = corniceMat || ctx.bodyMat;
  const rotY = seg.rotationY ?? 0;
  const flipX = seg.flipX === true;

  if (seg.kind === 'cornice_wave_front') {
    if (typeof THREE.Shape !== 'function' || typeof THREE.ExtrudeGeometry !== 'function') return;
    const mesh = createWaveFrontSegment({ THREE, seg, segMat, getPartMaterial, segPid });
    if (!mesh) return;
    finalizeCorniceMesh(mesh, { x: seg.x, y: seg.y, z: seg.z, flipX, rotY, segPid }, runtime);
    return;
  }

  if (seg.kind === 'cornice_wave_side') {
    if (typeof THREE.Shape !== 'function' || typeof THREE.ExtrudeGeometry !== 'function') return;
    const mesh = createWaveSideSegment({ THREE, seg, segMat, getPartMaterial, segPid });
    if (!mesh) return;
    finalizeCorniceMesh(mesh, { x: seg.x, y: seg.y, z: seg.z, flipX, rotY, segPid }, runtime);
    return;
  }

  if (typeof THREE.Shape !== 'function' || typeof THREE.ExtrudeGeometry !== 'function') return;
  const mesh = createProfileSegment(
    { THREE, seg, segMat, getPartMaterial, segPid, profile: seg.profile, segLen: seg.length },
    runtime
  );
  if (!mesh) return;
  finalizeCorniceMesh(mesh, { x: seg.x, y: seg.y, z: seg.z, flipX, rotY, segPid }, runtime);
}
