import type {
  CorniceOp,
  CorniceSegment,
  ExtrudeGeometryLike,
  ProfilePoint,
  RenderCarcassRuntime,
} from './render_carcass_ops_shared.js';
import type { Object3DLike } from '../../../types';
import {
  __asBool,
  __asFinite,
  __asString,
  __isCorniceSegment,
  __profilePoints,
  __readArray,
  __stripMiterCaps,
} from './render_carcass_ops_shared.js';

export function createApplyCarcassCorniceOps() {
  function applyCarcassCorniceOps(
    cornice: CorniceOp | null | undefined,
    runtime: RenderCarcassRuntime
  ): void {
    if (!cornice || cornice.kind !== 'cornice') return;

    const { ctx, getPartMaterial } = runtime;
    const pid = __asString(cornice.partId, 'cornice_color');
    const corniceMat = ctx.corniceMat || (getPartMaterial ? getPartMaterial(pid) : null) || ctx.bodyMat;
    const segments = __readArray(cornice.segments, __isCorniceSegment);

    if (segments && segments.length) {
      for (let si = 0; si < segments.length; si++) {
        applyCorniceSegment(segments[si], pid, corniceMat, runtime);
      }
      return;
    }

    applyLegacyCornice(cornice, pid, corniceMat, runtime);
  }

  function applyCorniceSegment(
    seg: CorniceSegment | null | undefined,
    pid: string,
    corniceMat: unknown,
    runtime: RenderCarcassRuntime
  ): void {
    const { THREE, ctx } = runtime;
    if (!seg || typeof seg !== 'object') return;

    const x = __asFinite(seg.x);
    const y = __asFinite(seg.y);
    const z = __asFinite(seg.z);
    const segPid = __asString(seg.partId, pid);
    // Main wardrobe cornice now paints as one canonical group.
    // All classic/wave cornice segments inherit the shared corniceMat
    // instead of resolving per-segment part colors.
    const segMat = corniceMat || ctx.bodyMat;
    const profile = __profilePoints(seg.profile);
    const segLen = __asFinite(seg.length);
    const rotY = __asFinite(seg.rotationY);
    const flipX = __asBool(seg.flipX);
    const kind = __asString(seg.kind);

    if (
      kind === 'cornice_wave_front' &&
      typeof THREE.Shape === 'function' &&
      typeof THREE.ExtrudeGeometry === 'function'
    ) {
      const mesh = createWaveFrontSegment({ THREE, seg, segMat });
      if (!mesh) return;
      finalizeCorniceMesh(mesh, { x, y, z, flipX, rotY, segPid }, runtime);
      return;
    }

    if (
      kind === 'cornice_wave_side' &&
      typeof THREE.Shape === 'function' &&
      typeof THREE.ExtrudeGeometry === 'function'
    ) {
      const mesh = createWaveSideSegment({ THREE, seg, segMat });
      if (!mesh) return;
      finalizeCorniceMesh(mesh, { x, y, z, flipX, rotY, segPid }, runtime);
      return;
    }

    if (
      profile &&
      profile.length >= 2 &&
      Number.isFinite(segLen) &&
      segLen > 0 &&
      typeof THREE.Shape === 'function' &&
      typeof THREE.ExtrudeGeometry === 'function'
    ) {
      const mesh = createProfileSegment({ THREE, seg, segMat, profile, segLen }, runtime);
      if (!mesh) return;
      finalizeCorniceMesh(mesh, { x, y, z, flipX, rotY, segPid }, runtime);
      return;
    }

    const w = __asFinite(seg.width);
    const h = __asFinite(seg.height);
    const d = __asFinite(seg.depth);
    if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(d)) return;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), segMat);
    finalizeCorniceMesh(
      mesh,
      { x, y, z: Number.isFinite(z) ? z : 0, flipX, rotY, segPid, fallbackY: h / 2 },
      runtime
    );
  }

  function createWaveFrontSegment(args: {
    THREE: NonNullable<RenderCarcassRuntime['THREE']>;
    seg: CorniceSegment;
    segMat: unknown;
  }) {
    const { THREE, seg, segMat } = args;
    const w = __asFinite(seg.width);
    const d = __asFinite(seg.depth);
    const hMax = __asFinite(seg.heightMax);
    const ampRaw = __asFinite(seg.waveAmp);
    const cyclesRaw = __asFinite(seg.waveCycles);
    const cycles = Number.isFinite(cyclesRaw) ? Math.max(1, Math.round(cyclesRaw)) : 2;
    if (
      !Number.isFinite(w) ||
      w <= 0 ||
      !Number.isFinite(d) ||
      d <= 0 ||
      !Number.isFinite(hMax) ||
      hMax <= 0
    ) {
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

  function createWaveSideSegment(args: {
    THREE: NonNullable<RenderCarcassRuntime['THREE']>;
    seg: CorniceSegment;
    segMat: unknown;
  }) {
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

  function createProfileSegment(
    args: {
      THREE: NonNullable<RenderCarcassRuntime['THREE']>;
      seg: CorniceSegment;
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
    computeVertexNormals(geo, runtime, 'applyCarcassOps.cornice.computeVertexNormals.final');
    return new THREE.Mesh(geo, segMat);
  }

  function applyMiterTrims(
    geo: ExtrudeGeometryLike,
    profile: ProfilePoint[],
    segLen: number,
    seg: CorniceSegment,
    runtime: RenderCarcassRuntime
  ): void {
    const miterStartTrim = __asFinite(seg.miterStartTrim);
    const miterEndTrim = __asFinite(seg.miterEndTrim);
    if (
      !(Number.isFinite(miterStartTrim) && miterStartTrim > 0) &&
      !(Number.isFinite(miterEndTrim) && miterEndTrim > 0)
    ) {
      return;
    }

    let xOuter = -Infinity;
    for (let pi = 0; pi < profile.length; pi++) {
      const p = profile[pi] || {};
      const px = __asFinite(p.x);
      if (Number.isFinite(px)) xOuter = Math.max(xOuter, px);
    }
    if (!Number.isFinite(xOuter) || xOuter <= 0) xOuter = 0.001;

    const pos = geo.getAttribute('position');
    const zPos = segLen / 2;
    const zNeg = -segLen / 2;
    const epsZ = 5e-4;

    for (let vi = 0; vi < pos.count; vi++) {
      const vx = Number(pos.getX(vi));
      const vz = Number(pos.getZ(vi));
      if (Number.isFinite(miterEndTrim) && miterEndTrim > 0 && Math.abs(vz - zPos) < epsZ) {
        const tRaw = 1 - vx / xOuter;
        const t = vx < 0 ? Math.min(3, Math.max(0, tRaw)) : Math.min(1, Math.max(0, tRaw));
        pos.setZ(vi, vz - miterEndTrim * t);
      }
      if (Number.isFinite(miterStartTrim) && miterStartTrim > 0 && Math.abs(vz - zNeg) < epsZ) {
        const tRaw = 1 - vx / xOuter;
        const t = vx < 0 ? Math.min(3, Math.max(0, tRaw)) : Math.min(1, Math.max(0, tRaw));
        pos.setZ(vi, vz + miterStartTrim * t);
      }
    }

    __stripMiterCaps(
      geo,
      Number.isFinite(miterStartTrim) && miterStartTrim > 0,
      Number.isFinite(miterEndTrim) && miterEndTrim > 0,
      err =>
        runtime.renderOpsHandleCatch(runtime.App, 'applyCarcassOps.corniceMiter.stripCaps', err, undefined, {
          failFast: false,
          throttleMs: 10000,
        })
    );

    pos.needsUpdate = true;
    computeVertexNormals(geo, runtime, 'applyCarcassOps.cornice.computeVertexNormals.miter');
  }

  function computeVertexNormals(geo: ExtrudeGeometryLike, runtime: RenderCarcassRuntime, op: string): void {
    try {
      geo.computeVertexNormals();
    } catch (err) {
      runtime.renderOpsHandleCatch(runtime.App, op, err, undefined, {
        failFast: false,
        throttleMs: 5000,
      });
    }
  }

  function finalizeCorniceMesh(
    mesh: Object3DLike & { castShadow?: boolean; receiveShadow?: boolean },
    args: {
      x: number;
      y: number;
      z: number;
      flipX: boolean;
      rotY: number;
      segPid: string;
      fallbackY?: number;
    },
    runtime: RenderCarcassRuntime
  ): void {
    const { addOutlines, wardrobeGroup, reg, App, sketchMode } = runtime;
    if (args.flipX) mesh.scale.x *= -1;
    if (Number.isFinite(args.rotY) && args.rotY !== 0) mesh.rotation.y = args.rotY;
    mesh.position.set(
      Number.isFinite(args.x) ? args.x : 0,
      Number.isFinite(args.y) ? args.y : (args.fallbackY ?? 0),
      Number.isFinite(args.z) ? args.z : 0
    );
    mesh.userData = { partId: args.segPid };
    reg(App, args.segPid, mesh, 'cornice');
    if (!sketchMode) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    addOutlines(mesh);
    wardrobeGroup.add(mesh);
  }

  function applyLegacyCornice(
    cornice: CorniceOp,
    pid: string,
    corniceMat: unknown,
    runtime: RenderCarcassRuntime
  ): void {
    const { THREE, addOutlines, wardrobeGroup, reg, App } = runtime;
    const corniceGeo = new THREE.CylinderGeometry(
      __asFinite(cornice.topRadius, 0),
      __asFinite(cornice.bottomRadius, 0),
      __asFinite(cornice.height, 0),
      Math.max(3, Math.round(__asFinite(cornice.radialSegments, 4)))
    );
    const corniceHolder = new THREE.Group();
    corniceHolder.position.set(__asFinite(cornice.x, 0), __asFinite(cornice.y, 0), __asFinite(cornice.z, 0));
    corniceHolder.scale.set(__asFinite(cornice.scaleX, 1), 1, __asFinite(cornice.scaleZ, 1));
    const corniceMesh = new THREE.Mesh(corniceGeo, corniceMat);
    corniceMesh.rotation.y = __asFinite(cornice.rotationY, 0);
    corniceMesh.userData = { partId: pid };
    reg(App, pid, corniceMesh, 'cornice');
    addOutlines(corniceMesh);
    corniceHolder.add(corniceMesh);
    wardrobeGroup.add(corniceHolder);
  }

  return {
    applyCarcassCorniceOps,
  };
}
