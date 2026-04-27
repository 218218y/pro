import type {
  AppContainer,
  InteriorLayoutHoverPreviewArgsLike,
  ModuleConfigLike,
  ModuleCustomDataLike,
  SketchPlacementPreviewArgsLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';
import type { HitObjectLike } from './canvas_picking_engine.js';
import type {
  CanvasPickingGridInfoLike,
  SketchPreviewArgs,
  SketchPreviewSurfaceLike,
} from './canvas_picking_manual_layout_sketch_contracts.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;
export type PreviewRenderPayload = SketchPlacementPreviewArgsLike | InteriorLayoutHoverPreviewArgsLike;
export type PreviewCallback = ((args: PreviewRenderPayload) => unknown) | null;
export type ShelfVariant = 'regular' | 'double' | 'glass' | 'brace';
export type LayoutManualTool = 'shelf' | 'rod' | 'storage';
export type HoverCustomDataLike = ModuleCustomDataLike &
  UnknownRecord & {
    shelfVariants?: unknown[];
  };
export type HoverModuleConfigLike = ModuleConfigLike &
  UnknownRecord & {
    braceShelves?: unknown[];
    customData?: HoverCustomDataLike;
  };

export type LayoutPreviewPayload = InteriorLayoutHoverPreviewArgsLike & {
  anchor: HitObjectLike | null;
  x: number;
  internalZ: number;
  innerW: number;
  internalDepth: number;
  woodThick: number;
  shelfYs: number[];
  rodYs: number[];
  storageBarrier: { y: number; h: number; z: number } | null;
  shelfVariant?: ShelfVariant;
  op: 'add' | 'remove';
};

export type SketchPreviewPayload = SketchPlacementPreviewArgsLike & UnknownRecord;

export interface CanvasInteriorHoverFlowArgs {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  primaryMode: string;
  raycaster: import('./canvas_picking_engine.js').RaycasterLike;
  mouse: import('./canvas_picking_engine.js').MouseVectorLike;
  previewRo: SketchPreviewSurfaceLike | null;
  hideLayoutPreview: PreviewCallback;
  hideSketchPreview: PreviewCallback;
  setLayoutPreview: PreviewCallback;
}

export type {
  AppContainer,
  CanvasPickingGridInfoLike,
  SketchPreviewArgs,
  SketchPreviewSurfaceLike,
  UiStateLike,
};
