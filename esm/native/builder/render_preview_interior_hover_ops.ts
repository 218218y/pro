import type { RenderPreviewOpsDeps } from './render_preview_ops_contracts.js';

import {
  hideInteriorLayoutHoverPreview,
  setInteriorLayoutHoverPreview,
} from './render_preview_interior_hover_apply.js';
import { ensureInteriorLayoutHoverPreview } from './render_preview_interior_hover_cache.js';
import { createRenderPreviewInteriorHoverShared } from './render_preview_interior_hover_shared.js';

export function createBuilderRenderInteriorLayoutHoverPreviewOps(deps: RenderPreviewOpsDeps) {
  const shared = createRenderPreviewInteriorHoverShared(deps);

  return {
    ensureInteriorLayoutHoverPreview: (args: unknown) => ensureInteriorLayoutHoverPreview(shared, args),
    hideInteriorLayoutHoverPreview: (args: unknown) => hideInteriorLayoutHoverPreview(shared, args),
    setInteriorLayoutHoverPreview: (args: unknown) => setInteriorLayoutHoverPreview(shared, args),
  };
}
