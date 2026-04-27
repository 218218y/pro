import type { TimeoutHandleLike } from '../../../../../types';
import type { SavedNote } from '../../../../../types';
import { getBrowserTimers } from '../../../services/api.js';
import { notesOverlayReportNonFatal } from './notes_overlay_helpers_shared.js';
import {
  notesChanged,
  preserveEquivalentNoteSnapshot,
  removeNoteAtIndex,
} from './notes_overlay_editor_state.js';

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
    // ignore
  }
}

export function scheduleNotesTypingPersist(args: NotesTypingPersistScheduleArgs): void {
  const {
    App,
    editMode,
    activeIndex,
    typingCommitTimerRef,
    typingCommitTokenRef,
    draftNotesRef,
    captureEditorsIntoNotes,
    commitNotes,
    source,
  } = args;

  if (!editMode || activeIndex == null) return;

  clearNotesTypingPersist(App, typingCommitTimerRef, typingCommitTokenRef);

  const token = typingCommitTokenRef.current;
  const timers = getBrowserTimers(App);
  const handle = timers.setTimeout(() => {
    if (typingCommitTokenRef.current !== token || typingCommitTimerRef.current !== handle) return;
    typingCommitTimerRef.current = null;
    try {
      const base = draftNotesRef.current || [];
      const captured = preserveEquivalentNoteSnapshot(base, captureEditorsIntoNotes(base));
      if (!notesChanged(base, captured)) return;
      commitNotes(captured, source);
      draftNotesRef.current = captured;
    } catch (__wpErr) {
      notesOverlayReportNonFatal('CTRL_typingPersist', __wpErr);
    }
  }, 420);

  typingCommitTimerRef.current = handle;
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
