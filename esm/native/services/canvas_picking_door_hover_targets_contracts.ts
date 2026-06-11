import type { AppContainer, UnknownRecord } from '../../../types';
import type { CanvasPickingHitIdentity } from './canvas_picking_hit_identity.js';
import type {
  HitObjectLike,
  MouseVectorLike,
  RaycastHitLike,
  RaycasterLike,
} from './canvas_picking_engine.js';

export type ViewportRoots = {
  camera: UnknownRecord | null;
  wardrobeGroup: TransformNodeLike | null;
};

export type HidePreviewArgs = { App: AppContainer; THREE: unknown };
export type HidePreviewFn = ((args: HidePreviewArgs) => unknown) | null | undefined;

export type ReusableVectorLike = {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => unknown;
};

export type ReusableQuaternionLike = {
  copy: (next: unknown) => unknown;
};

export type ReusableVectorCtor = new (x?: number, y?: number, z?: number) => ReusableVectorLike;
export type ReusableQuaternionCtor = new (
  x?: number,
  y?: number,
  z?: number,
  w?: number
) => ReusableQuaternionLike;

export type HoverThreeLike = {
  Vector3: ReusableVectorCtor;
  Quaternion: ReusableQuaternionCtor;
};

export type PickingRuntimeLike = Record<string, unknown>;

export type TransformNodeLike = {
  userData?: UnknownRecord | null;
  getWorldPosition?: (target: ReusableVectorLike) => unknown;
  localToWorld?: (target: ReusableVectorLike) => unknown;
  worldToLocal?: (target: ReusableVectorLike) => unknown;
  getWorldQuaternion?: (target: ReusableQuaternionLike) => unknown;
};

export type MarkerUserDataLike = UnknownRecord & {
  __matBottom?: unknown;
  __matTop?: unknown;
  __matAdd?: unknown;
  __matRemove?: unknown;
  __matGroove?: unknown;
  __matMirror?: unknown;
  __matCenter?: unknown;
};

export type MarkerLike = {
  visible?: boolean;
  material?: unknown;
  userData?: MarkerUserDataLike | null;
  position?: { copy?: (next: ReusableVectorLike) => unknown };
  quaternion?: { copy?: (next: ReusableQuaternionLike) => unknown };
  scale?: { set?: (x: number, y: number, z: number) => unknown };
};

export type DoorHoverHit = {
  hitDoorPid: string;
  hitDoorGroup: HitObjectLike;
  hitY: number;
  hitPoint: ReusableVectorLike | null;
  wardrobeGroup: UnknownRecord;
  hitIdentity?: CanvasPickingHitIdentity | null;
};

export type NormalizeDoorBaseKeyFn = (
  App: AppContainer,
  hitDoorGroup: HitObjectLike,
  hitDoorPid: string
) => string;

export type ReadSplitHoverDoorBoundsFn = (
  App: AppContainer,
  key: string
) => { minY: number; maxY: number } | null;

export type GetViewportRootsFn = (App: AppContainer) => ViewportRoots;
export type GetSplitHoverRaycastRootsFn = (App: AppContainer) => unknown;
export type RaycastReuseFn = (args: {
  App: AppContainer;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  camera: unknown;
  ndcX: number;
  ndcY: number;
  objects: unknown;
  recursive?: boolean;
}) => RaycastHitLike[];
export type IsViewportRootFn = (App: AppContainer, node: unknown) => boolean;
export type StrFn = (App: AppContainer, value: unknown) => string;
export type IsDoorLikePartIdFn = (partId: string) => boolean;
export type IsDoorOrDrawerLikePartIdFn = (partId: string) => boolean;
export type ReadUiFn = (App: AppContainer) => UnknownRecord | null;
export type GetCanvasPickingRuntimeFn = (App: AppContainer) => PickingRuntimeLike;
export type IsRemovedFn = (App: AppContainer, id: string) => boolean;
export type IsSegmentedDoorBaseIdFn = (id: string) => boolean;
export type CanonDoorPartKeyForMapsFn = (id: string) => string;
export type ReadSplitPosListFn = (App: AppContainer, doorBaseKey: string) => number[];
export type GetRegularSplitPreviewLineYFn = (args: {
  App: AppContainer;
  hitDoorGroup: HitObjectLike;
  bounds: { minY: number; maxY: number };
  isBottomRegion: boolean;
}) => number | null;
export type ReportPickingIssueFn = (
  App: AppContainer,
  err: unknown,
  meta: { op: string; where?: string; throttleMs?: number },
  opts?: { failFast?: boolean }
) => void;

export type DoorHoverResolverArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  getViewportRoots: GetViewportRootsFn;
  getSplitHoverRaycastRoots: GetSplitHoverRaycastRootsFn;
  raycastReuse: RaycastReuseFn;
  isViewportRoot: IsViewportRootFn;
  str: StrFn;
  isDoorLikePartId: IsDoorLikePartIdFn;
  isDoorOrDrawerLikePartId: IsDoorOrDrawerLikePartIdFn;
  paintUsesWardrobeGroup?: boolean;
  allowTransparentRestoreTargets?: boolean;
};

export type DoorActionHoverArgs = DoorHoverResolverArgs & {
  doorMarker: MarkerLike | null;
  hideLayoutPreview?: HidePreviewFn;
  hideSketchPreview?: HidePreviewFn;
  setSketchPreview?: ((args: UnknownRecord) => unknown) | null;
  isGrooveEditMode: boolean;
  isRemoveDoorMode: boolean;
  isHandleEditMode: boolean;
  isHingeEditMode: boolean;
  isMirrorPaintMode: boolean;
  isDoorTrimMode: boolean;
  paintSelection: string | null;
  readUi: ReadUiFn;
  normalizeDoorBaseKey: NormalizeDoorBaseKeyFn;
  readSplitHoverDoorBounds: ReadSplitHoverDoorBoundsFn;
  getCanvasPickingRuntime: GetCanvasPickingRuntimeFn;
  isRemoved: IsRemovedFn;
  isSegmentedDoorBaseId: IsSegmentedDoorBaseIdFn;
  canonDoorPartKeyForMaps: CanonDoorPartKeyForMapsFn;
  preferredFacePreviewPartId?: string | null;
  preferredFacePreviewHitObject?: HitObjectLike | null;
};

export type SplitDoorHoverArgs = DoorHoverResolverArgs & {
  marker: MarkerLike | null;
  cutMarker: MarkerLike | null;
  splitVariant: string;
  normalizeDoorBaseKey: NormalizeDoorBaseKeyFn;
  readSplitHoverDoorBounds: ReadSplitHoverDoorBoundsFn;
  getCanvasPickingRuntime: GetCanvasPickingRuntimeFn;
  readSplitPosList: ReadSplitPosListFn;
  getRegularSplitPreviewLineY: GetRegularSplitPreviewLineYFn;
  reportPickingIssue: ReportPickingIssueFn;
};
