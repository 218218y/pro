import type {
  RenderInteriorSketchBoxesArgs,
  RenderSketchBoxGeometry,
  RenderSketchBoxShellResult,
} from './render_interior_sketch_boxes_shared.js';

export type ResolveSketchBoxHeightArgs = {
  rawHeight: unknown;
  defaultHeight: unknown;
  woodThick: number;
  spanH: number;
  isFreePlacement: boolean;
};

export type ResolveSketchBoxShellGeometryArgs = {
  box: RenderInteriorSketchBoxesArgs['boxes'][number];
  isFreePlacement: boolean;
  height: number;
  renderArgs: RenderInteriorSketchBoxesArgs;
  freeWardrobeBox: ReturnType<RenderInteriorSketchBoxesArgs['measureWardrobeLocalBox']>;
};

export type ResolvedSketchBoxShellGeometry = {
  centerY: number;
  geometry: RenderSketchBoxGeometry;
  absEntry: RenderSketchBoxShellResult['absEntry'];
};

export type ResolveSketchBoxMaterialArgs = {
  getPartMaterial?: RenderInteriorSketchBoxesArgs['getPartMaterial'];
  isFn: RenderInteriorSketchBoxesArgs['isFn'];
  boxPid: string;
  defaultMaterial: unknown;
};
