import type {
  SavedNote as NotesSavedNote,
  SavedNoteStyle as NotesSavedNoteStyle,
  NotesNamespaceLike,
  NotesServiceAppLike,
} from '../../../types';
import { installNotesService } from './notes_service_runtime.js';
import { normalizeSavedNotes, sanitizeRichTextHTML } from './notes_service_sanitize.js';

export type SavedNoteStyle = NotesSavedNoteStyle;
export type SavedNote = NotesSavedNote;
export type NotesNamespace = NotesNamespaceLike;
export type NotesServiceApp = NotesServiceAppLike;

export { installNotesService, normalizeSavedNotes, sanitizeRichTextHTML };
