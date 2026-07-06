import type { Vector3Like } from '../../../types/three_like.js';

import {
  MIN_MEASURABLE_EDGE_M,
  type LocalPlanePoint,
  type MeasurementAxis,
  type MeasurementPlane,
  type OverlayThree,
  type PointMeasurementDraft,
} from './viewer_measurement_tool_contracts.js';
import {
  clampNumber,
  makePointOnPlane,
  readPointPlaneU,
  readPointPlaneV,
} from './viewer_measurement_tool_geometry.js';

const POINT_STRAIGHT_SNAP_MAX_ANGLE_DEG = 10;
const POINT_STRAIGHT_SNAP_ABSOLUTE_TOLERANCE_M = 0.008;

type ResolvedPointMeasurement = {
  axis: MeasurementAxis | 'free';
  snapAxis: MeasurementAxis | null;
  snapped: boolean;
  start: Vector3Like;
  end: Vector3Like;
  length: number;
};

function clipPointRayToMeasurementBounds(args: {
  plane: MeasurementPlane;
  startU: number;
  startV: number;
  rawU: number;
  rawV: number;
}): { u: number; v: number; clipped: boolean } {
  const { plane, startU, startV, rawU, rawV } = args;
  const clampedU = clampNumber(rawU, plane.uMin, plane.uMax);
  const clampedV = clampNumber(rawV, plane.vMin, plane.vMax);
  const outsideU = rawU < plane.uMin || rawU > plane.uMax;
  const outsideV = rawV < plane.vMin || rawV > plane.vMax;
  if (!outsideU && !outsideV) return { u: rawU, v: rawV, clipped: false };

  const deltaU = rawU - startU;
  const deltaV = rawV - startV;
  const candidates: number[] = [];
  if (deltaU > 1e-9) candidates.push((plane.uMax - startU) / deltaU);
  else if (deltaU < -1e-9) candidates.push((plane.uMin - startU) / deltaU);
  if (deltaV > 1e-9) candidates.push((plane.vMax - startV) / deltaV);
  else if (deltaV < -1e-9) candidates.push((plane.vMin - startV) / deltaV);

  const bestT = candidates.filter(t => Number.isFinite(t) && t >= 0 && t <= 1).sort((a, b) => a - b)[0];
  if (bestT == null) return { u: clampedU, v: clampedV, clipped: true };

  return {
    u: clampNumber(startU + deltaU * bestT, plane.uMin, plane.uMax),
    v: clampNumber(startV + deltaV * bestT, plane.vMin, plane.vMax),
    clipped: true,
  };
}

function shouldSnapPointMeasurementToStraightAxis(deltaU: number, deltaV: number): boolean {
  const absU = Math.abs(deltaU);
  const absV = Math.abs(deltaV);
  const major = Math.max(absU, absV);
  const minor = Math.min(absU, absV);
  if (!(major > MIN_MEASURABLE_EDGE_M)) return false;
  const angleRad = (POINT_STRAIGHT_SNAP_MAX_ANGLE_DEG * Math.PI) / 180;
  const tolerance = Math.max(POINT_STRAIGHT_SNAP_ABSOLUTE_TOLERANCE_M, major * Math.tan(angleRad));
  return minor <= tolerance;
}

function shouldSnapClippedPointMeasurementToStraightAxis(deltaU: number, deltaV: number): boolean {
  const absU = Math.abs(deltaU);
  const absV = Math.abs(deltaV);
  const major = Math.max(absU, absV);
  const minor = Math.min(absU, absV);
  return major > MIN_MEASURABLE_EDGE_M && minor <= POINT_STRAIGHT_SNAP_ABSOLUTE_TOLERANCE_M;
}

export function resolvePointMeasurementEnd(args: {
  THREE: OverlayThree;
  draft: PointMeasurementDraft;
  localEnd: LocalPlanePoint;
}): ResolvedPointMeasurement | null {
  const { THREE, draft, localEnd } = args;
  const plane = draft.plane;
  const startU = readPointPlaneU(draft.point, plane);
  const startV = readPointPlaneV(draft.point, plane);
  const rawU = readPointPlaneU(localEnd, plane);
  const rawV = readPointPlaneV(localEnd, plane);
  const clippedEnd = clipPointRayToMeasurementBounds({ plane, startU, startV, rawU, rawV });
  const rawDeltaU = rawU - startU;
  const rawDeltaV = rawV - startV;
  const shouldSnap = clippedEnd.clipped
    ? shouldSnapClippedPointMeasurementToStraightAxis(rawDeltaU, rawDeltaV)
    : shouldSnapPointMeasurementToStraightAxis(rawDeltaU, rawDeltaV);

  let axis: MeasurementAxis | 'free' = 'free';
  let snapAxis: MeasurementAxis | null = null;
  let endU: number;
  let endV: number;
  let length: number;

  if (shouldSnap) {
    snapAxis = Math.abs(rawDeltaU) >= Math.abs(rawDeltaV) ? plane.uAxis : plane.vAxis;
    axis = snapAxis;
    endU = snapAxis === plane.uAxis ? clampNumber(rawU, plane.uMin, plane.uMax) : startU;
    endV = snapAxis === plane.vAxis ? clampNumber(rawV, plane.vMin, plane.vMax) : startV;
    length = Math.abs(snapAxis === plane.uAxis ? endU - startU : endV - startV);
  } else {
    endU = clippedEnd.u;
    endV = clippedEnd.v;
    length = Math.hypot(endU - startU, endV - startV);
  }

  if (!Number.isFinite(length)) return null;
  return {
    axis,
    snapAxis,
    snapped: shouldSnap,
    start: makePointOnPlane(THREE, plane, startU, startV),
    end: makePointOnPlane(THREE, plane, endU, endV),
    length,
  };
}
