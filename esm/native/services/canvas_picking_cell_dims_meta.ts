import type { ActionMetaLike, AppContainer } from '../../../types';

import { __wp_metaNoBuild } from './canvas_picking_core_helpers.js';

export type CanvasPickingCellDimsMeta = ActionMetaLike & { immediate?: boolean };

function normalizeCanvasPickingCellDimsSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Canvas picking cell-dims meta requires a source.');
  }
  return normalized;
}

export function createCanvasPickingCellDimsStructuralMeta(source: string): CanvasPickingCellDimsMeta {
  return {
    source: normalizeCanvasPickingCellDimsSource(source),
    immediate: true,
  };
}

export function createCanvasPickingCellDimsRefreshGatedMeta(
  App: AppContainer,
  source: string,
  baseMeta?: CanvasPickingCellDimsMeta
): ActionMetaLike {
  const normalized = normalizeCanvasPickingCellDimsSource(source);
  return __wp_metaNoBuild(App, normalized, baseMeta || createCanvasPickingCellDimsStructuralMeta(normalized));
}
