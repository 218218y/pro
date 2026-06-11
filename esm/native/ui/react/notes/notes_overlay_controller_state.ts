import { useCallback, useEffect, useRef, useState } from 'react';

import type { TimeoutHandleLike } from '../../../../../types';

import type { SavedNote } from '../../../../../types';
import { getBrowserTimers } from '../../../services/api.js';
import { ensureNotesNamespace } from './notes_overlay_helpers.js';
import { clearNotesEditorAsync, createNotesEditorAsyncState } from './notes_overlay_editor_async.js';
import type { NotesOverlayControllerState } from './notes_overlay_controller_types.js';
import type { NotesOverlayApp } from './notes_overlay_helpers.js';

export function useNotesOverlayControllerState(args: {
  App: NotesOverlayApp;
  normalized: SavedNote[];
}): NotesOverlayControllerState {
  const { App, normalized } = args;

  const [editMode, setEditMode] = useState<boolean>(() => {
    try {
      const notes = ensureNotesNamespace(App);
      const draw = notes.draw || null;
      return !!(draw && draw.isScreenDrawMode);
    } catch {
      return false;
    }
  });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [draftNotes, setDraftNotes] = useState<SavedNote[]>(normalized);
  const [interaction, setInteraction] = useState<import('./notes_overlay_helpers.js').Interaction | null>(
    null
  );
  const [creatingRect, setCreatingRect] = useState<import('./notes_overlay_helpers.js').Rect | null>(null);
  const [colorPaletteOpen, setColorPaletteOpen] = useState<boolean>(false);
  const [sizePaletteOpen, setSizePaletteOpen] = useState<boolean>(false);
  const [colorPaletteUp, setColorPaletteUp] = useState<boolean>(false);
  const [sizePaletteUp, setSizePaletteUp] = useState<boolean>(false);
  const [toolbarColor, setToolbarColor] = useState<string>('#000000');
  const [toolbarFontSize, setToolbarFontSize] = useState<string>('3');
  const [toolbarBoldOn, setToolbarBoldOn] = useState<boolean>(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const editorRefs = useRef<Array<HTMLDivElement | null>>([]);
  const colorPaletteRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sizePaletteRefs = useRef<Array<HTMLDivElement | null>>([]);
  const draftNotesRef = useRef<SavedNote[]>(draftNotes);
  const editorFocusAsyncStateRef = useRef(createNotesEditorAsyncState());
  const editorSelectionAsyncStateRef = useRef(createNotesEditorAsyncState());
  const typingCommitTimerRef = useRef<TimeoutHandleLike | null>(null);
  const typingCommitTokenRef = useRef<number>(0);
  const selectionOffsetsRef = useRef<
    Array<import('./notes_overlay_editor_state.js').SelectionOffsets | null>
  >([]);
  const preExitDrawModeCommitRef = useRef<(() => void) | null>(null);
  const suppressNextClickRef = useRef<boolean>(false);
  const ignoreOutsideClickUntilRef = useRef<number>(0);
  const createLastPointRef = useRef<{ x: number; y: number } | null>(null);
  const interactionBaseNotesRef = useRef<SavedNote[] | null>(null);
  const interactionStartNotesRef = useRef<SavedNote[] | null>(null);
  const prevEditModeRef = useRef<boolean>(editMode);
  const prevEditModeCleanupRef = useRef<boolean>(editMode);

  const registerEditorRef = useCallback((index: number, el: HTMLDivElement | null) => {
    editorRefs.current[index] = el;
  }, []);

  useEffect(() => {
    draftNotesRef.current = draftNotes;
  }, [draftNotes]);

  useEffect(() => {
    return () => {
      try {
        const handle = typingCommitTimerRef.current;
        typingCommitTokenRef.current += 1;
        getBrowserTimers(App).clearTimeout(handle || undefined);
      } catch {
        // ignore
      }
      typingCommitTimerRef.current = null;

      try {
        clearNotesEditorAsync(App, editorFocusAsyncStateRef.current);
        clearNotesEditorAsync(App, editorSelectionAsyncStateRef.current);
      } catch {
        // ignore
      }
    };
  }, [App, editorFocusAsyncStateRef, editorSelectionAsyncStateRef]);

  return {
    editMode,
    setEditMode,
    activeIndex,
    setActiveIndex,
    draftNotes,
    setDraftNotes,
    interaction,
    setInteraction,
    creatingRect,
    setCreatingRect,
    colorPaletteOpen,
    setColorPaletteOpen,
    sizePaletteOpen,
    setSizePaletteOpen,
    colorPaletteUp,
    setColorPaletteUp,
    sizePaletteUp,
    setSizePaletteUp,
    toolbarColor,
    setToolbarColor,
    toolbarFontSize,
    setToolbarFontSize,
    toolbarBoldOn,
    setToolbarBoldOn,
    overlayRef,
    editorRefs,
    colorPaletteRefs,
    sizePaletteRefs,
    draftNotesRef,
    editorFocusAsyncStateRef,
    editorSelectionAsyncStateRef,
    typingCommitTimerRef,
    typingCommitTokenRef,
    selectionOffsetsRef,
    preExitDrawModeCommitRef,
    suppressNextClickRef,
    ignoreOutsideClickUntilRef,
    createLastPointRef,
    interactionBaseNotesRef,
    interactionStartNotesRef,
    prevEditModeRef,
    prevEditModeCleanupRef,
    registerEditorRef,
  };
}
