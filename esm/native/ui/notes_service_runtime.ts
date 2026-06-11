import type { ActionMetaLike, UnknownRecord } from '../../../types';
import type { NotesNamespace, NotesServiceApp } from './notes_service_shared.js';
import {
  createNotesMetaBuilder,
  ensureInstalledNotesService,
  ensureNotesDrawState,
  ensureNotesRuntime,
  getMetaActions,
  getNotesConfigState,
  patchSavedNotes,
  readActionMeta,
  wireUiNotesService,
} from './notes_service_shared.js';
import { normalizeSavedNotes, sanitizeRichTextHTML } from './notes_service_sanitize.js';

export function installNotesService(App: NotesServiceApp): NotesNamespace {
  if (!App || typeof App !== 'object') throw new Error('installNotesService(App): App is required');

  const notesNs = ensureInstalledNotesService(App);
  ensureNotesRuntime(notesNs);
  ensureNotesDrawState(notesNs);
  const notesMeta = createNotesMetaBuilder(App);
  wireUiNotesService(App, notesNs);

  if (typeof notesNs.sanitize !== 'function') {
    notesNs.sanitize = (html: string) => sanitizeRichTextHTML(App, html);
  }

  if (typeof notesNs.getForSave !== 'function') {
    notesNs.getForSave = () => {
      const cfg = getNotesConfigState(App);
      return normalizeSavedNotes(App, cfg.savedNotes);
    };
  }

  if (typeof notesNs.restoreFromSave !== 'function') {
    notesNs.restoreFromSave = (savedNotes: unknown) => {
      const norm = normalizeSavedNotes(App, savedNotes);
      patchSavedNotes(App, norm, notesMeta.build('notes:restore', { source: 'notes:restore' }));
    };
  }

  if (typeof notesNs.clear !== 'function') {
    notesNs.clear = () => {
      patchSavedNotes(App, [], notesMeta.build('notes:clear', { source: 'notes:clear' }));
    };
  }

  if (typeof notesNs.persist !== 'function') {
    notesNs.persist = (meta?: ActionMetaLike | UnknownRecord) => {
      try {
        const metaNs = getMetaActions(App);
        const payload = notesMeta.build('notes:react', readActionMeta(meta));
        if (metaNs && typeof metaNs.persist === 'function') metaNs.persist(payload);
      } catch {
        // ignore
      }
    };
  }

  return notesNs;
}
