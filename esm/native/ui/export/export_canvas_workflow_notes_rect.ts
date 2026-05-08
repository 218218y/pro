import type { NotesExportTransformLike } from './export_canvas_engine.js';

export type ExportCanvasNotesSourceRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type BoundingRectReader = {
  getBoundingClientRect?: () => DOMRectReadOnly;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readCanvasImageSourceRect(
  source: CanvasImageSource | null | undefined
): DOMRectReadOnly | null {
  if (!source || typeof source !== 'object') return null;

  const reader = (source as BoundingRectReader).getBoundingClientRect;
  if (typeof reader !== 'function') return null;

  try {
    return reader.call(source) || null;
  } catch {
    return null;
  }
}

export function serializeNotesSourceRect(
  rect: DOMRectReadOnly | null | undefined
): ExportCanvasNotesSourceRect | null {
  if (!rect) return null;

  const left = finiteNumber(rect.left);
  const top = finiteNumber(rect.top);
  const width = finiteNumber(rect.width);
  const height = finiteNumber(rect.height);

  return left !== null && top !== null && width !== null && height !== null && width > 0 && height > 0
    ? { left, top, width, height }
    : null;
}

export function attachNotesSourceRect(
  transform: NotesExportTransformLike,
  rect: DOMRectReadOnly | null | undefined
): NotesExportTransformLike {
  const sourceRect = serializeNotesSourceRect(rect);
  return sourceRect ? { ...transform, sourceRect } : transform;
}

export function attachNotesSourceRectMaybe(
  transform: NotesExportTransformLike | null,
  rect: DOMRectReadOnly | null | undefined
): NotesExportTransformLike | null {
  return transform ? attachNotesSourceRect(transform, rect) : null;
}
