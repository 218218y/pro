import type { ActionMetaLike, AppContainer, SavedNote, SavedNoteStyle } from '../../../../../types';
import { formatIdentityValue, readIdentityValue } from '../../../../shared/identity_value_shared.js';

import { normalizeSavedNotes } from '../../notes_service.js';
import { readInnerHtml } from '../../dom_helpers.js';
import {
  getHistorySystemMaybe,
  persistNotesViaService,
  readConfigStateFromApp,
  readRuntimeScalarOrDefaultFromApp,
  sanitizeNotesHtmlViaService,
} from '../../../services/api.js';
import { setCfgSavedNotes } from '../actions/store_actions.js';
import type { NotesOverlayApp } from './notes_overlay_helpers_services.js';
import { isEmptyHtml } from './notes_overlay_helpers_shared.js';
import { didNotesChange } from './notes_overlay_controller_interactions_shared.js';

export type NotesEditorRefs = Array<HTMLDivElement | null>;

type NotesHistoryIdentity = string;

type NotesHistoryCommitMetaArgs = {
  App: NotesOverlayApp;
  next: SavedNote[];
  source: string;
};

type NotesHistoryChange = {
  identity: NotesHistoryIdentity;
  prevNote: SavedNote | null;
  nextNote: SavedNote | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeHistoryIdentityPart(value: unknown): string {
  const raw = formatIdentityValue(readIdentityValue(value)).trim();
  if (!raw) return '';
  return raw.replace(/[^a-zA-Z0-9_.:-]+/g, '_').slice(0, 96);
}

function readNoteIdentity(note: SavedNote | null | undefined, index: number): NotesHistoryIdentity {
  const rec = isRecord(note) ? note : null;
  const id = sanitizeHistoryIdentityPart(rec?.id);
  if (id) return `id:${id}`;
  return `index:${index}`;
}

function tryReadCurrentSavedNotes(App: NotesOverlayApp): SavedNote[] | null {
  try {
    const cfg = readConfigStateFromApp(App);
    return normalizeSavedNotes(App, isRecord(cfg) ? cfg.savedNotes : undefined);
  } catch {
    return null;
  }
}

function readCurrentSavedNotes(App: NotesOverlayApp): SavedNote[] {
  return tryReadCurrentSavedNotes(App) || [];
}

function findChangedNoteChange(prev: SavedNote[], next: SavedNote[]): NotesHistoryChange {
  const max = Math.max(prev.length, next.length);
  for (let i = 0; i < max; i += 1) {
    const prevNote = prev[i] || null;
    const nextNote = next[i] || null;
    if (prevNote && nextNote && !didNotesChange([prevNote], [nextNote])) continue;
    return {
      identity: readNoteIdentity(nextNote || prevNote || null, i),
      prevNote,
      nextNote,
    };
  }
  return { identity: 'unchanged', prevNote: null, nextNote: null };
}

function shouldCoalesceCreateSource(source: string): boolean {
  return String(source || '') === 'react:notes:create';
}

function shouldCoalesceNoteChangeAcrossIdle(change: NotesHistoryChange): boolean {
  const prevNote = change.prevNote;
  const nextNote = change.nextNote;
  if (!prevNote) return false;
  const prevEmpty = isEmptyHtml(String(prevNote.text || ''));
  if (!prevEmpty) return false;
  if (!nextNote) return true;
  return !isEmptyHtml(String(nextNote.text || ''));
}

function isHistoryApplyInProgress(App: NotesOverlayApp): boolean {
  try {
    const historySystem = getHistorySystemMaybe(App) as {
      __isApplyingState?: unknown;
      __resumeAfterRestoreToken?: unknown;
      isPaused?: unknown;
    } | null;
    if (!historySystem) return false;
    if (historySystem.__isApplyingState === true) return true;
    const token =
      typeof historySystem.__resumeAfterRestoreToken === 'number'
        ? historySystem.__resumeAfterRestoreToken
        : 0;
    return historySystem.isPaused === true && token > 0;
  } catch {
    return false;
  }
}

export function isNotesOverlayCommitSuppressed(App: NotesOverlayApp): boolean {
  try {
    if (readRuntimeScalarOrDefaultFromApp(App, 'restoring', false)) return true;
  } catch {
    // Fall through to the history-system guard below.
  }
  return isHistoryApplyInProgress(App);
}

export function buildNotesHistoryCommitMeta(args: NotesHistoryCommitMetaArgs): ActionMetaLike {
  const { App, next, source } = args;
  const meta: ActionMetaLike = {
    source,
    immediate: true,
  };

  if (!String(source || '').startsWith('react:notes:') || source === 'react:notes:delete') return meta;

  const prev = readCurrentSavedNotes(App);
  const normalizedNext = normalizeSavedNotes(App, next);
  const change = findChangedNoteChange(prev, normalizedNext);
  const isFirstTextForEmptyNote = shouldCoalesceNoteChangeAcrossIdle(change);

  if (!shouldCoalesceCreateSource(source) && !isFirstTextForEmptyNote) return meta;

  meta.coalesceKey = `notes:${change.identity}`;
  meta.coalesceMs = 1200;
  if (isFirstTextForEmptyNote) meta.coalesceAcrossIdle = true;
  return meta;
}

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
  if (isNotesOverlayCommitSuppressed(App)) return;

  const normalizedDraft = normalizeSavedNotes(App, next);
  const normalizedNext = preserveEquivalentNoteSnapshotRuntime(
    normalizedDraft,
    filterEmptyNotesRuntime(normalizedDraft)
  );
  const current = tryReadCurrentSavedNotes(App);
  if (current && !didNotesChange(current, normalizedNext)) return;

  const commitMeta = buildNotesHistoryCommitMeta({ App, next: normalizedNext, source });

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
