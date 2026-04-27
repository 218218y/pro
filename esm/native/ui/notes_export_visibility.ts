import { getDocumentMaybe } from '../services/api.js';
import { getElementByIdHtml } from './dom_helpers.js';
import { queryAll, readNotesEnabledHint, requireNotesExportApp } from './notes_export_shared.js';

export function shouldIncludeNotesInExport(App: unknown): boolean {
  const A = requireNotesExportApp(App);
  const doc = getDocumentMaybe(A);
  const container = getElementByIdHtml(doc, 'viewer-container');
  const hidden = !!(container && container.classList && container.classList.contains('notes-hidden'));

  const boxes = queryAll(A, '.annotation-box');
  const markers = queryAll(A, '.annotation-marker');
  const boxesCount = boxes && typeof boxes.length === 'number' ? boxes.length : 0;
  const markersCount = markers && typeof markers.length === 'number' ? markers.length : 0;

  if (boxesCount + markersCount <= 0) return false;

  const notesEnabled = readNotesEnabledHint(A);
  const wantsNotes = notesEnabled === null ? !hidden : notesEnabled;
  if (hidden && !wantsNotes) return false;
  return true;
}
