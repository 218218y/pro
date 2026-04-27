import type {
  ModuleKey,
  LocalPoint,
  SketchFreeBoxGeometry,
  SelectorLocalBox,
} from './canvas_picking_manual_layout_sketch_contracts.js';

export type SketchFreeHoverContentKind =
  | 'divider'
  | 'shelf'
  | 'rod'
  | 'storage'
  | 'door'
  | 'double_door'
  | 'door_hinge'
  | 'cornice'
  | 'base'
  | 'drawers'
  | 'ext_drawers'
  | '';

export type SketchFreeHoverHost = { moduleKey: ModuleKey; isBottom: boolean } & Record<string, unknown>;

export type RecordMap = Record<string, unknown>;

export type SketchFreeBoxTarget = {
  boxId: string;
  targetBox: RecordMap;
  targetGeo: SketchFreeBoxGeometry;
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY: number;
};

export type SketchFreeSurfacePreviewResult = {
  hoverRecord: RecordMap;
  preview: RecordMap;
};

export type { LocalPoint, SelectorLocalBox };
