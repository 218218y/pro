import type { RenderPreviewOpsDeps } from './render_preview_ops_contracts.js';
import { createDoorActionHoverMarkerOwner } from './render_preview_marker_ops_door_action.js';
import { createDoorCutHoverMarkerOwner } from './render_preview_marker_ops_door_cut.js';
import { createRenderPreviewMarkerContext } from './render_preview_marker_ops_shared.js';
import { createSplitHoverMarkerOwner } from './render_preview_marker_ops_split.js';

export function createBuilderRenderPreviewMarkerOps(deps: RenderPreviewOpsDeps) {
  const ctx = createRenderPreviewMarkerContext(deps);
  return {
    ...createSplitHoverMarkerOwner(ctx),
    ...createDoorActionHoverMarkerOwner(ctx),
    ...createDoorCutHoverMarkerOwner(ctx),
  };
}
