import type { Object3DLike } from '../../../types';

import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import type { ViewerMeasurementGeometryRuntime } from './viewer_measurement_geometry_runtime.js';
import {
  FRONT_Z_EPSILON_M,
  MIN_MEASURABLE_EDGE_M,
  type LocalMeasurementBox,
  type LocalPlanePoint,
  type MeasurementAxis,
  type MeasurementPlane,
  type MeasurementPlaneKind,
  type OverlayThree,
  type PointClampResult,
  type PointMeasurementDraft,
  type PointMeasurementPointerContext,
  type RaycasterWithRay,
} from './viewer_measurement_tool_contracts.js';
import {
  clampNumber,
  computePointEdgeClampTolerance,
  createMeasurementPlaneForBox,
  dotBasisVector,
  getBoxLengthAxis,
  getBoxMaxAxis,
  getBoxMinAxis,
  measurementPlaneAxes,
  readCoordinateAxis,
  readPointAxis,
  readPointPlaneNormal,
  snapPointToMeasurementPlaneEdges,
} from './viewer_measurement_tool_geometry.js';
import {
  asMeasurableObject,
  hasVisibleFrontPlaneOcclusion,
  isDecorativeObject,
  isMeasurementPassiveFittingObject,
  isSlidingDoorLikeTarget,
  isViewerMeasurementHiddenObject,
  readCameraAxisSign,
  readCameraWorldPosition,
  readMeasuredBox,
  readUserData,
  resolveViewerMeasurementResolution,
} from './viewer_measurement_tool_resolution.js';

function readHitLocalPoint(
  runtime: ViewerMeasurementGeometryRuntime,
  hitState: CanvasPickingClickHitState | null | undefined,
  wardrobeGroup: Object3DLike
): { x: number; y: number; z: number } | null {
  if (!hitState) return null;
  const candidates = [hitState.primaryHitPoint, hitState.doorHitPoint, hitState.intersects?.[0]?.point];
  for (let i = 0; i < candidates.length; i += 1) {
    const point = runtime.projectWorldPointToLocal(candidates[i], wardrobeGroup);
    if (point) return point;
  }
  return null;
}

function createNormalSourceBoxWithFace(
  sourceBox: LocalMeasurementBox,
  axis: MeasurementAxis,
  normalSign: number,
  faceValue: number
): LocalMeasurementBox {
  const safeSign = normalSign >= 0 ? 1 : -1;
  const next = { ...sourceBox };
  const length = getBoxLengthAxis(sourceBox, axis);
  const center = faceValue - (safeSign * length) / 2;
  if (axis === 'x') next.centerX = center;
  else if (axis === 'y') next.centerY = center;
  else next.centerZ = center;
  return next;
}

function resolvePointFrontPlaneNormalSourceBox(args: {
  targetBox: LocalMeasurementBox;
  boundsBox: LocalMeasurementBox;
  normalSign: number;
}): LocalMeasurementBox {
  const { targetBox, boundsBox } = args;
  const normalSign = args.normalSign >= 0 ? 1 : -1;
  if (!hasVisibleFrontPlaneOcclusion({ targetBox, boundsBox, normalSign })) return targetBox;

  const boundsFace = normalSign >= 0 ? getBoxMaxAxis(boundsBox, 'z') : getBoxMinAxis(boundsBox, 'z');
  return createNormalSourceBoxWithFace(targetBox, 'z', normalSign, boundsFace);
}

function readObjectLocalPlanePoint(
  runtime: ViewerMeasurementGeometryRuntime,
  value: unknown,
  wardrobeGroup: Object3DLike
): LocalPlanePoint | null {
  const point = runtime.projectWorldPointToLocal(value, wardrobeGroup);
  if (!point) return null;
  const x = readCoordinateAxis(point, 'x');
  const y = readCoordinateAxis(point, 'y');
  const z = readCoordinateAxis(point, 'z');
  return x == null || y == null || z == null ? null : { x, y, z };
}

function readRayPlaneLocalPoint(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  plane: MeasurementPlane;
  wardrobeGroup: Object3DLike;
  pointer?: PointMeasurementPointerContext | null;
}): LocalPlanePoint | null {
  const { runtime, plane, wardrobeGroup, pointer } = args;
  const raycaster = pointer?.raycaster as RaycasterWithRay | null | undefined;
  const ray = raycaster?.ray;
  const originWorld = ray?.origin;
  const directionWorld = ray?.direction;
  const originLocal = readObjectLocalPlanePoint(runtime, originWorld, wardrobeGroup);
  if (!originLocal || !directionWorld) return null;

  const directionEndWorld = {
    x: (originWorld?.x ?? 0) + (directionWorld.x ?? 0),
    y: (originWorld?.y ?? 0) + (directionWorld.y ?? 0),
    z: (originWorld?.z ?? 0) + (directionWorld.z ?? 0),
  };
  const directionEndLocal = readObjectLocalPlanePoint(runtime, directionEndWorld, wardrobeGroup);
  if (!directionEndLocal) return null;

  const directionLocal = {
    x: directionEndLocal.x - originLocal.x,
    y: directionEndLocal.y - originLocal.y,
    z: directionEndLocal.z - originLocal.z,
  };
  const originAxis = readPointPlaneNormal(originLocal, plane);
  const directionAxis = plane.basis
    ? dotBasisVector(directionLocal, plane.basis.normal)
    : readPointAxis(directionLocal, plane.normalAxis);
  if (!Number.isFinite(originAxis) || !Number.isFinite(directionAxis) || Math.abs(directionAxis) < 1e-9) {
    return null;
  }

  const t = (plane.normalValue - originAxis) / directionAxis;
  if (!Number.isFinite(t)) return null;
  return {
    x: originLocal.x + directionLocal.x * t,
    y: originLocal.y + directionLocal.y * t,
    z: originLocal.z + directionLocal.z * t,
  };
}

export function readPointMeasurementPointerLocalPoint(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  hitState?: CanvasPickingClickHitState | null;
  wardrobeGroup: Object3DLike;
  plane: MeasurementPlane;
  pointer?: PointMeasurementPointerContext | null;
}): LocalPlanePoint | null {
  const { runtime, hitState, wardrobeGroup, plane, pointer } = args;
  return (
    readRayPlaneLocalPoint({ runtime, plane, wardrobeGroup, pointer }) ||
    readHitLocalPoint(runtime, hitState, wardrobeGroup)
  );
}

function shouldSkipAggregateWardrobeBoundsObject(value: unknown): boolean {
  const obj = asMeasurableObject(value);
  if (!obj || isDecorativeObject(obj) || isMeasurementPassiveFittingObject(obj)) return true;
  const ud = readUserData(obj);
  if (ud?.__wpViewerMeasurementOverlay || ud?.__wpExcludeWardrobeBounds || ud?.__ignoreRaycast) return true;
  if (ud?.isModuleSelector) return true;
  return isViewerMeasurementHiddenObject(obj);
}

function readAggregateWardrobeBoundsBox(
  runtime: ViewerMeasurementGeometryRuntime,
  wardrobeGroup: Object3DLike
): LocalMeasurementBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  const includeBox = (box: LocalMeasurementBox): void => {
    minX = Math.min(minX, box.centerX - box.width / 2);
    maxX = Math.max(maxX, box.centerX + box.width / 2);
    minY = Math.min(minY, box.centerY - box.height / 2);
    maxY = Math.max(maxY, box.centerY + box.height / 2);
    minZ = Math.min(minZ, box.centerZ - box.depth / 2);
    maxZ = Math.max(maxZ, box.centerZ + box.depth / 2);
  };
  const visit = (obj: Object3DLike): void => {
    if (!obj || obj === wardrobeGroup || shouldSkipAggregateWardrobeBoundsObject(obj)) return;
    const box = readMeasuredBox(runtime, obj, wardrobeGroup);
    if (box) includeBox(box);
  };

  try {
    if (typeof wardrobeGroup.traverse === 'function') wardrobeGroup.traverse(visit);
    else for (let i = 0; i < wardrobeGroup.children.length; i += 1) visit(wardrobeGroup.children[i]);
  } catch {
    return null;
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(minZ) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY) ||
    !Number.isFinite(maxZ) ||
    maxX - minX < MIN_MEASURABLE_EDGE_M ||
    maxY - minY < MIN_MEASURABLE_EDGE_M
  ) {
    return null;
  }

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}

function readPointMeasurementBoundsBox(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  targetBox: LocalMeasurementBox;
  wardrobeGroup: Object3DLike;
}): LocalMeasurementBox {
  return readAggregateWardrobeBoundsBox(args.runtime, args.wardrobeGroup) || args.targetBox;
}

function readCameraLocalPoint(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
}): LocalPlanePoint | null {
  const cameraWorld = readCameraWorldPosition({ runtime: args.runtime, THREE: args.THREE });
  return cameraWorld ? readObjectLocalPlanePoint(args.runtime, cameraWorld, args.wardrobeGroup) : null;
}

function isCameraMostlyViewingWardrobeFront(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  boundsBox: LocalMeasurementBox;
}): boolean {
  const cameraLocal = readCameraLocalPoint(args);
  if (!cameraLocal) return false;
  const zDistance = Math.abs(cameraLocal.z - args.boundsBox.centerZ);
  const xDistance = Math.abs(cameraLocal.x - args.boundsBox.centerX);
  const yDistance = Math.abs(cameraLocal.y - args.boundsBox.centerY);
  return zDistance >= xDistance * 1.1 && zDistance >= yDistance * 0.55;
}

function shouldUseWardrobeFrontPlaneForPointStart(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
  target: unknown;
  targetBox: LocalMeasurementBox;
  boundsBox: LocalMeasurementBox;
  resolvedPlane: MeasurementPlane;
  forceInteriorFront: boolean;
  frontPlaneSign: number;
}): boolean {
  const {
    runtime,
    THREE,
    hitState,
    wardrobeGroup,
    target,
    targetBox,
    boundsBox,
    resolvedPlane,
    forceInteriorFront,
    frontPlaneSign,
  } = args;
  if (forceInteriorFront) return false;
  if (!isCameraMostlyViewingWardrobeFront({ runtime, THREE, wardrobeGroup, boundsBox })) return false;

  if (resolvedPlane.kind === 'front') {
    return (
      isSlidingDoorLikeTarget(target) &&
      hasVisibleFrontPlaneOcclusion({ targetBox, boundsBox, normalSign: frontPlaneSign })
    );
  }

  const localPoint = readHitLocalPoint(runtime, hitState, wardrobeGroup);
  const hitZ = localPoint ? readCoordinateAxis(localPoint, 'z') : null;
  if (hitZ == null) return false;

  const boundsFrontZ = frontPlaneSign >= 0 ? getBoxMaxAxis(boundsBox, 'z') : getBoxMinAxis(boundsBox, 'z');
  const targetFrontZ = frontPlaneSign >= 0 ? getBoxMaxAxis(targetBox, 'z') : getBoxMinAxis(targetBox, 'z');
  const tolerance = clampNumber(
    Math.max(boundsBox.depth, targetBox.depth) * 0.05,
    FRONT_Z_EPSILON_M * 2,
    0.035
  );
  return Math.min(Math.abs(hitZ - boundsFrontZ), Math.abs(hitZ - targetFrontZ)) <= tolerance;
}

export function resolvePointMeasurementStart(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
  hitState: CanvasPickingClickHitState;
  wardrobeGroup: Object3DLike;
}): PointMeasurementDraft | null {
  const { runtime, THREE, hitState, wardrobeGroup } = args;
  const resolution = resolveViewerMeasurementResolution({ runtime, THREE, hitState, wardrobeGroup });
  if (!resolution) return null;
  const { target, box, plane, shouldMeasureInterior, targetKey } = resolution;
  const boundsBox = readPointMeasurementBoundsBox({ runtime, targetBox: box, wardrobeGroup });
  const frontPlaneSign =
    readCameraAxisSign({ runtime, THREE, wardrobeGroup, box: boundsBox, axis: 'z' }) ?? plane.normalSign;
  const shouldUseFrontPlane = shouldUseWardrobeFrontPlaneForPointStart({
    runtime,
    THREE,
    hitState,
    wardrobeGroup,
    target,
    targetBox: box,
    boundsBox,
    resolvedPlane: plane,
    forceInteriorFront: shouldMeasureInterior,
    frontPlaneSign,
  });
  const frontPlaneNormalSourceBox = shouldUseFrontPlane
    ? resolvePointFrontPlaneNormalSourceBox({
        targetBox: box,
        boundsBox,
        normalSign: frontPlaneSign,
      })
    : null;
  const boundedPlane = plane.basis
    ? plane
    : shouldUseFrontPlane
      ? createMeasurementPlaneForBox(boundsBox, 'front', frontPlaneSign, frontPlaneNormalSourceBox || box)
      : createMeasurementPlaneForBox(boundsBox, plane.kind, plane.normalSign, box);
  const localPoint = readHitLocalPoint(runtime, hitState, wardrobeGroup);
  if (!localPoint) return null;
  const point = snapPointToMeasurementPlaneEdges(THREE, boundedPlane, localPoint).point;
  return {
    point: { x: point.x, y: point.y, z: point.z },
    plane: boundedPlane,
    targetKey,
  };
}

export function resolvePointMeasurementStartFromPointer(args: {
  runtime: ViewerMeasurementGeometryRuntime;
  THREE: OverlayThree;
  wardrobeGroup: Object3DLike;
  pointer?: PointMeasurementPointerContext | null;
}): PointMeasurementDraft | null {
  const { runtime, THREE, wardrobeGroup, pointer } = args;
  const boundsBox = readAggregateWardrobeBoundsBox(runtime, wardrobeGroup);
  if (!boundsBox) return null;

  const candidates: Array<{ plane: MeasurementPlane; clamp: PointClampResult }> = [];
  const kinds: MeasurementPlaneKind[] = ['front', 'side', 'top'];
  for (let i = 0; i < kinds.length; i += 1) {
    const kind = kinds[i];
    const axes = measurementPlaneAxes(kind);
    const sign =
      readCameraAxisSign({ runtime, THREE, wardrobeGroup, box: boundsBox, axis: axes.normal }) ?? 1;
    const plane = createMeasurementPlaneForBox(boundsBox, kind, sign);
    const localPoint = readRayPlaneLocalPoint({ runtime, plane, wardrobeGroup, pointer });
    if (!localPoint) continue;
    const clamp = snapPointToMeasurementPlaneEdges(THREE, plane, localPoint);
    if (clamp.outsideDistance <= computePointEdgeClampTolerance(plane)) candidates.push({ plane, clamp });
  }

  candidates.sort((a, b) => a.clamp.outsideDistance - b.clamp.outsideDistance);
  const best = candidates[0];
  if (!best) return null;
  const point = best.clamp.point;
  return {
    point: { x: point.x, y: point.y, z: point.z },
    plane: best.plane,
    targetKey: 'wardrobe',
  };
}
