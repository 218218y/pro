import type { AppContainer, UnknownRecord } from '../../../types';
import type { SketchModuleBoxLike } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';

export type RecordMap = UnknownRecord;
export type SketchBoxToggleHoverMode = 'none' | 'free-toggle' | 'manual-toggle';
export type SketchBoxToggleContentKind = 'drawers' | 'ext_drawers' | 'regular_ext_drawers';

export type CommitSketchModuleBoxContentArgs = {
  App?: AppContainer | null | undefined;
  cfg?: RecordMap | null | undefined;
  box: SketchModuleBoxLike;
  boxId?: string | null | undefined;
  contentKind: string;
  hoverRec: RecordMap;
  floorY?: number | undefined;
  woodThick?: number | undefined;
  hoverMode?: SketchBoxToggleHoverMode | undefined;
  hoverHost?: ManualLayoutSketchHoverHost | null | undefined;
  sketchExternalDrawerType?: 'regular' | 'shoe' | undefined;
};
