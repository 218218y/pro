import type { AppContainer, Object3DLike, UnknownRecord } from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';

import { isShelfBoardPartId } from '../features/part_identity/api.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { getCamera } from '../runtime/render_access.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import { __wp_isDoorOrDrawerLikePartId } from './canvas_picking_core_helpers.js';
import { __wp_measureObjectLocalBox, __wp_projectWorldPointToLocal } from './canvas_picking_local_helpers.js';
import {
  FRONT_Z_EPSILON_M,
  MIN_MEASURABLE_EDGE_M,
  type LocalMeasurementBox,
  type MeasurableObject,
  type MeasurementAxis,
  type MeasurementBasisVector,
  type MeasurementPlane,
  type MeasurementPlaneKind,
  type OverlayThree,
} from './viewer_measurement_tool_contracts.js';
import {
  getBoxCenterAxis,
  getBoxMaxAxis,
  getBoxMinAxis,
  inferMeasurementPlaneKind,
  measurementPlaneAxes,
  normalizeBasisVector,
  readCoordinateAxis,
  rotatePointByEuler,
  subBasisVector,
} from './viewer_measurement_tool_geometry.js';

const POINT_FRONT_PLANE_OCCLUSION_PROMOTION_MAX_M = 0.16;

export type ViewerMeasurementResolution = {
  target: unknown;
  targetKey: string | null;
  box: LocalMeasurementBox;
  plane: MeasurementPlane;
  shouldMeasureInterior: boolean;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asMeasurableObject(value: unknown): MeasurableObject | null {
  return isRecord(value) ? (value as MeasurableObject) : null;
}

export function readUserData(value: unknown): UnknownRecord | null {
  const rec = isRecord(value) ? value : null;
  const ud = rec && isRecord(rec.userData) ? rec.userData : null;
  return ud;
}

export function readFiniteNumber(value: unknown, key: string): number | null {
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

export function hasCavityBackgroundTarget(value: unknown): boolean {
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

export function isDecorativeObject(value: unknown): boolean {
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

export function isMeasurementPassiveFittingObject(value: unknown): boolean {
  if (hasPassiveFittingAncestor(value)) return true;
  const obj = asMeasurableObject(value);
  if (!obj) return false;
  return hasCylinderGeometryParameters(obj) && !isShelfLikeObject(obj);
}

function shouldSkipDirectIntersectionObject(value: unknown): boolean {
  const obj = asMeasurableObject(value);
  if (!obj || isDecorativeObject(obj) || isMeasurementPassiveFittingObject(obj)) return true;
  const ud = readUserData(obj);
  if (ud?.isModuleSelector || ud?.__ignoreRaycast) return true;
  return isFullyTransparentMaterialObject(obj);
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

function readVectorRecord(value: unknown): MeasurementBasisVector | null {
  const rec = isRecord(value) ? value : null;
  const x = readFiniteNumber(rec, 'x');
  const y = readFiniteNumber(rec, 'y');
  const z = readFiniteNumber(rec, 'z');
  return x == null || y == null || z == null ? null : { x, y, z };
}

function transformLocalPointToAncestor(
  point: MeasurementBasisVector,
  object: unknown,
  ancestor: unknown
): MeasurementBasisVector | null {
  let current = asMeasurableObject(object);
  let out = { ...point };
  while (current && current !== ancestor) {
    const scale = readVectorRecord(current.scale) || { x: 1, y: 1, z: 1 };
    out = { x: out.x * scale.x, y: out.y * scale.y, z: out.z * scale.z };
    out = rotatePointByEuler(out, readVectorRecord(current.rotation));
    const position = readVectorRecord(current.position) || { x: 0, y: 0, z: 0 };
    out = { x: out.x + position.x, y: out.y + position.y, z: out.z + position.z };
    current = asMeasurableObject(current.parent);
  }
  return current === ancestor ? out : null;
}

function transformLocalDirectionToAncestor(
  direction: MeasurementBasisVector,
  object: unknown,
  ancestor: unknown
): MeasurementBasisVector | null {
  const origin = transformLocalPointToAncestor({ x: 0, y: 0, z: 0 }, object, ancestor);
  const end = transformLocalPointToAncestor(direction, object, ancestor);
  if (!origin || !end) return null;
  return normalizeBasisVector(subBasisVector(end, origin));
}

function findCornerPentDoorAncestor(start: unknown): MeasurableObject | null {
  let current = asMeasurableObject(start);
  while (current) {
    const ud = readUserData(current);
    if (ud?.__wpCornerPentDoor === true) return current;
    current = asMeasurableObject(current.parent);
  }
  return null;
}

function readCornerPentDoorMeasurementBox(args: {
  target: unknown;
  wardrobeGroup: Object3DLike;
}): { box: LocalMeasurementBox; plane: MeasurementPlane } | null {
  const { target, wardrobeGroup } = args;
  const door = findCornerPentDoorAncestor(target);
  if (!door) return null;
  const ud = readUserData(door);
  const width = readFiniteNumber(ud, '__doorWidth');
  const height = readFiniteNumber(ud, '__doorHeight');
  const depth = readFiniteNumber(ud, '__wpFrontThickness');
  const meshOffsetX = readFiniteNumber(ud, '__doorMeshOffsetX') ?? 0;
  const faceSign =
    (readFiniteNumber(ud, '__handleZSign') ?? readFiniteNumber(ud, '__wpDoorOpenDirSign') ?? 1) >= 0 ? 1 : -1;
  if (!(width != null && width > MIN_MEASURABLE_EDGE_M && height != null && height > MIN_MEASURABLE_EDGE_M)) {
    return null;
  }
  const safeDepth = depth != null && depth > MIN_MEASURABLE_EDGE_M ? depth : MIN_MEASURABLE_EDGE_M;
  const center = transformLocalPointToAncestor({ x: meshOffsetX, y: 0, z: 0 }, door, wardrobeGroup);
  const u = transformLocalDirectionToAncestor({ x: 1, y: 0, z: 0 }, door, wardrobeGroup);
  const v = transformLocalDirectionToAncestor({ x: 0, y: 1, z: 0 }, door, wardrobeGroup);
  const normal = transformLocalDirectionToAncestor({ x: 0, y: 0, z: 1 }, door, wardrobeGroup);
  if (!center || !u || !v || !normal) return null;

  const box = {
    centerX: center.x,
    centerY: center.y,
    centerZ: center.z,
    width,
    height,
    depth: safeDepth,
  };
  const uMin = -width / 2;
  const uMax = width / 2;
  const vMin = -height / 2;
  const vMax = height / 2;
  const normalMin = -safeDepth / 2;
  const normalMax = safeDepth / 2;
  const normalFace = faceSign >= 0 ? normalMax : normalMin;
  return {
    box,
    plane: {
      kind: 'front',
      normalAxis: 'z',
      normalSign: faceSign,
      normalValue: normalFace + faceSign * FRONT_Z_EPSILON_M,
      uAxis: 'x',
      vAxis: 'y',
      uMin,
      uMax,
      vMin,
      vMax,
      uLength: uMax - uMin,
      vLength: vMax - vMin,
      basis: {
        center,
        u,
        v,
        normal,
        normalMin,
        normalMax,
      },
    },
  };
}

function readVectorPosition(value: unknown): { x: number; y: number; z: number } | null {
  const rec = isRecord(value) ? value : null;
  const x = readFiniteNumber(rec, 'x');
  const y = readFiniteNumber(rec, 'y');
  const z = readFiniteNumber(rec, 'z');
  return x == null || y == null || z == null ? null : { x, y, z };
}

export function readCameraWorldPosition(args: {
  App: AppContainer;
  THREE: OverlayThree;
}): Vector3Like | null {
  const { App, THREE } = args;
  const camera = getCamera(App);
  const cameraRec = isRecord(camera) ? camera : null;
  if (!cameraRec) return null;

  const getWorldPosition = cameraRec.getWorldPosition;
  if (typeof getWorldPosition === 'function') {
    const worldTarget = new THREE.Vector3();
    try {
      const returned = Reflect.apply(getWorldPosition, camera, [worldTarget]);
      const returnedPosition = readVectorPosition(returned);
      if (returnedPosition)
        return new THREE.Vector3(returnedPosition.x, returnedPosition.y, returnedPosition.z);
      const targetPosition = readVectorPosition(worldTarget);
      if (targetPosition) return new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
    } catch {
      // fall back to camera.position below
    }
  }

  const position = readVectorPosition(cameraRec.position);
  return position ? new THREE.Vector3(position.x, position.y, position.z) : null;
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

export function readCameraAxisSign(args: {
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

export function resolveViewerMeasurementPlane(args: {
  App: AppContainer;
  THREE: OverlayThree;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  forceInteriorFront: boolean;
  target?: unknown;
}): MeasurementPlane {
  const { App, THREE, hitState, wardrobeGroup, box, forceInteriorFront, target } = args;
  if (!forceInteriorFront && target) {
    const cornerDoor = readCornerPentDoorMeasurementBox({ target, wardrobeGroup });
    if (cornerDoor) return cornerDoor.plane;
  }
  const kind = inferMeasurementPlaneKind(box, forceInteriorFront);
  const axes = measurementPlaneAxes(kind);
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

export function targetKeyForHit(hitState: CanvasPickingClickHitState, target: unknown): string | null {
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

export function resolveViewerMeasurementTarget(hitState: CanvasPickingClickHitState): unknown | null {
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

export function isModuleSelector(value: unknown): boolean {
  const ud = readUserData(value);
  return !!ud?.isModuleSelector;
}

function isSlidingDoorLikeUserData(userData: UnknownRecord | null): boolean {
  if (!userData) return false;
  if (userData.__doorType === 'sliding') return true;

  const partId = readPartIdFromUserData(userData)?.toLowerCase() || '';
  return (
    partId.startsWith('sliding') ||
    partId.startsWith('slide') ||
    partId.startsWith('lower_sliding') ||
    partId.startsWith('lower_slide')
  );
}

export function isSlidingDoorLikeTarget(value: unknown): boolean {
  let current = asMeasurableObject(value);
  while (current) {
    if (isSlidingDoorLikeUserData(readUserData(current))) return true;
    current = asMeasurableObject(current.parent);
  }
  return false;
}

function readFrontPlaneOcclusionAdvance(args: {
  targetBox: LocalMeasurementBox;
  boundsBox: LocalMeasurementBox;
  normalSign: number;
}): number | null {
  const normalSign = args.normalSign >= 0 ? 1 : -1;
  const targetFace =
    normalSign >= 0 ? getBoxMaxAxis(args.targetBox, 'z') : getBoxMinAxis(args.targetBox, 'z');
  const boundsFace =
    normalSign >= 0 ? getBoxMaxAxis(args.boundsBox, 'z') : getBoxMinAxis(args.boundsBox, 'z');
  const advance = normalSign * (boundsFace - targetFace);
  return Number.isFinite(advance) ? advance : null;
}

export function hasVisibleFrontPlaneOcclusion(args: {
  targetBox: LocalMeasurementBox;
  boundsBox: LocalMeasurementBox;
  normalSign: number;
}): boolean {
  const advance = readFrontPlaneOcclusionAdvance(args);
  return (
    advance != null && advance > FRONT_Z_EPSILON_M && advance <= POINT_FRONT_PLANE_OCCLUSION_PROMOTION_MAX_M
  );
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

export function readMeasuredBox(
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

export function resolveViewerMeasurementResolution(args: {
  App: AppContainer;
  THREE: OverlayThree;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  target?: unknown;
}): ViewerMeasurementResolution | null {
  const { App, THREE, hitState, wardrobeGroup } = args;
  const target = args.target ?? resolveViewerMeasurementTarget(hitState);
  if (!target) return null;

  const shouldMeasureInterior =
    hitState.foundModuleIndex != null && (isModuleSelector(target) || hasCavityBackgroundTarget(target));
  const cornerDoorMeasurement = shouldMeasureInterior
    ? null
    : readCornerPentDoorMeasurementBox({ target, wardrobeGroup });
  const box =
    (shouldMeasureInterior ? readModuleInteriorBox({ App, target, hitState, wardrobeGroup }) : null) ||
    cornerDoorMeasurement?.box ||
    readMeasuredBox(App, target, wardrobeGroup);
  if (!box) return null;

  const plane =
    cornerDoorMeasurement?.plane ||
    resolveViewerMeasurementPlane({
      App,
      THREE,
      hitState,
      wardrobeGroup,
      box,
      forceInteriorFront: shouldMeasureInterior,
      target,
    });

  return {
    target,
    targetKey: targetKeyForHit(hitState, target),
    box,
    plane,
    shouldMeasureInterior,
  };
}
