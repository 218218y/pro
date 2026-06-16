import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

import { asValueRecord, toFiniteNumber } from './render_interior_sketch_shared.js';
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
  if (!segments.length || !THREE) return;

  for (let i = 0; i < segments.length; i++) {
    const seg = asValueRecord(segments[i]);
    if (!seg) continue;
    const x = toFiniteNumber(seg.x);
    const y = toFiniteNumber(seg.y);
    const z = toFiniteNumber(seg.z);
    if (x == null || y == null || z == null) continue;
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
}
