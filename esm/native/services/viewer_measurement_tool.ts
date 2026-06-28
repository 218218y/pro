import type {
  AppContainer,
  BuilderDimensionLineFn,
  Object3DLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';

import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { isShelfBoardPartId } from '../features/shelf_part_identity.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { getDocumentMaybe } from '../runtime/dom_access.js';
import { setModePrimary } from '../runtime/mode_write_access.js';
import { getUiFeedbackServiceMaybe } from '../runtime/service_access.js';
import { runPlatformActivityRenderTouch } from '../runtime/platform_access.js';
import {
  getCamera,
  getWardrobeGroup,
  readRenderCacheValue,
  writeRenderCacheValue,
} from '../runtime/render_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import { __wp_isDoorOrDrawerLikePartId, __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import { __wp_measureObjectLocalBox, __wp_projectWorldPointToLocal } from './canvas_picking_local_helpers.js';
import type { HitObjectLike } from './canvas_picking_engine.js';

export const VIEWER_MEASUREMENT_MODE_ID = 'measure';

const VIEWER_MEASUREMENT_CACHE_KEY = '__wpViewerMeasurementOverlay';
const VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY = '__wpViewerMeasurementToolMode';
const MIN_MEASURABLE_EDGE_M = 0.005;
const FRONT_Z_EPSILON_M = 0.006;
const OVERLAY_RENDER_ORDER = 10040;
const GUIDE_OFFSET_M = 0.045;
const SIDE_GUIDE_OFFSET_M = 0.055;
const REAR_SELECTION_FRAME_PULL_FORWARD_M = 0.012;
const POINT_MEASUREMENT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25' viewBox='0 0 25 25'%3E%3Cpath d='M6 6 L19 19 M19 6 L6 19' stroke='%23111827' stroke-width='2.2' stroke-linecap='round'/%3E%3Ccircle cx='12.5' cy='12.5' r='2.2' fill='none' stroke='%23ffffff' stroke-width='1.4'/%3E%3C/svg%3E") 12 12, crosshair`;

export type ViewerMeasurementToolMode = 'part' | 'points';

type MeasurementAxis = 'x' | 'y' | 'z';

type MeasurementPlaneKind = 'front' | 'side' | 'top';

type MeasurementPlane = {
  kind: MeasurementPlaneKind;
  normalAxis: MeasurementAxis;
  normalSign: number;
  normalValue: number;
  uAxis: MeasurementAxis;
  vAxis: MeasurementAxis;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  uLength: number;
  vLength: number;
};

type LocalMeasurementBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

type PointMeasurementDraft = {
  point: { x: number; y: number; z: number };
  plane: MeasurementPlane;
  targetKey: string | null;
};

type MeasurementOverlayState = {
  objects: Object3DLike[];
  targetKey: string | null;
  pointDraft?: PointMeasurementDraft | null;
};

type OverlayThree = ThreeLike & {
  BufferGeometry: ThreeLike['BufferGeometry'];
  LineBasicMaterial: ThreeLike['LineBasicMaterial'];
  Line: ThreeLike['Line'];
  Vector3: ThreeLike['Vector3'];
};

type MeasurableObject = HitObjectLike & {
  userData?: UnknownRecord | null;
  parent?: MeasurableObject | null;
  type?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asObject3D(value: unknown): Object3DLike | null {
  return isRecord(value) ? (value as Object3DLike) : null;
}

function asMeasurableObject(value: unknown): MeasurableObject | null {
  return isRecord(value) ? (value as MeasurableObject) : null;
}

function readUserData(value: unknown): UnknownRecord | null {
  const rec = isRecord(value) ? value : null;
  const ud = rec && isRecord(rec.userData) ? rec.userData : null;
  return ud;
}

function readFiniteNumber(value: unknown, key: string): number | null {
  const rec = isRecord(value) ? value : null;
  const raw = rec ? rec[key] : null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function readPartIdFromUserData(userData: UnknownRecord | null): string | null {
  const raw = userData?.partId ?? userData?.pid;
  if (raw == null) return null;
  const text = String(raw).trim();
  return text || null;
}

function readObjectPartId(value: unknown): string | null {
  return readPartIdFromUserData(readUserData(value));
}

function hasDirectMeasurableUserData(userData: UnknownRecord | null): boolean {
  if (!userData || userData.isModuleSelector || userData.__ignoreRaycast) return false;
  return !!(userData.partId ?? userData.pid ?? userData.surfaceId ?? userData.drawerId);
}

function readMaterialRecords(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord) as UnknownRecord[];
  return isRecord(value) ? [value] : [];
}

function isFullyTransparentMaterialObject(value: unknown): boolean {
  const rec = isRecord(value) ? value : null;
  const materials = readMaterialRecords(rec?.material);
  if (!materials.length) return false;
  const visible = materials.filter(material => material.visible !== false);
  return visible.length > 0 && visible.every(material => material.opacity === 0);
}

function isBackPanelLike(value: unknown): boolean {
  const ud = readUserData(value);
  if (!ud) return false;
  if (ud.kind === 'backPanel' || ud.__wpWoodBackPanel === true) return true;
  return false;
}

function isShelfLikeUserData(userData: UnknownRecord | null): boolean {
  if (!userData) return false;
  const partId = readPartIdFromUserData(userData);
  return !!userData.__wpShelfGroupPartId || (partId != null && isShelfBoardPartId(partId));
}

function isShelfLikeObject(value: unknown): boolean {
  return isShelfLikeUserData(readUserData(value));
}

function shouldSkipDirectIntersectionObject(value: unknown): boolean {
  const obj = asMeasurableObject(value);
  if (!obj || isDecorativeObject(obj) || isMeasurementPassiveFittingObject(obj)) return true;
  const ud = readUserData(obj);
  if (ud?.isModuleSelector || ud?.__ignoreRaycast) return true;
  return isFullyTransparentMaterialObject(obj);
}

function hasCavityBackgroundTarget(value: unknown): boolean {
  const ud = readUserData(value);
  if (!ud) return true;
  if (isBackPanelLike(value)) return true;
  if (ud.isModuleSelector) return true;
  return !hasDirectMeasurableUserData(ud);
}

function sameModuleKey(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function isDecorativeObject(value: unknown): boolean {
  const rec = asMeasurableObject(value);
  return !!rec && (rec.type === 'LineSegments' || rec.type === 'Line' || rec.type === 'Sprite');
}

function readUserDataKind(userData: UnknownRecord | null): string {
  const raw = userData?.__kind ?? userData?.kind ?? userData?.type;
  return raw == null ? '' : String(raw).trim().toLowerCase();
}

function isMeasurementPassiveFittingUserData(userData: UnknownRecord | null): boolean {
  if (!userData) return false;
  if (userData.__wpMeasurementIgnoreInteriorBoundary === true) return true;

  const kind = readUserDataKind(userData);
  if (
    kind.startsWith('hanging_') ||
    kind.includes('hanger') ||
    kind.includes('cloth') ||
    kind.includes('clothes') ||
    kind.includes('wardrobe_rod') ||
    kind.includes('closet_rod') ||
    kind === 'rod'
  ) {
    return true;
  }

  const partId = readPartIdFromUserData(userData)?.toLowerCase() || '';
  return (
    partId.includes('hanger') ||
    partId.includes('hanging') ||
    partId.includes('clothes') ||
    partId.includes('cloth') ||
    /(^|[_-])rod($|[_-])/.test(partId) ||
    partId.endsWith('_rod') ||
    partId.startsWith('rod_')
  );
}

function hasPassiveFittingAncestor(value: unknown): boolean {
  let current = asMeasurableObject(value);
  while (current) {
    if (isMeasurementPassiveFittingUserData(readUserData(current))) return true;
    current = asMeasurableObject(current.parent);
  }
  return false;
}

function hasCylinderGeometryParameters(value: unknown): boolean {
  const geometry = isRecord(value) ? value.geometry : null;
  const params = isRecord(geometry) && isRecord(geometry.parameters) ? geometry.parameters : null;
  if (!params) return false;
  return (
    (readFiniteNumber(params, 'radiusTop') != null ||
      readFiniteNumber(params, 'radiusBottom') != null ||
      readFiniteNumber(params, 'radius') != null) &&
    readFiniteNumber(params, 'height') != null
  );
}

function isMeasurementPassiveFittingObject(value: unknown): boolean {
  if (hasPassiveFittingAncestor(value)) return true;
  const obj = asMeasurableObject(value);
  if (!obj) return false;
  return hasCylinderGeometryParameters(obj) && !isShelfLikeObject(obj);
}

function readOverlayState(App: AppContainer): MeasurementOverlayState | null {
  const state = readRenderCacheValue<MeasurementOverlayState>(App, VIEWER_MEASUREMENT_CACHE_KEY);
  return state && Array.isArray(state.objects) ? state : null;
}

function writeOverlayState(App: AppContainer, state: MeasurementOverlayState | null): void {
  writeRenderCacheValue(App, VIEWER_MEASUREMENT_CACHE_KEY, state);
}

function writeMeasurementCursor(App: AppContainer, cursor: string): void {
  try {
    const doc = getDocumentMaybe(App) as (Document & { querySelectorAll?: unknown }) | null;
    if (doc?.body?.style) doc.body.style.cursor = cursor === 'default' ? 'default' : cursor;
    const querySelectorAll = isRecord(doc) ? doc.querySelectorAll : null;
    if (typeof querySelectorAll !== 'function') return;
    const canvases = Reflect.apply(querySelectorAll, doc, ['canvas']);
    const length = isRecord(canvases) && typeof canvases.length === 'number' ? canvases.length : 0;
    for (let i = 0; i < length; i += 1) {
      const canvas = canvases[i];
      if (isRecord(canvas) && isRecord(canvas.style)) {
        canvas.style.cursor = cursor === 'default' ? '' : cursor;
      }
    }
  } catch {
    // Cursor is only a precision aid; measurement geometry still works without DOM access.
  }
}

function applyMeasurementToolCursor(App: AppContainer, mode: ViewerMeasurementToolMode): void {
  writeMeasurementCursor(App, mode === 'points' ? POINT_MEASUREMENT_CURSOR : 'crosshair');
}

export function getViewerMeasurementToolMode(App: AppContainer): ViewerMeasurementToolMode {
  const raw = readRenderCacheValue<unknown>(App, VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY);
  return raw === 'points' ? 'points' : 'part';
}

export function setViewerMeasurementToolMode(
  App: AppContainer,
  mode: ViewerMeasurementToolMode,
  render = true
): void {
  const nextMode: ViewerMeasurementToolMode = mode === 'points' ? 'points' : 'part';
  const previousMode = getViewerMeasurementToolMode(App);
  writeRenderCacheValue(App, VIEWER_MEASUREMENT_TOOL_MODE_CACHE_KEY, nextMode);
  applyMeasurementToolCursor(App, nextMode);
  if (previousMode !== nextMode) clearViewerMeasurementOverlay(App, render);
}

function removeObjectFromScene(obj: Object3DLike): void {
  try {
    const parent = asObject3D(obj.parent);
    if (parent && typeof parent.remove === 'function') parent.remove(obj);
  } catch {
    // ignore cleanup failures; the next build may already have removed the object.
  }

  try {
    const geometry = isRecord(obj) ? obj.geometry : null;
    const dispose = isRecord(geometry) ? geometry.dispose : null;
    if (typeof dispose === 'function') Reflect.apply(dispose, geometry, []);
  } catch {
    // ignore
  }

  try {
    const material = isRecord(obj) ? obj.material : null;
    const dispose = isRecord(material) ? material.dispose : null;
    if (typeof dispose === 'function') Reflect.apply(dispose, material, []);
  } catch {
    // ignore
  }
}

function touchRender(App: AppContainer): void {
  try {
    runPlatformActivityRenderTouch(App, {
      updateShadows: false,
      ensureRenderLoopAfterTrigger: true,
    });
  } catch {
    // ignore render wakeup failures; the overlay state is still updated.
  }
}

export function clearViewerMeasurementOverlay(App: AppContainer, render = true): void {
  const state = readOverlayState(App);
  const hadOverlay = !!state && state.objects.length > 0;
  removeOverlayStateObjects(state);
  writeOverlayState(App, null);
  if (render && hadOverlay) touchRender(App);
}

function readAddDimensionLine(App: AppContainer): BuilderDimensionLineFn | null {
  try {
    const renderOps = getBuilderRenderOps(App) as UnknownRecord | null;
    const fn = renderOps && renderOps.addDimensionLine;
    return typeof fn === 'function' ? (fn as BuilderDimensionLineFn) : null;
  } catch {
    return null;
  }
}

function readOverlayThree(App: AppContainer): OverlayThree | null {
  const THREE = getThreeMaybe(App);
  if (
    !THREE ||
    typeof THREE.BufferGeometry !== 'function' ||
    typeof THREE.LineBasicMaterial !== 'function' ||
    typeof THREE.Line !== 'function' ||
    typeof THREE.Vector3 !== 'function'
  ) {
    return null;
  }
  return THREE as OverlayThree;
}

function vector(THREE: Pick<ThreeLike, 'Vector3'>, x: number, y: number, z: number): Vector3Like {
  return new THREE.Vector3(x, y, z);
}

function formatCmLabel(valueM: number): string {
  const cm = valueM * 100;
  if (!Number.isFinite(cm)) return '';
  if (cm >= 10) return Math.round(cm).toFixed(0);
  return cm.toFixed(1).replace(/\.0$/, '');
}

function getBoxCenterAxis(box: LocalMeasurementBox, axis: MeasurementAxis): number {
  if (axis === 'x') return box.centerX;
  if (axis === 'y') return box.centerY;
  return box.centerZ;
}

function getBoxLengthAxis(box: LocalMeasurementBox, axis: MeasurementAxis): number {
  if (axis === 'x') return box.width;
  if (axis === 'y') return box.height;
  return box.depth;
}

function getBoxMinAxis(box: LocalMeasurementBox, axis: MeasurementAxis): number {
  return getBoxCenterAxis(box, axis) - getBoxLengthAxis(box, axis) / 2;
}

function getBoxMaxAxis(box: LocalMeasurementBox, axis: MeasurementAxis): number {
  return getBoxCenterAxis(box, axis) + getBoxLengthAxis(box, axis) / 2;
}

function readCoordinateAxis(value: unknown, axis: MeasurementAxis): number | null {
  const rec = isRecord(value) ? value : null;
  const n = readFiniteNumber(rec, axis);
  return n == null || !Number.isFinite(n) ? null : n;
}

function axisVector(
  THREE: Pick<ThreeLike, 'Vector3'>,
  axis: MeasurementAxis,
  amount: number,
  base?: Partial<Record<MeasurementAxis, number>>
): Vector3Like {
  const coords = { x: base?.x ?? 0, y: base?.y ?? 0, z: base?.z ?? 0 };
  coords[axis] = (coords[axis] || 0) + amount;
  return vector(THREE, coords.x, coords.y, coords.z);
}

function pointOnMeasurementPlane(
  THREE: Pick<ThreeLike, 'Vector3'>,
  box: LocalMeasurementBox,
  plane: MeasurementPlane,
  u: number,
  v: number,
  normalOffset = 0
): Vector3Like {
  const coords = { x: box.centerX, y: box.centerY, z: box.centerZ };
  coords[plane.uAxis] = u;
  coords[plane.vAxis] = v;
  coords[plane.normalAxis] = plane.normalValue + normalOffset;
  return vector(THREE, coords.x, coords.y, coords.z);
}

function inferMeasurementPlaneKind(
  box: LocalMeasurementBox,
  forceInteriorFront: boolean
): MeasurementPlaneKind {
  if (forceInteriorFront) return 'front';

  const { width, height, depth } = box;
  const smallest = Math.min(width, height, depth);
  const isThinX = width === smallest && width <= Math.min(height, depth) * 0.32;
  const isThinY = height === smallest && height <= Math.min(width, depth) * 0.32;
  const isThinZ = depth === smallest && depth <= Math.min(width, height) * 0.32;

  if (isThinX) return 'side';
  if (isThinY) return 'top';
  if (isThinZ) return 'front';
  return 'front';
}

function readClosestHitFaceSign(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  axis: MeasurementAxis;
}): number | null {
  const { App, hitState, wardrobeGroup, box, axis } = args;
  const localHit = __wp_projectWorldPointToLocal(App, hitState.primaryHitPoint, wardrobeGroup);
  const hitValue = readCoordinateAxis(localHit, axis);
  if (hitValue == null) return null;

  const min = getBoxMinAxis(box, axis);
  const max = getBoxMaxAxis(box, axis);
  const length = Math.max(MIN_MEASURABLE_EDGE_M, max - min);
  const minDistance = Math.abs(hitValue - min);
  const maxDistance = Math.abs(hitValue - max);
  const closestDistance = Math.min(minDistance, maxDistance);
  if (closestDistance > length * 0.35) return null;
  return maxDistance <= minDistance ? 1 : -1;
}

function readCameraAxisSign(args: {
  App: AppContainer;
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  axis: MeasurementAxis;
}): number | null {
  const { App, THREE, wardrobeGroup, box, axis } = args;
  const cameraWorld = readCameraWorldPosition({ App, THREE });
  const cameraLocal = cameraWorld ? __wp_projectWorldPointToLocal(App, cameraWorld, wardrobeGroup) : null;
  const cameraValue = readCoordinateAxis(cameraLocal, axis);
  if (cameraValue == null) return null;
  return cameraValue >= getBoxCenterAxis(box, axis) ? 1 : -1;
}

function readShapePlaneSign(
  box: LocalMeasurementBox,
  axis: MeasurementAxis,
  kind: MeasurementPlaneKind
): number | null {
  if (kind === 'side' && axis === 'x' && Math.abs(box.centerX) > box.width * 1.5) {
    return box.centerX >= 0 ? 1 : -1;
  }
  if (kind === 'top' && axis === 'y' && Math.abs(box.centerY) > box.height * 1.5) {
    return box.centerY >= 0 ? 1 : -1;
  }
  return null;
}

function resolveMeasurementPlane(args: {
  App: AppContainer;
  THREE: OverlayThree;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  forceInteriorFront: boolean;
}): MeasurementPlane {
  const { App, THREE, hitState, wardrobeGroup, box, forceInteriorFront } = args;
  const kind = inferMeasurementPlaneKind(box, forceInteriorFront);
  const axesByKind: Record<
    MeasurementPlaneKind,
    { normal: MeasurementAxis; u: MeasurementAxis; v: MeasurementAxis }
  > = {
    front: { normal: 'z', u: 'x', v: 'y' },
    side: { normal: 'x', u: 'z', v: 'y' },
    top: { normal: 'y', u: 'x', v: 'z' },
  };
  const axes = axesByKind[kind];
  const cameraSign = readCameraAxisSign({ App, THREE, wardrobeGroup, box, axis: axes.normal });
  const hitSign = forceInteriorFront
    ? null
    : readClosestHitFaceSign({ App, hitState, wardrobeGroup, box, axis: axes.normal });
  const shapeSign = forceInteriorFront ? null : readShapePlaneSign(box, axes.normal, kind);
  const normalSign = forceInteriorFront ? (cameraSign ?? 1) : (hitSign ?? shapeSign ?? cameraSign ?? 1);
  const normalFace = normalSign >= 0 ? getBoxMaxAxis(box, axes.normal) : getBoxMinAxis(box, axes.normal);

  const uMin = getBoxMinAxis(box, axes.u);
  const uMax = getBoxMaxAxis(box, axes.u);
  const vMin = getBoxMinAxis(box, axes.v);
  const vMax = getBoxMaxAxis(box, axes.v);

  return {
    kind,
    normalAxis: axes.normal,
    normalSign,
    normalValue: normalFace + normalSign * FRONT_Z_EPSILON_M,
    uAxis: axes.u,
    vAxis: axes.v,
    uMin,
    uMax,
    vMin,
    vMax,
    uLength: uMax - uMin,
    vLength: vMax - vMin,
  };
}

function clearMeasurementModeChrome(App: AppContainer): void {
  try {
    getUiFeedbackServiceMaybe(App)?.updateEditStateToast?.(null, false);
  } catch {
    // ignore UI feedback cleanup failures
  }

  try {
    writeMeasurementCursor(App, 'default');
  } catch {
    // ignore document cleanup failures
  }
}

function exitViewerMeasurementPrimaryMode(App: AppContainer): void {
  try {
    setModePrimary(
      App,
      'none',
      {},
      {
        source: 'viewerMeasurement:emptyClick',
        noBuild: true,
        noHistory: true,
        noAutosave: true,
        noPersist: true,
        noCapture: true,
        immediate: true,
      }
    );
  } catch {
    // Some isolated tests or partial hosts do not install mode actions; clearing
    // the overlay and chrome is still the correct local behavior.
  }

  clearMeasurementModeChrome(App);
}

function targetKeyForHit(hitState: CanvasPickingClickHitState, target: unknown): string | null {
  const ud = readUserData(target);
  const identity = hitState.hitIdentity;
  const candidates = [
    ud?.partId,
    ud?.pid,
    ud?.surfaceId,
    ud?.moduleIndex,
    identity?.partId,
    identity?.doorId,
    identity?.drawerId,
    identity?.surfaceId,
    identity?.moduleIndex,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const raw = candidates[i];
    if (raw != null && String(raw).trim()) return String(raw).trim();
  }
  return null;
}

function findTaggedAncestor(start: unknown, predicate: (userData: UnknownRecord) => boolean): unknown | null {
  let current = asMeasurableObject(start);
  while (current) {
    const ud = readUserData(current);
    if (ud && predicate(ud)) return current;
    current = asMeasurableObject(current.parent);
  }
  return null;
}

function findModuleSelectorTarget(hitState: CanvasPickingClickHitState): unknown | null {
  for (let i = 0; i < hitState.intersects.length; i += 1) {
    const obj = asMeasurableObject(hitState.intersects[i]?.object);
    if (!obj || !isModuleSelector(obj)) continue;
    const ud = readUserData(obj);
    if (hitState.foundModuleIndex == null || sameModuleKey(ud?.moduleIndex, hitState.foundModuleIndex)) {
      return obj;
    }
  }
  return null;
}

function findNearestDirectPartTarget(hitState: CanvasPickingClickHitState): unknown | null {
  if (hitState.doorHitGroup) return hitState.doorHitGroup;

  for (let i = 0; i < hitState.intersects.length; i += 1) {
    const hitObj = asMeasurableObject(hitState.intersects[i]?.object);
    if (shouldSkipDirectIntersectionObject(hitObj)) continue;

    if (hitState.foundDrawerId) {
      const drawerOwner = findTaggedAncestor(hitObj, ud => {
        const id = ud.drawerId ?? ud.partId ?? ud.pid;
        return id != null && String(id) === String(hitState.foundDrawerId);
      });
      if (drawerOwner) return drawerOwner;
    }

    const taggedOwner = findTaggedAncestor(hitObj, hasDirectMeasurableUserData);
    if (!taggedOwner) continue;
    if (isBackPanelLike(taggedOwner)) continue;

    const partId = readObjectPartId(taggedOwner);
    if (partId && (__wp_isDoorOrDrawerLikePartId(partId) || isShelfBoardPartId(partId))) {
      return taggedOwner;
    }

    if (isShelfLikeObject(taggedOwner)) return taggedOwner;

    const taggedUd = readUserData(taggedOwner);
    if (taggedUd?.surfaceId || taggedUd?.partId || taggedUd?.pid) return taggedOwner;
  }

  return null;
}

function resolveMeasurementTarget(hitState: CanvasPickingClickHitState): unknown | null {
  const directTarget = findNearestDirectPartTarget(hitState);
  if (directTarget) return directTarget;

  const primary = asMeasurableObject(hitState.primaryHitObject);
  if (!primary || isDecorativeObject(primary)) return findModuleSelectorTarget(hitState);

  const primaryUd = readUserData(primary);
  if (primaryUd?.isModuleSelector) return primary;

  if (hitState.foundModuleIndex != null && hasCavityBackgroundTarget(primary)) {
    return findModuleSelectorTarget(hitState) || primary;
  }

  const taggedOwner = findTaggedAncestor(primary, ud => !!(ud.partId ?? ud.pid ?? ud.surfaceId));
  if (taggedOwner && !isBackPanelLike(taggedOwner)) return taggedOwner;
  return findModuleSelectorTarget(hitState) || taggedOwner || primary;
}

function isModuleSelector(value: unknown): boolean {
  const ud = readUserData(value);
  return !!ud?.isModuleSelector;
}

function readModuleInteriorBox(args: {
  App: AppContainer;
  target: unknown;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
}): LocalMeasurementBox | null {
  const { App, target, hitState, wardrobeGroup } = args;
  if (hitState.foundModuleIndex == null) return null;

  const selectorTarget = isModuleSelector(target) ? target : findModuleSelectorTarget(hitState);
  const selectorBox = selectorTarget ? readMeasuredBox(App, selectorTarget, wardrobeGroup) : null;
  const fallbackBox = selectorBox || readMeasuredBox(App, target, wardrobeGroup);

  const grid = getInternalGridMap(App, hitState.foundModuleStack === 'bottom');
  const info = isRecord(grid) ? grid[String(hitState.foundModuleIndex)] : null;
  const gridInfo = isRecord(info) ? info : null;

  const fallbackBottomY = fallbackBox ? fallbackBox.centerY - fallbackBox.height / 2 : null;
  const fallbackTopY = fallbackBox ? fallbackBox.centerY + fallbackBox.height / 2 : null;
  const bottomY = readFiniteNumber(gridInfo, 'effectiveBottomY') ?? fallbackBottomY;
  const topY = readFiniteNumber(gridInfo, 'effectiveTopY') ?? fallbackTopY;
  const innerW = readFiniteNumber(gridInfo, 'innerW') ?? Math.max(0, fallbackBox?.width ?? 0);
  const internalCenterX = readFiniteNumber(gridInfo, 'internalCenterX') ?? fallbackBox?.centerX ?? 0;
  const internalDepth = readFiniteNumber(gridInfo, 'internalDepth') ?? Math.max(0, fallbackBox?.depth ?? 0);
  const internalZ = readFiniteNumber(gridInfo, 'internalZ') ?? fallbackBox?.centerZ ?? 0;
  if (bottomY == null || topY == null || !(topY > bottomY) || !(innerW > 0) || !(internalDepth > 0)) {
    return selectorBox;
  }

  const hitLocal = __wp_projectWorldPointToLocal(App, hitState.primaryHitPoint, wardrobeGroup);
  const hitY = hitLocal && Number.isFinite(hitLocal.y) ? Number(hitLocal.y) : hitState.primaryHitY;
  if (typeof hitY !== 'number' || !Number.isFinite(hitY)) {
    return {
      centerX: internalCenterX,
      centerY: (bottomY + topY) / 2,
      centerZ: internalZ,
      width: innerW,
      height: topY - bottomY,
      depth: internalDepth,
    };
  }

  const woodThick = readFiniteNumber(gridInfo, 'woodThick') ?? 0.017;
  const minShelfWidth = Math.max(0.02, innerW * 0.35);
  const minShelfDepth = Math.max(0.015, internalDepth * 0.12);
  const maxShelfHeight = Math.max(0.09, woodThick * 4.2);
  const moduleKey = hitState.foundModuleIndex;
  const moduleMinX = internalCenterX - innerW / 2;
  const moduleMaxX = internalCenterX + innerW / 2;
  const bounds: number[] = [bottomY, topY];

  const visit = (obj: Object3DLike): void => {
    if (!obj || obj === target || obj === selectorTarget || isDecorativeObject(obj)) return;
    const ud = readUserData(obj);
    const objModule = ud?.moduleIndex ?? ud?.__wpSketchModuleKey;
    if (objModule != null && !sameModuleKey(objModule, moduleKey)) return;
    if (ud?.isModuleSelector || ud?.__wpViewerMeasurementOverlay || ud?.__ignoreRaycast) return;
    if (isBackPanelLike(obj) || isMeasurementPassiveFittingObject(obj)) return;

    const box = __wp_measureObjectLocalBox(App, obj, wardrobeGroup);
    if (!box) return;
    const minY = box.centerY - box.height / 2;
    const maxY = box.centerY + box.height / 2;
    if (maxY <= bottomY + 0.001 || minY >= topY - 0.001) return;
    const minX = box.centerX - box.width / 2;
    const maxX = box.centerX + box.width / 2;
    const overlapX = Math.max(0, Math.min(moduleMaxX, maxX) - Math.max(moduleMinX, minX));
    if (overlapX < innerW * 0.2) return;

    const shelfLike = isShelfLikeUserData(ud);
    if (!shelfLike) {
      if (box.width < minShelfWidth || box.depth < minShelfDepth || box.height > maxShelfHeight) return;
    } else if (box.height > Math.max(maxShelfHeight, woodThick * 5.5)) {
      return;
    }

    bounds.push(Math.max(bottomY, minY), Math.min(topY, maxY));
  };

  try {
    if (typeof wardrobeGroup.traverse === 'function') wardrobeGroup.traverse(visit);
    else for (let i = 0; i < wardrobeGroup.children.length; i += 1) visit(wardrobeGroup.children[i]);
  } catch {
    // A cavity measurement should still fall back to the full internal selector box.
  }

  const sorted = bounds
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b)
    .reduce<number[]>((acc, n) => {
      if (!acc.length || Math.abs(acc[acc.length - 1] - n) > 0.004) acc.push(n);
      return acc;
    }, []);

  let low = bottomY;
  let high = topY;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b - a < MIN_MEASURABLE_EDGE_M) continue;
    if (hitY >= a - 0.002 && hitY <= b + 0.002) {
      low = a;
      high = b;
      break;
    }
  }

  const height = high - low;
  if (!(height > MIN_MEASURABLE_EDGE_M)) return selectorBox;
  return {
    centerX: internalCenterX,
    centerY: (low + high) / 2,
    centerZ: internalZ,
    width: innerW,
    height,
    depth: internalDepth,
  };
}

function readMeasuredBox(
  App: AppContainer,
  target: unknown,
  wardrobeGroup: Object3DLike
): LocalMeasurementBox | null {
  const measured = __wp_measureObjectLocalBox(App, target, wardrobeGroup);
  if (!measured) return null;
  const { centerX, centerY, centerZ, width, height, depth } = measured;
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(centerZ) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(depth) ||
    width < MIN_MEASURABLE_EDGE_M ||
    height < MIN_MEASURABLE_EDGE_M
  ) {
    return null;
  }
  return { centerX, centerY, centerZ, width, height, depth };
}

function readVectorPosition(value: unknown): { x: number; y: number; z: number } | null {
  const rec = isRecord(value) ? value : null;
  const x = readFiniteNumber(rec, 'x');
  const y = readFiniteNumber(rec, 'y');
  const z = readFiniteNumber(rec, 'z');
  return x == null || y == null || z == null ? null : { x, y, z };
}

function readCameraWorldPosition(args: { App: AppContainer; THREE: OverlayThree }): Vector3Like | null {
  const { App, THREE } = args;
  const camera = getCamera(App);
  const cameraRec = isRecord(camera) ? camera : null;
  if (!cameraRec) return null;

  const worldTarget = new THREE.Vector3(0, 0, 0);
  const getWorldPosition = cameraRec.getWorldPosition;
  if (typeof getWorldPosition === 'function') {
    try {
      const returned = Reflect.apply(getWorldPosition, cameraRec, [worldTarget]);
      const returnedPosition = readVectorPosition(returned);
      if (returnedPosition) return vector(THREE, returnedPosition.x, returnedPosition.y, returnedPosition.z);
      const targetPosition = readVectorPosition(worldTarget);
      if (targetPosition) return vector(THREE, targetPosition.x, targetPosition.y, targetPosition.z);
    } catch {
      // fall through to camera.position
    }
  }

  const position = readVectorPosition(cameraRec.position);
  return position ? vector(THREE, position.x, position.y, position.z) : null;
}

function addTrackedLine(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  objects: Object3DLike[];
  points: Vector3Like[];
  name: string;
}): void {
  const { THREE, wardrobeGroup, objects, points, name } = args;
  const geometry = new THREE.BufferGeometry();
  if (typeof geometry.setFromPoints === 'function') geometry.setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.98,
    depthTest: true,
    depthWrite: false,
  });
  const line = asObject3D(new THREE.Line(geometry, material));
  if (!line) return;
  line.name = name;
  line.renderOrder = OVERLAY_RENDER_ORDER;
  line.userData = {
    ...(line.userData || {}),
    __wpViewerMeasurementOverlay: true,
    __wpExcludeWardrobeBounds: true,
    __ignoreRaycast: true,
  };
  wardrobeGroup.add(line);
  objects.push(line);
}

function tuneOverlayMaterial(material: unknown, options: { depthTest: boolean }): unknown {
  const rec = isRecord(material) ? material : null;
  if (!rec) return material;

  let writable = rec;
  const clone = rec.clone;
  if (typeof clone === 'function') {
    try {
      const cloned = Reflect.apply(clone, rec, []);
      if (isRecord(cloned)) writable = cloned;
    } catch {
      writable = rec;
    }
  }

  try {
    writable.depthTest = options.depthTest;
    writable.depthWrite = false;
    writable.transparent = true;
    writable.needsUpdate = true;
  } catch {
    // ignore material write failures
  }

  return writable;
}

function tuneOverlayObject(obj: Object3DLike, options: { depthTest: boolean }): void {
  const rec = isRecord(obj) ? obj : null;
  if (!rec) return;
  try {
    rec.renderOrder = OVERLAY_RENDER_ORDER;
  } catch {
    // ignore
  }
  const material = rec.material;
  try {
    if (Array.isArray(material)) rec.material = material.map(item => tuneOverlayMaterial(item, options));
    else if (material) rec.material = tuneOverlayMaterial(material, options);
  } catch {
    // ignore
  }
}

function readCreatedDimensionObjects(value: unknown): Object3DLike[] {
  const rec = isRecord(value) ? value : null;
  const out: Object3DLike[] = [];
  const line = asObject3D(rec?.line);
  const sprite = asObject3D(rec?.sprite);
  if (line) {
    line.userData = {
      ...(line.userData || {}),
      __wpViewerMeasurementOverlay: true,
      __wpExcludeWardrobeBounds: true,
      __ignoreRaycast: true,
    };
    tuneOverlayObject(line, { depthTest: true });
    out.push(line);
  }
  if (sprite) {
    sprite.userData = {
      ...(sprite.userData || {}),
      __wpViewerMeasurementOverlay: true,
      __wpExcludeWardrobeBounds: true,
      __ignoreRaycast: true,
    };
    tuneOverlayObject(sprite, { depthTest: false });
    out.push(sprite);
  }
  return out;
}

function addDimensionGuides(args: {
  THREE: OverlayThree;
  addDimensionLine: BuilderDimensionLineFn;
  box: LocalMeasurementBox;
  plane: MeasurementPlane;
  objects: Object3DLike[];
}): void {
  const { THREE, addDimensionLine, box, plane, objects } = args;
  const sideOffset = SIDE_GUIDE_OFFSET_M;
  const normalBump = plane.normalSign * FRONT_Z_EPSILON_M;
  const labelScale = { textScale: 0.78, styleKey: 'cell' };

  const widthObjects = readCreatedDimensionObjects(
    addDimensionLine(
      pointOnMeasurementPlane(THREE, box, plane, plane.uMin, plane.vMax),
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax, plane.vMax),
      axisVector(THREE, plane.vAxis, GUIDE_OFFSET_M, { [plane.normalAxis]: normalBump }),
      formatCmLabel(plane.uLength),
      labelScale,
      axisVector(THREE, plane.vAxis, 0.012)
    )
  );
  objects.push(...widthObjects);

  const heightObjects = readCreatedDimensionObjects(
    addDimensionLine(
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax + sideOffset, plane.vMin),
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax + sideOffset, plane.vMax),
      axisVector(THREE, plane.uAxis, sideOffset, { [plane.normalAxis]: normalBump }),
      formatCmLabel(plane.vLength),
      labelScale
    )
  );
  objects.push(...heightObjects);
}

function resolveSelectionFrameAxisMin(
  plane: MeasurementPlane,
  axis: MeasurementAxis,
  min: number,
  max: number
): number {
  if (plane.kind !== 'top' || axis !== 'z') return min;
  const length = max - min;
  if (!(length > MIN_MEASURABLE_EDGE_M)) return min;
  const pull = Math.min(
    REAR_SELECTION_FRAME_PULL_FORWARD_M,
    Math.max(0, length - MIN_MEASURABLE_EDGE_M) * 0.25
  );
  if (!(pull > 0)) return min;
  return Math.min(max - MIN_MEASURABLE_EDGE_M, min + pull);
}

function addSelectionFrame(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  plane: MeasurementPlane;
  objects: Object3DLike[];
}): void {
  const { THREE, wardrobeGroup, box, plane, objects } = args;
  const frameUMin = resolveSelectionFrameAxisMin(plane, plane.uAxis, plane.uMin, plane.uMax);
  const frameVMin = resolveSelectionFrameAxisMin(plane, plane.vAxis, plane.vMin, plane.vMax);
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: 'wp-viewer-measurement-selection-frame',
    points: [
      pointOnMeasurementPlane(THREE, box, plane, frameUMin, frameVMin),
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax, frameVMin),
      pointOnMeasurementPlane(THREE, box, plane, plane.uMax, plane.vMax),
      pointOnMeasurementPlane(THREE, box, plane, frameUMin, plane.vMax),
      pointOnMeasurementPlane(THREE, box, plane, frameUMin, frameVMin),
    ],
  });
}

function readHitLocalPoint(
  App: AppContainer,
  hitState: CanvasPickingClickHitState,
  wardrobeGroup: Object3DLike
): { x: number; y: number; z: number } | null {
  const candidates = [hitState.primaryHitPoint, hitState.doorHitPoint, hitState.intersects?.[0]?.point];
  for (let i = 0; i < candidates.length; i += 1) {
    const point = __wp_projectWorldPointToLocal(App, candidates[i], wardrobeGroup);
    if (point) return point;
  }
  return null;
}

function readPointAxis(point: { x: number; y: number; z: number }, axis: MeasurementAxis): number {
  if (axis === 'x') return point.x;
  if (axis === 'y') return point.y;
  return point.z;
}

function makePointOnPlane(
  THREE: Pick<ThreeLike, 'Vector3'>,
  plane: MeasurementPlane,
  u: number,
  v: number
): Vector3Like {
  const coords = { x: 0, y: 0, z: 0 };
  coords[plane.uAxis] = u;
  coords[plane.vAxis] = v;
  coords[plane.normalAxis] = plane.normalValue;
  return vector(THREE, coords.x, coords.y, coords.z);
}

function projectLocalPointToPlane(
  THREE: Pick<ThreeLike, 'Vector3'>,
  plane: MeasurementPlane,
  localPoint: { x: number; y: number; z: number }
): Vector3Like {
  return makePointOnPlane(
    THREE,
    plane,
    readPointAxis(localPoint, plane.uAxis),
    readPointAxis(localPoint, plane.vAxis)
  );
}

function offsetPointOnMeasurementPlane(
  THREE: Pick<ThreeLike, 'Vector3'>,
  plane: MeasurementPlane,
  point: { x: number; y: number; z: number },
  deltaU: number,
  deltaV: number
): Vector3Like {
  const coords = { x: point.x, y: point.y, z: point.z };
  coords[plane.uAxis] = (coords[plane.uAxis] || 0) + deltaU;
  coords[plane.vAxis] = (coords[plane.vAxis] || 0) + deltaV;
  return vector(THREE, coords.x, coords.y, coords.z);
}

function addPointCrossMarker(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  objects: Object3DLike[];
  plane: MeasurementPlane;
  point: Vector3Like;
  namePrefix: string;
  half?: number;
}): void {
  const { THREE, wardrobeGroup, objects, plane, point, namePrefix } = args;
  const half = args.half ?? 0.014;
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: `${namePrefix}-x-a`,
    points: [
      offsetPointOnMeasurementPlane(THREE, plane, point, -half, -half),
      offsetPointOnMeasurementPlane(THREE, plane, point, half, half),
    ],
  });
  addTrackedLine({
    THREE,
    wardrobeGroup,
    objects,
    name: `${namePrefix}-x-b`,
    points: [
      offsetPointOnMeasurementPlane(THREE, plane, point, -half, half),
      offsetPointOnMeasurementPlane(THREE, plane, point, half, -half),
    ],
  });
}

function addDraftPointMarker(args: {
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  objects: Object3DLike[];
  plane: MeasurementPlane;
  point: Vector3Like;
  namePrefix?: string;
}): void {
  addPointCrossMarker({
    ...args,
    namePrefix: args.namePrefix || 'wp-viewer-measurement-point-draft-marker',
  });
}

type ResolvedPointMeasurement = {
  axis: MeasurementAxis;
  start: Vector3Like;
  end: Vector3Like;
  length: number;
};

function resolvePointMeasurementEnd(args: {
  THREE: OverlayThree;
  draft: PointMeasurementDraft;
  localEnd: { x: number; y: number; z: number };
}): ResolvedPointMeasurement | null {
  const { THREE, draft, localEnd } = args;
  const plane = draft.plane;
  const startU = readPointAxis(draft.point, plane.uAxis);
  const startV = readPointAxis(draft.point, plane.vAxis);
  const rawEndU = readPointAxis(localEnd, plane.uAxis);
  const rawEndV = readPointAxis(localEnd, plane.vAxis);
  const deltaU = rawEndU - startU;
  const deltaV = rawEndV - startV;
  const axis: MeasurementAxis = Math.abs(deltaU) >= Math.abs(deltaV) ? plane.uAxis : plane.vAxis;
  const endU = axis === plane.uAxis ? rawEndU : startU;
  const endV = axis === plane.vAxis ? rawEndV : startV;
  const length = Math.abs(axis === plane.uAxis ? endU - startU : endV - startV);
  if (!Number.isFinite(length)) return null;
  return {
    axis,
    start: makePointOnPlane(THREE, plane, startU, startV),
    end: makePointOnPlane(THREE, plane, endU, endV),
    length,
  };
}

function removeOverlayStateObjects(state: MeasurementOverlayState | null): void {
  if (!state) return;
  for (let i = 0; i < state.objects.length; i += 1) {
    const obj = state.objects[i];
    if (obj) removeObjectFromScene(obj);
  }
}

function renderPointDraftOverlay(args: {
  App: AppContainer;
  draft: PointMeasurementDraft;
  hitState?: CanvasPickingClickHitState | null;
  includePreview: boolean;
}): boolean {
  const { App, draft, hitState, includePreview } = args;
  const THREE = readOverlayThree(App);
  const wardrobeGroup = getWardrobeGroup(App);
  if (!THREE || !wardrobeGroup) return false;

  const objects: Object3DLike[] = [];
  const startPoint = vector(THREE, draft.point.x, draft.point.y, draft.point.z);
  addDraftPointMarker({
    THREE,
    wardrobeGroup,
    objects,
    plane: draft.plane,
    point: startPoint,
    namePrefix: 'wp-viewer-measurement-point-draft-start',
  });

  if (includePreview && hitState) {
    const localEnd = readHitLocalPoint(App, hitState, wardrobeGroup);
    const addDimensionLine = readAddDimensionLine(App);
    const resolved = localEnd ? resolvePointMeasurementEnd({ THREE, draft, localEnd }) : null;
    if (resolved) {
      addDraftPointMarker({
        THREE,
        wardrobeGroup,
        objects,
        plane: draft.plane,
        point: resolved.end,
        namePrefix: 'wp-viewer-measurement-point-draft-cursor',
      });
      if (resolved.length > MIN_MEASURABLE_EDGE_M && addDimensionLine) {
        objects.push(
          ...readCreatedDimensionObjects(
            addDimensionLine(
              resolved.start,
              resolved.end,
              axisVector(THREE, draft.plane.normalAxis, 0),
              formatCmLabel(resolved.length),
              { textScale: 0.82, styleKey: 'cell' }
            )
          )
        );
      } else {
        addTrackedLine({
          THREE,
          wardrobeGroup,
          objects,
          name: 'wp-viewer-measurement-point-draft-preview-line',
          points: [resolved.start, resolved.end],
        });
      }
    }
  }

  writeOverlayState(App, { objects, targetKey: draft.targetKey, pointDraft: draft });
  touchRender(App);
  return true;
}

function resolvePointMeasurementStart(args: {
  App: AppContainer;
  THREE: OverlayThree;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
}): PointMeasurementDraft | null {
  const { App, THREE, hitState, wardrobeGroup } = args;
  const target = resolveMeasurementTarget(hitState);
  if (!target) return null;

  const shouldMeasureInterior =
    hitState.foundModuleIndex != null && (isModuleSelector(target) || hasCavityBackgroundTarget(target));
  const box =
    (shouldMeasureInterior ? readModuleInteriorBox({ App, target, hitState, wardrobeGroup }) : null) ||
    readMeasuredBox(App, target, wardrobeGroup);
  if (!box) return null;

  const plane = resolveMeasurementPlane({
    App,
    THREE,
    hitState,
    wardrobeGroup,
    box,
    forceInteriorFront: shouldMeasureInterior,
  });
  const localPoint = readHitLocalPoint(App, hitState, wardrobeGroup);
  if (!localPoint) return null;
  const point = projectLocalPointToPlane(THREE, plane, localPoint);
  return {
    point: { x: point.x, y: point.y, z: point.z },
    plane,
    targetKey: targetKeyForHit(hitState, target),
  };
}

function beginPointMeasurementDraft(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState;
}): boolean {
  const { App, hitState } = args;
  const THREE = readOverlayThree(App);
  const wardrobeGroup = getWardrobeGroup(App);
  if (!THREE || !wardrobeGroup) return false;

  const draft = resolvePointMeasurementStart({ App, THREE, hitState, wardrobeGroup });
  if (!draft) return false;

  if (!renderPointDraftOverlay({ App, draft, includePreview: false })) return false;

  try {
    getUiFeedbackServiceMaybe(App)?.updateEditStateToast?.(
      'מצב מדידה מדוייק: לחץ נקודה שנייה בקו ישר הקרוב ביותר',
      true
    );
  } catch {
    // visual overlay is enough in partial test hosts.
  }
  return true;
}

function renderPointMeasurement(args: {
  App: AppContainer;
  draft: PointMeasurementDraft;
  hitState: CanvasPickingClickHitState;
}): boolean {
  const { App, draft, hitState } = args;
  const THREE = readOverlayThree(App);
  const wardrobeGroup = getWardrobeGroup(App);
  const addDimensionLine = readAddDimensionLine(App);
  if (!THREE || !wardrobeGroup || !addDimensionLine) return false;

  const localEnd = readHitLocalPoint(App, hitState, wardrobeGroup);
  if (!localEnd) return false;

  const plane = draft.plane;
  const resolved = resolvePointMeasurementEnd({ THREE, draft, localEnd });
  if (!resolved || !(resolved.length > MIN_MEASURABLE_EDGE_M)) {
    return beginPointMeasurementDraft({ App, hitState });
  }

  const objects: Object3DLike[] = [];

  const lineObjects = readCreatedDimensionObjects(
    addDimensionLine(
      resolved.start,
      resolved.end,
      axisVector(THREE, plane.normalAxis, 0),
      formatCmLabel(resolved.length),
      { textScale: 0.82, styleKey: 'cell' }
    )
  );
  objects.push(...lineObjects);
  addDraftPointMarker({
    THREE,
    wardrobeGroup,
    objects,
    plane,
    point: resolved.start,
    namePrefix: 'wp-viewer-measurement-point-start',
  });
  addDraftPointMarker({
    THREE,
    wardrobeGroup,
    objects,
    plane,
    point: resolved.end,
    namePrefix: 'wp-viewer-measurement-point-end',
  });

  writeOverlayState(App, { objects, targetKey: draft.targetKey, pointDraft: null });
  touchRender(App);
  return true;
}

function isEmptyMeasurementHitState(hitState: CanvasPickingClickHitState | null): boolean {
  if (!hitState) return true;
  if (!Array.isArray(hitState.intersects) || hitState.intersects.length === 0) return true;
  return !resolveMeasurementTarget(hitState);
}

function exitPointMeasurementOnEmptyClick(App: AppContainer): boolean {
  clearViewerMeasurementOverlay(App, false);
  exitViewerMeasurementPrimaryMode(App);
  touchRender(App);
  return true;
}

function tryHandleViewerPointMeasurementClick(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
}): boolean {
  const { App, hitState } = args;
  const currentState = readOverlayState(App);
  const draft = currentState?.pointDraft || null;

  if (isEmptyMeasurementHitState(hitState)) {
    return exitPointMeasurementOnEmptyClick(App);
  }

  if (!draft) {
    clearViewerMeasurementOverlay(App, false);
    if (!beginPointMeasurementDraft({ App, hitState })) touchRender(App);
    return true;
  }

  clearViewerMeasurementOverlay(App, false);
  if (!renderPointMeasurement({ App, draft, hitState })) touchRender(App);
  return true;
}

export function tryHandleViewerMeasurementHover(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
}): boolean {
  const { App, hitState } = args;
  if (getViewerMeasurementToolMode(App) !== 'points') return false;
  const state = readOverlayState(App);
  const draft = state?.pointDraft || null;
  if (!draft) return false;

  removeOverlayStateObjects(state);
  if (!renderPointDraftOverlay({ App, draft, hitState, includePreview: !!hitState })) {
    writeOverlayState(App, { objects: [], targetKey: draft.targetKey, pointDraft: draft });
    touchRender(App);
  }
  return true;
}

function renderMeasurementOverlay(args: {
  App: AppContainer;
  target: unknown;
  hitState: CanvasPickingClickHitState;
}): boolean {
  const { App, target, hitState } = args;
  const THREE = readOverlayThree(App);
  const wardrobeGroup = getWardrobeGroup(App);
  const addDimensionLine = readAddDimensionLine(App);
  if (!THREE || !wardrobeGroup || !addDimensionLine) return false;

  const shouldMeasureInterior =
    hitState.foundModuleIndex != null && (isModuleSelector(target) || hasCavityBackgroundTarget(target));
  const box =
    (shouldMeasureInterior ? readModuleInteriorBox({ App, target, hitState, wardrobeGroup }) : null) ||
    readMeasuredBox(App, target, wardrobeGroup);
  if (!box) return false;

  const plane = resolveMeasurementPlane({
    App,
    THREE,
    hitState,
    wardrobeGroup,
    box,
    forceInteriorFront: shouldMeasureInterior,
  });
  const objects: Object3DLike[] = [];
  addSelectionFrame({ THREE, wardrobeGroup, box, plane, objects });
  addDimensionGuides({ THREE, addDimensionLine, box, plane, objects });

  const key = targetKeyForHit(hitState, target);
  writeOverlayState(App, { objects, targetKey: key });
  touchRender(App);
  return true;
}

export function tryHandleViewerMeasurementClick(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
}): boolean {
  const { App, hitState } = args;

  try {
    if (getViewerMeasurementToolMode(App) === 'points') {
      return tryHandleViewerPointMeasurementClick({ App, hitState });
    }
  } catch {
    // Fall back to the regular part measurement in partial hosts.
  }

  clearViewerMeasurementOverlay(App, false);
  if (!hitState) {
    exitViewerMeasurementPrimaryMode(App);
    touchRender(App);
    return true;
  }

  try {
    const target = resolveMeasurementTarget(hitState);
    if (!target) {
      exitViewerMeasurementPrimaryMode(App);
      touchRender(App);
      return true;
    }
    if (!renderMeasurementOverlay({ App, target, hitState })) touchRender(App);
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'viewerMeasurement',
      op: 'click',
      throttleMs: 1000,
    });
    touchRender(App);
  }
  return true;
}
