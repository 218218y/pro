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
  reportError,
  startPerfSpan,
} from '../../services/api.js';
import { observeProjectSaveFeedback, observeProjectSaveWatchdog } from '../project_save_runtime.js';
import { publishProjectUiActionEvent } from './project_ui_action_events.js';

const PROJECT_SAVE_PERFORMANCE_OBSERVER_ID = 'project-save-performance';
const PROJECT_SAVE_TELEMETRY_OBSERVER_ID = 'project-save-telemetry';
type ProjectSaveAcceptedResult = Extract<ProjectSaveActionResult, { accepted: true }>;

function reportProjectSaveUiObserverFailure(
  app: CreateProjectUiActionControllerArgs['app'],
  op: string,
  error: unknown
): void {
  try {
    reportError(
      app,
      error,
      { where: 'native/ui/react/project_ui_action_controller_save', op, fatal: false },
      { consoleOutput: false }
    );
  } catch {
    // UI observers do not own the terminal business result.
  }
}

function buildProjectSaveTimingDetail(
  handle: ProjectSaveAcceptedResult,
  completedAt?: number
): Record<string, unknown> {
  return {
    operationId: handle.operationId,
    requestedAt: handle.requestedAt,
    acceptedAt: handle.acceptedAt,
    acceptanceLatencyMs: Math.max(0, handle.acceptedAt - handle.requestedAt),
    ...(typeof completedAt === 'number'
      ? {
          completedAt,
          journeyDurationMs: Math.max(0, completedAt - handle.requestedAt),
        }
      : {}),
  };
}

function endProjectSavePerformanceObservation(
  app: CreateProjectUiActionControllerArgs['app'],
  spanId: string | undefined,
  result: unknown,
  handle: ProjectSaveAcceptedResult
): void {
  if (!spanId) return;
  const options = buildPerfEntryOptionsFromActionResult(result);
  const baseDetail = options?.detail;
  const resultDetail =
    baseDetail && typeof baseDetail === 'object' && !Array.isArray(baseDetail)
      ? (baseDetail as Record<string, unknown>)
      : {};
  endPerfSpan(app, spanId, {
    ...options,
    detail: {
      ...resultDetail,
      ...buildProjectSaveTimingDetail(handle, Date.now()),
    },
  });
}

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
    observeProjectSaveFeedback(app, result, fb);
    observeProjectSaveWatchdog(app, result);

    observeAsyncOperation({
      observerId: PROJECT_SAVE_PERFORMANCE_OBSERVER_ID,
      handle: result,
      onStarted: handle => {
        return startPerfSpan(app, 'project.save', {
          detail: buildProjectSaveTimingDetail(handle),
        });
      },
      onSettled: (settled, handle, spanId) => {
        endProjectSavePerformanceObservation(app, spanId, settled, handle);
      },
      onRejected: (error, handle, spanId) => {
        const failure = buildProjectSaveActionErrorResult(error, 'Project save failed.');
        endProjectSavePerformanceObservation(app, spanId, failure, handle);
      },
      onObserverError: error => {
        reportProjectSaveUiObserverFailure(app, 'performance.observer', error);
      },
    });

    observeAsyncOperation({
      observerId: PROJECT_SAVE_TELEMETRY_OBSERVER_ID,
      handle: result,
      onStarted: handle => {
        publishProjectUiActionEvent(app, 'save', handle);
      },
      onSettled: (settled, handle) => {
        publishProjectUiActionEvent(app, 'save', {
          ...settled,
          operationId: handle.operationId,
          requestedAt: handle.requestedAt,
          acceptedAt: handle.acceptedAt,
        });
      },
      onRejected: (error, handle) => {
        publishProjectUiActionEvent(app, 'save', {
          ...buildProjectSaveActionErrorResult(error, 'Project save failed.'),
          operationId: handle.operationId,
          requestedAt: handle.requestedAt,
          acceptedAt: handle.acceptedAt,
        });
      },
      onObserverError: error => {
        reportProjectSaveUiObserverFailure(app, 'telemetry.observer', error);
      },
    });
  } else {
    const spanId = startPerfSpan(app, 'project.save');
    endPerfSpan(app, spanId, buildPerfEntryOptionsFromActionResult(result));
    publishProjectUiActionEvent(app, 'save', result);
  }
  return result;
}
