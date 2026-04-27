import type { Dispatch, MutableRefObject, PointerEvent, SetStateAction } from 'react';

import type { SavedNote } from '../../../../../types';
import {
  notesOverlayReportNonFatal,
  type Interaction,
  type NotesOverlayApp,
  type Rect,
} from './notes_overlay_helpers.js';
import type { ReadPointerEventTarget, ReadSavedNoteStyle } from './notes_overlay_editor_state.js';
import type { NotesOverlayInteractionRefs } from './notes_overlay_controller_pointer_runtime.js';

export type NotesOverlayPointerWorkflowArgs = {
  App: NotesOverlayApp;
  editMode: boolean;
  notesEnabled: boolean;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  draftNotes: SavedNote[];
  draftNotesRef: MutableRefObject<SavedNote[]>;
  interaction: Interaction | null;
  setInteraction: Dispatch<SetStateAction<Interaction | null>>;
  setDraftNotes: Dispatch<SetStateAction<SavedNote[]>>;
  setCreatingRect: Dispatch<SetStateAction<Rect | null>>;
  setActive: (index: number | null) => void;
  getOverlayPoint: (clientX: number, clientY: number) => { x: number; y: number } | null;
  readPointerEventTarget: ReadPointerEventTarget;
  readSavedNoteStyle: ReadSavedNoteStyle;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  commitNotes: (next: SavedNote[], source: string) => void;
  suppressNextClickRef: MutableRefObject<boolean>;
  ignoreOutsideClickUntilRef: MutableRefObject<number>;
  createLastPointRef: MutableRefObject<{ x: number; y: number } | null>;
  interactionBaseNotesRef: MutableRefObject<SavedNote[] | null>;
  interactionStartNotesRef: MutableRefObject<SavedNote[] | null>;
};

export function readNotesOverlayInteractionRefs(
  args: Pick<
    NotesOverlayPointerWorkflowArgs,
    'createLastPointRef' | 'interactionBaseNotesRef' | 'interactionStartNotesRef'
  >
): NotesOverlayInteractionRefs {
  return {
    createLastPointRef: args.createLastPointRef,
    interactionBaseNotesRef: args.interactionBaseNotesRef,
    interactionStartNotesRef: args.interactionStartNotesRef,
  };
}

export function preventNotesPointerEvent(
  event: Pick<PointerEvent<HTMLDivElement>, 'preventDefault' | 'stopPropagation'>,
  op: string
): void {
  try {
    event.preventDefault();
    event.stopPropagation();
  } catch (__wpErr) {
    notesOverlayReportNonFatal(op, __wpErr);
  }
}

export function trySetNotesPointerCapture(
  element: HTMLDivElement | null | undefined,
  pointerId: number,
  op: string
): void {
  try {
    element?.setPointerCapture(pointerId);
  } catch (__wpErr) {
    notesOverlayReportNonFatal(op, __wpErr);
  }
}

export function tryReleaseNotesPointerCapture(
  element: HTMLDivElement | null | undefined,
  pointerId: number,
  op: string
): void {
  try {
    element?.releasePointerCapture(pointerId);
  } catch (__wpErr) {
    notesOverlayReportNonFatal(op, __wpErr);
  }
}
