import type { UnknownRecord } from '../../../types';
import type {
  ResolveSketchBoxSegmentsArgs,
  PickSketchBoxSegmentArgs,
  ResolveSketchBoxVerticalSegmentsArgs,
  PickSketchBoxVerticalSegmentArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers.js';

export type RecordMap = UnknownRecord;
export type ModuleKey = number | 'corner' | `corner:${number}` | null;

export type SketchBoxSegmentLike = SketchBoxSegmentState;

export type SketchBoxVerticalContentHost = {
  tool: string;
  moduleKey: ModuleKey;
  isBottom: boolean;
  ts?: number;
};

export type SketchBoxVerticalContentGeo = {
  centerX: number;
  innerW: number;
  innerD: number;
  innerBackZ: number;
};

export type SketchBoxVerticalContentKind = 'shelf' | 'rod' | 'storage';

export type ResolveSketchBoxVerticalContentPreviewArgs = {
  host: SketchBoxVerticalContentHost;
  contentKind: SketchBoxVerticalContentKind;
  boxId: string;
  freePlacement: boolean;
  targetBox: unknown;
  targetGeo: SketchBoxVerticalContentGeo;
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY: number;
  partPrefix?: string | null;
  intersects?: RaycastHitLike[];
  woodThick: number;
  shelfVariant?: string | null;
  shelfDepthOverrideM?: number | null;
  storageHeight?: number | null;
  removeEpsShelf?: number;
  removeEpsBox?: number;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers?: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentLike[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentLike | null;
  resolveSketchBoxVerticalSegments?: (
    args: ResolveSketchBoxVerticalSegmentsArgs
  ) => SketchBoxVerticalSegmentState[];
  pickSketchBoxVerticalSegment?: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentState | null;
};

export type ResolveSketchBoxVerticalContentPreviewResult = {
  hoverRecord: RecordMap;
  preview: RecordMap;
} | null;
