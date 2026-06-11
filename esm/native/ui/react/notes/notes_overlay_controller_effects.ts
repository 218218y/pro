import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { SavedNote } from '../../../../../types';
import type { Interaction, NotesOverlayApp, Rect } from './notes_overlay_helpers.js';
import type { EnsureNotesDrawState, EnsureNotesRuntimeState } from './notes_overlay_controller_types.js';
import type { ReadSavedNoteStyle } from './notes_overlay_editor_state.js';
import { useNotesOverlayControllerCommitEffects } from './notes_overlay_controller_commit_effects.js';
import { useNotesOverlayControllerModeEffects } from './notes_overlay_controller_mode_effects.js';

type UseNotesOverlayControllerEffectsArgs = {
  App: NotesOverlayApp;
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
  setInteraction: Dispatch<SetStateAction<Interaction | null>>;
  setCreatingRect: Dispatch<SetStateAction<Rect | null>>;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
  setColorPaletteOpen: Dispatch<SetStateAction<boolean>>;
  setSizePaletteOpen: Dispatch<SetStateAction<boolean>>;
  setToolbarColor: Dispatch<SetStateAction<string>>;
  setToolbarFontSize: Dispatch<SetStateAction<string>>;
  preExitDrawModeCommitRef: MutableRefObject<(() => void) | null>;
  createLastPointRef: MutableRefObject<{ x: number; y: number } | null>;
  prevEditModeRef: MutableRefObject<boolean>;
  prevEditModeCleanupRef: MutableRefObject<boolean>;
  clearDomSelection: () => void;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  commitNotes: (next: SavedNote[], source: string) => void;
};

export function useNotesOverlayControllerEffects(args: UseNotesOverlayControllerEffectsArgs): void {
  useNotesOverlayControllerModeEffects(args);
  useNotesOverlayControllerCommitEffects({
    editMode: args.editMode,
    draftNotes: args.draftNotes,
    normalized: args.normalized,
    setDraftNotes: args.setDraftNotes,
    setActiveIndex: args.setActiveIndex,
    setInteraction: args.setInteraction,
    setCreatingRect: args.setCreatingRect,
    preExitDrawModeCommitRef: args.preExitDrawModeCommitRef,
    createLastPointRef: args.createLastPointRef,
    prevEditModeCleanupRef: args.prevEditModeCleanupRef,
    clearDomSelection: args.clearDomSelection,
    captureEditorsIntoNotes: args.captureEditorsIntoNotes,
    commitNotes: args.commitNotes,
  });
}
