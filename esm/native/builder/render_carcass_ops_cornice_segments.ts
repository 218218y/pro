import type { RenderCarcassRuntime } from './render_carcass_ops_shared.js';
import type {
  CorniceProfilePoint,
  CorniceProfileSegment,
  CorniceWaveFrontSegment,
  CorniceWaveSideSegment,
} from './carcass_cornice_ir.js';
import type { CorniceSegmentMeshArgs } from './render_carcass_ops_cornice_types.js';
import { applyMiterTrims, computeCorniceVertexNormals } from './render_carcass_ops_cornice_miter.js';

function resolveCorniceSegmentMaterial(
  args: Pick<CorniceSegmentMeshArgs, 'segMat' | 'getPartMaterial' | 'segPid'>
) {
  const overrideMat = args.getPartMaterial && args.segPid ? args.getPartMaterial(args.segPid) : null;
  return overrideMat || args.segMat;
}

export function createWaveFrontSegment(args: CorniceSegmentMeshArgs<CorniceWaveFrontSegment>) {
  const { THREE, seg } = args;
  const segMat = resolveCorniceSegmentMaterial(args);
  const { width: w, depth: d, heightMax: hMax, waveAmp: ampRaw, waveCycles: cycles } = seg;
  const amp = Math.max(0, Math.min(hMax * 0.8, ampRaw));

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

export function createWaveSideSegment(args: CorniceSegmentMeshArgs<CorniceWaveSideSegment>) {
  const { THREE, seg } = args;
  const segMat = resolveCorniceSegmentMaterial(args);
  const { width: w, height: h, depth: d } = seg;
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
  args: CorniceSegmentMeshArgs<CorniceProfileSegment> & {
    profile: CorniceProfilePoint[];
    segLen: number;
  },
  runtime: RenderCarcassRuntime
) {
  const { THREE, seg, profile, segLen } = args;
  const segMat = resolveCorniceSegmentMaterial(args);
  const p0 = profile[0];
  if (!p0) return null;
  const { x: x0, y: y0 } = p0;

  const ShapeCtor = THREE.Shape;
  const ExtrudeGeometryCtor = THREE.ExtrudeGeometry;
  if (!ShapeCtor || !ExtrudeGeometryCtor) return null;

  const shape = new ShapeCtor();
  shape.moveTo(x0, y0);
  for (let pi = 1; pi < profile.length; pi++) {
    const p = profile[pi];
    if (!p) continue;
    shape.lineTo(p.x, p.y);
  }
  shape.lineTo(x0, y0);

  const geo = new ExtrudeGeometryCtor(shape, { depth: segLen, bevelEnabled: false, steps: 1 });
  geo.translate(0, 0, -segLen / 2);
  applyMiterTrims(geo, profile, segLen, seg, runtime);
  computeCorniceVertexNormals(geo, runtime, 'applyCarcassOps.cornice.computeVertexNormals.final');
  return new THREE.Mesh(geo, segMat);
}
