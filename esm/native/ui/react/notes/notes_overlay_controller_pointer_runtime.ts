import type { MutableRefObject } from 'react';

import type { SavedNote } from '../../../../../types';
import type { ReadSavedNoteStyle } from './notes_overlay_editor_state.js';
import { MIN_CREATE, type Interaction, type Rect } from './notes_overlay_helpers_shared.js';
import { getDoorOpen, getUiNotesNamespace, type NotesOverlayApp } from './notes_overlay_helpers_services.js';
import {
  applyInteractionToDraftNotes,
  buildRectFromPoints,
  createEmptyNoteFromRect,
  createHandleNoteInteraction,
  finalizeInteractionDraftNotes,
  readSavedNoteBounds,
} from './notes_overlay_controller_interactions_shared.js';

export type PointerPoint = { x: number; y: number };

export type NotesOverlayInteractionRefs = {
  createLastPointRef: MutableRefObject<PointerPoint | null>;
  interactionBaseNotesRef: MutableRefObject<SavedNote[] | null>;
  interactionStartNotesRef: MutableRefObject<SavedNote[] | null>;
};

export type BeginNoteInteractionArgs = {
  draftNotes: SavedNote[];
  draftNotesRef: MutableRefObject<SavedNote[]>;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  index: number;
  readSavedNoteStyle: ReadSavedNoteStyle;
  point: PointerPoint;
  pointerId: number;
  refs: NotesOverlayInteractionRefs;
};

export type FinalizeCreateArgs = {
  App: NotesOverlayApp;
  interaction: Extract<Interaction, { kind: 'create' }>;
  endPoint: PointerPoint | null;
  draftNotes: SavedNote[];
  draftNotesRef: MutableRefObject<SavedNote[]>;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  refs: NotesOverlayInteractionRefs;
};

export type FinalizeCreateResult = {
  rect: Rect | null;
  nextDraft: SavedNote[] | null;
  shouldExitDrawMode: boolean;
};

export type FinalizePointerInteractionArgs = {
  draftNotes: SavedNote[];
  draftNotesRef: MutableRefObject<SavedNote[]>;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  refs: NotesOverlayInteractionRefs;
};

export type FinalizePointerInteractionResult = {
  nextDraft: SavedNote[];
  shouldCommit: boolean;
};

export function resetPointerInteractionRefs(refs: NotesOverlayInteractionRefs): void {
  refs.createLastPointRef.current = null;
  refs.interactionBaseNotesRef.current = null;
  refs.interactionStartNotesRef.current = null;
}

export function clearPointerInteractionSnapshots(refs: NotesOverlayInteractionRefs): void {
  refs.interactionBaseNotesRef.current = null;
  refs.interactionStartNotesRef.current = null;
}

export function beginCreatePointerInteraction(
  point: PointerPoint,
  pointerId: number,
  refs: NotesOverlayInteractionRefs
): Interaction {
  resetPointerInteractionRefs(refs);
  refs.createLastPointRef.current = point;
  return { kind: 'create', startX: point.x, startY: point.y, pointerId };
}

export function readCreatePreviewRect(
  interaction: Extract<Interaction, { kind: 'create' }>,
  point: PointerPoint,
  refs: NotesOverlayInteractionRefs
): Rect {
  refs.createLastPointRef.current = point;
  return buildRectFromPoints(interaction.startX, interaction.startY, point.x, point.y);
}

export function finalizeCreatePointerInteraction(args: FinalizeCreateArgs): FinalizeCreateResult {
  const { App, interaction, endPoint, draftNotes, draftNotesRef, captureEditorsIntoNotes, refs } = args;
  const end = refs.createLastPointRef.current || endPoint;
  resetPointerInteractionRefs(refs);
  if (!end) return { rect: null, nextDraft: null, shouldExitDrawMode: false };

  const rect = buildRectFromPoints(interaction.startX, interaction.startY, end.x, end.y);
  if (rect.width < MIN_CREATE || rect.height < MIN_CREATE) {
    try {
      const uiNotes = getUiNotesNamespace(App);
      if (uiNotes && typeof uiNotes.exitScreenDrawMode === 'function') uiNotes.exitScreenDrawMode();
    } catch {
      // caller already wraps non-fatal reporting
    }
    return { rect, nextDraft: null, shouldExitDrawMode: true };
  }

  const doorsOpen = getDoorOpen(App);
  const base = draftNotesRef.current || draftNotes;
  return {
    rect,
    nextDraft: [...captureEditorsIntoNotes(base), createEmptyNoteFromRect(rect, doorsOpen)],
    shouldExitDrawMode: false,
  };
}

export function beginNotePointerInteraction(args: BeginNoteInteractionArgs): {
  base: SavedNote[];
  interaction: Extract<Interaction, { kind: 'move' }>;
} | null {
  const {
    draftNotes,
    draftNotesRef,
    captureEditorsIntoNotes,
    index,
    readSavedNoteStyle,
    point,
    pointerId,
    refs,
  } = args;
  const currentDraft = draftNotesRef.current || draftNotes;
  const base = captureEditorsIntoNotes(currentDraft);
  refs.interactionBaseNotesRef.current = base;
  refs.interactionStartNotesRef.current = base;
  const note = base[index];
  if (!note) return null;
  const bounds = readSavedNoteBounds(readSavedNoteStyle(note));
  return {
    base,
    interaction: {
      kind: 'move',
      index,
      startX: point.x,
      startY: point.y,
      startLeft: bounds.left,
      startTop: bounds.top,
      pointerId,
    },
  };
}

export function beginHandlePointerInteraction(args: BeginNoteInteractionArgs & { dir: string }): {
  base: SavedNote[];
  interaction: Exclude<Interaction, { kind: 'create' }>;
} | null {
  const {
    draftNotes,
    draftNotesRef,
    captureEditorsIntoNotes,
    index,
    readSavedNoteStyle,
    point,
    pointerId,
    refs,
    dir,
  } = args;
  const currentDraft = draftNotesRef.current || draftNotes;
  const base = captureEditorsIntoNotes(currentDraft);
  refs.interactionBaseNotesRef.current = base;
  refs.interactionStartNotesRef.current = base;
  const note = base[index];
  if (!note) return null;
  const bounds = readSavedNoteBounds(readSavedNoteStyle(note));
  return {
    base,
    interaction: createHandleNoteInteraction({
      index,
      dir,
      startX: point.x,
      startY: point.y,
      pointerId,
      bounds,
    }),
  };
}

export function updatePointerInteractionDraft(
  interaction: Exclude<Interaction, { kind: 'create' }>,
  point: PointerPoint,
  draftNotes: SavedNote[],
  draftNotesRef: MutableRefObject<SavedNote[]>,
  refs: NotesOverlayInteractionRefs
): SavedNote[] {
  const base = refs.interactionBaseNotesRef.current || draftNotesRef.current || draftNotes;
  const next = applyInteractionToDraftNotes(base, interaction, point);
  if (next !== base) refs.interactionBaseNotesRef.current = next;
  return next;
}

export function finalizePointerInteractionDraft(
  args: FinalizePointerInteractionArgs
): FinalizePointerInteractionResult {
  const { draftNotes, draftNotesRef, captureEditorsIntoNotes, refs } = args;
  const base = refs.interactionBaseNotesRef.current || draftNotesRef.current || draftNotes;
  const result = finalizeInteractionDraftNotes({
    startNotes: refs.interactionStartNotesRef.current,
    currentNotes: base,
    fallbackNotes: draftNotes,
    captureEditorsIntoNotes,
  });
  clearPointerInteractionSnapshots(refs);
  return result;
}
