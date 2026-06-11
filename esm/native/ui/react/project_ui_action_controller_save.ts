import type { ProjectSaveActionResult } from '../project_action_feedback.js';
import type { CreateProjectUiActionControllerArgs } from './project_ui_action_controller_shared.js';

import { reportProjectSaveResult } from '../project_action_feedback.js';
import { executeProjectActionResult } from '../project_action_execution.js';
import { buildProjectSaveActionErrorResult } from '../../services/api.js';
import { buildPerfEntryOptionsFromActionResult, markPerfPoint, runPerfAction } from '../../services/api.js';
import { publishProjectUiActionEvent } from './project_ui_action_events.js';

export function runProjectUiSaveAction(
  args: Pick<CreateProjectUiActionControllerArgs, 'app' | 'fb' | 'saveProject'>
): ProjectSaveActionResult {
  const { app, fb, saveProject } = args;
  markPerfPoint(app, 'project.save.dispatched');
  const result = runPerfAction(
    app,
    'project.save',
    () =>
      executeProjectActionResult({
        feedback: fb,
        run: () => saveProject(app),
        report: reportProjectSaveResult,
        buildError: buildProjectSaveActionErrorResult,
        fallbackMessage: 'שמירת פרויקט נכשלה',
      }),
    {
      resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
    }
  );
  publishProjectUiActionEvent(app, 'save', result);
  return result;
}
