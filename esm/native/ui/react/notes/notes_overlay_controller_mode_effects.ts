import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { SavedNote } from '../../../../../types';
import {
  ensureNotesNamespace,
  exitNotesDrawMode,
  notesOverlayReportNonFatal,
  readPrimaryModeId,
  setNotesOrbitControlsEnabled,
  type Interaction,
} from './notes_overlay_helpers.js';
import { readNotesToolbarFormatting } from './notes_overlay_text_style_runtime.js';
import { getUiFeedback, setNotesScreenDrawMode } from '../../../services/api.js';
import { toggleBodyClass, toggleElementClass } from '../../dom_helpers.js';
import type { EnsureNotesDrawState, EnsureNotesRuntimeState } from './notes_overlay_controller_types.js';
import { reconcileDraftNotesWithNormalized } from './notes_overlay_editor_state.js';
import { isNotesOverlayCommitSuppressed } from './notes_overlay_editor_notes_runtime.js';
import type { ReadSavedNoteStyle } from './notes_overlay_editor_state.js';

type UseNotesOverlayControllerModeEffectsArgs = {
  App: import('./notes_overlay_helpers.js').NotesOverlayApp;
  doc: Document | null;
  viewerContainer: HTMLElement | null;
  notesEnabled: boolean;
  normalized: SavedNote[];
  draftNotes: SavedNote[];
  interaction: Interaction | null;
  editMode: boolean;
  activeIndex: number | null;
  ensureNotesRuntimeState: EnsureNotesRuntimeState;
  ensureNotesDrawState: EnsureNotesDrawState;
  readSavedNoteStyle: ReadSavedNoteStyle;
  setEditMode: Dispatch<SetStateAction<boolean>>;
  setDraftNotes: Dispatch<SetStateAction<SavedNote[]>>;
  setColorPaletteOpen: Dispatch<SetStateAction<boolean>>;
  setSizePaletteOpen: Dispatch<SetStateAction<boolean>>;
  setToolbarColor: Dispatch<SetStateAction<string>>;
  setToolbarFontSize: Dispatch<SetStateAction<string>>;
  preExitDrawModeCommitRef: MutableRefObject<(() => void) | null>;
  skipNextExitCleanupRef: MutableRefObject<boolean>;
  prevEditModeRef: MutableRefObject<boolean>;
};

export function useNotesOverlayControllerModeEffects(args: UseNotesOverlayControllerModeEffectsArgs): void {
  const {
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
    readSavedNoteStyle,
    setEditMode,
    setDraftNotes,
    setColorPaletteOpen,
    setSizePaletteOpen,
    setToolbarColor,
    setToolbarFontSize,
    preExitDrawModeCommitRef,
    skipNextExitCleanupRef,
    prevEditModeRef,
  } = args;

  useEffect(() => {
    if (editMode) return;
    if (interaction) return;
    setDraftNotes(prev => reconcileDraftNotesWithNormalized(prev, normalized));
  }, [normalized, interaction, editMode, setDraftNotes]);

  useEffect(() => {
    const prev = prevEditModeRef.current;
    prevEditModeRef.current = editMode;
    if (!prev && editMode) {
      setDraftNotes(prevDraft => reconcileDraftNotesWithNormalized(prevDraft, normalized));
    }
  }, [editMode, normalized, setDraftNotes, prevEditModeRef]);

  useEffect(() => {
    if (!editMode || activeIndex == null) {
      setColorPaletteOpen(false);
      setSizePaletteOpen(false);
      return;
    }
    setColorPaletteOpen(false);
    setSizePaletteOpen(false);
  }, [editMode, activeIndex, setColorPaletteOpen, setSizePaletteOpen]);

  useEffect(() => {
    if (!editMode || activeIndex == null) return;
    const formatting = readNotesToolbarFormatting(readSavedNoteStyle(draftNotes[activeIndex]));
    setToolbarColor(formatting.color);
    setToolbarFontSize(formatting.fontSizeUi);
  }, [editMode, activeIndex, draftNotes, readSavedNoteStyle, setToolbarColor, setToolbarFontSize]);

  useEffect(() => {
    if (!viewerContainer) return;
    try {
      toggleElementClass(viewerContainer, 'notes-hidden', !notesEnabled);
    } catch (__wpErr) {
      notesOverlayReportNonFatal('CTRL_viewerClass', __wpErr);
    }
  }, [viewerContainer, notesEnabled]);

  useEffect(() => {
    const notes = ensureNotesNamespace(App);
    const rt = ensureNotesRuntimeState(notes);
    const prevEnter = rt.onEnterDrawMode;
    const prevExit = rt.onExitDrawMode;

    rt.onEnterDrawMode = () => {
      try {
        if (typeof prevEnter === 'function') prevEnter();
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_enterMode', __wpErr);
      }
      setEditMode(true);
    };

    rt.onExitDrawMode = () => {
      try {
        if (typeof prevExit === 'function') prevExit();
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_exitModePrev', __wpErr);
      }
      let suppressExitCommit = false;
      try {
        suppressExitCommit = isNotesOverlayCommitSuppressed(App);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_exitModeSuppressCheck', __wpErr);
      }

      if (suppressExitCommit) {
        skipNextExitCleanupRef.current = true;
      } else {
        try {
          const fn = preExitDrawModeCommitRef.current;
          if (typeof fn === 'function') fn();
        } catch (__wpErr) {
          notesOverlayReportNonFatal('CTRL_exitModeCommit', __wpErr);
        }
      }
      setEditMode(false);
    };

    return () => {
      if (prevEnter === undefined) delete rt.onEnterDrawMode;
      else rt.onEnterDrawMode = prevEnter;
      if (prevExit === undefined) delete rt.onExitDrawMode;
      else rt.onExitDrawMode = prevExit;
    };
  }, [App, ensureNotesRuntimeState, preExitDrawModeCommitRef, skipNextExitCleanupRef, setEditMode]);

  useEffect(() => {
    try {
      setNotesScreenDrawMode(App, !!editMode);
    } catch (__wpErr) {
      notesOverlayReportNonFatal('CTRL_drawFlag', __wpErr);
    }
  }, [App, editMode]);

  useEffect(() => {
    if (!doc || !doc.body) return;

    try {
      toggleBodyClass(doc, 'is-drawing', !!editMode);
    } catch (__wpErr) {
      notesOverlayReportNonFatal('CTRL_bodyClass', __wpErr);
    }

    try {
      const uiFeedback = getUiFeedback(App);
      if (editMode && notesEnabled) {
        uiFeedback.updateEditStateToast?.('מצב הערות - גרור ריבוע על המסך', true);
      } else {
        let primary = 'none';
        try {
          primary = readPrimaryModeId(App);
        } catch {
          primary = 'none';
        }
        if (!primary || primary === 'none') uiFeedback.updateEditStateToast?.(null, false);
      }
    } catch (__wpErr) {
      notesOverlayReportNonFatal('CTRL_toast', __wpErr);
    }

    try {
      setNotesOrbitControlsEnabled(App, !editMode);
    } catch (__wpErr) {
      notesOverlayReportNonFatal('CTRL_orbit', __wpErr);
    }

    if (!notesEnabled && editMode) {
      try {
        exitNotesDrawMode(App);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_exitHidden', __wpErr);
      }
    }

    return () => {
      try {
        toggleBodyClass(doc, 'is-drawing', false);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_bodyCleanup', __wpErr);
      }
      try {
        setNotesOrbitControlsEnabled(App, true);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_orbitCleanup', __wpErr);
      }
    };
  }, [doc, App, editMode, notesEnabled]);
}
