import type { InteriorTHREESurface, InteriorValueRecord } from './render_interior_ops_contracts.js';

import { asValueRecord, toFiniteNumber, toPositiveNumber } from './render_interior_sketch_shared.js';
import type { SketchAdornmentPlacementRuntime } from './render_interior_sketch_visuals_adornments_contracts.js';

export function renderSketchBoxAdornmentBase(args: {
  THREE: InteriorTHREESurface;
  boxPid: string;
  baseRec: InteriorValueRecord | null;
  runtime: SketchAdornmentPlacementRuntime;
  bodyMat: unknown;
  legMat?: unknown;
}): void {
  const { THREE, boxPid, baseRec, runtime, bodyMat, legMat } = args;
  if (baseRec?.kind === 'plinth') {
    const pid = typeof baseRec.partId === 'string' ? baseRec.partId : `${boxPid}_plinth_color`;
    const plinthMat = runtime.resolveMat(pid);
    const segments = Array.isArray(baseRec.segments) ? baseRec.segments : [];
    if (segments.length) {
      for (let i = 0; i < segments.length; i++) {
        const seg = asValueRecord(segments[i]);
        if (!seg) continue;
        const w = toPositiveNumber(seg.width);
        const h = toPositiveNumber(seg.height);
        const d = toPositiveNumber(seg.depth);
        const x = toFiniteNumber(seg.x);
        const y = toFiniteNumber(seg.y);
        const z = toFiniteNumber(seg.z);
        if (!(w && h && d && x != null && y != null && z != null)) continue;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plinthMat);
        runtime.placeMesh(mesh, typeof seg.partId === 'string' ? seg.partId : pid, x, y, z);
      }
      return;
    }

    const w = toPositiveNumber(baseRec.width);
    const h = toPositiveNumber(baseRec.height);
    const d = toPositiveNumber(baseRec.depth);
    const x = toFiniteNumber(baseRec.x);
    const y = toFiniteNumber(baseRec.y);
    const z = toFiniteNumber(baseRec.z);
    if (w && h && d && x != null && y != null && z != null) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plinthMat);
      runtime.placeMesh(mesh, pid, x, y, z);
    }
    return;
  }

  if (baseRec?.kind !== 'legs') return;
  const legHeight = Math.max(0.02, toFiniteNumber(baseRec.height) ?? 0.12);
  const geoRec = asValueRecord(baseRec.geo);
  const shape = String(geoRec?.shape || 'round');
  const legGeometry =
    shape === 'square'
      ? new THREE.BoxGeometry(
          Math.max(0.001, toFiniteNumber(geoRec?.width) ?? 0.035),
          legHeight,
          Math.max(0.001, toFiniteNumber(geoRec?.depth) ?? 0.035)
        )
      : new THREE.CylinderGeometry(
          Math.max(0.001, toFiniteNumber(geoRec?.topRadius) ?? 0.02),
          Math.max(0.001, toFiniteNumber(geoRec?.bottomRadius) ?? 0.01),
          legHeight,
          Math.max(6, Math.round(toFiniteNumber(geoRec?.radialSegments) ?? 16))
        );
  const positions = Array.isArray(baseRec.positions) ? baseRec.positions : [];
  for (let i = 0; i < positions.length; i++) {
    const pos = asValueRecord(positions[i]);
    const x = toFiniteNumber(pos?.x);
    const z = toFiniteNumber(pos?.z);
    if (x == null || z == null) continue;
    const mesh = new THREE.Mesh(legGeometry, legMat || bodyMat);
    runtime.placeMesh(mesh, `${boxPid}_leg_${i}`, x, legHeight / 2, z);
  }
}
