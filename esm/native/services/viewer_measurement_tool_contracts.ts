import type { Object3DLike, ThreeLike, UnknownRecord } from '../../../types';
import type { Vector3Like } from '../../../types/three_like.js';

import type { HitObjectLike, MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';

export const FRONT_Z_EPSILON_M = 0.006;
export const MIN_MEASURABLE_EDGE_M = 0.005;
export const POINT_FRONT_PLANE_OCCLUSION_PROMOTION_MAX_M = 0.16;

export type ViewerMeasurementToolMode = 'part' | 'points';

export type MeasurementAxis = 'x' | 'y' | 'z';

export type MeasurementPlaneKind = 'front' | 'side' | 'top';

export type MeasurementBasisVector = { x: number; y: number; z: number };

export type MeasurementPlaneBasis = {
  center: MeasurementBasisVector;
  u: MeasurementBasisVector;
  v: MeasurementBasisVector;
  normal: MeasurementBasisVector;
  normalMin: number;
  normalMax: number;
};

export type MeasurementPlane = {
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
  basis?: MeasurementPlaneBasis;
};

export type LocalMeasurementBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type PointMeasurementDraft = {
  point: { x: number; y: number; z: number };
  plane: MeasurementPlane;
  targetKey: string | null;
};

export type PointMeasurementPointerContext = {
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
};

export type LocalPlanePoint = { x: number; y: number; z: number };

export type PointClampResult = {
  point: Vector3Like;
  rawU: number;
  rawV: number;
  clampedU: number;
  clampedV: number;
  outsideU: boolean;
  outsideV: boolean;
  outsideDistance: number;
};

export type RaycasterWithRay = RaycasterLike & {
  ray?: {
    origin?: { x?: number; y?: number; z?: number } | null;
    direction?: { x?: number; y?: number; z?: number } | null;
  } | null;
};

export type MeasurementOverlayState = {
  objects: Object3DLike[];
  targetKey: string | null;
  pointDraft?: PointMeasurementDraft | null;
};

export type OverlayThree = ThreeLike & {
  BufferGeometry: ThreeLike['BufferGeometry'];
  LineBasicMaterial: ThreeLike['LineBasicMaterial'];
  Line: ThreeLike['Line'];
  Vector3: ThreeLike['Vector3'];
};

export type MeasurableObject = HitObjectLike & {
  userData?: UnknownRecord | null;
  parent?: MeasurableObject | null;
  type?: string;
};
