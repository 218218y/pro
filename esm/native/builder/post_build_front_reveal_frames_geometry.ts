// Front reveal frame geometry helpers (Pure ESM)
//
// Owns reveal z-sign resolution, local-bounds measurement, and local line geometry emission.

import type { Object3DLike, ThreeLike } from '../../../types/index.js';

import {
  getGeometry,
  hasMultiplyMatrices,
  type Box3Like,
  type LineMaterialLike,
  type ValueRecord,
} from './post_build_extras_shared.js';

export type FrontRevealGeometryRuntime = {
  getRevealZSignOverride: (ud: ValueRecord | null) => number | null;
  getObjectLocalBounds: (root: Object3DLike | null) => Box3Like | null;
  buildRectLines: (
    xL: number,
    xR: number,
    yB: number,
    yT: number,
    z: number,
    lineMatOrDual?: LineMaterialLike | 'dual'
  ) => Object3DLike | null;
};

export type CreateFrontRevealGeometryRuntimeArgs = {
  THREE: ThreeLike;
  baseLineMaterial: LineMaterialLike;
  localName: string;
};

export function createFrontRevealGeometryRuntime(
  args: CreateFrontRevealGeometryRuntimeArgs
): FrontRevealGeometryRuntime {
  const { THREE, baseLineMaterial, localName } = args;
  const xyInset = 0.0015;

  const getRevealZSignOverride = (ud: ValueRecord | null): number | null => {
    const raw = ud?.__wpRevealZSign ?? ud?.__wpDoorOpenZSign ?? ud?.__handleZSign ?? ud?.__wpDoorOpenDirSign;
    const ov = Number(raw);
    return Number.isFinite(ov) && (ov === 1 || ov === -1) ? ov : null;
  };

  const getObjectLocalBounds = (root: Object3DLike | null): Box3Like | null => {
    if (!root) return null;
    try {
      if (typeof root.updateMatrixWorld === 'function') root.updateMatrixWorld(true);
      const inv: { copy: (matrix: unknown) => { invert: () => unknown }; invert: () => unknown } =
        new THREE.Matrix4();
      inv.copy(root.matrixWorld).invert();
      let out: Box3Like | null = null;
      if (typeof root.traverse !== 'function') return null;
      root.traverse((obj: Object3DLike & ValueRecord) => {
        const geom = getGeometry(obj);
        if (!geom) return;
        if (!geom.boundingBox && typeof geom.computeBoundingBox === 'function') geom.computeBoundingBox();
        if (!geom.boundingBox) return;
        const m = new THREE.Matrix4();
        if (!hasMultiplyMatrices(m)) return;
        m.multiplyMatrices(inv, obj.matrixWorld);
        const bb = geom.boundingBox.clone();
        bb.applyMatrix4(m);
        if (!out) out = bb;
        else out.union(bb);
      });
      return out;
    } catch (_error) {
      return null;
    }
  };

  const buildRectLines = (
    xL: number,
    xR: number,
    yB: number,
    yT: number,
    z: number,
    lineMatOrDual: LineMaterialLike | 'dual' = baseLineMaterial
  ) => {
    const sign = z >= 0 ? 1 : -1;
    const makeRectGeom = (extraInset: number, zOffset = 0) => {
      const inset = xyInset + extraInset;
      const x1 = xL + inset;
      const x2 = xR - inset;
      const y1 = yB + inset;
      const y2 = yT - inset;
      if (!(x2 > x1) || !(y2 > y1)) return null;

      const zz = z + zOffset;
      const pts = [
        new THREE.Vector3(x1, y1, zz),
        new THREE.Vector3(x2, y1, zz),
        new THREE.Vector3(x2, y1, zz),
        new THREE.Vector3(x2, y2, zz),
        new THREE.Vector3(x2, y2, zz),
        new THREE.Vector3(x1, y2, zz),
        new THREE.Vector3(x1, y2, zz),
        new THREE.Vector3(x1, y1, zz),
      ];
      const geom = new THREE.BufferGeometry();
      if (typeof getGeometry({ geometry: geom })?.setFromPoints !== 'function') return null;
      geom.setFromPoints?.(pts);
      return geom;
    };

    const makeLine = (geom: unknown, lineMat: unknown, childName?: string) => {
      if (!geom || !lineMat) return null;
      const line = new THREE.LineSegments(geom, lineMat);
      if (childName) line.name = childName;
      line.frustumCulled = false;
      line.userData = { kind: 'frontRevealFramesLines', local: true, hideWhenOpen: false };
      return line;
    };

    if (lineMatOrDual === 'dual') {
      const g = new THREE.Group();
      g.name = localName;
      g.userData = { kind: 'frontRevealFramesLines', local: true, hideWhenOpen: false };
      const g1 = makeRectGeom(0, sign * 0.00008);
      const g2 = makeRectGeom(0.0011, sign * 0.00016);
      const l1 = makeLine(g1, baseLineMaterial, localName + '_outer');
      const l2 = makeLine(g2, baseLineMaterial, localName + '_inner');
      if (l1) g.add(l1);
      if (l2) g.add(l2);
      if (!g.children.length) return null;
      g.frustumCulled = false;
      return g;
    }

    const selectedMat = lineMatOrDual || baseLineMaterial;
    const geom = makeRectGeom(0, 0);
    return makeLine(geom, selectedMat, localName);
  };

  return {
    getRevealZSignOverride,
    getObjectLocalBounds,
    buildRectLines,
  };
}
