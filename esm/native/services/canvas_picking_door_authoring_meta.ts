import type { ActionMetaLike, AppContainer } from '../../../types';

import { __wp_metaNoBuild } from './canvas_picking_core_helpers.js';

function normalizeCanvasPickingDoorAuthoringSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Canvas picking door-authoring structural meta requires a source.');
  }
  return normalized;
}

export function createCanvasPickingDoorAuthoringStructuralMeta(source: string): ActionMetaLike {
  return {
    source: normalizeCanvasPickingDoorAuthoringSource(source),
    immediate: true,
  };
}

export function createCanvasPickingDoorAuthoringRefreshGatedMeta(
  App: AppContainer,
  source: string,
  baseMeta?: ActionMetaLike
): ActionMetaLike {
  const normalized = normalizeCanvasPickingDoorAuthoringSource(source);
  return __wp_metaNoBuild(
    App,
    normalized,
    baseMeta || createCanvasPickingDoorAuthoringStructuralMeta(normalized)
  );
}
