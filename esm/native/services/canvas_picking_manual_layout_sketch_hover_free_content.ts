import type { AppContainer, UnknownRecord } from '../../../types';
import type {
  FindNearestSketchBoxDividerArgs,
  FindNearestSketchBoxDividerResult,
  LocalPoint,
  ModuleKey,
  PickSketchBoxSegmentArgs,
  ResolveSketchBoxSegmentsArgs,
  SketchBoxDividerPlacement,
  SketchBoxDividerPlacementArgs,
  SketchFreeBoxGeometryArgs,
  SketchFreeBoxGeometry,
  SketchFreeBoxLocalHitArgs,
  SelectorLocalBox,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import {
  resolveSketchFreeHoverContentKind,
  type SketchFreeHoverHost,
} from './canvas_picking_sketch_free_surface_preview.js';
import { resolveSketchFreeBoxContentPreview } from './canvas_picking_sketch_free_box_content_preview.js';

type SketchPreviewArgs = UnknownRecord;
type SketchFreeHoverContext = {
  host: SketchFreeHoverHost;
  wardrobeBox: SelectorLocalBox;
  wardrobeBackZ: number;
  planeHit: LocalPoint;
  freeBoxes: UnknownRecord[];
};

type ManualLayoutSketchHoverFreeContentArgs = {
  App: AppContainer;
  tool: string;
  intersects: RaycastHitLike[];
  wardrobeGroup: unknown;
  context: SketchFreeHoverContext;
  setPreview: ((args: SketchPreviewArgs) => unknown) | null;
  __hideSketchPreviewAndClearHover: () => void;
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
  __wp_readSketchBoxDividerXNorm: (box: unknown) => number | null;
  __wp_writeSketchHover: (App: AppContainer, snap: UnknownRecord) => void;
};

export function tryHandleManualLayoutSketchHoverFreeContentPreview(
  args: ManualLayoutSketchHoverFreeContentArgs
): boolean {
  const {
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
  } = args;

  if (!setPreview) return false;

  const freeContentKind = resolveSketchFreeHoverContentKind(tool);
  if (!freeContentKind) return false;

  const { host, wardrobeBox, wardrobeBackZ, planeHit, freeBoxes } = context;
  const contentPreview = resolveSketchFreeBoxContentPreview({
    App,
    tool,
    contentKind: freeContentKind,
    host,
    freeBoxes,
    planeHit,
    wardrobeBox,
    wardrobeBackZ,
    intersects,
    localParent: wardrobeGroup,
    resolveSketchFreeBoxGeometry: __wp_resolveSketchFreeBoxGeometry,
    getSketchFreeBoxPartPrefix: __wp_getSketchFreeBoxPartPrefix,
    findSketchFreeBoxLocalHit: __wp_findSketchFreeBoxLocalHit,
    readSketchBoxDividers: __wp_readSketchBoxDividers,
    resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
    pickSketchBoxSegment: __wp_pickSketchBoxSegment,
    findNearestSketchBoxDivider: __wp_findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement: __wp_resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm: __wp_readSketchBoxDividerXNorm,
  });
  if (contentPreview?.mode === 'hide') {
    __hideSketchPreviewAndClearHover();
    return true;
  }
  if (contentPreview?.mode !== 'preview') return false;

  __wp_writeSketchHover(App, contentPreview.hoverRecord);
  setPreview({
    App,
    THREE: getThreeMaybe(App),
    anchorParent: wardrobeGroup,
    ...contentPreview.preview,
  });
  return true;
}
