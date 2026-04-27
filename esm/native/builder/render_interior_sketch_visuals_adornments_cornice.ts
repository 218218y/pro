import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

import { asValueRecord, readObject, toFiniteNumber } from './render_interior_sketch_shared.js';
import { renderSketchAdornmentCorniceSegment } from './render_interior_sketch_visuals_adornments_cornice_segments.js';
import type { SketchAdornmentPlacementRuntime } from './render_interior_sketch_visuals_adornments_contracts.js';

export function renderSketchBoxAdornmentCornice(args: {
  THREE: SketchAdornmentPlacementRuntime['corniceTHREE'];
  corniceRec: InteriorValueRecord | null;
  boxPid: string;
  runtime: SketchAdornmentPlacementRuntime;
}): void {
  const { THREE, corniceRec, boxPid, runtime } = args;
  if (corniceRec?.kind !== 'cornice') return;

  const pid = typeof corniceRec.partId === 'string' ? corniceRec.partId : `${boxPid}_cornice_color`;
  const corniceMat = runtime.resolveMat(pid);
  const segments = Array.isArray(corniceRec.segments) ? corniceRec.segments : [];
  if (segments.length) {
    for (let i = 0; i < segments.length; i++) {
      const seg = asValueRecord(segments[i]);
      if (!seg) continue;
      const x = toFiniteNumber(seg.x);
      const y = toFiniteNumber(seg.y);
      const z = toFiniteNumber(seg.z);
      if (x == null || y == null || z == null || !THREE) continue;
      renderSketchAdornmentCorniceSegment({
        THREE,
        seg,
        partId: typeof seg.partId === 'string' ? seg.partId : pid,
        rotY: toFiniteNumber(seg.rotationY) ?? 0,
        flipX: seg.flipX === true,
        x,
        y,
        z,
        corniceMat,
        runtime,
      });
    }
    return;
  }

  if (!THREE) return;
  const holderGroup = new THREE.Group();
  holderGroup.position?.set?.(
    toFiniteNumber(corniceRec.x) ?? 0,
    toFiniteNumber(corniceRec.y) ?? 0,
    toFiniteNumber(corniceRec.z) ?? 0
  );
  const geo = new THREE.CylinderGeometry(
    toFiniteNumber(corniceRec.topRadius) ?? 0,
    toFiniteNumber(corniceRec.bottomRadius) ?? 0,
    toFiniteNumber(corniceRec.height) ?? 0,
    Math.max(3, Math.round(toFiniteNumber(corniceRec.radialSegments) ?? 4))
  );
  const mesh = new THREE.Mesh(geo, corniceMat);
  if (mesh.rotation) mesh.rotation.y = toFiniteNumber(corniceRec.rotationY) ?? 0;
  const scaleRec = readObject<{ set?: (x: number, y: number, z: number) => void }>(holderGroup.scale);
  scaleRec?.set?.(toFiniteNumber(corniceRec.scaleX) ?? 1, 1, toFiniteNumber(corniceRec.scaleZ) ?? 1);
  holderGroup.add?.(mesh);
  runtime.attachNode(holderGroup, pid);
}
