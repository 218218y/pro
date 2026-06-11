import type { ActionMetaLike, AppContainer, SavedNote, SavedNoteStyle } from '../../../../../types';

import { normalizeSavedNotes } from '../../notes_service.js';
import { readInnerHtml } from '../../dom_helpers.js';
import { persistNotesViaService, sanitizeNotesHtmlViaService } from '../../../services/api.js';
import { setCfgSavedNotes } from '../actions/store_actions.js';
import type { NotesOverlayApp } from './notes_overlay_helpers_services.js';
import { isEmptyHtml } from './notes_overlay_helpers_shared.js';
import { didNotesChange } from './notes_overlay_controller_interactions_shared.js';

export type NotesEditorRefs = Array<HTMLDivElement | null>;

export function captureEditorsIntoNotesRuntime(
  App: NotesOverlayApp,
  editorRefs: NotesEditorRefs,
  base: SavedNote[]
): SavedNote[] {
  let changed = false;
  const out = base.map((note, index) => {
    const editor = editorRefs[index];
    if (!editor) return note;

    const html = readInnerHtml(editor);
    let sanitized = html;
    try {
      sanitized = sanitizeNotesHtmlViaService(App, html);
    } catch {
      sanitized = html;
    }

    if (sanitized === (note.text || '')) return note;
    changed = true;
    return { ...note, text: sanitized };
  });

  return changed ? out : base;
}

export function commitOverlayNotesRuntime(
  App: NotesOverlayApp,
  app: AppContainer,
  next: SavedNote[],
  source: string
): void {
  const normalizedNext = normalizeSavedNotes(App, next);
  const commitMeta: ActionMetaLike = {
    source,
    immediate: true,
    coalesceKey: 'notes',
    coalesceMs: 1200,
  };

  setCfgSavedNotes(app, normalizedNext, commitMeta);
  persistNotesViaService(App, { source });
}

export function notesChangedRuntime(a: SavedNote[], b: SavedNote[]): boolean {
  return didNotesChange(a, b);
}

export function preserveEquivalentNoteSnapshotRuntime<T extends SavedNote[]>(prev: T, next: T): T {
  return notesChangedRuntime(prev, next) ? next : prev;
}

export function reconcileDraftNotesWithNormalizedRuntime(
  prev: SavedNote[],
  normalized: SavedNote[]
): SavedNote[] {
  return preserveEquivalentNoteSnapshotRuntime(prev, normalized);
}

export function removeNoteAtIndexRuntime(notes: SavedNote[], index: number): SavedNote[] {
  if (index < 0 || index >= notes.length) return notes;
  return [...notes.slice(0, index), ...notes.slice(index + 1)];
}

export function filterEmptyNotesRuntime(notes: SavedNote[]): SavedNote[] {
  let firstEmptyIndex = -1;
  for (let i = 0; i < notes.length; i += 1) {
    if (isEmptyHtml(String(notes[i]?.text || ''))) {
      firstEmptyIndex = i;
      break;
    }
  }
  if (firstEmptyIndex < 0) return notes;
  return notes.filter(note => !isEmptyHtml(String(note.text || '')));
}

export function applyStylePatchToNoteRuntime(
  note: SavedNote,
  patch: Partial<SavedNoteStyle> | null
): SavedNote {
  if (!patch || Object.keys(patch).length < 1) return note;
  const baseStyle: SavedNoteStyle = note.style ? { ...note.style } : {};
  const nextStyle: SavedNoteStyle = { ...baseStyle, ...patch };
  const patchKeys = Object.keys(patch) as Array<keyof SavedNoteStyle>;
  if (patchKeys.every(key => baseStyle[key] === nextStyle[key])) return note;
  return { ...note, style: nextStyle };
}
