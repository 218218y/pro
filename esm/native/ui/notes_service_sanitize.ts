import type { SavedNote as NotesSavedNote, SavedNoteStyle as NotesSavedNoteStyle } from '../../../types';
import { asRecord, getNotesDocument } from './notes_service_shared.js';
import { sanitizeHtmlByPolicy } from './html_sanitize_runtime.js';
import type { NotesServiceApp } from './notes_service_shared.js';

export type SavedNoteStyle = NotesSavedNoteStyle;
export type SavedNote = NotesSavedNote;

declare const sanitizedNotesHtmlBrand: unique symbol;
export type SanitizedNotesHtmlString = string & {
  readonly [sanitizedNotesHtmlBrand]: 'notes-rich';
};

function asSanitizedNotesHtml(html: string): SanitizedNotesHtmlString {
  return String(html || '') as SanitizedNotesHtmlString;
}

function stripAllHtml(s: string): string {
  return String(s || '').replace(/<[^>]*>/g, '');
}

export function sanitizeRichTextHTMLWithDocument(
  doc: Document | null | undefined,
  html: unknown
): SanitizedNotesHtmlString {
  const raw = typeof html === 'string' ? html : html == null ? '' : String(html);
  if (!raw) return asSanitizedNotesHtml('');
  if (!doc) return asSanitizedNotesHtml(stripAllHtml(raw));
  return asSanitizedNotesHtml(sanitizeHtmlByPolicy(doc, raw, 'notes-rich'));
}

export function sanitizeRichTextHTML(App: NotesServiceApp, html: string): SanitizedNotesHtmlString {
  return sanitizeRichTextHTMLWithDocument(getNotesDocument(App), html);
}

function normPx(v: unknown, defaultPx: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return defaultPx;
  if (!/^[0-9.]+(px|%|vh|vw)?$/i.test(s)) return defaultPx;
  return s;
}

function normFontSize(v: unknown, defaultValue: string): string {
  const s = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
  return s === '1' || s === '2' || s === '3' || s === '4' || s === '5' || s === '6' || s === '7'
    ? s
    : defaultValue;
}

function normColor(v: unknown, defaultValue: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : defaultValue;
}

export function normalizeSavedNoteStyle(v: unknown): SavedNoteStyle {
  const rec = asRecord(v);
  return {
    left: normPx(rec?.left, '0px'),
    top: normPx(rec?.top, '0px'),
    width: normPx(rec?.width, '150px'),
    height: normPx(rec?.height, '100px'),
    baseTextColor: normColor(rec?.baseTextColor, normColor(rec?.textColor, '#000000')),
    baseFontSize: normFontSize(rec?.baseFontSize, normFontSize(rec?.fontSize, '4')),
    textColor: normColor(rec?.textColor, '#000000'),
    fontSize: normFontSize(rec?.fontSize, '4'),
  };
}

export function normalizeSavedNotes(App: NotesServiceApp, savedNotes: unknown): SavedNote[] {
  const arr = Array.isArray(savedNotes) ? savedNotes : [];
  const out: SavedNote[] = [];

  for (const item of arr) {
    const noteRec = asRecord(item);
    if (!noteRec) continue;

    const styleSeed = normalizeSavedNoteStyle(noteRec.style);
    const style: SavedNoteStyle = {
      ...styleSeed,
      baseTextColor: normColor(styleSeed.baseTextColor, styleSeed.textColor || '#000000'),
      baseFontSize: normFontSize(styleSeed.baseFontSize, styleSeed.fontSize || '4'),
    };

    const noteId = typeof noteRec.id === 'string' && noteRec.id ? noteRec.id : undefined;
    const textRaw = typeof noteRec.text === 'string' ? noteRec.text : '';
    const text = sanitizeRichTextHTML(App, textRaw);
    const doorsOpen = typeof noteRec.doorsOpen === 'boolean' ? noteRec.doorsOpen : undefined;

    const note: SavedNote = { text, style };
    if (typeof noteId !== 'undefined') note.id = noteId;
    if (typeof doorsOpen !== 'undefined') note.doorsOpen = doorsOpen;
    out.push(note);
  }

  return out;
}
