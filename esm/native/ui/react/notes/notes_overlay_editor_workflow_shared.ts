import type { Dispatch, KeyboardEvent, MouseEvent, MutableRefObject, SetStateAction } from 'react';

import type { TimeoutHandleLike } from '../../../../../types';

import type { SavedNote, SavedNoteStyle, UiFeedbackNamespaceLike } from '../../../../../types';
import type { Interaction, NotesOverlayApp } from './notes_overlay_helpers.js';
import type { NotesEditorAsyncStateRef } from './notes_overlay_editor_async.js';
import type {
  ReadPointerEventTarget,
  ReadSavedNoteStyle,
  SelectionOffsetsRef,
} from './notes_overlay_editor_state.js';

export type UseNotesOverlayEditorWorkflowsArgs = {
  App: NotesOverlayApp;
  fb: UiFeedbackNamespaceLike | null | undefined;
  doc: Document | null;
  notesEnabled: boolean;
  editMode: boolean;
  activeIndex: number | null;
  interaction: Interaction | null;
  draftNotes: SavedNote[];
  editorRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  selectionOffsetsRef: SelectionOffsetsRef;
  draftNotesRef: MutableRefObject<SavedNote[]>;
  editorFocusAsyncStateRef: NotesEditorAsyncStateRef;
  editorSelectionAsyncStateRef: NotesEditorAsyncStateRef;
  typingCommitTimerRef: MutableRefObject<TimeoutHandleLike | null>;
  typingCommitTokenRef: MutableRefObject<number>;
  suppressNextClickRef: MutableRefObject<boolean>;
  ignoreOutsideClickUntilRef: MutableRefObject<number>;
  setEditMode: Dispatch<SetStateAction<boolean>>;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
  setDraftNotes: Dispatch<SetStateAction<SavedNote[]>>;
  setColorPaletteOpen: Dispatch<SetStateAction<boolean>>;
  setSizePaletteOpen: Dispatch<SetStateAction<boolean>>;
  setToolbarBoldOn: Dispatch<SetStateAction<boolean>>;
  setToolbarColor: Dispatch<SetStateAction<string>>;
  setToolbarFontSize: Dispatch<SetStateAction<string>>;
  readSavedNoteStyle: ReadSavedNoteStyle;
  readPointerEventTarget: ReadPointerEventTarget;
  clearDomSelection: () => void;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  commitNotes: (next: SavedNote[], source: string) => void;
};

export type NotesOverlayEditorWorkflows = {
  openNoteForEdit: (index: number) => void;
  saveSelectionForIndex: (index: number) => void;
  captureDraftOnly: (index: number) => void;
  ensureSelectionForIndex: (index: number) => void;
  focusEditor: (index: number) => void;
  execCommand: (cmd: string, value?: string) => void;
  persistActiveNote: (index: number, stylePatch: Partial<SavedNoteStyle> | null, source: string) => void;
  reapplyTypingDefaults: (index: number, opts: { color?: string; fontSize?: string; bold?: boolean }) => void;
  updateNoteStyleDefaults: (index: number, patch: Partial<SavedNoteStyle>, source: string) => void;
  requestDeleteNote: (index: number) => void;
  onOverlayClick: (e: MouseEvent<HTMLDivElement>) => void;
  onEditorBlur: (index: number) => void;
  onEditorMouseUp: (index: number) => void;
  onEditorKeyUp: (index: number, e: KeyboardEvent<HTMLDivElement>) => void;
  onEditorInput: (index: number) => void;
  onEditorFocus: (index: number) => void;
  setActive: (index: number | null) => void;
};

export type NotesOverlayEditorCore = Omit<
  NotesOverlayEditorWorkflows,
  'onOverlayClick' | 'onEditorBlur' | 'onEditorMouseUp' | 'onEditorKeyUp' | 'onEditorInput' | 'onEditorFocus'
> & {
  syncToolbarFromSelection: (index: number) => void;
  captureAndCommitDraft: (source: string) => void;
  captureActiveDraftIfDirty: (index: number) => void;
  scheduleTypingPersist: (source: string) => void;
};

export const NOTES_OVERLAY_IGNORE_SELECTOR = [
  '.annotation-box',
  '.floating-toolbar',
  '.resize-handle',
  '.color-palette',
  '.toolbar-color-container',
  '.size-palette',
  '.toolbar-size-container',
  '[data-notes-ui="1"]',
  '.editor',
  '.note-hit',
  '.note-hit-pad',
].join(',');

export const NOTES_OUTSIDE_POINTER_IGNORE_SELECTOR = [
  '.floating-toolbar',
  '.resize-handle',
  '.color-palette',
  '.toolbar-color-container',
  '[data-notes-ui="1"]',
].join(',');

export function isNotesUiTarget(target: HTMLElement | null, selector: string): boolean {
  return !!(target && target.closest(selector));
}
