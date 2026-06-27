import type { AppContainer, UnknownRecord } from '../../../types';
import type {
  LocalPoint,
  SketchFreeBoxGeometryArgs,
  SketchFreeBoxGeometry,
  SketchFreeBoxLocalHitArgs,
  ResolveSketchBoxSegmentsArgs,
  PickSketchBoxSegmentArgs,
  FindNearestSketchBoxDividerArgs,
  FindNearestSketchBoxDividerResult,
  FindNearestSketchBoxHorizontalDividerArgs,
  FindNearestSketchBoxHorizontalDividerResult,
  SketchBoxDividerPlacementArgs,
  SketchBoxDividerPlacement,
  SketchBoxHorizontalDividerPlacementArgs,
  SketchBoxHorizontalDividerPlacement,
  ResolveSketchBoxVerticalSegmentsArgs,
  PickSketchBoxVerticalSegmentArgs,
  SelectorLocalBox,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  SketchFreeBoxTarget,
  SketchFreeHoverContentKind,
  SketchFreeHoverHost,
  SketchFreeSurfacePreviewResult,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

export type RecordMap = UnknownRecord;

export type SketchFreeBoxContentPreviewArgs = {
  App: AppContainer;
  tool: string;
  contentKind: SketchFreeHoverContentKind;
  host: SketchFreeHoverHost;
  freeBoxes: RecordMap[];
  planeHit: LocalPoint;
  wardrobeBox: SelectorLocalBox;
  wardrobeBackZ: number;
  intersects: RaycastHitLike[];
  localParent: unknown;
  resolveSketchFreeBoxGeometry: (args: SketchFreeBoxGeometryArgs) => SketchFreeBoxGeometry;
  getSketchFreeBoxPartPrefix: (moduleKey: SketchFreeHoverHost['moduleKey'], boxId: unknown) => string;
  findSketchFreeBoxLocalHit: (args: SketchFreeBoxLocalHitArgs) => LocalPoint | null;
  projectPointerToLocalZPlane?: ((planeZ: number) => LocalPoint | null) | null;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  findNearestSketchBoxDivider: (
    args: FindNearestSketchBoxDividerArgs
  ) => FindNearestSketchBoxDividerResult | null;
  resolveSketchBoxDividerPlacement: (args: SketchBoxDividerPlacementArgs) => SketchBoxDividerPlacement;
  readSketchBoxDividerXNorm: (box: unknown) => number | null;
  resolveSketchBoxVerticalSegments: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentState[];
  pickSketchBoxVerticalSegment: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentState | null;
  findNearestSketchBoxHorizontalDivider: (
    args: FindNearestSketchBoxHorizontalDividerArgs
  ) => FindNearestSketchBoxHorizontalDividerResult | null;
  resolveSketchBoxHorizontalDividerPlacement: (
    args: SketchBoxHorizontalDividerPlacementArgs
  ) => SketchBoxHorizontalDividerPlacement;
};

export type SketchFreeBoxContentPreviewResult =
  { mode: 'preview'; hoverRecord: RecordMap; preview: RecordMap } | { mode: 'hide' };

export type SketchFreeBoxResolvedTarget = Pick<
  SketchFreeBoxTarget,
  | 'boxId'
  | 'partPrefix'
  | 'targetBox'
  | 'targetGeo'
  | 'targetCenterY'
  | 'targetHeight'
  | 'pointerX'
  | 'pointerY'
>;

export type SketchFreeSurfaceKind = Extract<SketchFreeHoverContentKind, 'divider' | 'cornice' | 'base'>;
export type SketchFreeVerticalKind = Extract<SketchFreeHoverContentKind, 'shelf' | 'rod' | 'storage'>;
export type SketchFreeStackKind = Extract<SketchFreeHoverContentKind, 'drawers' | 'ext_drawers'>;
export type SketchFreeDoorKind = Extract<SketchFreeHoverContentKind, 'door' | 'double_door' | 'door_hinge'>;

export type SketchFreeSurfacePreviewResolverArgs = {
  tool: string;
  contentKind: SketchFreeSurfaceKind;
  host: SketchFreeHoverHost;
  target: SketchFreeBoxTarget;
  wardrobeBox: SelectorLocalBox;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  findNearestSketchBoxDivider: (
    args: FindNearestSketchBoxDividerArgs
  ) => FindNearestSketchBoxDividerResult | null;
  resolveSketchBoxDividerPlacement: (args: SketchBoxDividerPlacementArgs) => SketchBoxDividerPlacement;
  readSketchBoxDividerXNorm: (box: unknown) => number | null;
  resolveSketchBoxVerticalSegments: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentState[];
  pickSketchBoxVerticalSegment: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentState | null;
  findNearestSketchBoxHorizontalDivider: (
    args: FindNearestSketchBoxHorizontalDividerArgs
  ) => FindNearestSketchBoxHorizontalDividerResult | null;
  resolveSketchBoxHorizontalDividerPlacement: (
    args: SketchBoxHorizontalDividerPlacementArgs
  ) => SketchBoxHorizontalDividerPlacement;
};

export type SketchFreeVerticalPreviewArgs = {
  tool: string;
  contentKind: SketchFreeVerticalKind;
  host: SketchFreeHoverHost;
  target: SketchFreeBoxResolvedTarget;
  intersects?: RaycastHitLike[];
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers?: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  resolveSketchBoxVerticalSegments?: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentState[];
  pickSketchBoxVerticalSegment?: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentState | null;
};

export type SketchFreeStackPreviewArgs = {
  tool: string;
  contentKind: SketchFreeStackKind;
  host: SketchFreeHoverHost;
  target: SketchFreeBoxResolvedTarget;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers?: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  resolveSketchBoxVerticalSegments?: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentState[];
  pickSketchBoxVerticalSegment?: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentState | null;
};

export type SketchFreeDoorPreviewArgs = {
  tool: string;
  contentKind: SketchFreeDoorKind;
  host: SketchFreeHoverHost;
  target: SketchFreeBoxResolvedTarget;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers?: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  resolveSketchBoxVerticalSegments?: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentState[];
  pickSketchBoxVerticalSegment?: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentState | null;
};

export type { SketchFreeSurfacePreviewResult };
