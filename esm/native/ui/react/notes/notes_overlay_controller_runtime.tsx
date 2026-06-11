import { useCallback } from 'react';

import type { SavedNote } from '../../../../../types';
import { notesOverlayReportNonFatal } from './notes_overlay_helpers.js';
import { useNotesOverlayControllerEffects } from './notes_overlay_controller_effects.js';
import { useNotesOverlayEditorWorkflows } from './notes_overlay_editor_workflows.js';
import {
  captureEditorsIntoNotes as captureEditorsIntoNotesState,
  commitOverlayNotes,
} from './notes_overlay_editor_state.js';
import { useNotesOverlayPointerWorkflows } from './notes_overlay_controller_interactions.js';
import { useNotesOverlayControllerPalettes } from './notes_overlay_controller_palettes.js';
import { useNotesOverlayControllerState } from './notes_overlay_controller_state.js';
import type {
  NotesOverlayController,
  UseNotesOverlayControllerArgs,
} from './notes_overlay_controller_types.js';

export function useNotesOverlayController(args: UseNotesOverlayControllerArgs): NotesOverlayController {
  const {
    App,
    app,
    fb,
    doc,
    viewerContainer,
    notesEnabled,
    normalized,
    ensureNotesRuntimeState,
    ensureNotesDrawState,
    readSavedNoteStyle,
    readPointerEventTarget,
    readPaletteAnchorElement,
  } = args;

  const state = useNotesOverlayControllerState({ App, normalized });
  const {
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
  } = state;

  useNotesOverlayControllerPalettes({
    doc,
    viewerContainer,
    overlayRef,
    activeIndex,
    draftNotes,
    interaction,
    readPaletteAnchorElement,
    colorPaletteOpen,
    colorPaletteRefs,
    setColorPaletteUp,
    sizePaletteOpen,
    sizePaletteRefs,
    setSizePaletteUp,
  });

  const getOverlayPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = overlayRef.current || viewerContainer;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [overlayRef, viewerContainer]
  );

  const commitNotes = useCallback(
    (next: SavedNote[], source: string) => {
      try {
        commitOverlayNotes(App, app, next, source);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_commitNotes', __wpErr);
      }
    },
    [App, app]
  );

  const captureEditorsIntoNotes = useCallback(
    (base: SavedNote[]): SavedNote[] => {
      try {
        return captureEditorsIntoNotesState(App, editorRefs.current, base);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_captureEditors', __wpErr);
        return base;
      }
    },
    [App, editorRefs]
  );

  const clearDomSelection = useCallback(() => {
    try {
      const win = doc ? doc.defaultView : null;
      const sel = win && typeof win.getSelection === 'function' ? win.getSelection() : null;
      if (sel && typeof sel.removeAllRanges === 'function') sel.removeAllRanges();
    } catch (__wpErr) {
      notesOverlayReportNonFatal('CTRL_clearSelection', __wpErr);
    }
  }, [doc]);

  useNotesOverlayControllerEffects({
    App,
    doc,
    viewerContainer,
    notesEnabled,
    normalized,
    draftNotes,
    interaction,
    editMode,
    activeIndex,
    ensureNotesRuntimeState,
    ensureNotesDrawState,
    readSavedNoteStyle,
    setEditMode,
    setDraftNotes,
    setInteraction,
    setCreatingRect,
    setActiveIndex,
    setColorPaletteOpen,
    setSizePaletteOpen,
    setToolbarColor,
    setToolbarFontSize,
    preExitDrawModeCommitRef,
    createLastPointRef,
    prevEditModeRef,
    prevEditModeCleanupRef,
    clearDomSelection,
    captureEditorsIntoNotes,
    commitNotes,
  });

  const editorWorkflows = useNotesOverlayEditorWorkflows({
    App,
    fb,
    doc,
    notesEnabled,
    editMode,
    activeIndex,
    interaction,
    draftNotes,
    editorRefs,
    selectionOffsetsRef,
    draftNotesRef,
    editorFocusAsyncStateRef,
    editorSelectionAsyncStateRef,
    typingCommitTimerRef,
    typingCommitTokenRef,
    suppressNextClickRef,
    ignoreOutsideClickUntilRef,
    setEditMode,
    setActiveIndex,
    setDraftNotes,
    setColorPaletteOpen,
    setSizePaletteOpen,
    setToolbarBoldOn,
    setToolbarColor,
    setToolbarFontSize,
    readSavedNoteStyle,
    readPointerEventTarget,
    clearDomSelection,
    captureEditorsIntoNotes,
    commitNotes,
  });

  const pointerWorkflows = useNotesOverlayPointerWorkflows({
    App,
    editMode,
    notesEnabled,
    overlayRef,
    draftNotes,
    interaction,
    setInteraction,
    setDraftNotes,
    draftNotesRef,
    setCreatingRect,
    setActive: editorWorkflows.setActive,
    getOverlayPoint,
    readPointerEventTarget,
    readSavedNoteStyle,
    captureEditorsIntoNotes,
    commitNotes,
    suppressNextClickRef,
    ignoreOutsideClickUntilRef,
    createLastPointRef,
    interactionBaseNotesRef,
    interactionStartNotesRef,
  });

  return {
    editMode,
    activeIndex,
    interaction,
    draftNotes,
    creatingRect,
    toolbarBoldOn,
    toolbarColor,
    toolbarFontSize,
    colorPaletteOpen,
    sizePaletteOpen,
    colorPaletteUp,
    sizePaletteUp,
    overlayRef,
    colorPaletteRefs,
    sizePaletteRefs,
    registerEditorRef,
    onOverlayPointerDown: pointerWorkflows.onOverlayPointerDown,
    onOverlayPointerMove: pointerWorkflows.onOverlayPointerMove,
    onOverlayPointerUp: pointerWorkflows.onOverlayPointerUp,
    onOverlayClick: editorWorkflows.onOverlayClick,
    noteCardProps: {
      activeIndex,
      toolbarBoldOn,
      toolbarColor,
      toolbarFontSize,
      colorPaletteOpen,
      sizePaletteOpen,
      colorPaletteUp,
      sizePaletteUp,
      colorPaletteRefs,
      sizePaletteRefs,
      registerEditorRef,
      onBoxPointerDown: pointerWorkflows.onBoxPointerDown,
      onEditorBlur: editorWorkflows.onEditorBlur,
      onEditorMouseUp: editorWorkflows.onEditorMouseUp,
      onEditorKeyUp: editorWorkflows.onEditorKeyUp,
      onEditorInput: editorWorkflows.onEditorInput,
      onEditorFocus: editorWorkflows.onEditorFocus,
      openNoteForEdit: editorWorkflows.openNoteForEdit,
      saveSelectionForIndex: editorWorkflows.saveSelectionForIndex,
      captureDraftOnly: editorWorkflows.captureDraftOnly,
      ensureSelectionForIndex: editorWorkflows.ensureSelectionForIndex,
      focusEditor: editorWorkflows.focusEditor,
      execCommand: editorWorkflows.execCommand,
      setColorPaletteOpen,
      setSizePaletteOpen,
      setToolbarBoldOn,
      setToolbarColor,
      setToolbarFontSize,
      persistActiveNote: editorWorkflows.persistActiveNote,
      reapplyTypingDefaults: editorWorkflows.reapplyTypingDefaults,
      updateNoteStyleDefaults: editorWorkflows.updateNoteStyleDefaults,
      requestDeleteNote: editorWorkflows.requestDeleteNote,
      onHandlePointerDown: pointerWorkflows.onHandlePointerDown,
      doc,
    },
  };
}
