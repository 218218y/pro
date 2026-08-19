import type { UnknownRecord } from '../../../types';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type { StandardExternalShoeDrawerPreview } from './canvas_picking_drawer_cross_family.js';

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
  info?: RecordMap | undefined;
  shelves?: RecordMap[] | undefined;
  rods?: RecordMap[] | undefined;
  storageBarriers?: RecordMap[] | undefined;
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
  boxes?: RecordMap[] | undefined;
  selectedDrawerCount?: number | null | undefined;
  externalDrawerType?: 'regular' | 'shoe' | undefined;
  standardShoePreview?: StandardExternalShoeDrawerPreview | null | undefined;
  drawerHeightM?: number | null | undefined;
  woodThick: number;
  selectorFrontEnvelope?: SelectorFrontEnvelope | null | undefined;
  hitSelectorObj?: unknown;
  isCornerKey: (moduleKey: ModuleKey) => boolean;
};

export type ResolveSketchModuleStackPreviewResult = {
  hoverRecord: RecordMap;
  preview: RecordMap | null;
} | null;
