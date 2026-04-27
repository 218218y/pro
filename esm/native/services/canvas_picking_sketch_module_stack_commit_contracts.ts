import type { UnknownRecord } from '../../../types';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';

export type RecordMap = UnknownRecord;

export type CommitSketchModuleInternalDrawerArgs = {
  cfg: RecordMap;
  hoverRec: RecordMap;
  hoverOk: boolean;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  drawerHeightM: number;
  hitYClamped: number;
  hoverHost: ManualLayoutSketchHoverHost;
};

export type CommitSketchModuleExternalDrawerArgs = {
  cfg: RecordMap;
  hoverRec: RecordMap;
  hoverOk: boolean;
  requestedDrawerCount: number;
  drawerHeightM: number;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  hitYClamped: number;
  hoverHost: ManualLayoutSketchHoverHost;
};
