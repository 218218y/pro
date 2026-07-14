import type { ProjectSaveActionResult } from '../project_action_feedback.js';
import type { CreateProjectUiActionControllerArgs } from './project_ui_action_controller_shared.js';

import { reportProjectSaveResult } from '../project_action_feedback.js';
import { executeProjectActionResult } from '../project_action_execution.js';
import {
  buildPerfEntryOptionsFromActionResult,
  buildProjectSaveActionErrorResult,
  endPerfSpan,
  markPerfPoint,
  startPerfSpan,
} from '../../services/api.js';
import { publishProjectUiActionEvent } from './project_ui_action_events.js';

export function runProjectUiSaveAction(
  args: Pick<CreateProjectUiActionControllerArgs, 'app' | 'fb' | 'saveProject'>
): ProjectSaveActionResult {
  const { app, fb, saveProject } = args;
  markPerfPoint(app, 'project.save.dispatched');
  const spanId = startPerfSpan(app, 'project.save');
  const result = executeProjectActionResult({
    feedback: fb,
    run: () => saveProject(app),
    report: reportProjectSaveResult,
    buildError: buildProjectSaveActionErrorResult,
    fallbackMessage: 'Project save failed.',
  });
  publishProjectUiActionEvent(app, 'save', result);

  if (result.ok === true && result.pending === true) {
    void result.settled.then(
      settled => {
        endPerfSpan(app, spanId, buildPerfEntryOptionsFromActionResult(settled));
        publishProjectUiActionEvent(app, 'save', {
          ...settled,
          operationId: result.operationId,
          acceptedAt: result.acceptedAt,
        });
      },
      error => {
        const failure = buildProjectSaveActionErrorResult(error, 'Project save failed.');
        endPerfSpan(app, spanId, buildPerfEntryOptionsFromActionResult(failure));
        reportProjectSaveResult(fb, failure);
        publishProjectUiActionEvent(app, 'save', {
          ...failure,
          operationId: result.operationId,
          acceptedAt: result.acceptedAt,
        });
      }
    );
  } else {
    endPerfSpan(app, spanId, buildPerfEntryOptionsFromActionResult(result));
  }
  return result;
}
