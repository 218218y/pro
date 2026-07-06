import type { ThreeLike, UnknownRecord } from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';

import {
  FRONT_Z_EPSILON_M,
  type LocalMeasurementBox,
  type LocalPlanePoint,
  type MeasurementAxis,
  type MeasurementBasisVector,
  type MeasurementPlane,
  type MeasurementPlaneKind,
  type PointClampResult,
} from './viewer_measurement_tool_contracts.js';

const POINT_EDGE_CLAMP_TOLERANCE_MIN_M = 0.02;
const POINT_EDGE_CLAMP_TOLERANCE_MAX_M = 0.08;
const POINT_EDGE_CLAMP_TOLERANCE_RATIO = 0.035;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function vector(THREE: Pick<ThreeLike, 'Vector3'>, x: number, y: number, z: number): Vector3Like {
  return new THREE.Vector3(x, y, z);
}

export function getBoxCenterAxis(box: LocalMeasurementBox, axis: MeasurementAxis): number {
  if (axis === 'x') return box.centerX;
  if (axis === 'y') return box.centerY;
  return box.centerZ;
}

export function getBoxLengthAxis(box: LocalMeasurementBox, axis: MeasurementAxis): number {
  if (axis === 'x') return box.width;
  if (axis === 'y') return box.height;
  return box.depth;
}

export function getBoxMinAxis(box: LocalMeasurementBox, axis: MeasurementAxis): number {
  return getBoxCenterAxis(box, axis) - getBoxLengthAxis(box, axis) / 2;
}

export function getBoxMaxAxis(box: LocalMeasurementBox, axis: MeasurementAxis): number {
  return getBoxCenterAxis(box, axis) + getBoxLengthAxis(box, axis) / 2;
}

export function readCoordinateAxis(value: unknown, axis: MeasurementAxis): number | null {
  const rec = isRecord(value) ? value : null;
  const raw = rec ? rec[axis] : null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

export function axisVector(
  THREE: Pick<ThreeLike, 'Vector3'>,
  axis: MeasurementAxis,
  amount: number,
  base?: Partial<Record<MeasurementAxis, number>>
): Vector3Like {
  const coords = { x: base?.x ?? 0, y: base?.y ?? 0, z: base?.z ?? 0 };
  coords[axis] = (coords[axis] || 0) + amount;
  return vector(THREE, coords.x, coords.y, coords.z);
}

export function basisVector(
  THREE: Pick<ThreeLike, 'Vector3'>,
  value: MeasurementBasisVector,
  amount = 1
): Vector3Like {
  return vector(THREE, value.x * amount, value.y * amount, value.z * amount);
}

export function addBasisVectors(
  THREE: Pick<ThreeLike, 'Vector3'>,
  a: MeasurementBasisVector,
  amountA: number,
  b?: MeasurementBasisVector,
  amountB = 0
): Vector3Like {
  return vector(
    THREE,
    a.x * amountA + (b?.x ?? 0) * amountB,
    a.y * amountA + (b?.y ?? 0) * amountB,
    a.z * amountA + (b?.z ?? 0) * amountB
  );
}

export function dotBasisVector(a: { x: number; y: number; z: number }, b: MeasurementBasisVector): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function subBasisVector(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): MeasurementBasisVector {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function normalizeBasisVector(value: MeasurementBasisVector): MeasurementBasisVector | null {
  const length = Math.hypot(value.x, value.y, value.z);
  if (!Number.isFinite(length) || length < 1e-9) return null;
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

export function rotatePointByEuler(
  point: { x: number; y: number; z: number },
  rotation: { x?: number; y?: number; z?: number } | null
): MeasurementBasisVector {
  let x = point.x;
  let y = point.y;
  let z = point.z;
  const rx = typeof rotation?.x === 'number' && Number.isFinite(rotation.x) ? rotation.x : 0;
  const ry = typeof rotation?.y === 'number' && Number.isFinite(rotation.y) ? rotation.y : 0;
  const rz = typeof rotation?.z === 'number' && Number.isFinite(rotation.z) ? rotation.z : 0;

  if (rx) {
    const c = Math.cos(rx);
    const s = Math.sin(rx);
    const ny = y * c - z * s;
    const nz = y * s + z * c;
    y = ny;
    z = nz;
  }
  if (ry) {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const nx = x * c + z * s;
    const nz = -x * s + z * c;
    x = nx;
    z = nz;
  }
  if (rz) {
    const c = Math.cos(rz);
    const s = Math.sin(rz);
    const nx = x * c - y * s;
    const ny = x * s + y * c;
    x = nx;
    y = ny;
  }
  return { x, y, z };
}

export function pointOnMeasurementPlane(
  THREE: Pick<ThreeLike, 'Vector3'>,
  box: LocalMeasurementBox,
  plane: MeasurementPlane,
  u: number,
  v: number,
  normalOffset = 0
): Vector3Like {
  if (plane.basis) {
    const { center, normal } = plane.basis;
    return vector(
      THREE,
      center.x + plane.basis.u.x * u + plane.basis.v.x * v + normal.x * (plane.normalValue + normalOffset),
      center.y + plane.basis.u.y * u + plane.basis.v.y * v + normal.y * (plane.normalValue + normalOffset),
      center.z + plane.basis.u.z * u + plane.basis.v.z * v + normal.z * (plane.normalValue + normalOffset)
    );
  }
  const coords = { x: box.centerX, y: box.centerY, z: box.centerZ };
  coords[plane.uAxis] = u;
  coords[plane.vAxis] = v;
  coords[plane.normalAxis] = plane.normalValue + normalOffset;
  return vector(THREE, coords.x, coords.y, coords.z);
}

export function pointOnBoxAxisLine(
  THREE: Pick<ThreeLike, 'Vector3'>,
  box: LocalMeasurementBox,
  values: Partial<Record<MeasurementAxis, number>>
): Vector3Like {
  const coords = { x: box.centerX, y: box.centerY, z: box.centerZ };
  if (values.x != null) coords.x = values.x;
  if (values.y != null) coords.y = values.y;
  if (values.z != null) coords.z = values.z;
  return vector(THREE, coords.x, coords.y, coords.z);
}

export function inferMeasurementPlaneKind(
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

export function readPointAxis(point: { x: number; y: number; z: number }, axis: MeasurementAxis): number {
  if (axis === 'x') return point.x;
  if (axis === 'y') return point.y;
  return point.z;
}

export function readPointPlaneU(point: { x: number; y: number; z: number }, plane: MeasurementPlane): number {
  if (!plane.basis) return readPointAxis(point, plane.uAxis);
  return dotBasisVector(subBasisVector(point, plane.basis.center), plane.basis.u);
}

export function readPointPlaneV(point: { x: number; y: number; z: number }, plane: MeasurementPlane): number {
  if (!plane.basis) return readPointAxis(point, plane.vAxis);
  return dotBasisVector(subBasisVector(point, plane.basis.center), plane.basis.v);
}

export function readPointPlaneNormal(
  point: { x: number; y: number; z: number },
  plane: MeasurementPlane
): number {
  if (!plane.basis) return readPointAxis(point, plane.normalAxis);
  return dotBasisVector(subBasisVector(point, plane.basis.center), plane.basis.normal);
}

export function makePointOnPlane(
  THREE: Pick<ThreeLike, 'Vector3'>,
  plane: MeasurementPlane,
  u: number,
  v: number
): Vector3Like {
  if (plane.basis) {
    const { center, normal } = plane.basis;
    return vector(
      THREE,
      center.x + plane.basis.u.x * u + plane.basis.v.x * v + normal.x * plane.normalValue,
      center.y + plane.basis.u.y * u + plane.basis.v.y * v + normal.y * plane.normalValue,
      center.z + plane.basis.u.z * u + plane.basis.v.z * v + normal.z * plane.normalValue
    );
  }
  const coords = { x: 0, y: 0, z: 0 };
  coords[plane.uAxis] = u;
  coords[plane.vAxis] = v;
  coords[plane.normalAxis] = plane.normalValue;
  return vector(THREE, coords.x, coords.y, coords.z);
}

export function clampNumber(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function computePointEdgeClampTolerance(plane: MeasurementPlane): number {
  const proportional = Math.max(plane.uLength, plane.vLength) * POINT_EDGE_CLAMP_TOLERANCE_RATIO;
  return clampNumber(proportional, POINT_EDGE_CLAMP_TOLERANCE_MIN_M, POINT_EDGE_CLAMP_TOLERANCE_MAX_M);
}

export function snapCoordinateToMeasurementEdge(
  value: number,
  min: number,
  max: number,
  tolerance: number
): number {
  const clamped = clampNumber(value, min, max);
  if (clamped !== value) return clamped;
  if (value - min <= tolerance) return min;
  if (max - value <= tolerance) return max;
  return value;
}

export function clampPointToMeasurementPlane(
  THREE: Pick<ThreeLike, 'Vector3'>,
  plane: MeasurementPlane,
  localPoint: LocalPlanePoint
): PointClampResult {
  const rawU = readPointPlaneU(localPoint, plane);
  const rawV = readPointPlaneV(localPoint, plane);
  const clampedU = clampNumber(rawU, plane.uMin, plane.uMax);
  const clampedV = clampNumber(rawV, plane.vMin, plane.vMax);
  const outsideU = rawU < plane.uMin || rawU > plane.uMax;
  const outsideV = rawV < plane.vMin || rawV > plane.vMax;
  const outsideDistance = Math.hypot(rawU - clampedU, rawV - clampedV);
  return {
    point: makePointOnPlane(THREE, plane, clampedU, clampedV),
    rawU,
    rawV,
    clampedU,
    clampedV,
    outsideU,
    outsideV,
    outsideDistance,
  };
}

export function snapPointToMeasurementPlaneEdges(
  THREE: Pick<ThreeLike, 'Vector3'>,
  plane: MeasurementPlane,
  localPoint: LocalPlanePoint
): PointClampResult {
  const base = clampPointToMeasurementPlane(THREE, plane, localPoint);
  const tolerance = computePointEdgeClampTolerance(plane);
  const clampedU = snapCoordinateToMeasurementEdge(base.rawU, plane.uMin, plane.uMax, tolerance);
  const clampedV = snapCoordinateToMeasurementEdge(base.rawV, plane.vMin, plane.vMax, tolerance);
  return {
    ...base,
    point: makePointOnPlane(THREE, plane, clampedU, clampedV),
    clampedU,
    clampedV,
    outsideDistance: Math.hypot(base.rawU - clampedU, base.rawV - clampedV),
  };
}

export function measurementPlaneAxes(kind: MeasurementPlaneKind): {
  normal: MeasurementAxis;
  u: MeasurementAxis;
  v: MeasurementAxis;
} {
  if (kind === 'side') return { normal: 'x', u: 'z', v: 'y' };
  if (kind === 'top') return { normal: 'y', u: 'x', v: 'z' };
  return { normal: 'z', u: 'x', v: 'y' };
}

export function createMeasurementPlaneForBox(
  box: LocalMeasurementBox,
  kind: MeasurementPlaneKind,
  normalSign: number,
  normalSourceBox: LocalMeasurementBox = box
): MeasurementPlane {
  const axes = measurementPlaneAxes(kind);
  const safeSign = normalSign >= 0 ? 1 : -1;
  const normalFace =
    safeSign >= 0 ? getBoxMaxAxis(normalSourceBox, axes.normal) : getBoxMinAxis(normalSourceBox, axes.normal);
  const uMin = getBoxMinAxis(box, axes.u);
  const uMax = getBoxMaxAxis(box, axes.u);
  const vMin = getBoxMinAxis(box, axes.v);
  const vMax = getBoxMaxAxis(box, axes.v);

  return {
    kind,
    normalAxis: axes.normal,
    normalSign: safeSign,
    normalValue: normalFace + safeSign * FRONT_Z_EPSILON_M,
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
