import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

import { readObject, toFiniteNumber, toPositiveNumber } from './render_interior_sketch_shared.js';
import { createProfileSegment } from './render_interior_sketch_visuals_adornments_cornice_profile.js';
import {
  createWaveFrontSegment,
  createWaveSideSegment,
} from './render_interior_sketch_visuals_adornments_cornice_wave.js';
import type { SketchAdornmentPlacementRuntime } from './render_interior_sketch_visuals_adornments_contracts.js';

export function renderSketchAdornmentCorniceSegment(args: {
  THREE: NonNullable<SketchAdornmentPlacementRuntime['corniceTHREE']>;
  seg: InteriorValueRecord;
  partId: string;
  rotY: number;
  flipX: boolean;
  x: number;
  y: number;
  z: number;
  corniceMat: unknown;
  runtime: SketchAdornmentPlacementRuntime;
}): boolean {
  const { THREE, seg, partId, rotY, flipX, x, y, z, corniceMat, runtime } = args;
  const kind = typeof seg.kind === 'string' ? seg.kind : '';

  if (kind === 'wave' || kind === 'cornice_wave_front') {
    const mesh = createWaveFrontSegment({ THREE, seg, corniceMat });
    if (mesh) {
      runtime.placeMesh(mesh, partId, x, y, z, rotY, flipX);
      return true;
    }
  }

  if (kind === 'cornice_wave_side') {
    const mesh = createWaveSideSegment({ THREE, seg, corniceMat });
    if (mesh) {
      runtime.placeMesh(mesh, partId, x, y, z, rotY, flipX);
      return true;
    }
  }

  if (kind === 'cornice_profile_seg' || Array.isArray(seg.profile) || Array.isArray(seg.profilePoints)) {
    const mesh = createProfileSegment({ THREE, seg, corniceMat });
    if (mesh) {
      runtime.placeMesh(mesh, partId, x, y, z, rotY, flipX);
      return true;
    }
  }

  const geoKind = typeof seg.geoKind === 'string' ? seg.geoKind : '';
  if (geoKind === 'cylinder') {
    const topRadius = toFiniteNumber(seg.topRadius) ?? 0;
    const bottomRadius = toFiniteNumber(seg.bottomRadius) ?? 0;
    const height = toFiniteNumber(seg.height) ?? 0;
    const radialSegments = Math.max(3, Math.round(toFiniteNumber(seg.radialSegments) ?? 8));
    const scaleX = toFiniteNumber(seg.scaleX) ?? 1;
    const scaleZ = toFiniteNumber(seg.scaleZ) ?? 1;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius, bottomRadius, height, radialSegments),
      corniceMat
    );
    if (mesh.rotation) mesh.rotation.y = rotY;
    const scaleRec = readObject<{ set?: (x: number, y: number, z: number) => void }>(mesh.scale);
    scaleRec?.set?.(scaleX, 1, scaleZ);
    runtime.placeMesh(mesh, partId, x, y, z, undefined, flipX);
    return true;
  }

  const w = toPositiveNumber(seg.width);
  const h = toPositiveNumber(seg.height);
  const d = toPositiveNumber(seg.depth);
  if (!(w && h && d)) return false;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), corniceMat);
  runtime.placeMesh(mesh, partId, x, y, z, rotY, flipX);
  return true;
}
