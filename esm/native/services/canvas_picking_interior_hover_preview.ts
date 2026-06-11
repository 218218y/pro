import { getThreeMaybe } from '../runtime/three_access.js';
import type {
  AppContainer,
  PreviewCallback,
  SketchPreviewArgs,
  SketchPreviewPayload,
  SketchPreviewSurfaceLike,
} from './canvas_picking_interior_hover_contracts.js';

export function previewArgs(App: AppContainer): SketchPreviewArgs {
  return { App, THREE: getThreeMaybe(App) };
}

export function hideSketchPreview(args: { App: AppContainer; hideSketchPreview: PreviewCallback }): void {
  const { App, hideSketchPreview } = args;
  if (hideSketchPreview) hideSketchPreview(previewArgs(App));
}

export function hideLayoutPreview(args: { App: AppContainer; hideLayoutPreview: PreviewCallback }): void {
  const { App, hideLayoutPreview } = args;
  if (hideLayoutPreview) hideLayoutPreview(previewArgs(App));
}

export function getSketchPreviewFns(previewRo: SketchPreviewSurfaceLike | null): {
  hidePreview: PreviewCallback;
  setPreview: PreviewCallback;
} {
  return {
    hidePreview:
      previewRo && typeof previewRo.hideSketchPlacementPreview === 'function'
        ? previewRo.hideSketchPlacementPreview
        : null,
    setPreview:
      previewRo && typeof previewRo.setSketchPlacementPreview === 'function'
        ? previewRo.setSketchPlacementPreview
        : null,
  };
}

export function setPreview(preview: PreviewCallback, payload: SketchPreviewPayload): boolean {
  if (!preview) return false;
  preview(payload);
  return true;
}
