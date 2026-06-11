import type {
  AppContainer,
  BuilderCreateBoardArgsLike,
  BuilderCreateDrawerShadowPlaneArgsLike,
  BuilderCreateModuleHitBoxArgsLike,
  BuilderHandleMeshOptionsLike,
  BuilderRenderCommonArgsLike,
  DoorVisualEntryLike,
  DrawerVisualEntryLike,
  Object3DLike,
  ThreeLike,
} from '../../../types';

export type AnyMap = Record<string, unknown>;
export type BoundUnknownMethod<Args extends readonly unknown[] = readonly unknown[], Return = unknown> = (
  ...args: Args
) => Return;
export type RenderThreeLike = Pick<
  ThreeLike,
  | 'Vector3'
  | 'Box3'
  | 'CylinderGeometry'
  | 'MeshStandardMaterial'
  | 'MeshBasicMaterial'
  | 'BoxGeometry'
  | 'Mesh'
  | 'Group'
  | 'DoubleSide'
  | 'FrontSide'
  | 'Shape'
  | 'ExtrudeGeometry'
>;
export type RenderCommonArgs = Omit<BuilderRenderCommonArgsLike, 'THREE'> & {
  THREE?: RenderThreeLike | null;
};

export type CommonMatsCache = AnyMap & {
  masoniteMat?: unknown;
  whiteMat?: unknown;
  shadowMat?: unknown;
  realMirrorMat?: AnyMap | null;
};

export type BoardArgs = Omit<BuilderCreateBoardArgsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
export type ModuleHitBoxArgs = Omit<BuilderCreateModuleHitBoxArgsLike, 'THREE'> & {
  THREE?: RenderThreeLike | null;
};
export type DrawerShadowPlaneArgs = Omit<BuilderCreateDrawerShadowPlaneArgsLike, 'THREE'> & {
  THREE?: RenderThreeLike | null;
};
export type HandleMeshOpts = Omit<BuilderHandleMeshOptionsLike, 'THREE'> & { THREE?: RenderThreeLike | null };
export type AddGroupLike = { add: BoundUnknownMethod<[obj: unknown]> };
export type TraversableLike = { traverse: BoundUnknownMethod<[fn: (value: unknown) => void], void> };

export type BackPanelSeg = {
  kind: 'back_panel';
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
};

export type RenderOpsBag = AnyMap & {
  __matCache?: CommonMatsCache;
};

export type MirrorTrackableObject = Object3DLike & { material?: unknown | unknown[] };
export type { AppContainer, DoorVisualEntryLike, DrawerVisualEntryLike, Object3DLike };
