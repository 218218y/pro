import type { ActionMetaLike, AppContainer } from '../../../types';

import { __wp_metaNoBuild } from './canvas_picking_core_helpers.js';

export type CanvasPickingPaintMeta = ActionMetaLike & { immediate?: boolean };

function normalizeCanvasPickingPaintSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Canvas picking paint meta requires a source.');
  }
  return normalized;
}

export function createCanvasPickingPaintStructuralMeta(source: string): CanvasPickingPaintMeta {
  return {
    source: normalizeCanvasPickingPaintSource(source),
    immediate: true,
  };
}

export function createCanvasPickingPaintMaterialRefreshMeta(
  App: AppContainer,
  source: string,
  baseMeta?: CanvasPickingPaintMeta
): ActionMetaLike {
  const normalized = normalizeCanvasPickingPaintSource(source);
  return __wp_metaNoBuild(App, normalized, baseMeta || createCanvasPickingPaintStructuralMeta(normalized));
}
