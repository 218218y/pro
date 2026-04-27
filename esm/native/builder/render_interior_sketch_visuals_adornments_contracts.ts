import type {
  InteriorGeometryLike,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

export type IndexedGeometryLike = InteriorGeometryLike & {
  getIndex?: () => { array?: ArrayLike<number> } | null;
  getAttribute?: (name: string) => { count?: number } | null;
  setIndex?: (value: number[]) => void;
};

export type SketchCorniceShapeLike = {
  moveTo: (x: number, y: number) => unknown;
  lineTo: (x: number, y: number) => unknown;
};

export type SketchCorniceExtrudeGeometryLike = InteriorGeometryLike & {
  translate?: (x: number, y: number, z: number) => unknown;
};

export type InteriorTHREESurfaceWithSketchCornice = InteriorTHREESurface & {
  Shape?: new () => SketchCorniceShapeLike;
  ExtrudeGeometry?: new (
    shape: SketchCorniceShapeLike,
    opts: InteriorValueRecord
  ) => SketchCorniceExtrudeGeometryLike;
};

export type SketchAdornmentPlacementRuntime = {
  corniceTHREE: InteriorTHREESurfaceWithSketchCornice | null | undefined;
  resolveMat: (partId: string) => unknown;
  attachNode: (node: unknown, partId: string) => void;
  placeMesh: (
    mesh: unknown,
    partId: string,
    x: number,
    y: number,
    z: number,
    rotY?: number,
    flipX?: boolean
  ) => void;
};
