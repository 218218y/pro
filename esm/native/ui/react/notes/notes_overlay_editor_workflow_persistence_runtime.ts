import type { TimeoutHandleLike } from '../../../../../types';
import type { SavedNote } from '../../../../../types';
import { getBrowserTimers } from '../../../services/api.js';
import { preserveEquivalentNoteSnapshot, removeNoteAtIndex } from './notes_overlay_editor_state.js';

export type NotesPersistenceAppLike = {
  deps?: {
    browser?: unknown;
  };
};

export type RefLike<T> = { current: T };

export type NotesTypingPersistScheduleArgs = {
  App: NotesPersistenceAppLike;
  editMode: boolean;
  activeIndex: number | null;
  typingCommitTimerRef: RefLike<TimeoutHandleLike | null>;
  typingCommitTokenRef: RefLike<number>;
  draftNotesRef: RefLike<SavedNote[]>;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
  commitNotes: (next: SavedNote[], source: string) => void;
  source: string;
};

export function clearNotesTypingPersist(
  App: NotesPersistenceAppLike,
  typingCommitTimerRef: RefLike<TimeoutHandleLike | null>,
  typingCommitTokenRef: RefLike<number>
): void {
  typingCommitTokenRef.current += 1;
  const handle = typingCommitTimerRef.current;
  typingCommitTimerRef.current = null;
  try {
    getBrowserTimers(App).clearTimeout(handle || undefined);
  } catch {
    // timer-cleanup-best-effort: clearing a stale typing timer must not block persistence teardown.
  }
}

export function scheduleNotesTypingPersist(args: NotesTypingPersistScheduleArgs): void {
  const { App, editMode, activeIndex, typingCommitTimerRef, typingCommitTokenRef } = args;

  if (!editMode || activeIndex == null) return;

  // Text editing history is committed only when the editor is left.  This function remains
  // as the input-event seam so older pending typing timers are cancelled, but it deliberately
  // does not create a delayed history/save checkpoint while the user is still typing.
  clearNotesTypingPersist(App, typingCommitTimerRef, typingCommitTokenRef);
}

export function prepareDeletedDraftNotes(args: {
  draftNotes: SavedNote[];
  index: number;
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
}): { next: SavedNote[]; deleted: boolean } {
  const { draftNotes, index, captureEditorsIntoNotes } = args;
  const captured = preserveEquivalentNoteSnapshot(
    draftNotes || [],
    captureEditorsIntoNotes(draftNotes || [])
  );
  const next = removeNoteAtIndex(captured, index);
  return {
    next,
    deleted: next !== captured,
  };
}
