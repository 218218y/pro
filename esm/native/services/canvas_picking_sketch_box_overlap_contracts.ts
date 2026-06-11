import type {
  SketchBoxGeometryArgs,
  SketchBoxGeometry,
} from './canvas_picking_manual_layout_sketch_contracts.js';

export type RecordMap = Record<string, unknown>;

export type ResolveSketchBoxGeometryFn = (args: SketchBoxGeometryArgs) => SketchBoxGeometry;

export type PlacementBoxLike = {
  id?: unknown;
  freePlacement?: unknown;
  yNorm?: unknown;
  heightM?: unknown;
  widthM?: unknown;
  depthM?: unknown;
  xNorm?: unknown;
};

export type ResolvedModuleBoxLike = {
  id: string;
  box: PlacementBoxLike & RecordMap;
  centerX: number;
  centerY: number;
  boxW: number;
  boxH: number;
  widthM: number | null;
  depthM: number | null;
  xNorm: number | null;
};
