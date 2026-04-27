import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

import {
  asValueRecord,
  readObject,
  toFiniteNumber,
  toPositiveNumber,
} from './render_interior_sketch_shared.js';
import {
  readCorniceSegmentTrim,
  stripSketchCorniceMiterCaps,
} from './render_interior_sketch_visuals_adornments_miter.js';
import type {
  SketchAdornmentPlacementRuntime,
  SketchCorniceExtrudeGeometryLike,
  SketchCorniceShapeLike,
} from './render_interior_sketch_visuals_adornments_contracts.js';

function readProfilePoints(seg: InteriorValueRecord): InteriorValueRecord[] {
  const rawProfile = Array.isArray(seg.profilePoints)
    ? seg.profilePoints
    : Array.isArray(seg.profile)
      ? seg.profile
      : [];
  const profile: InteriorValueRecord[] = [];
  for (let i = 0; i < rawProfile.length; i++) {
    const point = asValueRecord(rawProfile[i]);
    if (point) profile.push(point);
  }
  return profile;
}

function applyProfileSegmentMiterTrims(args: {
  geo: SketchCorniceExtrudeGeometryLike;
  profile: InteriorValueRecord[];
  segLen: number;
  seg: InteriorValueRecord;
}): void {
  const { geo, profile, segLen, seg } = args;
  const miterStartTrim = readCorniceSegmentTrim(seg.miterStartTrim);
  const miterEndTrim = readCorniceSegmentTrim(seg.miterEndTrim);
  if (!(miterStartTrim != null && miterStartTrim > 0) && !(miterEndTrim != null && miterEndTrim > 0)) {
    return;
  }

  const geoOps = readObject<{
    getAttribute?: (name: string) => {
      count?: number;
      getX?: (index: number) => number;
      getZ?: (index: number) => number;
      setZ?: (index: number, value: number) => void;
      needsUpdate?: boolean;
    } | null;
    computeVertexNormals?: () => void;
  }>(geo);
  const position = geoOps?.getAttribute?.('position');
  if (
    !position?.count ||
    typeof position.getX !== 'function' ||
    typeof position.getZ !== 'function' ||
    typeof position.setZ !== 'function'
  ) {
    return;
  }

  let xOuter = -Infinity;
  for (let pi = 0; pi < profile.length; pi++) {
    const px = toFiniteNumber(profile[pi]?.x);
    if (px != null) xOuter = Math.max(xOuter, px);
  }
  if (!Number.isFinite(xOuter) || xOuter <= 0) xOuter = 0.001;

  const zNeg = -segLen / 2;
  const zPos = segLen / 2;
  const epsZ = 5e-4;
  for (let vi = 0; vi < position.count; vi++) {
    const vx = Number(position.getX(vi));
    const vz = Number(position.getZ(vi));
    const tRaw = 1 - vx / xOuter;
    const t = vx < 0 ? Math.min(3, Math.max(0, tRaw)) : Math.min(1, Math.max(0, tRaw));
    if (miterEndTrim != null && miterEndTrim > 0 && Math.abs(vz - zPos) < epsZ) {
      position.setZ(vi, vz - miterEndTrim * t);
    }
    if (miterStartTrim != null && miterStartTrim > 0 && Math.abs(vz - zNeg) < epsZ) {
      position.setZ(vi, vz + miterStartTrim * t);
    }
  }

  stripSketchCorniceMiterCaps(
    geo,
    miterStartTrim != null && miterStartTrim > 0,
    miterEndTrim != null && miterEndTrim > 0
  );
  position.needsUpdate = true;
  const computeVertexNormals = geoOps?.computeVertexNormals;
  if (typeof computeVertexNormals === 'function') computeVertexNormals.call(geo);
}

export function createProfileSegment(args: {
  THREE: NonNullable<SketchAdornmentPlacementRuntime['corniceTHREE']>;
  seg: InteriorValueRecord;
  corniceMat: unknown;
}) {
  const { THREE, seg, corniceMat } = args;
  const shapeCtor = THREE.Shape;
  const extrudeCtor = THREE.ExtrudeGeometry;
  const profile = readProfilePoints(seg);
  const segLen = toPositiveNumber(seg.length);
  if (typeof shapeCtor !== 'function' || typeof extrudeCtor !== 'function' || !segLen || profile.length < 2) {
    return null;
  }

  const first = profile[0];
  const startX = toFiniteNumber(first?.x);
  const startY = toFiniteNumber(first?.y);
  if (startX == null || startY == null) return null;

  const shape: SketchCorniceShapeLike = new shapeCtor();
  shape.moveTo(startX, startY);
  for (let pi = 1; pi < profile.length; pi++) {
    const px = toFiniteNumber(profile[pi]?.x);
    const py = toFiniteNumber(profile[pi]?.y);
    if (px == null || py == null) continue;
    shape.lineTo(px, py);
  }
  shape.lineTo(startX, startY);

  const geo = new extrudeCtor(shape, { depth: segLen, bevelEnabled: false, steps: 1 });
  geo.translate?.(0, 0, -segLen / 2);
  applyProfileSegmentMiterTrims({ geo, profile, segLen, seg });
  return new THREE.Mesh(geo, corniceMat);
}
