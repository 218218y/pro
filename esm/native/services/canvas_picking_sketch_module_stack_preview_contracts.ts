import type { UnknownRecord } from '../../../types';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';

export type RecordMap = UnknownRecord;
export type ModuleKey = number | 'corner' | `corner:${number}` | null;

export type SelectorFrontEnvelope = {
  centerX: number;
  centerZ: number;
  outerW: number;
  outerD: number;
};

export type ResolveSketchModuleStackPreviewArgs = {
  host: ManualLayoutSketchHoverHost;
  contentKind: 'drawers' | 'ext_drawers';
  moduleKey: ModuleKey;
  cfgRef: RecordMap | null;
  info?: RecordMap;
  shelves?: RecordMap[];
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  desiredCenterY: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  drawers: RecordMap[];
  extDrawers: RecordMap[];
  selectedDrawerCount?: number | null;
  drawerHeightM?: number | null;
  woodThick: number;
  selectorFrontEnvelope?: SelectorFrontEnvelope | null;
  hitSelectorObj?: unknown;
  isCornerKey: (moduleKey: ModuleKey) => boolean;
};

export type ResolveSketchModuleStackPreviewResult = {
  hoverRecord: RecordMap;
  preview: RecordMap;
};
