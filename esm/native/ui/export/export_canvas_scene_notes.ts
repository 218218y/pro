import type { AppContainer } from '../../../../types/app.js';
import type { NotesExportTransformLike } from './export_canvas_engine.js';
import { getDocumentMaybe, getDoorsService, setDoorsOpenViaService } from '../../services/api.js';
import {
  shouldIncludeNotesInExport,
  renderAllNotesToCanvas as renderNotesToCanvas,
} from '../notes_export.js';
import { isPromiseLike } from './export_canvas_core_shared.js';
import { _exportReportThrottled, _guard } from './export_canvas_core_feedback.js';

export function isNotesEnabledForExport(App: AppContainer): boolean {
  try {
    return !!shouldIncludeNotesInExport(App);
  } catch (e) {
    _exportReportThrottled(App, 'isNotesEnabled', e, { throttleMs: 1500 });
    return false;
  }
}

export async function renderAllNotesForExportCanvas(
  App: AppContainer,
  ctx: CanvasRenderingContext2D,
  originalWidth: number,
  originalHeight: number,
  titleOffset: number,
  opts: NotesExportTransformLike | null | undefined
): Promise<unknown> {
  try {
    const res = renderNotesToCanvas(App, ctx, originalWidth, originalHeight, titleOffset, opts);
    if (isPromiseLike(res)) return await res;
    return res;
  } catch (e) {
    _exportReportThrottled(App, 'renderAllNotesToCanvas', e, { throttleMs: 1000 });
    return undefined;
  }
}

export function setDoorsOpenForExportScene(App: AppContainer, isOpen: boolean): void {
  _guard(App, 'setDoorsOpenForExport', () => {
    if (setDoorsOpenViaService(App, !!isOpen, { touch: false, forceUpdate: true, source: 'export' })) {
      return;
    }
    const doorsSvc = getDoorsService(App);
    const sync = doorsSvc && typeof doorsSvc.syncVisualsNow === 'function' ? doorsSvc.syncVisualsNow : null;
    if (typeof sync === 'function') sync({ open: !!isOpen });
  });
}

export function setBodyDoorStatusForExportNotes(App: AppContainer, isOpen: boolean): void {
  _guard(App, 'setBodyDoorStatusForNotes', () => {
    const doc = getDocumentMaybe(App);
    if (!doc || !doc.body) return;
    doc.body.setAttribute('data-door-status', isOpen ? 'open' : 'closed');
    void doc.body.offsetHeight;
  });
}
