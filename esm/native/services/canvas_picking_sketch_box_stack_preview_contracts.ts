import type { UnknownRecord } from '../../../types';
import type { ManualLayoutSketchCenterReader } from './canvas_picking_manual_layout_sketch_stack_placement.js';
import type {
  PickSketchBoxSegmentArgs,
  PickSketchBoxVerticalSegmentArgs,
  ResolveSketchBoxSegmentsArgs,
  ResolveSketchBoxVerticalSegmentsArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers.js';

export type RecordMap = UnknownRecord;
export type ModuleKey = number | 'corner' | `corner:${number}` | null;
export type SketchBoxSegmentLike = SketchBoxSegmentState;
export type SketchBoxVerticalSegmentLike = SketchBoxVerticalSegmentState;

export type SketchBoxStackPreviewHost = {
  tool: string;
  moduleKey: ModuleKey;
  isBottom: boolean;
  ts?: number;
};

export type SketchBoxStackPreviewGeo = {
  centerX: number;
  innerW: number;
  innerD: number;
  innerBackZ: number;
  outerW: number;
  centerZ: number;
  outerD: number;
};

export type ResolveSketchBoxStackPreviewArgs = {
  host: SketchBoxStackPreviewHost;
  contentKind: 'drawers' | 'ext_drawers';
  boxId: string;
  freePlacement: boolean;
  targetBox: unknown;
  targetGeo: SketchBoxStackPreviewGeo;
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY: number;
  woodThick: number;
  selectedDrawerCount?: number | null;
  drawerHeightM?: number | null;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers?: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentLike[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentLike | null;
  resolveSketchBoxVerticalSegments?: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentLike[];
  pickSketchBoxVerticalSegment?: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentLike | null;
};

export type ResolveSketchBoxStackPreviewResult = {
  hoverRecord: RecordMap;
  preview: RecordMap | null;
} | null;

export type SketchBoxFrontOverlay = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
};

export type SketchBoxStackPreviewContext = {
  args: ResolveSketchBoxStackPreviewArgs;
  fullBoxBottomY: number;
  fullBoxTopY: number;
  boxBottomY: number;
  boxTopY: number;
  cellHeight: number;
  normBottomY: number;
  normHeight: number;
  readCenterY: ManualLayoutSketchCenterReader;
  boxSegments: SketchBoxSegmentLike[];
  activeSegment: SketchBoxSegmentLike | null;
  verticalSegments: SketchBoxVerticalSegmentLike[];
  activeVerticalSegment: SketchBoxVerticalSegmentLike | null;
  localDrawers: RecordMap[];
  localExtDrawers: RecordMap[];
  frontOverlay: SketchBoxFrontOverlay | null;
};
