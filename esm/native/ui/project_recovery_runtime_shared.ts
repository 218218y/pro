import type { AppContainer } from '../../../types';

import type { ProjectFeedbackLike } from './project_action_feedback.js';
import { executeAsyncProjectActionResult } from './project_action_execution.js';
import { beginProjectActionFamilyFlight } from './project_action_family_shared.js';
import { __uiFeedbackReportNonFatal } from './feedback_shared.js';

export type ProjectRecoveryRunFn<Result> = ((app: AppContainer) => Promise<Result>) | null | undefined;

type ProjectRecoveryActionKey = 'restore' | 'reset';
type ProjectRecoveryActionLike = {
  ok: boolean;
  reason?: string;
  message?: string;
  restoreGen?: number;
  warnings?: unknown[];
};

function reportRecoveryFeedbackFailure(App: AppContainer, error: unknown): void {
  try {
    __uiFeedbackReportNonFatal(App, 'projectRecovery.feedback.report', error);
  } catch {
    // Diagnostics are non-fatal and must not replace the recovery result.
  }
}

function reportRecoveryResultSafely<Feedback, Result>(
  App: AppContainer,
  feedback: Feedback,
  result: Result,
  report: (feedback: Feedback, result: Result) => unknown
): void {
  try {
    report(feedback, result);
  } catch (error) {
    reportRecoveryFeedbackFailure(App, error);
  }
}

export function runProjectRecoveryActionResult<Result extends ProjectRecoveryActionLike>(args: {
  app: AppContainer;
  feedback: ProjectFeedbackLike | null | undefined;
  run: ProjectRecoveryRunFn<Result>;
  report: (feedback: ProjectFeedbackLike | null | undefined, result: Result) => unknown;
  buildError: (error: unknown, fallbackMessage: string) => Result;
  fallbackMessage: string;
  createNotInstalled: () => Result;
  createBusy: () => Result;
  flightKey: ProjectRecoveryActionKey;
}): Promise<Result> {
  const {
    app,
    feedback,
    run,
    report,
    buildError,
    fallbackMessage,
    createNotInstalled,
    createBusy,
    flightKey,
  } = args;
  if (typeof run !== 'function') {
    const result = createNotInstalled();
    reportRecoveryResultSafely(app, feedback, result, report);
    return Promise.resolve(result);
  }

  const flight = beginProjectActionFamilyFlight<Result>({
    app,
    key: flightKey,
    dedupeKey: flightKey,
    run: () =>
      executeAsyncProjectActionResult<ProjectFeedbackLike | null | undefined, Result>({
        feedback,
        run: () => run(app),
        report,
        buildError,
        fallbackMessage,
        onReportError: error => reportRecoveryFeedbackFailure(app, error),
      }),
  });
  if (flight.status === 'reused') return flight.promise;
  if (flight.status === 'busy') {
    const result = createBusy();
    reportRecoveryResultSafely(app, feedback, result, report);
    return Promise.resolve(result);
  }
  return flight.promise;
}
