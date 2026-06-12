import type { ActionMetaLike } from '../../../types';

function normalizeCanvasPickingConfigPatchSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Canvas picking config structural patch requires a source.');
  }
  return normalized;
}

export function createCanvasPickingConfigStructuralPatchMeta(source: string): ActionMetaLike {
  return {
    source: normalizeCanvasPickingConfigPatchSource(source),
    immediate: true,
  };
}
