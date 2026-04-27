import { useCallback } from 'react';
import type { MutableRefObject, PointerEvent } from 'react';

import type { SavedNote } from '../../../../../types';
import type { Interaction, Rect } from './notes_overlay_helpers.js';
import type { ReadPointerEventTarget } from './notes_overlay_editor_state.js';
import {
  beginCreatePointerInteraction,
  finalizeCreatePointerInteraction,
  readCreatePreviewRect,
  type NotesOverlayInteractionRefs,
} from './notes_overlay_controller_pointer_runtime.js';
import {
  preventNotesPointerEvent,
  tryReleaseNotesPointerCapture,
  trySetNotesPointerCapture,
} from './notes_overlay_controller_pointer_shared.js';

type NotesOverlayCreatePointerWorkflowArgs = {
  App: Parameters<typeof finalizeCreatePointerInteraction>[0]['App'];
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
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  commitNotes: (next: SavedNote[], source: string) => void;
  suppressNextClickRef: MutableRefObject<boolean>;
  interactionRefs: NotesOverlayInteractionRefs;
};

export function useNotesOverlayCreatePointerWorkflow(args: NotesOverlayCreatePointerWorkflowArgs) {
  const {
    App,
    captureEditorsIntoNotes,
    commitNotes,
    draftNotes,
    draftNotesRef,
    editMode,
    getOverlayPoint,
    interaction,
    interactionRefs,
    notesEnabled,
    overlayRef,
    readPointerEventTarget,
    setActive,
    setCreatingRect,
    setDraftNotes,
    setInteraction,
    suppressNextClickRef,
  } = args;

  const finishCreate = useCallback(
    (clientX: number, clientY: number) => {
      if (!interaction || interaction.kind !== 'create') return;
      const result = finalizeCreatePointerInteraction({
        App,
        interaction,
        endPoint: getOverlayPoint(clientX, clientY),
        draftNotes,
        draftNotesRef,
        captureEditorsIntoNotes,
        refs: interactionRefs,
      });
      setInteraction(null);
      setCreatingRect(null);
      if (!result.nextDraft) return;
      setDraftNotes(result.nextDraft);
      commitNotes(result.nextDraft, 'react:notes:create');
      suppressNextClickRef.current = true;
      setActive(result.nextDraft.length - 1);
    },
    [
      App,
      captureEditorsIntoNotes,
      commitNotes,
      draftNotes,
      draftNotesRef,
      getOverlayPoint,
      interaction,
      interactionRefs,
      setActive,
      setCreatingRect,
      setDraftNotes,
      setInteraction,
      suppressNextClickRef,
    ]
  );

  const onOverlayPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!editMode || !notesEnabled) return;
      const target = readPointerEventTarget(e.target);
      if (
        target &&
        (target.closest('.annotation-box') ||
          target.closest('.floating-toolbar') ||
          target.closest('.resize-handle'))
      ) {
        return;
      }
      if (!overlayRef.current || typeof e.pointerId !== 'number') return;
      const point = getOverlayPoint(e.clientX, e.clientY);
      if (!point) return;
      trySetNotesPointerCapture(overlayRef.current, e.pointerId, 'CTRL_overlayDownCapture');
      setActive(null);
      setInteraction(beginCreatePointerInteraction(point, e.pointerId, interactionRefs));
      setCreatingRect({ left: point.x, top: point.y, width: 0, height: 0 });
      preventNotesPointerEvent(e, 'CTRL_overlayDown');
    },
    [
      editMode,
      getOverlayPoint,
      interactionRefs,
      notesEnabled,
      overlayRef,
      readPointerEventTarget,
      setActive,
      setCreatingRect,
      setInteraction,
    ]
  );

  const onOverlayPointerMoveCreate = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!interaction || interaction.kind !== 'create') return;
      const point = getOverlayPoint(e.clientX, e.clientY);
      if (!point) return;
      setCreatingRect(readCreatePreviewRect(interaction, point, interactionRefs));
      preventNotesPointerEvent(e, 'CTRL_overlayMoveCreate');
    },
    [getOverlayPoint, interaction, interactionRefs, setCreatingRect]
  );

  const onOverlayPointerUpCreate = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!interaction || interaction.kind !== 'create') return;
      tryReleaseNotesPointerCapture(overlayRef.current, interaction.pointerId, 'CTRL_overlayUpCreateCapture');
      finishCreate(e.clientX, e.clientY);
      preventNotesPointerEvent(e, 'CTRL_overlayUpCreate');
    },
    [finishCreate, interaction, overlayRef]
  );

  return {
    finishCreate,
    onOverlayPointerDown,
    onOverlayPointerMoveCreate,
    onOverlayPointerUpCreate,
  };
}
