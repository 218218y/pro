import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

import { toFiniteNumber, toPositiveNumber } from './render_interior_sketch_shared.js';
import type { SketchAdornmentPlacementRuntime } from './render_interior_sketch_visuals_adornments_contracts.js';

export function createWaveFrontSegment(args: {
  THREE: NonNullable<SketchAdornmentPlacementRuntime['corniceTHREE']>;
  seg: InteriorValueRecord;
  corniceMat: unknown;
}) {
  const { THREE, seg, corniceMat } = args;
  const w = toPositiveNumber(seg.width);
  const d = toPositiveNumber(seg.depth);
  const hMax = toPositiveNumber(seg.heightMax);
  const ampRaw = toFiniteNumber(seg.waveAmp);
  const cyclesRaw = toFiniteNumber(seg.waveCycles);
  const cycles =
    typeof cyclesRaw === 'number' && Number.isFinite(cyclesRaw) ? Math.max(1, Math.round(cyclesRaw)) : 2;
  if (!(w && d && hMax)) return null;

  const ShapeCtor = THREE.Shape;
  const ExtrudeGeometryCtor = THREE.ExtrudeGeometry;
  if (typeof ShapeCtor !== 'function' || typeof ExtrudeGeometryCtor !== 'function') return null;

  const amp =
    typeof ampRaw === 'number' && Number.isFinite(ampRaw)
      ? Math.max(0, Math.min(hMax * 0.8, ampRaw))
      : Math.min(0.04, hMax * 0.35);
  const shape = new ShapeCtor();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(-w / 2, hMax);
  const steps = Math.max(24, cycles * 24);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = -w / 2 + w * t;
    const py = hMax - amp * (0.5 - 0.5 * Math.cos(Math.PI * 2 * cycles * t));
    shape.lineTo(px, py);
  }
  shape.lineTo(w / 2, 0);
  shape.lineTo(-w / 2, 0);

  const geo = new ExtrudeGeometryCtor(shape, { depth: d, bevelEnabled: false, steps: 1 });
  geo.translate?.(0, -hMax / 2, -d / 2);
  return new THREE.Mesh(geo, corniceMat);
}

export function createWaveSideSegment(args: {
  THREE: NonNullable<SketchAdornmentPlacementRuntime['corniceTHREE']>;
  seg: InteriorValueRecord;
  corniceMat: unknown;
}) {
  const { THREE, seg, corniceMat } = args;
  const w = toPositiveNumber(seg.width);
  const h = toPositiveNumber(seg.height);
  const d = toPositiveNumber(seg.depth);
  if (!(w && h && d)) return null;

  const ShapeCtor = THREE.Shape;
  const ExtrudeGeometryCtor = THREE.ExtrudeGeometry;
  if (typeof ShapeCtor !== 'function' || typeof ExtrudeGeometryCtor !== 'function') return null;

  const shape = new ShapeCtor();
  shape.moveTo(0, 0);
  shape.lineTo(0, h);
  shape.lineTo(w, h);
  shape.lineTo(w, 0);
  shape.lineTo(0, 0);
  const geo = new ExtrudeGeometryCtor(shape, { depth: d, bevelEnabled: false, steps: 1 });
  geo.translate?.(-w / 2, -h / 2, -d / 2);
  return new THREE.Mesh(geo, corniceMat);
}
