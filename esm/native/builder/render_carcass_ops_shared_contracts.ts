import type { AppContainer, Object3DLike, UnknownCallable } from '../../../types';
import type { CarcassCornicePlan, CarcassCorniceSegment, CorniceProfilePoint } from './carcass_cornice_ir.js';
import type { CarcassBackPanelOp, CarcassBoardOp } from './carcass_shell_ir.js';

export type AnyMap = Record<string, unknown>;

export type BackPanelSeg = CarcassBackPanelOp;

export type GroupLike = Object3DLike;

export type IndexLike = {
  array: ArrayLike<unknown>;
};

export type PositionAttributeLike = {
  count: number;
  needsUpdate?: boolean;
  getX: (index: number) => number;
  getY?: (index: number) => number;
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

export type LegPlatformSegment = {
  width?: number;
  height?: number;
  depth?: number;
  x?: number;
  y?: number;
  z?: number;
  partId?: unknown;
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
  platforms?: unknown;
};

export type LegPlatformsBaseOp = {
  kind: 'leg_platforms';
  platforms?: unknown;
};

export type BoardOp = CarcassBoardOp;

export type ProfilePoint = CorniceProfilePoint;
export type CorniceSegment = CarcassCorniceSegment;
export type CorniceOp = CarcassCornicePlan;

export type CarcassOps = {
  base?: PlinthBaseOp | LegsBaseOp | LegPlatformsBaseOp | null;
  boards?: BoardOp[] | null;
  backPanels?: BackPanelSeg[] | null;
  backPanel?: BackPanelSeg | null;
  cornice?: CorniceOp | null;
};

export type RenderCarcassOpsDeps = {
  app: (ctx: unknown) => AppContainer;
  ops: (App: AppContainer) => unknown;
  wardrobeGroup: (App: AppContainer) => unknown;
  three: (THREE: unknown) => unknown;
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
