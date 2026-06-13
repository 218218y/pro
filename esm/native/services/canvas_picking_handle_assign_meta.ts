import type { ActionMetaLike } from '../../../types';

function normalizeCanvasPickingHandleAssignSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Canvas picking handle-assignment structural meta requires a source.');
  }
  return normalized;
}

export function createCanvasPickingHandleAssignStructuralMeta(source: string): ActionMetaLike {
  return {
    source: normalizeCanvasPickingHandleAssignSource(source),
    immediate: true,
  };
}
