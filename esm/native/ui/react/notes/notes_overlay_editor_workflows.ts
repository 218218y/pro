import { useNotesOverlayEditorWorkflowCore } from './notes_overlay_editor_workflow_core.js';
import { useNotesOverlayEditorWorkflowEvents } from './notes_overlay_editor_workflow_events.js';
import type {
  NotesOverlayEditorWorkflows,
  UseNotesOverlayEditorWorkflowsArgs,
} from './notes_overlay_editor_workflow_shared.js';

export type {
  NotesOverlayEditorWorkflows,
  UseNotesOverlayEditorWorkflowsArgs,
} from './notes_overlay_editor_workflow_shared.js';

export function useNotesOverlayEditorWorkflows(
  args: UseNotesOverlayEditorWorkflowsArgs
): NotesOverlayEditorWorkflows {
  const core = useNotesOverlayEditorWorkflowCore(args);
  const events = useNotesOverlayEditorWorkflowEvents(args, core);

  return {
    ...core,
    ...events,
  };
}
