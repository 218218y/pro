import type { AppContainer, UnknownRecord } from '../../../types';
import type {
  ModuleKey,
  LocalPoint,
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
  ResolveSketchFreeBoxHoverPlacementArgs,
  ResolveSketchFreeBoxHoverPlacementResult,
  SelectorLocalBox,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import type { SketchFreeHoverHost } from './canvas_picking_sketch_free_surface_preview.js';
import { resolveManualLayoutSketchHoverFreePlaneContext } from './canvas_picking_manual_layout_sketch_hover_free_context.js';
import { tryHandleManualLayoutSketchHoverFreeContentPreview } from './canvas_picking_manual_layout_sketch_hover_free_content.js';
import { tryHandleManualLayoutSketchHoverFreePlacementPreview } from './canvas_picking_manual_layout_sketch_hover_free_box.js';

type SketchPreviewArgs = UnknownRecord;
type SketchBoxToolSpecLike = UnknownRecord;
type SketchFreeBoxHostLike = SketchFreeHoverHost;
type InteriorModuleConfigRefLike = UnknownRecord;

type ManualLayoutSketchHoverFreeFlowArgs = {
  App: AppContainer;
  tool: string;
  hitModuleKey: unknown;
  hitY: number | null;
  ndcX: number;
  ndcY: number;
  camera: unknown;
  wardrobeGroup: unknown;
  intersects: RaycastHitLike[];
  setPreview: ((args: SketchPreviewArgs) => unknown) | null;
  __wpRaycaster: RaycasterLike;
  __wpMouse: MouseVectorLike;
  __hideSketchPreviewAndClearHover: () => void;
  __wp_parseSketchBoxToolSpec: (tool: string) => SketchBoxToolSpecLike | null;
  __wp_pickSketchFreeBoxHost: (App: AppContainer) => SketchFreeBoxHostLike | null;
  __wp_measureWardrobeLocalBox: (App: AppContainer) => SelectorLocalBox | null;
  __wp_intersectScreenWithLocalZPlane: (args: IntersectScreenWithLocalZPlaneArgs) => LocalPoint | null;
  __wp_readInteriorModuleConfigRef: (
    App: AppContainer,
    moduleKey: ModuleKey,
    isBottom: boolean
  ) => InteriorModuleConfigRefLike | null;
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
  __wp_resolveSketchFreeBoxHoverPlacement: (
    args: ResolveSketchFreeBoxHoverPlacementArgs
  ) => ResolveSketchFreeBoxHoverPlacementResult | null;
  __wp_writeSketchHover: (App: AppContainer, snap: UnknownRecord) => void;
};

export function tryHandleManualLayoutSketchHoverFreeFlow(args: ManualLayoutSketchHoverFreeFlowArgs): boolean {
  const {
    App,
    tool,
    hitModuleKey,
    hitY,
    ndcX,
    ndcY,
    camera,
    wardrobeGroup,
    intersects,
    setPreview,
    __wpRaycaster,
    __wpMouse,
    __hideSketchPreviewAndClearHover,
    __wp_parseSketchBoxToolSpec,
    __wp_pickSketchFreeBoxHost,
    __wp_measureWardrobeLocalBox,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readInteriorModuleConfigRef,
    __wp_resolveSketchFreeBoxGeometry,
    __wp_getSketchFreeBoxPartPrefix,
    __wp_findSketchFreeBoxLocalHit,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
    __wp_findNearestSketchBoxDivider,
    __wp_resolveSketchBoxDividerPlacement,
    __wp_findSketchModuleBoxAtPoint,
    __wp_readSketchBoxDividerXNorm,
    __wp_resolveSketchFreeBoxHoverPlacement,
    __wp_writeSketchHover,
  } = args;

  if (hitModuleKey != null && typeof hitY === 'number') return false;

  const context = resolveManualLayoutSketchHoverFreePlaneContext({
    App,
    tool,
    ndcX,
    ndcY,
    camera,
    wardrobeGroup,
    raycaster: __wpRaycaster,
    mouse: __wpMouse,
    __wp_parseSketchBoxToolSpec,
    __wp_pickSketchFreeBoxHost,
    __wp_measureWardrobeLocalBox,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readInteriorModuleConfigRef,
  });

  if (
    context &&
    tryHandleManualLayoutSketchHoverFreeContentPreview({
      App,
      tool,
      intersects,
      wardrobeGroup,
      context,
      setPreview,
      __hideSketchPreviewAndClearHover,
      __wp_resolveSketchFreeBoxGeometry,
      __wp_getSketchFreeBoxPartPrefix,
      __wp_findSketchFreeBoxLocalHit,
      __wp_readSketchBoxDividers,
      __wp_resolveSketchBoxSegments,
      __wp_pickSketchBoxSegment,
      __wp_findNearestSketchBoxDivider,
      __wp_resolveSketchBoxDividerPlacement,
      __wp_readSketchBoxDividerXNorm,
      __wp_writeSketchHover,
    })
  ) {
    return true;
  }

  const placementContext = resolveManualLayoutSketchHoverFreePlaneContext({
    App,
    tool,
    ndcX,
    ndcY,
    camera,
    wardrobeGroup,
    raycaster: __wpRaycaster,
    mouse: __wpMouse,
    __wp_parseSketchBoxToolSpec,
    __wp_pickSketchFreeBoxHost,
    __wp_measureWardrobeLocalBox,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readInteriorModuleConfigRef,
    requireBoxSpec: true,
  });

  if (
    placementContext &&
    tryHandleManualLayoutSketchHoverFreePlacementPreview({
      App,
      tool,
      wardrobeGroup,
      context: placementContext,
      setPreview,
      __wp_resolveSketchFreeBoxHoverPlacement,
      __wp_resolveSketchFreeBoxGeometry,
      __wp_readSketchBoxDividers,
      __wp_resolveSketchBoxSegments,
      __wp_writeSketchHover,
    })
  ) {
    return true;
  }

  __hideSketchPreviewAndClearHover();
  return false;
}
