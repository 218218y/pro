import type { ActionMetaLike } from '../../../types';

function normalizeCanvasPickingDrawerDividerSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Canvas picking drawer-divider structural meta requires a source.');
  }
  return normalized;
}

export function createCanvasPickingDrawerDividerStructuralMeta(source: string): ActionMetaLike {
  return {
    source: normalizeCanvasPickingDrawerDividerSource(source),
    immediate: true,
  };
}
