import type { AppContainer } from '../../../types';
import {
  ensureUiNotesExportService,
  isUiNotesExportInstalled,
  markUiNotesExportInstalled,
} from '../services/api.js';
import { type NotesExportApi, requireNotesExportApp } from './notes_export_shared.js';
import { shouldIncludeNotesInExport } from './notes_export_visibility.js';
import { renderAllNotesToCanvas } from './notes_export_render.js';

function ensureNotesExportApi(app: AppContainer): NotesExportApi {
  return ensureUiNotesExportService(app);
}

function hasInstalledNotesExportApi(api: NotesExportApi): boolean {
  return (
    typeof api.shouldIncludeNotesInExport === 'function' && typeof api.renderAllNotesToCanvas === 'function'
  );
}

export { shouldIncludeNotesInExport, renderAllNotesToCanvas };
export type { ExportNotesTransform } from './notes_export_shared.js';

export function installNotesExport(App: unknown): boolean {
  const A = requireNotesExportApp(App);
  const notesExport = ensureNotesExportApi(A);

  if (isUiNotesExportInstalled(A) && hasInstalledNotesExportApi(notesExport)) {
    return true;
  }

  notesExport.shouldIncludeNotesInExport = () => shouldIncludeNotesInExport(A);
  notesExport.renderAllNotesToCanvas = (ctx, w, h, titleOffset, exportTransform) =>
    renderAllNotesToCanvas(A, ctx, w, h, titleOffset ?? 0, exportTransform ?? null);
  markUiNotesExportInstalled(A);
  return true;
}
