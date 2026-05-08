import type { SavedNoteStyle } from '../../../../../types';

import {
  editorFontSizeToToolbarFontSize,
  toolbarFontSizeToEditorFontSize,
} from './notes_overlay_helpers_shared.js';
import {
  editorFontSizeToPx,
  normalizeCssColorToHex,
  normalizeEditorFontSizeValue,
} from './notes_overlay_helpers_style.js';

export const DEFAULT_NOTES_TOOLBAR_COLOR = '#000000';
export const DEFAULT_NOTES_CARD_TEXT_COLOR = '#1e293b';
export const DEFAULT_NOTES_EDITOR_FONT_SIZE = '4';
export const DEFAULT_NOTES_TOOLBAR_FONT_SIZE = '3';
export const DEFAULT_NOTES_FONT_SIZE_PX = 18;

export type NotesToolbarFormatting = {
  color: string;
  editorFontSize: string;
  fontSizeUi: string;
};

export type NotesCardFormatting = {
  baseFontPx: string;
  baseTextColor: string;
};

export type NotesEditorFormattingDefaults = {
  color?: unknown;
  fontSize?: unknown;
  bold?: boolean;
};

export type NotesEditorFormattingOptions = {
  fontSizeKind?: 'toolbar' | 'editor';
};

type NotesEditorCommandDoc = Pick<Document, 'execCommand' | 'queryCommandState'>;

const NOTES_TOOLBAR_UI_SIZE_VALUES = ['1', '2', '3', '4', '5'] as const;

type NotesToolbarUiSize = (typeof NOTES_TOOLBAR_UI_SIZE_VALUES)[number];

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = readTrimmedString(value);
  if (!raw) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function readPxNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = readTrimmedString(value).toLowerCase();
  if (!raw.endsWith('px')) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function findNearestNotesToolbarUiSizeForPx(pxValue: number): NotesToolbarUiSize {
  let bestUi: NotesToolbarUiSize = NOTES_TOOLBAR_UI_SIZE_VALUES[2];
  let bestDist = Infinity;
  for (const uiSize of NOTES_TOOLBAR_UI_SIZE_VALUES) {
    const candidatePx = resolveNotesFontSizePxFromUi(uiSize, DEFAULT_NOTES_FONT_SIZE_PX);
    const dist = Math.abs(candidatePx - pxValue);
    if (dist < bestDist) {
      bestDist = dist;
      bestUi = uiSize;
    }
  }
  return bestUi;
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveNotesToolbarColor(value: unknown, defaultValue = DEFAULT_NOTES_TOOLBAR_COLOR): string {
  const normalized = normalizeCssColorToHex(value);
  if (normalized) return normalized;
  const raw = readTrimmedString(value);
  return raw || defaultValue;
}

export function resolveNotesEditorFontSize(
  value: unknown,
  defaultValue = DEFAULT_NOTES_EDITOR_FONT_SIZE
): string {
  const normalized = normalizeEditorFontSizeValue(value);
  return normalized || defaultValue;
}

export function resolveNotesToolbarFontSizeUi(
  value: unknown,
  defaultValue = DEFAULT_NOTES_TOOLBAR_FONT_SIZE
): string {
  const normalized = normalizeEditorFontSizeValue(value);
  return normalized ? editorFontSizeToToolbarFontSize(normalized) : defaultValue;
}

export function resolveNotesEditorFontSizeFromUi(
  value: unknown,
  defaultValue = DEFAULT_NOTES_EDITOR_FONT_SIZE
): string {
  const raw = readTrimmedString(value);
  const size = parseInt(raw, 10);
  if (Number.isFinite(size) && size >= 1 && size <= 5) return toolbarFontSizeToEditorFontSize(String(size));
  return defaultValue;
}

export function resolveNotesEditorFontSizeFromToolbarValue(
  value: unknown,
  defaultValue = DEFAULT_NOTES_EDITOR_FONT_SIZE
): string {
  const raw = readTrimmedString(value);
  const size =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value)
      : raw
        ? parseInt(raw, 10)
        : Number.NaN;
  if (Number.isFinite(size) && size >= 1 && size <= 5) {
    return toolbarFontSizeToEditorFontSize(String(size));
  }

  const pxValue = readPxNumber(value);
  if (pxValue != null) {
    return toolbarFontSizeToEditorFontSize(findNearestNotesToolbarUiSizeForPx(pxValue));
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 5) {
    return toolbarFontSizeToEditorFontSize(findNearestNotesToolbarUiSizeForPx(value));
  }

  return resolveNotesEditorFontSize(value, defaultValue);
}

export function resolveNotesFontSizePx(value: unknown, defaultValue = DEFAULT_NOTES_FONT_SIZE_PX): number {
  const editorFontSize = resolveNotesEditorFontSize(value, DEFAULT_NOTES_EDITOR_FONT_SIZE);
  const px = parseFloat(editorFontSizeToPx(editorFontSize));
  return Number.isFinite(px) ? px : defaultValue;
}

export function resolveNotesToolbarFontSizeUiFromPx(
  value: unknown,
  defaultValue = DEFAULT_NOTES_TOOLBAR_FONT_SIZE
): string {
  const pxValue = readPxNumber(value);
  if (pxValue != null) return findNearestNotesToolbarUiSizeForPx(pxValue);
  const numericValue = readFiniteNumber(value);
  if (numericValue != null && numericValue > 5) return findNearestNotesToolbarUiSizeForPx(numericValue);
  return resolveNotesToolbarFontSizeUi(value, defaultValue);
}

export function resolveNotesFontSizePxFromUi(
  value: unknown,
  defaultValue = DEFAULT_NOTES_FONT_SIZE_PX
): number {
  const editorFontSize = resolveNotesEditorFontSizeFromUi(value, DEFAULT_NOTES_EDITOR_FONT_SIZE);
  const px = parseFloat(editorFontSizeToPx(editorFontSize));
  return Number.isFinite(px) ? px : defaultValue;
}

export function readNotesToolbarFormatting(
  style: Partial<SavedNoteStyle> | null | undefined
): NotesToolbarFormatting {
  const styleRec = style || {};
  const editorFontSize = resolveNotesEditorFontSize(
    styleRec.fontSize || styleRec.baseFontSize,
    DEFAULT_NOTES_EDITOR_FONT_SIZE
  );
  return {
    color: resolveNotesToolbarColor(styleRec.textColor, DEFAULT_NOTES_TOOLBAR_COLOR),
    editorFontSize,
    fontSizeUi: editorFontSizeToToolbarFontSize(editorFontSize),
  };
}

export function readNotesCardFormatting(
  style: Partial<SavedNoteStyle> | null | undefined
): NotesCardFormatting {
  const styleRec = style || {};
  const editorFontSize = resolveNotesEditorFontSize(
    styleRec.baseFontSize || styleRec.fontSize,
    DEFAULT_NOTES_EDITOR_FONT_SIZE
  );
  return {
    baseFontPx: editorFontSizeToPx(editorFontSize),
    baseTextColor: resolveNotesToolbarColor(
      styleRec.baseTextColor || styleRec.textColor,
      DEFAULT_NOTES_CARD_TEXT_COLOR
    ),
  };
}

export function readNotesEditorBoldState(doc: NotesEditorCommandDoc | null | undefined): boolean | null {
  if (!doc || typeof doc.queryCommandState !== 'function') return null;
  try {
    return !!doc.queryCommandState('bold');
  } catch {
    return null;
  }
}

export function applyNotesEditorFormattingDefaults(
  doc: NotesEditorCommandDoc | null | undefined,
  defaults: NotesEditorFormattingDefaults | null | undefined,
  options?: NotesEditorFormattingOptions
): void {
  if (!doc || typeof doc.execCommand !== 'function' || !defaults) return;

  if (typeof defaults.color !== 'undefined') {
    const rawColor = readTrimmedString(defaults.color);
    if (rawColor) {
      doc.execCommand('foreColor', false, resolveNotesToolbarColor(rawColor, rawColor));
    }
  }

  if (typeof defaults.fontSize !== 'undefined') {
    const editorFontSize =
      options?.fontSizeKind === 'editor'
        ? resolveNotesEditorFontSize(defaults.fontSize, DEFAULT_NOTES_EDITOR_FONT_SIZE)
        : resolveNotesEditorFontSizeFromToolbarValue(defaults.fontSize, DEFAULT_NOTES_EDITOR_FONT_SIZE);
    if (editorFontSize) doc.execCommand('fontSize', false, editorFontSize);
  }

  if (typeof defaults.bold === 'boolean') {
    const currentBold = readNotesEditorBoldState(doc);
    if (typeof currentBold === 'boolean' && currentBold !== defaults.bold) {
      doc.execCommand('bold', false);
    }
  }
}

export function applyNotesEditorStyleDefaults(
  doc: NotesEditorCommandDoc | null | undefined,
  style: Partial<SavedNoteStyle> | null | undefined
): NotesToolbarFormatting {
  const formatting = readNotesToolbarFormatting(style);
  applyNotesEditorFormattingDefaults(
    doc,
    {
      color: formatting.color,
      fontSize: formatting.editorFontSize,
    },
    { fontSizeKind: 'editor' }
  );
  return formatting;
}
