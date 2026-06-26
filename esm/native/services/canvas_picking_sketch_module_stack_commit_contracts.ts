import type { AppContainer, UnknownRecord } from '../../../types';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';

export type RecordMap = UnknownRecord;

export type CommitSketchModuleInternalDrawerArgs = {
  App?: AppContainer | null;
  cfg: RecordMap;
  hoverRec: RecordMap;
  hoverOk: boolean;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  woodThick?: number;
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
  woodThick?: number;
  hitYClamped: number;
  hoverHost: ManualLayoutSketchHoverHost;
};
