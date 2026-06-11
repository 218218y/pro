import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { SavedNote } from '../../../../../types';
import { notesOverlayReportNonFatal } from './notes_overlay_helpers.js';
import {
  filterEmptyNotes,
  notesChanged,
  preserveEquivalentNoteSnapshot,
} from './notes_overlay_editor_state.js';

type UseNotesOverlayControllerCommitEffectsArgs = {
  editMode: boolean;
  draftNotes: SavedNote[];
  normalized: SavedNote[];
  setDraftNotes: Dispatch<SetStateAction<SavedNote[]>>;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
  setInteraction: Dispatch<SetStateAction<import('./notes_overlay_helpers.js').Interaction | null>>;
  setCreatingRect: Dispatch<SetStateAction<import('./notes_overlay_helpers.js').Rect | null>>;
  preExitDrawModeCommitRef: MutableRefObject<(() => void) | null>;
  createLastPointRef: MutableRefObject<{ x: number; y: number } | null>;
  prevEditModeCleanupRef: MutableRefObject<boolean>;
  clearDomSelection: () => void;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  commitNotes: (next: SavedNote[], source: string) => void;
};

export function useNotesOverlayControllerCommitEffects(
  args: UseNotesOverlayControllerCommitEffectsArgs
): void {
  const {
    editMode,
    draftNotes,
    normalized,
    setDraftNotes,
    setActiveIndex,
    setInteraction,
    setCreatingRect,
    preExitDrawModeCommitRef,
    createLastPointRef,
    prevEditModeCleanupRef,
    clearDomSelection,
    captureEditorsIntoNotes,
    commitNotes,
  } = args;

  useEffect(() => {
    preExitDrawModeCommitRef.current = () => {
      const captured = captureEditorsIntoNotes(draftNotes);
      const cleaned = preserveEquivalentNoteSnapshot(draftNotes, filterEmptyNotes(captured));
      setDraftNotes(prev => preserveEquivalentNoteSnapshot(prev, cleaned));
      if (notesChanged(cleaned, normalized)) commitNotes(cleaned, 'react:notes:exitDrawMode');
    };

    return () => {
      preExitDrawModeCommitRef.current = null;
    };
  }, [captureEditorsIntoNotes, draftNotes, normalized, commitNotes, preExitDrawModeCommitRef, setDraftNotes]);

  useEffect(() => {
    const prev = prevEditModeCleanupRef.current;
    prevEditModeCleanupRef.current = editMode;

    if (!prev || editMode) return;

    try {
      clearDomSelection();
    } catch (__wpErr) {
      notesOverlayReportNonFatal('CTRL_cleanupSelection', __wpErr);
    }

    setActiveIndex(null);
    setInteraction(null);
    setCreatingRect(null);
    createLastPointRef.current = null;

    const captured = captureEditorsIntoNotes(draftNotes);
    const cleaned = filterEmptyNotes(captured);
    if (!notesChanged(cleaned, normalized)) return;
    commitNotes(cleaned, 'react:notes:cleanup');
  }, [
    editMode,
    captureEditorsIntoNotes,
    draftNotes,
    normalized,
    commitNotes,
    clearDomSelection,
    createLastPointRef,
    prevEditModeCleanupRef,
    setActiveIndex,
    setInteraction,
    setCreatingRect,
  ]);
}
