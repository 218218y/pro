import type { UnknownRecord } from '../../../types';
import type { SketchModuleBoxLike } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';

export type RecordMap = UnknownRecord;
export type SketchBoxToggleHoverMode = 'none' | 'free-toggle' | 'manual-toggle';
export type SketchBoxToggleContentKind = 'drawers' | 'ext_drawers';

export type CommitSketchModuleBoxContentArgs = {
  box: SketchModuleBoxLike;
  boxId?: string | null;
  contentKind: string;
  hoverRec: RecordMap;
  floorY?: number;
  hoverMode?: SketchBoxToggleHoverMode;
  hoverHost?: ManualLayoutSketchHoverHost | null;
};
