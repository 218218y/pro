import { assertApp, assertTHREE } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { asRecord } from '../runtime/record.js';
import type {
  AppContainer,
  Box3Like,
  BuildStateLike,
  ConfigStateLike,
  Matrix4Like,
  Object3DLike,
  ThreeLike,
  UiStateLike,
} from '../../../types';
import {
  HANDLE_COLOR_GLOBAL_KEY,
  handleColorPartKey,
  type HandleFinishColor,
} from '../features/handle_finish_shared.js';

export type ValueRecord = Record<string, unknown>;

export type HandlesCacheLike = ValueRecord & {
  _edgeHandleMat?: unknown;
  _stdHandleMat?: unknown;
  _edgeHandleMatByColor?: Record<string, unknown>;
  _stdHandleMatByColor?: Record<string, unknown>;
};

export type HandlesApplyOptions = {
  triggerRender?: boolean;
};

export type HandlesSurfaceLike = ValueRecord & {
  cache?: HandlesCacheLike;
  __esm_builder_handles_v7_v1?: boolean;
  createHandleMeshV7?: (
    type: unknown,
    w: number,
    hh: number,
    isLeftHinge: boolean,
    isDrawer: boolean,
    ctx?: CreateHandleMeshCtx
  ) => Object3DLike | null;
  applyHandles?: (opts?: HandlesApplyOptions) => void;
  purgeHandlesForRemovedDoors?: (forceEnabled: boolean) => void;
};

export type RemoveDoorsFlagsLike = {
  removeDoorsEnabled?: boolean;
  removeDoors?: boolean;
};

export type HandleUserDataLike = ValueRecord & {
  __kind?: string;
  handleType?: unknown;
  isHandle?: boolean;
  partId?: unknown;
  __baseVisible?: boolean;
  __doorWidth?: number;
  __doorHeight?: number;
  __hingeLeft?: boolean;
  __handleZSign?: number;
  __handleAbsY?: number;
  __frontMaxZ?: number;
  __wpStack?: 'top' | 'bottom' | string;
  __keepMaterial?: boolean;
  __wpSketchCustomHandles?: boolean;
};

export type VectorLike = {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => void;
};

export type BoundingBoxLike = {
  min: { z?: number; y?: number };
  max: { z?: number; y?: number };
};

export type GeometryLike = {
  boundingBox?: BoundingBoxLike | null;
  computeBoundingBox?: () => void;
};

export type NodeLike = Object3DLike & {
  uuid?: string;
  visible?: boolean;
  isGroup?: boolean;
  isMesh?: boolean;
  geometry?: GeometryLike | null;
  matrixWorld?: unknown;
  updateWorldMatrix?: (updateParents: boolean, updateChildren: boolean) => void;
  traverse?: (fn: (obj: NodeLike) => void) => void;
  parent: NodeLike | null;
  children: NodeLike[];
  position: VectorLike;
  userData: HandleUserDataLike;
};

export type EdgeHandleVariant = 'short' | 'long';
export type CreateHandleMeshCtx =
  | {
      App: AppContainer;
      edgeHandleVariant?: EdgeHandleVariant | string | null;
      handleColor?: HandleFinishColor | string | null;
    }
  | null
  | undefined;

export const EDGE_HANDLE_VARIANT_GLOBAL_KEY = '__wp_edge_handle_variant_global';
export const EDGE_HANDLE_VARIANT_PART_PREFIX = '__wp_edge_handle_variant:';
export { HANDLE_COLOR_GLOBAL_KEY, handleColorPartKey };
export type { HandleFinishColor };

export function asNode(x: unknown): NodeLike | null {
  return asRecord<NodeLike>(x);
}

export function asRemoveDoorsFlags(x: unknown): RemoveDoorsFlagsLike | null {
  return asRecord<RemoveDoorsFlagsLike>(x);
}

export function readConfigState(value: unknown): ConfigStateLike | null {
  return asRecord<ConfigStateLike>(value);
}

export function readBox3(value: unknown): Box3Like | null {
  const box = asRecord<Box3Like>(value);
  if (!box) return null;
  return typeof box.copy === 'function' && typeof box.applyMatrix4 === 'function' ? box : null;
}

export function readMatrix4(value: unknown): Matrix4Like | null {
  const matrix = asRecord<Matrix4Like>(value);
  if (!matrix) return null;
  return typeof matrix.copy === 'function' && typeof matrix.invert === 'function' ? matrix : null;
}

export function getViewFlags(
  stateLike: unknown,
  uiLike: unknown
): {
  uiView: RemoveDoorsFlagsLike | null;
  stateView: RemoveDoorsFlagsLike | null;
} {
  const state = asRecord<BuildStateLike>(stateLike);
  const ui = asRecord<UiStateLike>(uiLike);
  return {
    uiView: asRemoveDoorsFlags(ui?.view) || asRemoveDoorsFlags(state?.ui?.view),
    stateView: asRemoveDoorsFlags(state?.view),
  };
}

export function appFromCtx(ctx: unknown): AppContainer {
  const o = asRecord<ValueRecord>(ctx);
  const a = o ? asRecord<AppContainer>(o.App) : null;
  return assertApp(a, 'native/builder/handles');
}

export function ensureHandlesSurface(appIn: unknown): {
  App: AppContainer;
  B: ReturnType<typeof ensureBuilderService>;
  handles: HandlesSurfaceLike;
  cache: HandlesCacheLike;
} {
  const App = assertApp(asRecord<AppContainer>(appIn), 'native/builder/handles.surface');
  const B = ensureBuilderService(App, 'native/builder/handles.surface');
  const handles = (B.handles = asRecord<HandlesSurfaceLike>(B.handles) || {});
  handles.cache = asRecord<HandlesCacheLike>(handles.cache) || {};
  return { App, B, handles, cache: handles.cache };
}

export function normEdgeHandleVariant(v: unknown): EdgeHandleVariant {
  return v === 'long' ? 'long' : 'short';
}

export function edgeHandleVariantPartKey(partId: unknown): string {
  return `${EDGE_HANDLE_VARIANT_PART_PREFIX}${String(partId || '')}`;
}

export function getHandlesThree(App: AppContainer): ThreeLike {
  return assertTHREE(App, 'native/builder/handles.THREE');
}
