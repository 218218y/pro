import type { Object3DLike, UnknownRecord } from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

import { isShelfBoardPartId } from '../features/part_identity/api.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import type { ViewerMeasurementGeometryRuntime } from './viewer_measurement_geometry_runtime.js';
import { __wp_isDoorOrDrawerLikePartId } from './canvas_picking_core_helpers.js';
import { readCanvasPickingMaterialHitPolicy } from './canvas_picking_transparent_hit_policy.js';
import {
  FRONT_Z_EPSILON_M,
  MIN_MEASURABLE_EDGE_M,
  POINT_FRONT_PLANE_OCCLUSION_PROMOTION_MAX_M,
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

export type ViewerMeasurementResolution = {
  target: unknown;
  targetKey: string | null;
  measurementKey: string;
  box: LocalMeasurementBox;
  plane: MeasurementPlane;
  shouldMeasureInterior: boolean;
};

function isRecord(value: unknown): value is UnknownRecord {
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

function readFiniteNumber(value: unknown, key: string): number | null {
  const rec = isRecord(value) ? value : null;
  const raw = rec ? rec[key] : null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

export function readViewerMeasurementIdentityText(value: unknown): string {
  return formatIdentityValue(readIdentityValue(value)).trim();
}

export function isViewerMeasurementShelfPartId(value: unknown): boolean {
  return isShelfBoardPartId(value);
}

export function isViewerMeasurementDoorOrDrawerPartId(value: unknown): boolean {
  return __wp_isDoorOrDrawerLikePartId(value);
}

function readPartIdFromUserData(userData: UnknownRecord | null): string | null {
  const raw = userData?.partId ?? userData?.pid;
  const text = readViewerMeasurementIdentityText(raw);
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

function hasDirectMeasurableAncestor(value: unknown): boolean {
  let current = asMeasurableObject(value);
  while (current) {
    if (hasDirectMeasurableUserData(readUserData(current))) return true;
    current = asMeasurableObject(current.parent);
  }
  return false;
}

function hasCavityBackgroundTarget(value: unknown): boolean {
  const ud = readUserData(value);
  if (isBackPanelLike(value)) return true;
  if (ud?.isModuleSelector) return true;
  if (hasDirectMeasurableUserData(ud)) return false;
  return !hasDirectMeasurableAncestor(value);
}

function sameModuleKey(a: unknown, b: unknown): boolean {
  const left = readIdentityValue(a);
  const right = readIdentityValue(b);
  return left != null && right != null && formatIdentityValue(left) === formatIdentityValue(right);
}

export function isDecorativeObject(value: unknown): boolean {
  const rec = asMeasurableObject(value);
  return !!rec && (rec.type === 'LineSegments' || rec.type === 'Line' || rec.type === 'Sprite');
}

function readUserDataKind(userData: UnknownRecord | null): string {
  const raw = userData?.__kind ?? userData?.kind ?? userData?.type;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
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
  return isViewerMeasurementHiddenObject(obj);
}

export function isViewerMeasurementHiddenObject(value: unknown): boolean {
  let current = asMeasurableObject(value);
  while (current) {
    if (isRecord(current) && current.visible === false) return true;
    current = asMeasurableObject(current.parent);
  }

  const rec = isRecord(value) ? value : null;
  if (!rec) return false;
  const materialPolicy = readCanvasPickingMaterialHitPolicy(rec.material);
  return !materialPolicy.visible || materialPolicy.fullyTransparent;
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
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
}): Vector3Like | null {
  const { runtime, THREE } = args;
  const camera = runtime.getCamera();
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
  runtime: ViewerMeasurementGeometryRuntime;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  axis: MeasurementAxis;
}): number | null {
  const { runtime, hitState, wardrobeGroup, box, axis } = args;
  const localHit = runtime.projectWorldPointToLocal(hitState.primaryHitPoint, wardrobeGroup);
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
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  axis: MeasurementAxis;
}): number | null {
  const { runtime, THREE, wardrobeGroup, box, axis } = args;
  const cameraWorld = readCameraWorldPosition({ runtime, THREE });
  const cameraLocal = cameraWorld ? runtime.projectWorldPointToLocal(cameraWorld, wardrobeGroup) : null;
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

function resolveViewerMeasurementPlane(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  box: LocalMeasurementBox;
  forceInteriorFront: boolean;
  target?: unknown;
}): MeasurementPlane {
  const { runtime, THREE, hitState, wardrobeGroup, box, forceInteriorFront, target } = args;
  if (!forceInteriorFront && target) {
    const cornerDoor = readCornerPentDoorMeasurementBox({ target, wardrobeGroup });
    if (cornerDoor) return cornerDoor.plane;
  }
  const kind = inferMeasurementPlaneKind(box, forceInteriorFront);
  const axes = measurementPlaneAxes(kind);
  const cameraSign = readCameraAxisSign({ runtime, THREE, wardrobeGroup, box, axis: axes.normal });
  const targetFrontSign =
    !forceInteriorFront && axes.normal === 'z' && target ? readDoorOrDrawerFrontFaceSign(target) : null;
  const hitSign = forceInteriorFront
    ? null
    : readClosestHitFaceSign({ runtime, hitState, wardrobeGroup, box, axis: axes.normal });
  const shapeSign = forceInteriorFront ? null : readShapePlaneSign(box, axes.normal, kind);
  const normalSign = forceInteriorFront
    ? (cameraSign ?? 1)
    : (targetFrontSign ?? hitSign ?? shapeSign ?? cameraSign ?? 1);
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

function targetKeyForHit(hitState: CanvasPickingClickHitState, target: unknown): string | null {
  const ud = readUserData(target);
  const identity = hitState.hitIdentity;
  const candidates = [
    ud?.partId,
    ud?.pid,
    ud?.surfaceId,
    ud?.drawerId,
    ud?.moduleIndex,
    readNearestTargetIdentity(target),
    identity?.partId,
    identity?.doorId,
    identity?.drawerId,
    identity?.surfaceId,
    identity?.moduleIndex,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const raw = candidates[i];
    const key = formatIdentityValue(readIdentityValue(raw)).trim();
    if (key) return key;
  }
  return null;
}

function measurementKeyNumber(value: number): string {
  if (!Number.isFinite(value)) return 'nan';
  const rounded = Math.round(value * 10000) / 10000;
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(4);
}

function measurementBoxKey(box: LocalMeasurementBox): string {
  return [box.centerX, box.centerY, box.centerZ, box.width, box.height, box.depth]
    .map(measurementKeyNumber)
    .join(',');
}

function measurementPlaneKey(plane: MeasurementPlane): string {
  return [
    plane.kind,
    plane.normalAxis,
    plane.normalSign >= 0 ? 1 : -1,
    measurementKeyNumber(plane.normalValue),
    plane.uAxis,
    measurementKeyNumber(plane.uMin),
    measurementKeyNumber(plane.uMax),
    plane.vAxis,
    measurementKeyNumber(plane.vMin),
    measurementKeyNumber(plane.vMax),
  ].join(',');
}

export function buildViewerMeasurementKey(args: {
  targetKey: string | null;
  box: LocalMeasurementBox;
  plane: MeasurementPlane;
  shouldMeasureInterior: boolean;
}): string {
  const baseKey = args.targetKey ? args.targetKey : 'anonymous';
  return [
    baseKey,
    args.shouldMeasureInterior ? 'interior' : 'part',
    measurementBoxKey(args.box),
    measurementPlaneKey(args.plane),
  ].join('|');
}

function findTaggedAncestor(start: unknown, predicate: (userData: UnknownRecord) => boolean): unknown {
  let current = asMeasurableObject(start);
  while (current) {
    const ud = readUserData(current);
    if (ud && predicate(ud)) return current;
    current = asMeasurableObject(current.parent);
  }
  return null;
}

function findModuleSelectorTarget(hitState: CanvasPickingClickHitState): unknown {
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

function partIdMatchesDoorCandidate(partId: string | null, doorId: string | null): boolean {
  if (!partId || !doorId) return false;
  return partId === doorId;
}

function readDoorOwnerMetadata(userData: UnknownRecord | null): { width: number; height: number } | null {
  const width = readFiniteNumber(userData, '__doorWidth');
  const height = readFiniteNumber(userData, '__doorHeight');
  if (width == null || height == null) return null;
  if (!(width > MIN_MEASURABLE_EDGE_M && height > MIN_MEASURABLE_EDGE_M)) return null;
  return { width, height };
}

function findDoorMeasurementBranch(start: unknown, doorId: string | null): unknown {
  const first = asMeasurableObject(start);
  if (!first || !doorId) return null;

  let current: MeasurableObject | null = first;
  let childBelowCurrent: MeasurableObject | null = null;
  while (current) {
    const ud = readUserData(current);
    const partId = readPartIdFromUserData(ud);
    if (partIdMatchesDoorCandidate(partId, doorId) && readDoorOwnerMetadata(ud)) {
      return childBelowCurrent || current;
    }
    childBelowCurrent = current;
    current = asMeasurableObject(current.parent);
  }

  return null;
}

function resolveDoorMeasurementTarget(start: unknown, doorId: string | null): unknown {
  return findDoorMeasurementBranch(start, doorId) || start || null;
}

function readNearestTargetIdentity(value: unknown): string | null {
  let current = asMeasurableObject(value);
  while (current) {
    const ud = readUserData(current);
    const raw = ud?.partId ?? ud?.pid ?? ud?.surfaceId ?? ud?.drawerId;
    const key = formatIdentityValue(readIdentityValue(raw)).trim();
    if (key) return key;
    current = asMeasurableObject(current.parent);
  }
  return null;
}

function findNearestDirectPartTarget(hitState: CanvasPickingClickHitState): unknown {
  if (hitState.doorHitGroup) {
    return resolveDoorMeasurementTarget(hitState.doorHitGroup, hitState.effectiveDoorId ?? null);
  }

  for (let i = 0; i < hitState.intersects.length; i += 1) {
    const hitObj = asMeasurableObject(hitState.intersects[i]?.object);
    if (shouldSkipDirectIntersectionObject(hitObj)) continue;

    if (hitState.foundDrawerId) {
      const drawerOwner = findTaggedAncestor(hitObj, ud => {
        const id = ud.drawerId ?? ud.partId ?? ud.pid;
        return sameModuleKey(id, hitState.foundDrawerId);
      });
      if (drawerOwner) return drawerOwner;
    }

    const taggedOwner = findTaggedAncestor(hitObj, hasDirectMeasurableUserData);
    if (!taggedOwner) continue;
    if (isBackPanelLike(taggedOwner)) continue;

    const partId = readObjectPartId(taggedOwner);
    if (partId && __wp_isDoorOrDrawerLikePartId(partId)) {
      return resolveDoorMeasurementTarget(taggedOwner, partId);
    }

    if (partId && isShelfBoardPartId(partId)) {
      return taggedOwner;
    }

    if (isShelfLikeObject(taggedOwner)) return taggedOwner;

    const taggedUd = readUserData(taggedOwner);
    if (taggedUd?.surfaceId || taggedUd?.partId || taggedUd?.pid) return taggedOwner;
  }

  return null;
}

export function resolveViewerMeasurementTarget(hitState: CanvasPickingClickHitState): unknown {
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

function readDoorOrDrawerFrontFaceSign(value: unknown): number | null {
  let current = asMeasurableObject(value);
  while (current) {
    const ud = readUserData(current);
    const partId = readPartIdFromUserData(ud);
    const hasFrontMetadata = readDoorOwnerMetadata(ud) != null;
    if (hasFrontMetadata || (partId != null && __wp_isDoorOrDrawerLikePartId(partId))) {
      const sign =
        readFiniteNumber(ud, '__handleZSign') ??
        readFiniteNumber(ud, '__wpDoorOpenDirSign') ??
        readFiniteNumber(ud, 'faceSign');
      return sign != null && sign < 0 ? -1 : 1;
    }
    current = asMeasurableObject(current.parent);
  }
  return null;
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
  runtime: ViewerMeasurementGeometryRuntime;
  target: unknown;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
}): LocalMeasurementBox | null {
  const { runtime, target, hitState, wardrobeGroup } = args;
  if (hitState.foundModuleIndex == null) return null;

  const selectorTarget = isModuleSelector(target) ? target : findModuleSelectorTarget(hitState);
  const selectorBox = selectorTarget ? readMeasuredBox(runtime, selectorTarget, wardrobeGroup) : null;
  const fallbackBox = selectorBox || readMeasuredBox(runtime, target, wardrobeGroup);

  const grid = runtime.getInternalGridMap(hitState.foundModuleStack === 'bottom');
  const moduleKey = formatIdentityValue(readIdentityValue(hitState.foundModuleIndex));
  const info = isRecord(grid) && moduleKey ? grid[moduleKey] : null;
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

  const hitLocal = runtime.projectWorldPointToLocal(hitState.primaryHitPoint, wardrobeGroup);
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
  const targetModuleKey = hitState.foundModuleIndex;
  const moduleMinX = internalCenterX - innerW / 2;
  const moduleMaxX = internalCenterX + innerW / 2;
  const bounds: number[] = [bottomY, topY];

  const visit = (obj: Object3DLike): void => {
    if (!obj || obj === target || obj === selectorTarget || isDecorativeObject(obj)) return;
    const ud = readUserData(obj);
    const objModule = ud?.moduleIndex ?? ud?.__wpSketchModuleKey;
    if (objModule != null && !sameModuleKey(objModule, targetModuleKey)) return;
    if (ud?.isModuleSelector || ud?.__wpViewerMeasurementOverlay || ud?.__ignoreRaycast) return;
    if (isViewerMeasurementHiddenObject(obj)) return;
    if (isBackPanelLike(obj) || isMeasurementPassiveFittingObject(obj)) return;

    const box = runtime.measureObjectLocalBox(obj, wardrobeGroup);
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
  runtime: ViewerMeasurementGeometryRuntime,
  target: unknown,
  wardrobeGroup: Object3DLike
): LocalMeasurementBox | null {
  const measured = runtime.measureObjectLocalBox(target, wardrobeGroup);
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
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  target?: unknown;
}): ViewerMeasurementResolution | null {
  const { runtime, THREE, hitState, wardrobeGroup } = args;
  const target = args.target ?? resolveViewerMeasurementTarget(hitState);
  if (!target) return null;

  const shouldMeasureInterior =
    hitState.foundModuleIndex != null && (isModuleSelector(target) || hasCavityBackgroundTarget(target));
  const cornerDoorMeasurement = shouldMeasureInterior
    ? null
    : readCornerPentDoorMeasurementBox({ target, wardrobeGroup });
  const box =
    (shouldMeasureInterior ? readModuleInteriorBox({ runtime, target, hitState, wardrobeGroup }) : null) ||
    cornerDoorMeasurement?.box ||
    readMeasuredBox(runtime, target, wardrobeGroup);
  if (!box) return null;

  const plane =
    cornerDoorMeasurement?.plane ||
    resolveViewerMeasurementPlane({
      runtime,
      THREE,
      hitState,
      wardrobeGroup,
      box,
      forceInteriorFront: shouldMeasureInterior,
      target,
    });

  const targetKey = targetKeyForHit(hitState, target);
  return {
    target,
    targetKey,
    measurementKey: buildViewerMeasurementKey({ targetKey, box, plane, shouldMeasureInterior }),
    box,
    plane,
    shouldMeasureInterior,
  };
}
