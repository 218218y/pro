import { useCallback } from 'react';

import { getUiNotesNamespace, notesOverlayReportNonFatal } from './notes_overlay_helpers.js';
import {
  applyNotesEditorFormattingDefaults,
  applyNotesEditorStyleDefaults,
} from './notes_overlay_text_style_runtime.js';
import { scheduleNotesEditorAfterPaint, scheduleNotesEditorNextFrame } from './notes_overlay_editor_async.js';
import type { UseNotesOverlayEditorWorkflowsArgs } from './notes_overlay_editor_workflow_shared.js';
import type { NotesOverlayEditorSelectionCore } from './notes_overlay_editor_workflow_selection.js';

export type NotesOverlayEditorSessionCore = {
  openNoteForEdit(index: number): void;
  reapplyTypingDefaults(index: number, opts: { color?: string; fontSize?: string; bold?: boolean }): void;
};

export function useNotesOverlayEditorWorkflowSession(
  args: UseNotesOverlayEditorWorkflowsArgs,
  selection: NotesOverlayEditorSelectionCore
): NotesOverlayEditorSessionCore {
  const {
    App,
    doc,
    notesEnabled,
    editMode,
    draftNotes,
    editorRefs,
    readSavedNoteStyle,
    setEditMode,
    setActiveIndex,
    editorFocusAsyncStateRef,
  } = args;
  const { ensureSelectionForIndex, focusEditor } = selection;

  const openNoteForEdit = useCallback(
    (index: number) => {
      if (!notesEnabled) return;
      setActiveIndex(index);

      if (!editMode) {
        try {
          const uiNotes = getUiNotesNamespace(App);
          if (uiNotes && typeof uiNotes.enterScreenDrawMode === 'function') uiNotes.enterScreenDrawMode();
          else setEditMode(true);
        } catch {
          setEditMode(true);
        }
      }

      try {
        scheduleNotesEditorNextFrame({
          App,
          state: editorFocusAsyncStateRef.current,
          run: () => {
            const win = doc && doc.defaultView ? doc.defaultView : null;
            const el = editorRefs.current[index];
            if (!win || !el) return;

            try {
              el.focus();
            } catch (__wpErr) {
              notesOverlayReportNonFatal('CTRL_openFocus', __wpErr);
            }

            try {
              const sel = win.getSelection ? win.getSelection() : null;
              if (!sel) return;
              const range = doc?.createRange ? doc.createRange() : null;
              if (!range) return;
              range.selectNodeContents(el);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);

              try {
                applyNotesEditorStyleDefaults(doc, readSavedNoteStyle(draftNotes[index]));
              } catch (__wpErr) {
                notesOverlayReportNonFatal('CTRL_openDefaults', __wpErr);
              }
            } catch (__wpErr) {
              notesOverlayReportNonFatal('CTRL_openSelection', __wpErr);
            }
          },
          report: notesOverlayReportNonFatal,
          op: 'CTRL_openNote',
        });
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_openNote', __wpErr);
      }
    },
    [
      App,
      notesEnabled,
      editMode,
      doc,
      draftNotes,
      editorRefs,
      readSavedNoteStyle,
      setEditMode,
      setActiveIndex,
      editorFocusAsyncStateRef,
    ]
  );

  const reapplyTypingDefaults = useCallback(
    (index: number, opts: { color?: string; fontSize?: string; bold?: boolean }) => {
      try {
        if (!doc) return;

        scheduleNotesEditorAfterPaint({
          App,
          state: editorFocusAsyncStateRef.current,
          run: () => {
            try {
              ensureSelectionForIndex(index);
            } catch (__wpErr) {
              notesOverlayReportNonFatal('CTRL_reapplySelection', __wpErr);
            }
            try {
              focusEditor(index);
            } catch (__wpErr) {
              notesOverlayReportNonFatal('CTRL_reapplyFocus', __wpErr);
            }
            try {
              applyNotesEditorFormattingDefaults(doc, opts);
            } catch (__wpErr) {
              notesOverlayReportNonFatal('CTRL_reapplyDefaults:formatting', __wpErr);
            }
          },
          report: notesOverlayReportNonFatal,
          op: 'CTRL_reapplyDefaults',
        });
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_reapplyDefaults', __wpErr);
      }
    },
    [App, doc, ensureSelectionForIndex, focusEditor, editorFocusAsyncStateRef]
  );

  return {
    openNoteForEdit,
    reapplyTypingDefaults,
  };
}
