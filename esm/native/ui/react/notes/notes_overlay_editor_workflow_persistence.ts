import { useCallback } from 'react';

import type { SavedNoteStyle } from '../../../../../types';
import { scheduleNotesEditorNextFrame } from './notes_overlay_editor_async.js';
import { isEmptyHtml } from './notes_overlay_helpers_shared.js';
import { notesOverlayReportNonFatal } from './notes_overlay_helpers_shared.js';
import { readInnerHtml } from '../../dom_helpers.js';
import {
  applyStylePatchToNote,
  filterEmptyNotes,
  notesChanged,
  preserveEquivalentNoteSnapshot,
  type SelectionOffsets,
} from './notes_overlay_editor_state.js';
import type { UseNotesOverlayEditorWorkflowsArgs } from './notes_overlay_editor_workflow_shared.js';
import type { NotesOverlayEditorSelectionCore } from './notes_overlay_editor_workflow_selection.js';
import {
  clearNotesTypingPersist,
  prepareDeletedDraftNotes,
  scheduleNotesTypingPersist,
} from './notes_overlay_editor_workflow_persistence_runtime.js';

export type NotesOverlayEditorPersistenceCore = {
  captureAndCommitDraft: (source: string) => void;
  captureActiveDraftIfDirty: (index: number) => void;
  scheduleTypingPersist: (source: string) => void;
  captureDraftOnly: (index: number) => void;
  persistActiveNote: (index: number, stylePatch: Partial<SavedNoteStyle> | null, source: string) => void;
  updateNoteStyleDefaults: (index: number, patch: Partial<SavedNoteStyle>, source: string) => void;
  requestDeleteNote: (index: number) => void;
};

export function useNotesOverlayEditorWorkflowPersistence(
  args: UseNotesOverlayEditorWorkflowsArgs,
  selection: NotesOverlayEditorSelectionCore
): NotesOverlayEditorPersistenceCore {
  const {
    App,
    fb,
    editMode,
    activeIndex,
    draftNotes,
    editorRefs,
    draftNotesRef,
    editorSelectionAsyncStateRef,
    selectionOffsetsRef,
    typingCommitTimerRef,
    typingCommitTokenRef,
    suppressNextClickRef,
    ignoreOutsideClickUntilRef,
    setDraftNotes,
    setColorPaletteOpen,
    setSizePaletteOpen,
    captureEditorsIntoNotes,
    commitNotes,
  } = args;
  const { getSelectionOffsetsForIndex, restoreSelectionOffsetsForIndex, saveSelectionForIndex, setActive } =
    selection;

  const clearTypingCommitTimer = useCallback(() => {
    clearNotesTypingPersist(App, typingCommitTimerRef, typingCommitTokenRef);
  }, [App, typingCommitTimerRef, typingCommitTokenRef]);

  const captureAndCommitDraft = useCallback(
    (source: string) => {
      clearTypingCommitTimer();
      const base = draftNotesRef.current || draftNotes;
      const captured = preserveEquivalentNoteSnapshot(base, captureEditorsIntoNotes(base));
      const cleaned = preserveEquivalentNoteSnapshot(captured, filterEmptyNotes(captured));
      if (notesChanged(base, cleaned)) {
        draftNotesRef.current = cleaned;
        setDraftNotes(cleaned);
      }
      if (cleaned !== captured && activeIndex != null) setActive(null);
      commitNotes(cleaned, source);
    },
    [
      activeIndex,
      captureEditorsIntoNotes,
      clearTypingCommitTimer,
      draftNotes,
      draftNotesRef,
      commitNotes,
      setActive,
      setDraftNotes,
    ]
  );

  const scheduleSelectionRestore = useCallback(
    (index: number, off: SelectionOffsets | null, op: string) => {
      if (!off) return;
      try {
        scheduleNotesEditorNextFrame({
          App,
          state: editorSelectionAsyncStateRef.current,
          run: () => {
            restoreSelectionOffsetsForIndex(index, off);
            saveSelectionForIndex(index);
          },
          report: notesOverlayReportNonFatal,
          op,
        });
      } catch (__wpErr) {
        notesOverlayReportNonFatal(op, __wpErr);
      }
    },
    [App, editorSelectionAsyncStateRef, restoreSelectionOffsetsForIndex, saveSelectionForIndex]
  );

  const captureActiveDraftIfDirty = useCallback(
    (index: number) => {
      try {
        const el = editorRefs.current[index];
        if (!el) return;

        const base = draftNotesRef.current || draftNotes;
        const captured = preserveEquivalentNoteSnapshot(base, captureEditorsIntoNotes(base));
        const prevText = String((base && base[index] && base[index].text) || '');
        const nextText = String((captured && captured[index] && captured[index].text) || '');
        if (nextText === prevText) return;

        const off = getSelectionOffsetsForIndex(index) || selectionOffsetsRef.current[index] || null;

        draftNotesRef.current = captured;
        setDraftNotes(captured);

        scheduleSelectionRestore(index, off, 'CTRL_captureActiveDraftRestore');
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_captureActiveDraft', __wpErr);
      }
    },
    [
      draftNotes,
      draftNotesRef,
      editorRefs,
      captureEditorsIntoNotes,
      getSelectionOffsetsForIndex,
      selectionOffsetsRef,
      setDraftNotes,
      scheduleSelectionRestore,
    ]
  );

  const scheduleTypingPersist = useCallback(
    (source: string) => {
      scheduleNotesTypingPersist({
        App,
        editMode,
        activeIndex,
        typingCommitTimerRef,
        typingCommitTokenRef,
        draftNotesRef,
        captureEditorsIntoNotes,
        commitNotes,
        source,
      });
    },
    [
      App,
      editMode,
      activeIndex,
      typingCommitTimerRef,
      typingCommitTokenRef,
      draftNotesRef,
      captureEditorsIntoNotes,
      commitNotes,
    ]
  );

  const captureDraftOnly = useCallback(
    (index: number) => {
      const off = getSelectionOffsetsForIndex(index) || selectionOffsetsRef.current[index] || null;
      const base = draftNotesRef.current || draftNotes;
      const captured = preserveEquivalentNoteSnapshot(base, captureEditorsIntoNotes(base));
      if (captured !== base) {
        draftNotesRef.current = captured;
        setDraftNotes(captured);
      }

      scheduleSelectionRestore(index, off, 'CTRL_captureDraftOnlyRestore');
    },
    [
      captureEditorsIntoNotes,
      draftNotes,
      draftNotesRef,
      getSelectionOffsetsForIndex,
      selectionOffsetsRef,
      setDraftNotes,
      scheduleSelectionRestore,
    ]
  );

  const persistActiveNote = useCallback(
    (index: number, stylePatch: Partial<SavedNoteStyle> | null, _source: string) => {
      suppressNextClickRef.current = true;
      ignoreOutsideClickUntilRef.current = Date.now() + 1200;

      const off = getSelectionOffsetsForIndex(index) || selectionOffsetsRef.current[index] || null;
      const base = draftNotesRef.current || draftNotes;
      const captured = preserveEquivalentNoteSnapshot(base, captureEditorsIntoNotes(base));
      const next = stylePatch
        ? captured.map((note, noteIndex) =>
            noteIndex === index ? applyStylePatchToNote(note, stylePatch) : note
          )
        : captured;

      if (notesChanged(base, next)) {
        draftNotesRef.current = next;
        setDraftNotes(next);
      }

      scheduleSelectionRestore(index, off, 'CTRL_persistActiveRestore');
    },
    [
      draftNotes,
      draftNotesRef,
      captureEditorsIntoNotes,
      getSelectionOffsetsForIndex,
      selectionOffsetsRef,
      setDraftNotes,
      suppressNextClickRef,
      ignoreOutsideClickUntilRef,
      scheduleSelectionRestore,
    ]
  );

  const updateNoteStyleDefaults = useCallback(
    (index: number, patch: Partial<SavedNoteStyle>, source: string) => {
      try {
        const el = editorRefs.current[index];
        const liveHtml = el ? readInnerHtml(el) : String(draftNotes[index]?.text || '');
        const empty = isEmptyHtml(liveHtml);

        const stylePatch: Partial<SavedNoteStyle> = {};
        if (typeof patch.textColor === 'string' && patch.textColor) {
          stylePatch.textColor = patch.textColor;
          if (empty) stylePatch.baseTextColor = patch.textColor;
        }
        if (typeof patch.fontSize === 'string' && patch.fontSize) {
          stylePatch.fontSize = patch.fontSize;
          if (empty) stylePatch.baseFontSize = patch.fontSize;
        }
        setColorPaletteOpen(false);
        setSizePaletteOpen(false);
        persistActiveNote(index, stylePatch, source);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_styleDefaults', __wpErr);
      }
    },
    [editorRefs, draftNotes, setColorPaletteOpen, setSizePaletteOpen, persistActiveNote]
  );

  const requestDeleteNote = useCallback(
    (index: number) => {
      if (editMode && activeIndex === index) {
        clearTypingCommitTimer();
      }

      let deleted = false;
      try {
        const { next, deleted: shouldDelete } = prepareDeletedDraftNotes({
          draftNotes: draftNotes || [],
          index,
          captureEditorsIntoNotes,
        });
        deleted = shouldDelete;
        if (deleted) {
          draftNotesRef.current = next;
          setDraftNotes(next);
          commitNotes(next, 'react:notes:delete');
        }
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_delete', __wpErr);
      }

      if (!deleted) return;

      try {
        setColorPaletteOpen(false);
        setSizePaletteOpen(false);
        setActive(null);
      } catch {
        // local-ui-cleanup-best-effort: closing transient editor chrome must not invalidate the completed note deletion.
      }

      try {
        const showToast = typeof fb?.showToast === 'function' ? fb.showToast : null;
        const toast = !showToast && typeof fb?.toast === 'function' ? fb.toast : null;
        (showToast || toast)?.('הפתק נמחק', 'info');
      } catch {
        // feedback-best-effort: deletion toast failure must not invalidate the completed note deletion.
      }
    },
    [
      fb,
      editMode,
      activeIndex,
      clearTypingCommitTimer,
      draftNotes,
      draftNotesRef,
      captureEditorsIntoNotes,
      commitNotes,
      setDraftNotes,
      setColorPaletteOpen,
      setSizePaletteOpen,
      setActive,
    ]
  );

  return {
    captureAndCommitDraft,
    captureActiveDraftIfDirty,
    scheduleTypingPersist,
    captureDraftOnly,
    persistActiveNote,
    updateNoteStyleDefaults,
    requestDeleteNote,
  };
}
