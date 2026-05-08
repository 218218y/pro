import type { AppContainer } from '../../../../types/app.js';
import { getDimsMFromPlatform, getViewportWardrobeGroup } from '../../services/api.js';
import {
  buildNotesExportTransform,
  type ExportRefPoints,
  type NotesExportTransformLike,
} from './export_canvas_engine.js';
import {
  asObject,
  asRecord,
  getCtor,
  getFn,
  getNumberArray,
  getNumberProp,
  getProp,
} from './export_canvas_core_shared.js';
import { _exportReportThrottled } from './export_canvas_core_feedback.js';
import type { RefTargetLike } from './export_canvas_core_canvas.js';
import {
  type Box3CtorLike,
  type Matrix4CtorLike,
  type ThreeVector3CtorLike,
  type ThreeVector3Like,
  cloneRefTargetLike,
  getCameraControlsOrNull,
  getCameraOrNull,
  getCameraZ,
  getTargetZ,
  resolveThree,
} from './export_canvas_viewport_shared.js';

function computeWardrobeBoundsZ(
  App: AppContainer,
  THREE: unknown,
  wg: unknown
): { minZ: number; maxZ: number } | null {
  try {
    if (!wg) return null;
    const Box3 = getCtor<Box3CtorLike>(THREE, 'Box3');
    if (!Box3) return null;

    const traverse = getFn(wg, 'traverse');
    if (!traverse) return null;

    try {
      const updWM = getFn(wg, 'updateWorldMatrix');
      if (updWM) updWM.call(wg, true, true);
      else {
        const updMW = getFn(wg, 'updateMatrixWorld');
        if (updMW) updMW.call(wg, true);
      }
    } catch (e) {
      _exportReportThrottled(App, 'computeWardrobeBoundsZ.updateWorldMatrix', e, { throttleMs: 2000 });
    }

    const agg = new Box3();
    const tmp = new Box3();
    let hasAny = false;

    traverse.call(wg, (o: unknown) => {
      try {
        const obj = asObject(o);
        const ud = getProp(obj, 'userData');
        const udRec = asRecord(ud);
        if (udRec && (udRec['__kind'] === 'handle' || !!udRec['isHandle'])) return;

        const geo = getProp(obj, 'geometry');
        if (!geo) return;

        const geoRec = asObject(geo);
        const bb0 = getProp(geoRec, 'boundingBox');
        if (!bb0) {
          const compute = getFn(geo, 'computeBoundingBox');
          if (compute) compute.call(geo);
        }
        const bb = getProp(geoRec, 'boundingBox');
        if (!bb) return;

        if (typeof tmp.copy !== 'function') return;
        tmp.copy(bb);

        const mw = getProp(obj, 'matrixWorld');
        if (mw && typeof tmp.applyMatrix4 === 'function') tmp.applyMatrix4(mw);

        if (!hasAny) {
          if (typeof agg.copy === 'function') agg.copy(tmp);
          hasAny = true;
        } else if (typeof agg.union === 'function') {
          agg.union(tmp);
        }
      } catch (e) {
        _exportReportThrottled(App, 'computeWardrobeBoundsZ.traverseObjectBounds', e, { throttleMs: 2000 });
      }
    });

    if (!hasAny) return null;

    const minZ = getNumberProp(getProp(agg, 'min'), 'z', NaN);
    const maxZ = getNumberProp(getProp(agg, 'max'), 'z', NaN);
    if (!Number.isFinite(minZ) || !Number.isFinite(maxZ)) return null;

    return { minZ, maxZ };
  } catch (e) {
    _exportReportThrottled(App, 'computeWardrobeBoundsZ', e, { throttleMs: 2000 });
    return null;
  }
}

export function computeNotesRefZ(
  App: AppContainer,
  camera: unknown,
  refTarget: RefTargetLike | null
): number {
  const camZ = getCameraZ(camera);
  const tgtZ = getTargetZ(refTarget);
  const frontSide = camZ >= tgtZ;

  try {
    const dims = getDimsMFromPlatform(App);
    const d = dims && typeof getProp(dims, 'd') !== 'undefined' ? getNumberProp(dims, 'd', NaN) : NaN;
    if (Number.isFinite(d) && d > 0) return (frontSide ? 1 : -1) * (d / 2);
  } catch (e) {
    _exportReportThrottled(App, 'computeNotesRefZ.getPlatformDims', e, { throttleMs: 2000 });
  }

  try {
    const THREE = resolveThree(App);
    const wg = getViewportWardrobeGroup(App);
    const bounds = computeWardrobeBoundsZ(App, THREE, wg);
    if (bounds) return frontSide ? bounds.maxZ : bounds.minZ;
  } catch (e) {
    _exportReportThrottled(App, 'computeNotesRefZ.bounds', e, { throttleMs: 2000 });
  }

  return 0;
}

export function captureExportRefPoints(
  App: AppContainer,
  containerRect: DOMRectReadOnly,
  canvasW: number,
  canvasH: number,
  refTarget?: RefTargetLike | null
): ExportRefPoints | null {
  try {
    if (!containerRect || !containerRect.width || !containerRect.height) return null;
    if (!canvasW || !canvasH) return null;
    const camera = getCameraOrNull(App);
    if (!camera) return null;

    const THREE = resolveThree(App);
    const V3 = getCtor<ThreeVector3CtorLike>(THREE, 'Vector3');
    if (!V3) return null;

    const cssScaleX = canvasW / containerRect.width;
    const cssScaleY = canvasH / containerRect.height;

    const projectCss = (worldVec3: ThreeVector3Like) => {
      const v = worldVec3.clone().project(camera);
      const xPx = (v.x + 1) * 0.5 * canvasW;
      const yPx = (1 - v.y) * 0.5 * canvasH;
      return { x: xPx / cssScaleX, y: yPx / cssScaleY };
    };

    const cc = getCameraControlsOrNull(App);
    const tUnknown = refTarget || (cc ? cc.controls.target : null) || { x: 0, y: 0, z: 0 };
    const t = cloneRefTargetLike(tUnknown);
    const refZ = computeNotesRefZ(App, camera, t);

    const p0 = new V3(t.x || 0, t.y || 0, refZ);
    const p1 = p0.clone().add(new V3(1, 0, 0));
    const p2 = p0.clone().add(new V3(0, 1, 0));

    return { p0: projectCss(p0), p1: projectCss(p1), p2: projectCss(p2) };
  } catch (e) {
    _exportReportThrottled(App, 'captureExportRefPoints', e, { throttleMs: 2000 });
    return null;
  }
}

export function captureCameraPvInfo(
  App: AppContainer,
  camera: unknown
): { pv: number[] | null; pvInv: number[] | null; camPos: { x: number; y: number; z: number } | null } {
  try {
    const THREE = resolveThree(App);
    const M4 = getCtor<Matrix4CtorLike>(THREE, 'Matrix4');
    if (!M4) return { pv: null, pvInv: null, camPos: null };

    try {
      const upd = getFn(camera, 'updateMatrixWorld');
      if (upd) upd.call(camera, true);
    } catch (e) {
      _exportReportThrottled(App, 'captureCameraPvInfo.updateMatrixWorld', e, { throttleMs: 2000 });
    }

    const cam = asObject(camera);
    const proj = getProp(cam, 'projectionMatrix');
    const inv = getProp(cam, 'matrixWorldInverse');

    const pvMat = new M4();
    try {
      pvMat.multiplyMatrices(proj, inv);
    } catch (e) {
      _exportReportThrottled(App, 'captureCameraPvInfo.multiplyMatrices', e, { throttleMs: 2000 });
      return { pv: null, pvInv: null, camPos: null };
    }

    const pv = getNumberArray(pvMat.elements)?.slice(0, 16) ?? null;

    let pvInv: number[] | null = null;
    try {
      const invMat = pvMat.clone();
      if (typeof invMat.invert === 'function') invMat.invert();
      else if (typeof invMat.getInverse === 'function') invMat.getInverse(pvMat);
      pvInv = getNumberArray(invMat.elements)?.slice(0, 16) ?? null;
    } catch (e) {
      _exportReportThrottled(App, 'captureCameraPvInfo.invertPv', e, { throttleMs: 2000 });
      pvInv = null;
    }

    const pos = getProp(cam, 'position');
    const camPos = pos
      ? { x: getNumberProp(pos, 'x', 0), y: getNumberProp(pos, 'y', 0), z: getNumberProp(pos, 'z', 0) }
      : null;

    return { pv, pvInv, camPos };
  } catch (e) {
    _exportReportThrottled(App, 'captureCameraPvInfo', e, { throttleMs: 2000 });
    return { pv: null, pvInv: null, camPos: null };
  }
}

export function buildNotesExportTransformFromArgs(
  args: Parameters<typeof buildNotesExportTransform>[0]
): NotesExportTransformLike | null {
  return buildNotesExportTransform(args);
}
