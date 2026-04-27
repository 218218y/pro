import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { SavedNoteStyle } from '../../../../../types';

export type NoteCardToolbarProps = {
  index: number;
  isActive: boolean;
  toolbarBoldOn: boolean;
  toolbarColor: string;
  toolbarFontSize: string;
  colorPaletteOpen: boolean;
  sizePaletteOpen: boolean;
  colorPaletteUp: boolean;
  sizePaletteUp: boolean;
  colorPaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  sizePaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
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
  doc: Document | null;
};

export type NoteToolbarColor = '#000000' | '#ef4444' | '#ffffff' | '#facc15';
export type NoteToolbarSize = '1' | '2' | '3' | '4' | '5';

export const NOTE_TOOLBAR_COLORS: readonly [
  NoteToolbarColor,
  NoteToolbarColor,
  NoteToolbarColor,
  NoteToolbarColor,
] = ['#000000', '#ef4444', '#ffffff', '#facc15'];
export const NOTE_TOOLBAR_SIZES: readonly [
  NoteToolbarSize,
  NoteToolbarSize,
  NoteToolbarSize,
  NoteToolbarSize,
  NoteToolbarSize,
] = ['1', '2', '3', '4', '5'];
