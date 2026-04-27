import { useCallback } from 'react';
import type { MutableRefObject, PointerEvent } from 'react';

import type { SavedNote } from '../../../../../types';
import type { Interaction, Rect } from './notes_overlay_helpers.js';
import type { ReadPointerEventTarget } from './notes_overlay_editor_state.js';
import {
  beginHandlePointerInteraction,
  beginNotePointerInteraction,
  finalizePointerInteractionDraft,
  type NotesOverlayInteractionRefs,
  updatePointerInteractionDraft,
} from './notes_overlay_controller_pointer_runtime.js';
import {
  preventNotesPointerEvent,
  tryReleaseNotesPointerCapture,
  trySetNotesPointerCapture,
} from './notes_overlay_controller_pointer_shared.js';

type NotesOverlayEditPointerWorkflowArgs = {
  editMode: boolean;
  notesEnabled: boolean;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  draftNotes: SavedNote[];
  draftNotesRef: MutableRefObject<SavedNote[]>;
  interaction: Interaction | null;
  setInteraction: (next: Interaction | null) => void;
  setDraftNotes: (next: SavedNote[]) => void;
  setCreatingRect: (next: Rect | null) => void;
  setActive: (index: number | null) => void;
  getOverlayPoint: (clientX: number, clientY: number) => { x: number; y: number } | null;
  readPointerEventTarget: ReadPointerEventTarget;
  readSavedNoteStyle: Parameters<typeof beginNotePointerInteraction>[0]['readSavedNoteStyle'];
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  commitNotes: (next: SavedNote[], source: string) => void;
  suppressNextClickRef: MutableRefObject<boolean>;
  ignoreOutsideClickUntilRef: MutableRefObject<number>;
  interactionBaseNotesRef: MutableRefObject<SavedNote[] | null>;
  interactionRefs: NotesOverlayInteractionRefs;
};

export function useNotesOverlayEditPointerWorkflow(args: NotesOverlayEditPointerWorkflowArgs) {
  const {
    captureEditorsIntoNotes,
    commitNotes,
    draftNotes,
    draftNotesRef,
    editMode,
    getOverlayPoint,
    ignoreOutsideClickUntilRef,
    interaction,
    interactionBaseNotesRef,
    interactionRefs,
    notesEnabled,
    overlayRef,
    readPointerEventTarget,
    readSavedNoteStyle,
    setActive,
    setCreatingRect,
    setDraftNotes,
    setInteraction,
    suppressNextClickRef,
  } = args;

  const endInteraction = useCallback(() => {
    if (!interaction || interaction.kind === 'create') return;
    suppressNextClickRef.current = true;
    ignoreOutsideClickUntilRef.current = Date.now() + 1200;
    const base = interactionBaseNotesRef.current || draftNotesRef.current || draftNotes;
    const { nextDraft, shouldCommit } = finalizePointerInteractionDraft({
      draftNotes,
      draftNotesRef,
      captureEditorsIntoNotes,
      refs: interactionRefs,
    });
    setInteraction(null);
    setCreatingRect(null);
    if (!shouldCommit) return;
    if (nextDraft !== base) setDraftNotes(nextDraft);
    commitNotes(nextDraft, 'react:notes:boxMoveResize');
  }, [
    captureEditorsIntoNotes,
    commitNotes,
    draftNotes,
    draftNotesRef,
    ignoreOutsideClickUntilRef,
    interaction,
    interactionBaseNotesRef,
    interactionRefs,
    setCreatingRect,
    setDraftNotes,
    setInteraction,
    suppressNextClickRef,
  ]);

  const onBoxPointerDown = useCallback(
    (index: number, e: PointerEvent<HTMLDivElement>) => {
      if (!editMode || !notesEnabled) return;
      const target = readPointerEventTarget(e.target);
      if (
        target &&
        (target.closest('.floating-toolbar') || target.closest('.resize-handle') || target.closest('.editor'))
      ) {
        return;
      }
      if (!overlayRef.current || typeof e.pointerId !== 'number') return;
      const point = getOverlayPoint(e.clientX, e.clientY);
      if (!point) return;
      setActive(index);
      suppressNextClickRef.current = true;
      ignoreOutsideClickUntilRef.current = Date.now() + 1200;
      const start = beginNotePointerInteraction({
        draftNotes,
        draftNotesRef,
        captureEditorsIntoNotes,
        index,
        readSavedNoteStyle,
        point,
        pointerId: e.pointerId,
        refs: interactionRefs,
      });
      if (!start) return;
      if (start.base !== (draftNotesRef.current || draftNotes)) setDraftNotes(start.base);
      setInteraction(start.interaction);
      trySetNotesPointerCapture(overlayRef.current, e.pointerId, 'CTRL_boxDownCapture');
      preventNotesPointerEvent(e, 'CTRL_boxDown');
    },
    [
      captureEditorsIntoNotes,
      draftNotes,
      draftNotesRef,
      editMode,
      getOverlayPoint,
      ignoreOutsideClickUntilRef,
      interactionRefs,
      notesEnabled,
      overlayRef,
      readPointerEventTarget,
      readSavedNoteStyle,
      setActive,
      setDraftNotes,
      setInteraction,
      suppressNextClickRef,
    ]
  );

  const onHandlePointerDown = useCallback(
    (index: number, dir: string, e: PointerEvent<HTMLDivElement>) => {
      if (!editMode || !notesEnabled) return;
      if (!overlayRef.current || typeof e.pointerId !== 'number') return;
      const point = getOverlayPoint(e.clientX, e.clientY);
      if (!point) return;
      setActive(index);
      suppressNextClickRef.current = true;
      ignoreOutsideClickUntilRef.current = Date.now() + 1200;
      const start = beginHandlePointerInteraction({
        draftNotes,
        draftNotesRef,
        captureEditorsIntoNotes,
        index,
        dir,
        readSavedNoteStyle,
        point,
        pointerId: e.pointerId,
        refs: interactionRefs,
      });
      if (!start) return;
      if (start.base !== (draftNotesRef.current || draftNotes)) setDraftNotes(start.base);
      setInteraction(start.interaction);
      trySetNotesPointerCapture(overlayRef.current, e.pointerId, 'CTRL_handleDownCapture');
      preventNotesPointerEvent(e, 'CTRL_handleDown');
    },
    [
      captureEditorsIntoNotes,
      draftNotes,
      draftNotesRef,
      editMode,
      getOverlayPoint,
      ignoreOutsideClickUntilRef,
      interactionRefs,
      notesEnabled,
      overlayRef,
      readSavedNoteStyle,
      setActive,
      setDraftNotes,
      setInteraction,
      suppressNextClickRef,
    ]
  );

  const onOverlayPointerMoveAny = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!interaction || interaction.kind === 'create') return;
      const point = getOverlayPoint(e.clientX, e.clientY);
      if (!point) return;
      const base = interactionBaseNotesRef.current || draftNotesRef.current || draftNotes;
      const next = updatePointerInteractionDraft(
        interaction,
        point,
        draftNotes,
        draftNotesRef,
        interactionRefs
      );
      if (next === base) return;
      setDraftNotes(next);
      preventNotesPointerEvent(e, 'CTRL_overlayMoveAny');
    },
    [
      draftNotes,
      draftNotesRef,
      getOverlayPoint,
      interaction,
      interactionBaseNotesRef,
      interactionRefs,
      setDraftNotes,
    ]
  );

  const onOverlayPointerUpAny = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!interaction || interaction.kind === 'create') return;
      tryReleaseNotesPointerCapture(overlayRef.current, interaction.pointerId, 'CTRL_overlayUpAnyCapture');
      endInteraction();
      preventNotesPointerEvent(e, 'CTRL_overlayUpAny');
    },
    [endInteraction, interaction, overlayRef]
  );

  return {
    endInteraction,
    onBoxPointerDown,
    onHandlePointerDown,
    onOverlayPointerMoveAny,
    onOverlayPointerUpAny,
  };
}
