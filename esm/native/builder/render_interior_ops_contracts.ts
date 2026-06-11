import type { AppContainer, Object3DLike, UnknownCallable, Vec3Like } from '../../../types';

export type InteriorValueRecord = Record<string, unknown>;

export type InteriorOpsCallable = UnknownCallable;

export type InteriorVector3Like = InteriorValueRecord &
  Vec3Like & {
    set?: (x: number, y: number, z: number) => unknown;
  };

export type InteriorGeometryLike = InteriorValueRecord & {
  parameters?: InteriorValueRecord;
  boundingBox?: {
    min?: InteriorVector3Like;
    max?: InteriorVector3Like;
  };
  computeBoundingBox?: () => unknown;
};

export type InteriorMaterialLike = InteriorValueRecord & {
  userData?: InteriorValueRecord;
  dispose?: () => unknown;
  premultipliedAlpha?: boolean;
  __keepMaterial?: boolean;
};

export type InteriorObjectLike = InteriorValueRecord & {
  parent?: InteriorObjectLike | null;
  children?: unknown[];
  userData?: InteriorValueRecord;
  visible?: boolean;
  renderOrder?: number;
  position?: InteriorVector3Like;
  rotation?: InteriorVector3Like;
  scale?: InteriorVector3Like;
  add?: (...objs: unknown[]) => unknown;
  remove?: (obj: unknown) => unknown;
  traverse?: (cb: (node: unknown) => unknown) => unknown;
  updateWorldMatrix?: (updateParents?: boolean, updateChildren?: boolean) => unknown;
  updateMatrixWorld?: (force?: boolean) => unknown;
  worldToLocal?: (vec: InteriorVector3Like) => unknown;
  getWorldScale?: (vec: InteriorVector3Like) => unknown;
  getWorldPosition?: (vec: InteriorVector3Like) => unknown;
  geometry?: InteriorGeometryLike;
  material?: InteriorMaterialLike | unknown;
  castShadow?: boolean;
  receiveShadow?: boolean;
  isMesh?: boolean;
  isLine?: boolean;
  isLineSegments?: boolean;
};

export type InteriorMeshLike = InteriorObjectLike & {
  geometry?: InteriorGeometryLike;
  material?: InteriorMaterialLike | unknown;
};

export type InteriorGroupLike = InteriorObjectLike;

export type InteriorBox3Like = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  setFromObject: (obj: unknown) => InteriorBox3Like;
  copy?: (box: unknown) => InteriorBox3Like;
  union?: (box: unknown) => InteriorBox3Like;
  makeEmpty?: () => InteriorBox3Like;
};

export type InteriorTHREESurface = {
  Box3: new () => InteriorBox3Like;
  Group: new () => InteriorGroupLike & Object3DLike;
  Vector3: new (x?: number, y?: number, z?: number) => InteriorVector3Like & Vec3Like;
  BoxGeometry: new (width?: number, height?: number, depth?: number) => InteriorGeometryLike;
  CylinderGeometry: new (
    radiusTop?: number,
    radiusBottom?: number,
    height?: number,
    radialSegments?: number
  ) => InteriorGeometryLike;
  MeshBasicMaterial: new (params: InteriorValueRecord) => InteriorMaterialLike;
  MeshStandardMaterial: new (params: InteriorValueRecord) => InteriorMaterialLike;
  Mesh: new (geometry: unknown, material: unknown) => InteriorMeshLike & Object3DLike;
  DoubleSide?: number;
};

export type RenderInteriorOpsDeps = {
  app: (ctx: unknown) => AppContainer;
  ops: (App: AppContainer) => InteriorValueRecord;
  wardrobeGroup: (App: AppContainer) => InteriorObjectLike | null;
  three: (THREE: unknown) => unknown;
  matCache: (App: AppContainer) => InteriorValueRecord;
  renderOpsHandleCatch: (
    App: AppContainer | null | undefined,
    op: string,
    err: unknown,
    extra?: InteriorValueRecord,
    opts?: { throttleMs?: number; failFast?: boolean }
  ) => void;
  assertTHREE: (App: AppContainer, where: string) => unknown;
};
