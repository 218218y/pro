import type { Dispatch, KeyboardEvent, MutableRefObject, PointerEvent, SetStateAction } from 'react';

import type { SavedNoteStyle } from '../../../../../types';
import { isEmptyHtml } from './notes_overlay_helpers.js';
import { readNotesCardFormatting } from './notes_overlay_text_style_runtime.js';

export type NoteCardProps = {
  key?: string | number;
  index: number;
  note: { text?: string; doorsOpen?: boolean; style?: SavedNoteStyle };
  editMode: boolean;
  activeIndex: number | null;
  toolbarBoldOn: boolean;
  toolbarColor: string;
  toolbarFontSize: string;
  colorPaletteOpen: boolean;
  sizePaletteOpen: boolean;
  colorPaletteUp: boolean;
  sizePaletteUp: boolean;
  colorPaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  sizePaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  registerEditorRef: (index: number, el: HTMLDivElement | null) => void;
  onBoxPointerDown: (index: number, e: PointerEvent<HTMLDivElement>) => void;
  onEditorBlur: (index: number) => void;
  onEditorMouseUp: (index: number) => void;
  onEditorKeyUp: (index: number, e: KeyboardEvent<HTMLDivElement>) => void;
  onEditorInput: (index: number) => void;
  onEditorFocus: (index: number) => void;
  openNoteForEdit: (index: number) => void;
  saveSelectionForIndex: (index: number) => void;
  captureDraftOnly: (index: number) => void;
  ensureSelectionForIndex: (index: number) => void;
  focusEditor: (index: number) => void;
  execCommand: (cmd: string, value?: string) => void;
  setColorPaletteOpen: Dispatch<SetStateAction<boolean>>;
  setSizePaletteOpen: Dispatch<SetStateAction<boolean>>;
  setToolbarBoldOn: Dispatch<SetStateAction<boolean>>;
  setToolbarColor: Dispatch<SetStateAction<string>>;
  setToolbarFontSize: Dispatch<SetStateAction<string>>;
  persistActiveNote: (index: number, stylePatch: Partial<SavedNoteStyle> | null, source: string) => void;
  reapplyTypingDefaults: (index: number, opts: { color?: string; fontSize?: string; bold?: boolean }) => void;
  updateNoteStyleDefaults: (index: number, patch: Partial<SavedNoteStyle>, source: string) => void;
  requestDeleteNote: (index: number) => void;
  onHandlePointerDown: (index: number, dir: string, e: PointerEvent<HTMLDivElement>) => void;
  doc: Document | null;
};

export type NoteCardDerived = {
  style: SavedNoteStyle;
  isActive: boolean;
  noteHtml: string;
  hasText: boolean;
  baseFontPx: string;
  baseTextColor: string;
};

export function readNoteCardDerived(
  props: Pick<NoteCardProps, 'note' | 'editMode' | 'activeIndex' | 'index'>
): NoteCardDerived {
  const { note, editMode, activeIndex, index } = props;
  const style: SavedNoteStyle = note?.style ?? {};
  const isActive = editMode && activeIndex === index;
  const noteHtml = String(note && note.text ? note.text : '');
  const hasText = !isEmptyHtml(noteHtml);
  const { baseFontPx, baseTextColor } = readNotesCardFormatting(style);

  return {
    style,
    isActive,
    noteHtml,
    hasText,
    baseFontPx,
    baseTextColor,
  };
}
