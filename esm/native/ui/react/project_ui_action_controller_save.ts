import type { ProjectSaveActionResult } from '../project_action_feedback.js';
import type { CreateProjectUiActionControllerArgs } from './project_ui_action_controller_shared.js';

import { reportProjectSaveResult } from '../project_action_feedback.js';
import { executeProjectActionResult } from '../project_action_execution.js';
import {
  buildPerfEntryOptionsFromActionResult,
  buildProjectSaveActionErrorResult,
  endPerfSpan,
  markPerfPoint,
  observeAsyncOperation,
  startPerfSpan,
} from '../../services/api.js';
import { publishProjectUiActionEvent } from './project_ui_action_events.js';

export function runProjectUiSaveAction(
  args: Pick<CreateProjectUiActionControllerArgs, 'app' | 'fb' | 'saveProject'>
): ProjectSaveActionResult {
  const { app, fb, saveProject } = args;
  markPerfPoint(app, 'project.save.dispatched');
  const result = executeProjectActionResult({
    feedback: fb,
    run: () => saveProject(app),
    report: reportProjectSaveResult,
    buildError: buildProjectSaveActionErrorResult,
    fallbackMessage: 'Project save failed.',
  });

  if (result.accepted === true) {
    observeAsyncOperation({
      observerId: 'project-save-ui-lifecycle',
      handle: result,
      onStarted: handle => {
        const spanId = startPerfSpan(app, 'project.save');
        publishProjectUiActionEvent(app, 'save', handle);
        return spanId;
      },
      onSettled: (settled, handle, spanId) => {
        if (spanId) endPerfSpan(app, spanId, buildPerfEntryOptionsFromActionResult(settled));
        publishProjectUiActionEvent(app, 'save', {
          ...settled,
          operationId: handle.operationId,
          acceptedAt: handle.acceptedAt,
        });
      },
      onRejected: (error, handle, spanId) => {
        const failure = buildProjectSaveActionErrorResult(error, 'Project save failed.');
        if (spanId) endPerfSpan(app, spanId, buildPerfEntryOptionsFromActionResult(failure));
        reportProjectSaveResult(fb, failure);
        publishProjectUiActionEvent(app, 'save', {
          ...failure,
          operationId: handle.operationId,
          acceptedAt: handle.acceptedAt,
        });
      },
    });
  } else {
    const spanId = startPerfSpan(app, 'project.save');
    endPerfSpan(app, spanId, buildPerfEntryOptionsFromActionResult(result));
    publishProjectUiActionEvent(app, 'save', result);
  }
  return result;
}
