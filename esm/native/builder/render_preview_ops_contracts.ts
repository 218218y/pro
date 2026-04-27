import type {
  AppContainer,
  BuilderPreviewMeasurementEntryLike,
  InteriorLayoutHoverPreviewArgsLike,
  PreviewDrawerEntryLike,
  PreviewStorageBarrierEntryLike,
  SketchPlacementPreviewArgsLike,
  UnknownRecord,
} from '../../../types';

export type PreviewOpsRecord = UnknownRecord;
export type PreviewValueRecord = Record<string, unknown>;

export type RenderPreviewOpsDeps = {
  app: (ctx: unknown) => AppContainer;
  ops: (App: AppContainer) => PreviewOpsRecord;
  asObject: <T extends object = UnknownRecord>(x: unknown) => T | null;
  cacheValue: <T = unknown>(App: AppContainer, key: string) => T | null;
  writeCacheValue: <T = unknown>(App: AppContainer, key: string, value: T | null) => T | null;
  wardrobeGroup: (
    App: AppContainer
  ) => (PreviewValueRecord & { add: (...objs: unknown[]) => unknown }) | null;
  addToWardrobe: (App: AppContainer, obj: unknown) => boolean;
  renderOpsHandleCatch: (
    App: AppContainer | null | undefined,
    op: string,
    err: unknown,
    extra?: UnknownRecord,
    opts?: { throttleMs?: number; failFast?: boolean }
  ) => void;
  assertTHREE: (App: AppContainer, where: string) => unknown;
  getThreeMaybe: (App: AppContainer) => unknown;
};

export type PreviewVec3Like = {
  set: (x: number, y: number, z: number) => unknown;
};

export type PreviewRaycastFn = (raycaster: unknown, intersects: unknown[]) => unknown;

export type PreviewMaterialLike = PreviewValueRecord & {
  userData?: PreviewMaterialUserData;
};

export type PreviewMaterialUserData = PreviewValueRecord & {
  __keepMaterial?: boolean;
};

export type PreviewLineUserData = PreviewValueRecord & {
  __ignoreRaycast?: boolean;
};

export type PreviewGroupUserData = SketchPlacementPreviewUserData & {
  __ignoreRaycast?: boolean;
  __keepMaterialSubtree?: boolean;
};

export type PreviewObject3DLike = PreviewValueRecord & {
  parent?: PreviewObject3DLike | null;
  userData?: PreviewValueRecord;
  visible?: boolean;
  renderOrder?: number;
  position?: PreviewVec3Like;
  scale?: PreviewVec3Like;
  add?: (...objs: unknown[]) => unknown;
  remove?: (obj: unknown) => unknown;
  raycast?: PreviewRaycastFn;
  geometry?: unknown;
  material?: unknown;
  castShadow?: boolean;
  receiveShadow?: boolean;
  isGroup?: boolean;
};

export type PreviewLineLike = PreviewObject3DLike & {
  material?: PreviewMaterialLike | unknown;
  userData?: PreviewLineUserData;
};

export type PreviewMeshUserData = PreviewValueRecord & {
  __outline?: PreviewLineLike;
};

export type PreviewMeshLike = PreviewObject3DLike & {
  geometry?: unknown;
  material?: PreviewMaterialLike | unknown;
  userData?: PreviewMeshUserData;
  add: (...objs: unknown[]) => unknown;
};

export type PreviewGroupLike = PreviewObject3DLike & {
  userData?: PreviewGroupUserData;
  add: (...objs: unknown[]) => unknown;
};

export type SketchPlacementPreviewUserData = PreviewValueRecord & {
  __shelfA?: PreviewMeshLike;
  __boxTop?: PreviewMeshLike;
  __boxBottom?: PreviewMeshLike;
  __boxLeft?: PreviewMeshLike;
  __boxRight?: PreviewMeshLike;
  __boxBack?: PreviewMeshLike;
  __matShelf?: PreviewMaterialLike;
  __matGlass?: PreviewMaterialLike;
  __matBox?: PreviewMaterialLike;
  __matBrace?: PreviewMaterialLike;
  __matRemove?: PreviewMaterialLike;
  __matRod?: PreviewMaterialLike;
  __matBoxOverlay?: PreviewMaterialLike;
  __matRemoveOverlay?: PreviewMaterialLike;
  __lineShelf?: PreviewMaterialLike;
  __lineGlass?: PreviewMaterialLike;
  __lineBox?: PreviewMaterialLike;
  __lineBrace?: PreviewMaterialLike;
  __lineRemove?: PreviewMaterialLike;
  __lineRod?: PreviewMaterialLike;
  __lineBoxOverlay?: PreviewMaterialLike;
  __lineRemoveOverlay?: PreviewMaterialLike;
};

export type InteriorLayoutHoverPreviewUserData = PreviewValueRecord & {
  __shelfList?: PreviewMeshLike[];
  __rodList?: PreviewMeshLike[];
  __storage?: PreviewMeshLike;
  __matShelf?: PreviewMaterialLike;
  __matGlass?: PreviewMaterialLike;
  __matBrace?: PreviewMaterialLike;
  __matRod?: PreviewMaterialLike;
  __matStorage?: PreviewMaterialLike;
  __matRemove?: PreviewMaterialLike;
  __lineShelf?: PreviewMaterialLike;
  __lineGlass?: PreviewMaterialLike;
  __lineBrace?: PreviewMaterialLike;
  __lineRod?: PreviewMaterialLike;
  __lineStorage?: PreviewMaterialLike;
  __lineRemove?: PreviewMaterialLike;
};

export type PreviewDrawerEntry = PreviewDrawerEntryLike;

export type PreviewStorageBarrierEntry = PreviewStorageBarrierEntryLike;

export type PreviewMeasurementEntry = BuilderPreviewMeasurementEntryLike;

export type SketchPlacementPreviewArgs = SketchPlacementPreviewArgsLike & PreviewValueRecord;

export type InteriorLayoutHoverPreviewArgs = InteriorLayoutHoverPreviewArgsLike & PreviewValueRecord;

export type PreviewTHREESurface = {
  BoxGeometry: new (width?: number, height?: number, depth?: number) => unknown;
  EdgesGeometry: new (geometry: unknown) => unknown;
  MeshBasicMaterial: new (params: PreviewValueRecord) => PreviewMaterialLike;
  LineBasicMaterial: new (params: PreviewValueRecord) => PreviewMaterialLike;
  Mesh: new (geometry: unknown, material: unknown) => PreviewMeshLike;
  LineSegments: new (geometry: unknown, material: unknown) => PreviewLineLike;
  Group: new () => PreviewGroupLike;
};
