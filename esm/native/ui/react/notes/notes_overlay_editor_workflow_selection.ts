import { useCallback } from 'react';

import { notesOverlayReportNonFatal } from './notes_overlay_helpers.js';
import { clearNotesEditorAsync, scheduleNotesEditorNextFrame } from './notes_overlay_editor_async.js';
import {
  getSelectionOffsetsForEditor,
  readToolbarSelectionState,
  restoreSelectionOffsetsForEditor,
  type SelectionOffsets,
} from './notes_overlay_editor_state.js';
import type { UseNotesOverlayEditorWorkflowsArgs } from './notes_overlay_editor_workflow_shared.js';

export type NotesOverlayEditorSelectionCore = {
  getSelectionOffsetsForIndex(index: number): SelectionOffsets | null;
  restoreSelectionOffsetsForIndex(index: number, offsets: SelectionOffsets | null): void;
  saveSelectionForIndex(index: number): void;
  focusEditor(index: number): void;
  ensureSelectionForIndex(index: number): void;
  execCommand(cmd: string, value?: string): void;
  syncToolbarFromSelection(index: number): void;
  setActive(index: number | null): void;
};

export function useNotesOverlayEditorWorkflowSelection(
  args: UseNotesOverlayEditorWorkflowsArgs
): NotesOverlayEditorSelectionCore {
  const {
    App,
    doc,
    editMode,
    activeIndex,
    editorRefs,
    selectionOffsetsRef,
    setActiveIndex,
    editorFocusAsyncStateRef,
    setToolbarBoldOn,
    setToolbarColor,
    setToolbarFontSize,
    clearDomSelection,
  } = args;

  const getSelectionOffsetsForIndex = useCallback(
    (index: number): SelectionOffsets | null => getSelectionOffsetsForEditor(doc, editorRefs.current[index]),
    [doc, editorRefs]
  );

  const restoreSelectionOffsetsForIndex = useCallback(
    (index: number, offsets: SelectionOffsets | null) => {
      try {
        restoreSelectionOffsetsForEditor(doc, editorRefs.current[index], offsets);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_restoreSelection', __wpErr);
      }
    },
    [doc, editorRefs]
  );

  const saveSelectionForIndex = useCallback(
    (index: number) => {
      const off = getSelectionOffsetsForIndex(index);
      if (!off) return;
      selectionOffsetsRef.current[index] = off;
    },
    [getSelectionOffsetsForIndex, selectionOffsetsRef]
  );

  const focusEditor = useCallback(
    (index: number) => {
      try {
        const el = editorRefs.current[index];
        if (el) el.focus();
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_focusEditor', __wpErr);
      }
    },
    [editorRefs]
  );

  const ensureSelectionForIndex = useCallback(
    (index: number) => {
      const off = selectionOffsetsRef.current[index] || getSelectionOffsetsForIndex(index);
      restoreSelectionOffsetsForIndex(index, off || null);
    },
    [selectionOffsetsRef, getSelectionOffsetsForIndex, restoreSelectionOffsetsForIndex]
  );

  const execCommand = useCallback(
    (cmd: string, value?: string) => {
      try {
        if (!doc) return;
        doc.execCommand(cmd, false, value);
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_execCommand', __wpErr);
      }
    },
    [doc]
  );

  const syncToolbarFromSelection = useCallback(
    (index: number) => {
      if (!editMode) return;
      if (activeIndex == null || activeIndex !== index) return;
      try {
        const next = readToolbarSelectionState(doc, editorRefs.current[index]);
        if (!next) return;

        if (typeof next.bold === 'boolean') {
          setToolbarBoldOn(prev => (prev === next.bold ? prev : !!next.bold));
        }
        if (next.color) {
          const nextColor = String(next.color).toLowerCase();
          setToolbarColor(prev =>
            String(prev || '').toLowerCase() === nextColor ? prev : next.color || prev
          );
        }
        if (next.fontSizeUi) {
          setToolbarFontSize(prev => (prev === next.fontSizeUi ? prev : next.fontSizeUi || prev));
        }
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_syncToolbar', __wpErr);
      }
    },
    [doc, editMode, activeIndex, editorRefs, setToolbarBoldOn, setToolbarColor, setToolbarFontSize]
  );

  const setActive = useCallback(
    (index: number | null) => {
      clearDomSelection();
      setActiveIndex(index);
      if (index == null) {
        clearNotesEditorAsync(App, editorFocusAsyncStateRef.current);
        return;
      }

      try {
        scheduleNotesEditorNextFrame({
          App,
          state: editorFocusAsyncStateRef.current,
          run: () => {
            const el = editorRefs.current[index];
            if (el) el.focus();
          },
          report: notesOverlayReportNonFatal,
          op: 'CTRL_setActive',
        });
      } catch (__wpErr) {
        notesOverlayReportNonFatal('CTRL_setActive', __wpErr);
      }
    },
    [App, clearDomSelection, setActiveIndex, editorFocusAsyncStateRef, editorRefs]
  );

  return {
    getSelectionOffsetsForIndex,
    restoreSelectionOffsetsForIndex,
    saveSelectionForIndex,
    focusEditor,
    ensureSelectionForIndex,
    execCommand,
    syncToolbarFromSelection,
    setActive,
  };
}
