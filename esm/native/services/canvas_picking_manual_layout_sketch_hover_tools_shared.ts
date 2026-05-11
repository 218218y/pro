import type { AppContainer, SketchPlacementPreviewArgsLike, UnknownRecord } from '../../../types';
import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import type { ResolveDrawerHoverPreviewTargetFn } from './canvas_picking_hover_preview_modes_shared.js';
import { getModeId } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { hasViewportPickingSurface } from '../runtime/render_access.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { readActiveManualTool } from './canvas_picking_manual_tool_access.js';
import type {
  ModuleKey,
  LocalPoint,
  SelectorLocalBox,
  IntersectScreenWithLocalZPlaneArgs,
  SketchFreeBoxGeometryArgs,
  SketchFreeBoxGeometry,
  SketchFreeBoxLocalHitArgs,
  ResolveSketchBoxSegmentsArgs,
  PickSketchBoxSegmentArgs,
  FindNearestSketchBoxDividerArgs,
  FindNearestSketchBoxDividerResult,
  SketchBoxDividerPlacementArgs,
  SketchBoxDividerPlacement,
  FindSketchModuleBoxAtPointArgs,
  FindSketchModuleBoxAtPointResult,
  SketchBoxGeometryArgs,
  SketchBoxGeometry,
  ResolveSketchFreeBoxHoverPlacementArgs,
  ResolveSketchFreeBoxHoverPlacementResult,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';

export type { ModuleKey } from './canvas_picking_manual_layout_sketch_contracts.js';

export type PreviewArgs = { App: AppContainer; THREE: unknown } & UnknownRecord;
export type HidePreviewFn = ((args: PreviewArgs) => unknown) | null | undefined;
export type SetPreviewFn = ((args: UnknownRecord) => unknown) | null | undefined;
export type RenderOpsSketchPreviewLike = UnknownRecord & {
  hideSketchPlacementPreview?: HidePreviewFn;
  setSketchPlacementPreview?: SetPreviewFn;
};
export type SketchFreeBoxHostLike = UnknownRecord & { moduleKey: ModuleKey; isBottom: boolean };

export type ManualLayoutSketchHoverPreviewArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  __pm: string;
  __hideLayoutPreview?: HidePreviewFn;
  __wpRaycaster: RaycasterLike;
  __wpMouse: MouseVectorLike;
  __wp_getViewportRoots: (App: AppContainer) => { camera: unknown; wardrobeGroup: unknown };
  __wp_raycastReuse: (args: {
    App: AppContainer;
    raycaster: RaycasterLike;
    mouse: MouseVectorLike;
    camera: unknown;
    ndcX: number;
    ndcY: number;
    objects: unknown;
    recursive?: boolean;
  }) => RaycastHitLike[];
  __wp_toModuleKey: (value: unknown) => ModuleKey | null;
  __wp_projectWorldPointToLocal: (
    App: AppContainer,
    point: unknown,
    parent?: unknown
  ) => (UnknownRecord & { x?: unknown; z?: unknown }) | null;
  __wp_parseSketchBoxToolSpec: (tool: string) => UnknownRecord | null;
  __wp_pickSketchFreeBoxHost: (App: AppContainer) => SketchFreeBoxHostLike | null;
  __wp_measureWardrobeLocalBox: (App: AppContainer) => SelectorLocalBox | null;
  __wp_intersectScreenWithLocalZPlane: (args: IntersectScreenWithLocalZPlaneArgs) => LocalPoint | null;
  __wp_readInteriorModuleConfigRef: (
    App: AppContainer,
    moduleKey: ModuleKey,
    isBottom: boolean
  ) => UnknownRecord | null;
  __wp_resolveSketchFreeBoxGeometry: (args: SketchFreeBoxGeometryArgs) => SketchFreeBoxGeometry;
  __wp_getSketchFreeBoxPartPrefix: (moduleKey: ModuleKey, boxId: unknown) => string;
  __wp_findSketchFreeBoxLocalHit: (args: SketchFreeBoxLocalHitArgs) => LocalPoint | null;
  __wp_readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  __wp_resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  __wp_pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  __wp_findNearestSketchBoxDivider: (
    args: FindNearestSketchBoxDividerArgs
  ) => FindNearestSketchBoxDividerResult | null;
  __wp_resolveSketchBoxDividerPlacement: (args: SketchBoxDividerPlacementArgs) => SketchBoxDividerPlacement;
  __wp_findSketchModuleBoxAtPoint: (
    args: FindSketchModuleBoxAtPointArgs
  ) => FindSketchModuleBoxAtPointResult | null;
  __wp_readSketchBoxDividerXNorm: (box: unknown) => number | null;
  __wp_isCornerKey: (value: unknown) => boolean;
  __wp_isDefaultCornerCellCfgLike: (cfg: unknown) => boolean;
  __wp_resolveSketchBoxGeometry: (args: SketchBoxGeometryArgs) => SketchBoxGeometry;
  __wp_resolveSketchFreeBoxHoverPlacement: (
    args: ResolveSketchFreeBoxHoverPlacementArgs
  ) => ResolveSketchFreeBoxHoverPlacementResult | null;
  __wp_resolveDrawerHoverPreviewTarget: ResolveDrawerHoverPreviewTargetFn;
  __wp_writeSketchHover: (App: AppContainer, snap: UnknownRecord) => void;
  __wp_clearSketchHover: (App: AppContainer) => void;
};

export type ManualLayoutSketchHoverRuntime = {
  tool: string;
  camera: unknown;
  wardrobeGroup: unknown;
  intersects: RaycastHitLike[];
  hidePreview: HidePreviewFn;
  setPreview: ((args: SketchPlacementPreviewArgsLike) => unknown) | null;
  hideSketchPreviewAndClearHover: () => void;
};

export const __SKETCH_BOX_TOOL_PREFIX = 'sketch_box:';
export const __SKETCH_BOX_DIVIDER_TOOL = 'sketch_box_divider';

export function makePreviewArgs(App: AppContainer): PreviewArgs {
  return { App, THREE: getThreeMaybe(App) };
}

export function readManualLayoutSketchPreviewFns(App: AppContainer): {
  hidePreview: HidePreviewFn;
  setPreview: ((args: SketchPlacementPreviewArgsLike) => unknown) | null;
} {
  const ro = asRecord<RenderOpsSketchPreviewLike>(getBuilderRenderOps(App));
  const hidePreview =
    typeof ro?.hideSketchPlacementPreview === 'function'
      ? (args: PreviewArgs) => ro.hideSketchPlacementPreview?.(args)
      : null;
  const setPreview =
    typeof ro?.setSketchPlacementPreview === 'function'
      ? (args: SketchPlacementPreviewArgsLike) => ro.setSketchPlacementPreview?.(args)
      : null;
  return { hidePreview, setPreview };
}

export function hideLayoutPreviewIfPresent(App: AppContainer, hideLayoutPreview?: HidePreviewFn): void {
  if (hideLayoutPreview) hideLayoutPreview(makePreviewArgs(App));
}

export function readManualLayoutSketchHoverRuntime(
  args: ManualLayoutSketchHoverPreviewArgs
): ManualLayoutSketchHoverRuntime | null {
  const {
    App,
    ndcX,
    ndcY,
    __pm,
    __hideLayoutPreview,
    __wpRaycaster,
    __wpMouse,
    __wp_getViewportRoots,
    __wp_raycastReuse,
    __wp_clearSketchHover,
  } = args;

  const { hidePreview, setPreview } = readManualLayoutSketchPreviewFns(App);
  const hideSketchPreviewAndClearHover = () => {
    if (hidePreview) hidePreview(makePreviewArgs(App));
    __wp_clearSketchHover(App);
  };

  const __manualMode = getModeId(App, 'MANUAL_LAYOUT') || 'manual_layout';
  if (__pm !== __manualMode) {
    hideSketchPreviewAndClearHover();
    hideLayoutPreviewIfPresent(App, __hideLayoutPreview);
    return null;
  }

  hideLayoutPreviewIfPresent(App, __hideLayoutPreview);
  const tool = readActiveManualTool(App) || '';
  if (!tool.startsWith('sketch_')) {
    hideSketchPreviewAndClearHover();
    return null;
  }

  if (!hasViewportPickingSurface(App)) {
    hideSketchPreviewAndClearHover();
    return null;
  }

  const { camera, wardrobeGroup } = __wp_getViewportRoots(App);
  if (!camera || !wardrobeGroup) {
    hideSketchPreviewAndClearHover();
    return null;
  }

  const intersects = __wp_raycastReuse({
    App,
    raycaster: __wpRaycaster,
    mouse: __wpMouse,
    camera,
    ndcX,
    ndcY,
    objects: [wardrobeGroup],
    recursive: true,
  });

  return {
    tool,
    camera,
    wardrobeGroup,
    intersects,
    hidePreview,
    setPreview,
    hideSketchPreviewAndClearHover,
  };
}
