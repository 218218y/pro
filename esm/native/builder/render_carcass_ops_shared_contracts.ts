import type { AppContainer, Object3DLike, UnknownCallable } from '../../../types';

export type AnyMap = Record<string, unknown>;

export type BackPanelSeg = {
  kind: 'back_panel';
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
};

export type GroupLike = Object3DLike;

export type IndexLike = {
  array: ArrayLike<unknown>;
};

export type PositionAttributeLike = {
  count: number;
  needsUpdate?: boolean;
  getX: (index: number) => number;
  getZ: (index: number) => number;
  setZ: (index: number, value: number) => unknown;
};

export type ExtrudeGeometryLike = {
  translate: (x: number, y: number, z: number) => unknown;
  getIndex?: () => IndexLike | null;
  getAttribute: (name: string) => PositionAttributeLike;
  setIndex?: (indices: number[]) => unknown;
  computeVertexNormals: () => unknown;
};

export type ShapeLike = {
  moveTo: (x: number, y: number) => unknown;
  lineTo: (x: number, y: number) => unknown;
};

export type ThreeCtorLike = {
  Mesh: new (geometry: unknown, material: unknown) => Object3DLike;
  Group: new () => GroupLike;
  BoxGeometry: new (w: number, h: number, d: number) => unknown;
  CylinderGeometry: new (top: number, bottom: number, height: number, radialSegments: number) => unknown;
  MeshBasicMaterial: new (opts: AnyMap) => unknown;
  Shape?: new () => ShapeLike;
  ExtrudeGeometry?: new (shape: ShapeLike, opts: AnyMap) => ExtrudeGeometryLike;
};

export type OutlineFn = (obj: unknown) => unknown;
export type PartMaterialFn = (partId: string) => unknown;

export type RenderCarcassContext = {
  App?: AppContainer;
  THREE?: unknown;
  addOutlines?: OutlineFn;
  getPartMaterial?: PartMaterialFn;
  __sketchMode?: boolean;
  plinthMat?: unknown;
  legMat?: unknown;
  bodyMat?: unknown;
  masoniteMat?: unknown;
  whiteMat?: unknown;
  corniceMat?: unknown;
};

export type PlinthSegment = {
  width?: number;
  height?: number;
  depth?: number;
  x?: number;
  y?: number;
  z?: number;
};

export type PlinthBaseOp = {
  kind: 'plinth';
  partId?: unknown;
  segments?: unknown;
  width?: number;
  height?: number;
  depth?: number;
  x?: number;
  y?: number;
  z?: number;
};

export type LegsBaseOp = {
  kind: 'legs';
  geo?: {
    shape?: string;
    topRadius?: number;
    bottomRadius?: number;
    radialSegments?: number;
    width?: number;
    depth?: number;
  };
  height?: number;
  positions?: Array<{ x?: number; z?: number } | null | undefined>;
};

export type BoardOp = {
  kind: 'board';
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
  partId?: unknown;
};

export type ProfilePoint = { x?: unknown; y?: unknown };

export type CorniceSegment = {
  kind?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
  partId?: unknown;
  profile?: unknown;
  length?: unknown;
  rotationY?: unknown;
  flipX?: unknown;
  width?: unknown;
  depth?: unknown;
  height?: unknown;
  heightMax?: unknown;
  waveAmp?: unknown;
  waveCycles?: unknown;
  miterStartTrim?: unknown;
  miterEndTrim?: unknown;
};

export type LegacyCorniceOp = {
  x?: number;
  y?: number;
  z?: number;
  scaleX?: number;
  scaleZ?: number;
  topRadius?: number;
  bottomRadius?: number;
  height?: number;
  radialSegments?: number;
  rotationY?: number;
};

export type CorniceOp = LegacyCorniceOp & {
  kind: 'cornice';
  partId?: unknown;
  segments?: unknown;
};

export type CarcassOps = {
  base?: PlinthBaseOp | LegsBaseOp | null;
  boards?: unknown;
  backPanels?: unknown;
  backPanel?: BackPanelSeg | null;
  cornice?: CorniceOp | null;
};

export type RenderCarcassOpsDeps = {
  app: (ctx: unknown) => AppContainer;
  ops: (App: AppContainer) => unknown;
  wardrobeGroup: (App: AppContainer) => unknown;
  three: (THREE: unknown) => unknown;
  isBackPanelSeg: (v: unknown) => v is BackPanelSeg;
  reg: (App: AppContainer, partId: unknown, obj: unknown, kind: unknown) => void;
  renderOpsHandleCatch: (
    App: AppContainer | null | undefined,
    op: string,
    err: unknown,
    extra?: AnyMap,
    opts?: { throttleMs?: number; failFast?: boolean }
  ) => void;
};

export type RenderCarcassRuntime = {
  App: AppContainer;
  THREE: ThreeCtorLike;
  wardrobeGroup: GroupLike;
  ctx: RenderCarcassContext;
  addOutlines: OutlineFn;
  getPartMaterial: PartMaterialFn | null;
  sketchMode: boolean;
  reg: RenderCarcassOpsDeps['reg'];
  renderOpsHandleCatch: RenderCarcassOpsDeps['renderOpsHandleCatch'];
};

export type { AppContainer, UnknownCallable };
