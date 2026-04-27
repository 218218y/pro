import type { AppContainer } from '../../../types';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import type {
  HoverMarkerLike,
  HoverRenderOpsLike,
  HoverPreviewArgs,
} from './canvas_picking_hover_flow_shared.js';

export type HandleCanvasNonSplitHoverArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  primaryMode: string;
  paintSelection: string | null;
  isGrooveEditMode: boolean;
  isRemoveDoorMode: boolean;
  isHandleEditMode: boolean;
  isHingeEditMode: boolean;
  isMirrorPaintMode: boolean;
  isDoorTrimMode: boolean;
  isExtDrawerEditMode: boolean;
  isDividerEditMode: boolean;
  isCellDimsMode: boolean;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  doorMarker: HoverMarkerLike | null;
  cutMarker: HoverMarkerLike | null;
  previewRo: HoverRenderOpsLike | null;
  hideLayoutPreview: ((args: HoverPreviewArgs) => unknown) | null;
  hideSketchPreview: ((args: HoverPreviewArgs) => unknown) | null;
  setSketchPreview: ((args: HoverPreviewArgs) => unknown) | null;
  setLayoutPreview: ((args: HoverPreviewArgs) => unknown) | null;
};

export type NonSplitPreferredFacePreviewState = {
  preferredFacePreviewPartId: string | null;
  preferredFacePreviewHitObject: Record<string, unknown> | null;
};

export type NonSplitPreviewRouteArgs = {
  hoverArgs: HandleCanvasNonSplitHoverArgs;
  facePreviewState: NonSplitPreferredFacePreviewState;
};
