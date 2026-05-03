import type {
  PreviewGroupLike,
  PreviewLineLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewTHREESurface,
  PreviewValueRecord,
} from './render_preview_ops_contracts.js';

export type MeasurementEntryLike = {
  startX?: unknown;
  startY?: unknown;
  endX?: unknown;
  endY?: unknown;
  z?: unknown;
  label?: unknown;
  labelX?: unknown;
  labelY?: unknown;
  styleKey?: unknown;
  textScale?: unknown;
  faceSign?: unknown;
  viewFaceSign?: unknown;
  labelFaceSign?: unknown;
};

export type RotatablePreviewMeshLike = PreviewMeshLike & {
  rotation?: {
    set?: (x: number, y: number, z: number) => unknown;
  };
  quaternion?: {
    identity?: () => unknown;
    set?: (x: number, y: number, z: number, w: number) => unknown;
  };
};

export type MeasurementUserData = PreviewValueRecord & {
  __measurementGroup?: PreviewGroupLike;
  __measurementLineMat?: PreviewMaterialLike;
  __measurementLabelMatCache?: Map<string, PreviewMaterialLike>;
  __measurementSlots?: MeasurementSlot[];
};

export type MeasurementSlot = {
  line: PreviewLineLike;
  label: PreviewMeshLike;
};

export type MeasurementTHREESurface = PreviewTHREESurface & {
  BufferGeometry: new () => { setFromPoints?: (points: unknown[]) => unknown };
  Group: new () => PreviewGroupLike;
  Line: new (geometry: unknown, material: unknown) => PreviewLineLike;
  LineBasicMaterial: new (params: PreviewValueRecord) => PreviewMaterialLike;
  Mesh: new (geometry: unknown, material: unknown) => PreviewMeshLike;
  MeshBasicMaterial: new (params: PreviewValueRecord) => PreviewMaterialLike;
  PlaneGeometry: new (width?: number, height?: number) => unknown;
  Vector3: new (x?: number, y?: number, z?: number) => { x: number; y: number; z: number };
  DoubleSide?: unknown;
};
