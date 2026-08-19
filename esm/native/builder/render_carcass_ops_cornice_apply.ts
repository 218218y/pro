import type { CorniceProfileSegment, CorniceWaveSideSegment } from './carcass_cornice_ir.js';
import {
  ROOM_ARCHITECTURE_EPSILON_M,
  intersectAxisAlignedBoxes,
  resolveActiveRoomColumnCutObstacle,
} from './room_architecture_geometry.js';
import type { AxisAlignedBox } from '../../../types';
import type { CorniceOp, CorniceSegment, RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import { finalizeCorniceMesh } from './render_carcass_ops_cornice_finalize.js';
import {
  createProfileSegment,
  createWaveFrontSegment,
  createWaveSideSegment,
} from './render_carcass_ops_cornice_segments.js';

const SIDE_PROFILE_ROTATION_EPSILON = 1e-7;

type ZRange = { minZ: number; maxZ: number };

function resolveWaveSideBox(seg: CorniceWaveSideSegment): AxisAlignedBox {
  return {
    minX: seg.x - seg.width / 2,
    maxX: seg.x + seg.width / 2,
    minY: seg.y - seg.height / 2,
    maxY: seg.y + seg.height / 2,
    minZ: seg.z - seg.depth / 2,
    maxZ: seg.z + seg.depth / 2,
  };
}

function resolveProfileSideBox(seg: CorniceProfileSegment): AxisAlignedBox | null {
  if (Math.abs(seg.rotationY) > SIDE_PROFILE_ROTATION_EPSILON) return null;
  if (!seg.profile.length) return null;

  let minLocalX = Infinity;
  let maxLocalX = -Infinity;
  let minLocalY = Infinity;
  let maxLocalY = -Infinity;
  for (let i = 0; i < seg.profile.length; i += 1) {
    const point = seg.profile[i];
    if (!point) continue;
    const localX = seg.flipX ? -point.x : point.x;
    minLocalX = Math.min(minLocalX, localX);
    maxLocalX = Math.max(maxLocalX, localX);
    minLocalY = Math.min(minLocalY, point.y);
    maxLocalY = Math.max(maxLocalY, point.y);
  }
  if (
    !Number.isFinite(minLocalX) ||
    !Number.isFinite(maxLocalX) ||
    !Number.isFinite(minLocalY) ||
    !Number.isFinite(maxLocalY)
  ) {
    return null;
  }

  return {
    minX: seg.x + minLocalX,
    maxX: seg.x + maxLocalX,
    minY: seg.y + minLocalY,
    maxY: seg.y + maxLocalY,
    minZ: seg.z - seg.length / 2,
    maxZ: seg.z + seg.length / 2,
  };
}

function subtractZRange(source: ZRange, cut: ZRange): ZRange[] {
  const ranges: ZRange[] = [];
  if (cut.minZ - source.minZ > ROOM_ARCHITECTURE_EPSILON_M) {
    ranges.push({ minZ: source.minZ, maxZ: cut.minZ });
  }
  if (source.maxZ - cut.maxZ > ROOM_ARCHITECTURE_EPSILON_M) {
    ranges.push({ minZ: cut.maxZ, maxZ: source.maxZ });
  }
  return ranges;
}

function trimWaveSideAgainstObstacle(
  seg: CorniceWaveSideSegment,
  obstacle: AxisAlignedBox
): CorniceWaveSideSegment[] {
  const box = resolveWaveSideBox(seg);
  const cut = intersectAxisAlignedBoxes(box, obstacle);
  if (!cut) return [seg];

  return subtractZRange(box, cut).map(range => ({
    ...seg,
    depth: range.maxZ - range.minZ,
    z: (range.minZ + range.maxZ) / 2,
  }));
}

function trimProfileSideAgainstObstacle(
  seg: CorniceProfileSegment,
  obstacle: AxisAlignedBox
): CorniceProfileSegment[] {
  const box = resolveProfileSideBox(seg);
  if (!box) return [seg];
  const cut = intersectAxisAlignedBoxes(box, obstacle);
  if (!cut) return [seg];

  const ranges = subtractZRange(box, cut);
  return ranges.map(range => {
    const next: CorniceProfileSegment = {
      ...seg,
      length: range.maxZ - range.minZ,
      z: (range.minZ + range.maxZ) / 2,
    };
    if (range.minZ > box.minZ + ROOM_ARCHITECTURE_EPSILON_M) delete next.miterStartTrim;
    if (range.maxZ < box.maxZ - ROOM_ARCHITECTURE_EPSILON_M) delete next.miterEndTrim;
    return next;
  });
}

export function resolveCorniceSegmentsAgainstRoomColumnCut(
  seg: CorniceSegment,
  runtime: Pick<RenderCarcassRuntime, 'roomArchitecturePlan'>
): CorniceSegment[] {
  const obstacle = resolveActiveRoomColumnCutObstacle(runtime.roomArchitecturePlan);
  if (!obstacle) return [seg];

  if (seg.kind === 'cornice_wave_side') return trimWaveSideAgainstObstacle(seg, obstacle);
  if (seg.kind === 'cornice_profile_seg') return trimProfileSideAgainstObstacle(seg, obstacle);
  return [seg];
}

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
      const adjustedSegments = resolveCorniceSegmentsAgainstRoomColumnCut(segments[si], runtime);
      for (let ai = 0; ai < adjustedSegments.length; ai++) {
        applyCorniceSegment(adjustedSegments[ai], pid, corniceMat, runtime);
      }
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
