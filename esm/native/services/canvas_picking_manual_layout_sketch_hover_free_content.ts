import type { AppContainer, UnknownRecord } from '../../../types';
import type {
  FindNearestSketchBoxDividerArgs,
  FindNearestSketchBoxDividerResult,
  FindNearestSketchBoxHorizontalDividerArgs,
  FindNearestSketchBoxHorizontalDividerResult,
  SketchBoxHorizontalDividerPlacementArgs,
  SketchBoxHorizontalDividerPlacement,
  ResolveSketchBoxVerticalSegmentsArgs,
  PickSketchBoxVerticalSegmentArgs,
  IntersectScreenWithLocalZPlaneArgs,
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
import type { MouseVectorLike, RaycasterLike, RaycastHitLike } from './canvas_picking_engine.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import {
  resolveSketchFreeHoverContentKind,
  type SketchFreeHoverContentKind,
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

type ExistingVerticalRemovalKind = Extract<SketchFreeHoverContentKind, 'shelf' | 'rod' | 'storage'>;

function isStackContentKind(contentKind: SketchFreeHoverContentKind): boolean {
  return contentKind === 'drawers' || contentKind === 'ext_drawers';
}

function isExistingVerticalRemovalPreview(
  contentPreview: ReturnType<typeof resolveSketchFreeBoxContentPreview> | null,
  contentKind: ExistingVerticalRemovalKind
): contentPreview is { mode: 'preview'; hoverRecord: UnknownRecord; preview: UnknownRecord } {
  if (contentPreview?.mode !== 'preview') return false;
  const hover = contentPreview.hoverRecord;
  return (
    hover?.kind === 'box_content' &&
    hover?.freePlacement === true &&
    hover?.contentKind === contentKind &&
    hover?.op === 'remove'
  );
}

function isExistingStackRemovalPreview(
  contentPreview: ReturnType<typeof resolveSketchFreeBoxContentPreview> | null,
  contentKind: SketchFreeHoverContentKind
): contentPreview is { mode: 'preview'; hoverRecord: UnknownRecord; preview: UnknownRecord } {
  if (contentPreview?.mode !== 'preview') return false;
  const hover = contentPreview.hoverRecord;
  const removeId = hover?.removeId;
  return (
    hover?.kind === 'box_content' &&
    hover?.freePlacement === true &&
    hover?.contentKind === contentKind &&
    hover?.op === 'remove' &&
    typeof removeId === 'string' &&
    removeId.length > 0
  );
}

function applySketchFreeContentPreview(args: {
  App: AppContainer;
  wardrobeGroup: unknown;
  setPreview: (args: SketchPreviewArgs) => unknown;
  __wp_writeSketchHover: (App: AppContainer, snap: UnknownRecord) => void;
  contentPreview: { hoverRecord: UnknownRecord; preview: UnknownRecord };
}): void {
  args.__wp_writeSketchHover(args.App, args.contentPreview.hoverRecord);
  args.setPreview({
    App: args.App,
    THREE: getThreeMaybe(args.App),
    anchorParent: args.wardrobeGroup,
    ...args.contentPreview.preview,
  });
}

type ManualLayoutSketchHoverFreeContentArgs = {
  App: AppContainer;
  tool: string;
  intersects: RaycastHitLike[];
  wardrobeGroup: unknown;
  camera: unknown;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  context: SketchFreeHoverContext;
  setPreview: ((args: SketchPreviewArgs) => unknown) | null;
  __hideSketchPreviewAndClearHover: () => void;
  __wp_resolveSketchFreeBoxGeometry: (args: SketchFreeBoxGeometryArgs) => SketchFreeBoxGeometry;
  __wp_getSketchFreeBoxPartPrefix: (moduleKey: ModuleKey, boxId: unknown) => string;
  __wp_findSketchFreeBoxLocalHit: (args: SketchFreeBoxLocalHitArgs) => LocalPoint | null;
  __wp_intersectScreenWithLocalZPlane: (args: IntersectScreenWithLocalZPlaneArgs) => LocalPoint | null;
  __wp_readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  __wp_readSketchBoxHorizontalDividers: (box: unknown) => SketchBoxHorizontalDividerState[];
  __wp_resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  __wp_pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  __wp_resolveSketchBoxVerticalSegments: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentState[];
  __wp_pickSketchBoxVerticalSegment: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentState | null;
  __wp_findNearestSketchBoxDivider: (
    args: FindNearestSketchBoxDividerArgs
  ) => FindNearestSketchBoxDividerResult | null;
  __wp_findNearestSketchBoxHorizontalDivider: (
    args: FindNearestSketchBoxHorizontalDividerArgs
  ) => FindNearestSketchBoxHorizontalDividerResult | null;
  __wp_resolveSketchBoxDividerPlacement: (args: SketchBoxDividerPlacementArgs) => SketchBoxDividerPlacement;
  __wp_resolveSketchBoxHorizontalDividerPlacement: (
    args: SketchBoxHorizontalDividerPlacementArgs
  ) => SketchBoxHorizontalDividerPlacement;
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
    camera,
    ndcX,
    ndcY,
    raycaster,
    mouse,
    context,
    setPreview,
    __hideSketchPreviewAndClearHover,
    __wp_resolveSketchFreeBoxGeometry,
    __wp_getSketchFreeBoxPartPrefix,
    __wp_findSketchFreeBoxLocalHit,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readSketchBoxDividers,
    __wp_readSketchBoxHorizontalDividers,
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
    __wp_resolveSketchBoxVerticalSegments,
    __wp_pickSketchBoxVerticalSegment,
    __wp_findNearestSketchBoxDivider,
    __wp_findNearestSketchBoxHorizontalDivider,
    __wp_resolveSketchBoxDividerPlacement,
    __wp_resolveSketchBoxHorizontalDividerPlacement,
    __wp_readSketchBoxDividerXNorm,
    __wp_writeSketchHover,
  } = args;

  if (!setPreview) return false;

  const freeContentKind = resolveSketchFreeHoverContentKind(tool);
  if (!freeContentKind) return false;

  const { host, wardrobeBox, wardrobeBackZ, planeHit, freeBoxes } = context;
  const basePreviewArgs = {
    App,
    tool,
    host,
    freeBoxes,
    planeHit,
    wardrobeBox,
    wardrobeBackZ,
    intersects,
    localParent: wardrobeGroup,
    projectPointerToLocalZPlane: (planeZ: number) =>
      __wp_intersectScreenWithLocalZPlane({
        App,
        raycaster,
        mouse,
        camera,
        ndcX,
        ndcY,
        localParent: wardrobeGroup,
        planeZ,
      }),
    resolveSketchFreeBoxGeometry: __wp_resolveSketchFreeBoxGeometry,
    getSketchFreeBoxPartPrefix: __wp_getSketchFreeBoxPartPrefix,
    findSketchFreeBoxLocalHit: __wp_findSketchFreeBoxLocalHit,
    readSketchBoxDividers: __wp_readSketchBoxDividers,
    readSketchBoxHorizontalDividers: __wp_readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
    pickSketchBoxSegment: __wp_pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments: __wp_resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment: __wp_pickSketchBoxVerticalSegment,
    findNearestSketchBoxDivider: __wp_findNearestSketchBoxDivider,
    findNearestSketchBoxHorizontalDivider: __wp_findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxDividerPlacement: __wp_resolveSketchBoxDividerPlacement,
    resolveSketchBoxHorizontalDividerPlacement: __wp_resolveSketchBoxHorizontalDividerPlacement,
    readSketchBoxDividerXNorm: __wp_readSketchBoxDividerXNorm,
  };

  const contentPreview = resolveSketchFreeBoxContentPreview({
    ...basePreviewArgs,
    contentKind: freeContentKind,
  });

  if (isStackContentKind(freeContentKind)) {
    if (isExistingStackRemovalPreview(contentPreview, freeContentKind)) {
      applySketchFreeContentPreview({
        App,
        wardrobeGroup,
        setPreview,
        __wp_writeSketchHover,
        contentPreview,
      });
      return true;
    }

    const verticalRemovalKinds: ExistingVerticalRemovalKind[] = ['shelf', 'rod', 'storage'];
    for (const verticalKind of verticalRemovalKinds) {
      const verticalRemovePreview = resolveSketchFreeBoxContentPreview({
        ...basePreviewArgs,
        contentKind: verticalKind,
      });
      if (!isExistingVerticalRemovalPreview(verticalRemovePreview, verticalKind)) continue;
      applySketchFreeContentPreview({
        App,
        wardrobeGroup,
        setPreview,
        __wp_writeSketchHover,
        contentPreview: verticalRemovePreview,
      });
      return true;
    }
  }

  if (contentPreview?.mode === 'hide') {
    __hideSketchPreviewAndClearHover();
    return true;
  }
  if (contentPreview?.mode !== 'preview') return false;

  applySketchFreeContentPreview({
    App,
    wardrobeGroup,
    setPreview,
    __wp_writeSketchHover,
    contentPreview,
  });
  return true;
}
