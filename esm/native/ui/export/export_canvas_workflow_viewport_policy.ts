import type { AppContainer } from '../../../../types';
import type { NotesExportTransformLike } from './export_canvas_engine.js';
import { getUi } from '../store_access.js';
import { attachNotesSourceRect, readCanvasImageSourceRect } from './export_canvas_workflow_notes_rect.js';

export function shouldPreserveLiveViewportForSketchImageExport(App: AppContainer): boolean {
  const ui = getUi(App);
  return ui.isChestMode === true || ui.cornerMode === true;
}

export function createLiveViewportNotesTransform(
  rendererSource: CanvasImageSource | null | undefined
): NotesExportTransformLike {
  return attachNotesSourceRect(
    {
      sx: 1,
      sy: 1,
      dx: 0,
      dy: 0,
    },
    readCanvasImageSourceRect(rendererSource)
  );
}
