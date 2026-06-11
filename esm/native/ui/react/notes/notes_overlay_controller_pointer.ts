import { useMemo } from 'react';
import type { PointerEvent } from 'react';

import { useNotesOverlayCreatePointerWorkflow } from './notes_overlay_controller_pointer_create.js';
import { useNotesOverlayEditPointerWorkflow } from './notes_overlay_controller_pointer_edit.js';
import {
  readNotesOverlayInteractionRefs,
  type NotesOverlayPointerWorkflowArgs,
} from './notes_overlay_controller_pointer_shared.js';

export function useNotesOverlayPointerWorkflows(args: NotesOverlayPointerWorkflowArgs) {
  const {
    App,
    editMode,
    notesEnabled,
    overlayRef,
    draftNotes,
    draftNotesRef,
    interaction,
    setInteraction,
    setDraftNotes,
    setCreatingRect,
    setActive,
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
  } = args;

  const interactionRefs = useMemo(
    () =>
      readNotesOverlayInteractionRefs({
        createLastPointRef,
        interactionBaseNotesRef,
        interactionStartNotesRef,
      }),
    [createLastPointRef, interactionBaseNotesRef, interactionStartNotesRef]
  );

  const createWorkflow = useNotesOverlayCreatePointerWorkflow({
    App,
    editMode,
    notesEnabled,
    overlayRef,
    draftNotes,
    draftNotesRef,
    interaction,
    setInteraction,
    setDraftNotes,
    setCreatingRect,
    setActive,
    getOverlayPoint,
    readPointerEventTarget,
    captureEditorsIntoNotes,
    commitNotes,
    suppressNextClickRef,
    interactionRefs,
  });

  const editWorkflow = useNotesOverlayEditPointerWorkflow({
    editMode,
    notesEnabled,
    overlayRef,
    draftNotes,
    draftNotesRef,
    interaction,
    setInteraction,
    setDraftNotes,
    setCreatingRect,
    setActive,
    getOverlayPoint,
    readPointerEventTarget,
    readSavedNoteStyle,
    captureEditorsIntoNotes,
    commitNotes,
    suppressNextClickRef,
    ignoreOutsideClickUntilRef,
    interactionBaseNotesRef,
    interactionRefs,
  });

  return {
    onOverlayPointerDown: createWorkflow.onOverlayPointerDown,
    onOverlayPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      createWorkflow.onOverlayPointerMoveCreate(e);
      editWorkflow.onOverlayPointerMoveAny(e);
    },
    onOverlayPointerUp: (e: PointerEvent<HTMLDivElement>) => {
      createWorkflow.onOverlayPointerUpCreate(e);
      editWorkflow.onOverlayPointerUpAny(e);
    },
    onBoxPointerDown: editWorkflow.onBoxPointerDown,
    onHandlePointerDown: editWorkflow.onHandlePointerDown,
  };
}
