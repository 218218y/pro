import type { AppContainer, UnknownRecord } from '../../../types';
import type {
  HitObjectLike,
  MouseVectorLike,
  RaycastHitLike,
  RaycasterLike,
} from './canvas_picking_engine.js';
import { asRecord } from '../runtime/record.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type SelectorLocalBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type InteriorHoverTarget = {
  intersects: RaycastHitLike[];
  hitModuleKey: ModuleKey;
  hitSelectorObj: HitObjectLike | null;
  isBottom: boolean;
  hitY: number;
  info: UnknownRecord;
  bottomY: number;
  topY: number;
  spanH: number;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  backZ: number;
  regularDepth: number;
};

export type DrawerHoverPreviewTarget = {
  drawer: UnknownRecord;
  parent: UnknownRecord;
  box: SelectorLocalBox;
};

export type ViewportRoots = {
  camera: UnknownRecord | null;
  wardrobeGroup: UnknownRecord | null;
};

export type ToModuleKeyFn = (value: unknown) => ModuleKey | null;
export type GetViewportRootsFn = (App: AppContainer) => ViewportRoots;
export type IsViewportRootFn = (App: AppContainer, node: unknown) => boolean;
export type ProjectWorldPointToLocalFn = (
  App: AppContainer,
  point: unknown,
  parentObj: unknown
) => { x: number; y: number; z: number } | null;
export type MeasureObjectLocalBoxFn = (
  App: AppContainer,
  obj: unknown,
  parentOverride?: unknown
) => SelectorLocalBox | null;
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

export type ResolveInteriorHoverTargetArgs = {
  App: AppContainer;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  ndcX: number;
  ndcY: number;
  getViewportRoots: GetViewportRootsFn;
  raycastReuse: RaycastReuseFn;
  isViewportRoot: IsViewportRootFn;
  toModuleKey: ToModuleKeyFn;
  projectWorldPointToLocal: ProjectWorldPointToLocalFn;
  measureObjectLocalBox: MeasureObjectLocalBoxFn;
};

export type EstimateVisibleModuleFrontZArgs = {
  App: AppContainer;
  target: InteriorHoverTarget;
  selectorBox: SelectorLocalBox;
  isViewportRoot: IsViewportRootFn;
  toModuleKey: ToModuleKeyFn;
  projectWorldPointToLocal: ProjectWorldPointToLocalFn;
  measureObjectLocalBox: MeasureObjectLocalBoxFn;
};

export type ResolveDrawerHoverPreviewTargetArgs = {
  App: AppContainer;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  ndcX: number;
  ndcY: number;
  getViewportRoots: GetViewportRootsFn;
  raycastReuse: RaycastReuseFn;
  projectWorldPointToLocal: ProjectWorldPointToLocalFn;
  measureObjectLocalBox: MeasureObjectLocalBoxFn;
};

export function isHitObject(value: unknown): value is HitObjectLike {
  return !!asRecord(value);
}

export function asHitObject(value: unknown): HitObjectLike | null {
  return isHitObject(value) ? value : null;
}

export function readUserData(value: unknown): UnknownRecord | null {
  return asRecord(asRecord(value)?.userData);
}

export function readParent(value: unknown): HitObjectLike | null {
  return asHitObject(asRecord(value)?.parent);
}

export function readPointRecord(value: unknown): UnknownRecord | null {
  return asRecord(asRecord(value)?.point);
}

export function isRenderableHitObject(obj: HitObjectLike | null): boolean {
  if (!obj) return false;
  if (obj.type === 'LineSegments' || obj.type === 'Line' || obj.type === 'Sprite') return false;
  const mat = asRecord(asRecord(obj)?.material);
  if (mat && mat.visible === false) return false;
  if (mat && mat.opacity === 0) return false;
  return true;
}

export function readLocalHitY(args: {
  App: AppContainer;
  hitPoint: unknown;
  parent: unknown;
  projectWorldPointToLocal: ProjectWorldPointToLocalFn;
  fallbackY: number | null;
}): number | null {
  const { App, hitPoint, parent, projectWorldPointToLocal, fallbackY } = args;
  let hitY = fallbackY;
  try {
    const localPoint = projectWorldPointToLocal(App, hitPoint || null, parent || null);
    if (localPoint && Number.isFinite(localPoint.y)) hitY = Number(localPoint.y);
  } catch {
    // ignore
  }
  return hitY;
}
