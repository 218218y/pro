import type { ProfilePoint, RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import { __asFinite } from './render_carcass_ops_shared.js';
import type { CorniceSegmentMeshArgs, CorniceThreeRuntime } from './render_carcass_ops_cornice_types.js';
import { applyMiterTrims, computeCorniceVertexNormals } from './render_carcass_ops_cornice_miter.js';

export function createWaveFrontSegment(args: CorniceSegmentMeshArgs) {
  const { THREE, seg, segMat } = args;
  const w = __asFinite(seg.width);
  const d = __asFinite(seg.depth);
  const hMax = __asFinite(seg.heightMax);
  const ampRaw = __asFinite(seg.waveAmp);
  const cyclesRaw = __asFinite(seg.waveCycles);
  const cycles = Number.isFinite(cyclesRaw) ? Math.max(1, Math.round(cyclesRaw)) : 2;
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(d) || d <= 0 || !Number.isFinite(hMax) || hMax <= 0) {
    return null;
  }
  const amp = Number.isFinite(ampRaw)
    ? Math.max(0, Math.min(hMax * 0.8, ampRaw))
    : Math.min(0.04, hMax * 0.35);

  const ShapeCtor = THREE.Shape;
  const ExtrudeGeometryCtor = THREE.ExtrudeGeometry;
  if (!ShapeCtor || !ExtrudeGeometryCtor) return null;

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
  geo.translate(0, -hMax / 2, -d / 2);
  return new THREE.Mesh(geo, segMat);
}

export function createWaveSideSegment(args: CorniceSegmentMeshArgs) {
  const { THREE, seg, segMat } = args;
  const w = __asFinite(seg.width);
  const h = __asFinite(seg.height);
  const d = __asFinite(seg.depth);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0 || !Number.isFinite(d) || d <= 0) {
    return null;
  }
  const ShapeCtor = THREE.Shape;
  const ExtrudeGeometryCtor = THREE.ExtrudeGeometry;
  if (!ShapeCtor || !ExtrudeGeometryCtor) return null;

  const shape = new ShapeCtor();
  shape.moveTo(0, 0);
  shape.lineTo(0, h);
  shape.lineTo(w, h);
  shape.lineTo(w, 0);
  shape.lineTo(0, 0);
  const geo = new ExtrudeGeometryCtor(shape, { depth: d, bevelEnabled: false, steps: 1 });
  geo.translate(-w / 2, -h / 2, -d / 2);
  return new THREE.Mesh(geo, segMat);
}

export function createProfileSegment(
  args: {
    THREE: CorniceThreeRuntime;
    seg: import('./render_carcass_ops_shared.js').CorniceSegment;
    segMat: unknown;
    profile: ProfilePoint[];
    segLen: number;
  },
  runtime: RenderCarcassRuntime
) {
  const { THREE, seg, segMat, profile, segLen } = args;
  const p0 = profile[0] || {};
  const x0 = __asFinite(p0.x);
  const y0 = __asFinite(p0.y);
  if (!Number.isFinite(x0) || !Number.isFinite(y0)) return null;

  const ShapeCtor = THREE.Shape;
  const ExtrudeGeometryCtor = THREE.ExtrudeGeometry;
  if (!ShapeCtor || !ExtrudeGeometryCtor) return null;

  const shape = new ShapeCtor();
  shape.moveTo(x0, y0);
  for (let pi = 1; pi < profile.length; pi++) {
    const p = profile[pi] || {};
    const px = __asFinite(p.x);
    const py = __asFinite(p.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    shape.lineTo(px, py);
  }
  shape.lineTo(x0, y0);

  const geo = new ExtrudeGeometryCtor(shape, { depth: segLen, bevelEnabled: false, steps: 1 });
  geo.translate(0, 0, -segLen / 2);
  applyMiterTrims(geo, profile, segLen, seg, runtime);
  computeCorniceVertexNormals(geo, runtime, 'applyCarcassOps.cornice.computeVertexNormals.final');
  return new THREE.Mesh(geo, segMat);
}
