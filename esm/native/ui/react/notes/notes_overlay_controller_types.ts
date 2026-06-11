import type {
  Dispatch,
  KeyboardEvent,
  MouseEvent,
  MutableRefObject,
  PointerEvent,
  SetStateAction,
} from 'react';

import type { TimeoutHandleLike } from '../../../../../types';

import type { AppContainer, SavedNote, SavedNoteStyle, UiFeedbackNamespaceLike } from '../../../../../types';
import {
  ensureNotesNamespace,
  type Interaction,
  type NotesOverlayApp,
  type NotesDrawLike,
  type NotesRuntimeLike,
  type Rect,
} from './notes_overlay_helpers.js';
import type {
  ReadPointerEventTarget,
  ReadSavedNoteStyle,
  SelectionOffsets,
} from './notes_overlay_editor_state.js';
import type { ReadPaletteAnchorElement } from './notes_overlay_controller_interactions_shared.js';
import type { NotesEditorAsyncStateRef } from './notes_overlay_editor_async.js';

export type EnsureNotesRuntimeState = (notes: ReturnType<typeof ensureNotesNamespace>) => NotesRuntimeLike;
export type EnsureNotesDrawState = (notes: ReturnType<typeof ensureNotesNamespace>) => NotesDrawLike;

export type UseNotesOverlayControllerArgs = {
  App: NotesOverlayApp;
  app: AppContainer;
  fb: UiFeedbackNamespaceLike | null | undefined;
  doc: Document | null;
  viewerContainer: HTMLElement | null;
  notesEnabled: boolean;
  normalized: SavedNote[];
  ensureNotesRuntimeState: EnsureNotesRuntimeState;
  ensureNotesDrawState: EnsureNotesDrawState;
  readSavedNoteStyle: ReadSavedNoteStyle;
  readPointerEventTarget: ReadPointerEventTarget;
  readPaletteAnchorElement: ReadPaletteAnchorElement;
};

export type NotesOverlayController = {
  editMode: boolean;
  activeIndex: number | null;
  interaction: Interaction | null;
  draftNotes: SavedNote[];
  creatingRect: Rect | null;
  toolbarBoldOn: boolean;
  toolbarColor: string;
  toolbarFontSize: string;
  colorPaletteOpen: boolean;
  sizePaletteOpen: boolean;
  colorPaletteUp: boolean;
  sizePaletteUp: boolean;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  colorPaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  sizePaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  registerEditorRef: (index: number, el: HTMLDivElement | null) => void;
  onOverlayPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onOverlayPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onOverlayPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  onOverlayClick: (e: MouseEvent<HTMLDivElement>) => void;
  noteCardProps: {
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
    reapplyTypingDefaults: (
      index: number,
      opts: { color?: string; fontSize?: string; bold?: boolean }
    ) => void;
    updateNoteStyleDefaults: (index: number, patch: Partial<SavedNoteStyle>, source: string) => void;
    requestDeleteNote: (index: number) => void;
    onHandlePointerDown: (index: number, dir: string, e: PointerEvent<HTMLDivElement>) => void;
    doc: Document | null;
  };
};

export type NotesOverlayControllerState = {
  editMode: boolean;
  setEditMode: Dispatch<SetStateAction<boolean>>;
  activeIndex: number | null;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
  draftNotes: SavedNote[];
  setDraftNotes: Dispatch<SetStateAction<SavedNote[]>>;
  interaction: Interaction | null;
  setInteraction: Dispatch<SetStateAction<Interaction | null>>;
  creatingRect: Rect | null;
  setCreatingRect: Dispatch<SetStateAction<Rect | null>>;
  colorPaletteOpen: boolean;
  setColorPaletteOpen: Dispatch<SetStateAction<boolean>>;
  sizePaletteOpen: boolean;
  setSizePaletteOpen: Dispatch<SetStateAction<boolean>>;
  colorPaletteUp: boolean;
  setColorPaletteUp: Dispatch<SetStateAction<boolean>>;
  sizePaletteUp: boolean;
  setSizePaletteUp: Dispatch<SetStateAction<boolean>>;
  toolbarColor: string;
  setToolbarColor: Dispatch<SetStateAction<string>>;
  toolbarFontSize: string;
  setToolbarFontSize: Dispatch<SetStateAction<string>>;
  toolbarBoldOn: boolean;
  setToolbarBoldOn: Dispatch<SetStateAction<boolean>>;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  editorRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  colorPaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  sizePaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  draftNotesRef: MutableRefObject<SavedNote[]>;
  editorFocusAsyncStateRef: NotesEditorAsyncStateRef;
  editorSelectionAsyncStateRef: NotesEditorAsyncStateRef;
  typingCommitTimerRef: MutableRefObject<TimeoutHandleLike | null>;
  typingCommitTokenRef: MutableRefObject<number>;
  selectionOffsetsRef: MutableRefObject<Array<SelectionOffsets | null>>;
  preExitDrawModeCommitRef: MutableRefObject<(() => void) | null>;
  suppressNextClickRef: MutableRefObject<boolean>;
  ignoreOutsideClickUntilRef: MutableRefObject<number>;
  createLastPointRef: MutableRefObject<{ x: number; y: number } | null>;
  interactionBaseNotesRef: MutableRefObject<SavedNote[] | null>;
  interactionStartNotesRef: MutableRefObject<SavedNote[] | null>;
  prevEditModeRef: MutableRefObject<boolean>;
  prevEditModeCleanupRef: MutableRefObject<boolean>;
  registerEditorRef: (index: number, el: HTMLDivElement | null) => void;
};
