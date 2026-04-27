import type {
  NotesOverlayEditorCore,
  UseNotesOverlayEditorWorkflowsArgs,
} from './notes_overlay_editor_workflow_shared.js';
import { useNotesOverlayEditorWorkflowSelection } from './notes_overlay_editor_workflow_selection.js';
import { useNotesOverlayEditorWorkflowPersistence } from './notes_overlay_editor_workflow_persistence.js';
import { useNotesOverlayEditorWorkflowSession } from './notes_overlay_editor_workflow_session.js';

export function useNotesOverlayEditorWorkflowCore(
  args: UseNotesOverlayEditorWorkflowsArgs
): NotesOverlayEditorCore {
  const selection = useNotesOverlayEditorWorkflowSelection(args);
  const persistence = useNotesOverlayEditorWorkflowPersistence(args, selection);
  const session = useNotesOverlayEditorWorkflowSession(args, selection);

  return {
    ...session,
    saveSelectionForIndex: selection.saveSelectionForIndex,
    captureDraftOnly: persistence.captureDraftOnly,
    ensureSelectionForIndex: selection.ensureSelectionForIndex,
    focusEditor: selection.focusEditor,
    execCommand: selection.execCommand,
    persistActiveNote: persistence.persistActiveNote,
    reapplyTypingDefaults: session.reapplyTypingDefaults,
    updateNoteStyleDefaults: persistence.updateNoteStyleDefaults,
    requestDeleteNote: persistence.requestDeleteNote,
    setActive: selection.setActive,
    syncToolbarFromSelection: selection.syncToolbarFromSelection,
    captureAndCommitDraft: persistence.captureAndCommitDraft,
    captureActiveDraftIfDirty: persistence.captureActiveDraftIfDirty,
    scheduleTypingPersist: persistence.scheduleTypingPersist,
  };
}
