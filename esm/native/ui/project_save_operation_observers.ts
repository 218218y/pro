import type { ProjectFeedbackLike, ProjectSaveActionResult } from './project_action_feedback.js';
import { scheduleSaveResultToast } from './project_save_runtime_results.js';

export const PROJECT_SAVE_FEEDBACK_OBSERVER_ID = 'project-save-feedback';
export const PROJECT_SAVE_WATCHDOG_OBSERVER_ID = 'project-save-watchdog';
export const PROJECT_SAVE_STALE_AFTER_MS = 30_000;

type ProjectSaveAcceptedResult = Extract<ProjectSaveActionResult, { accepted: true }>;
type ProjectSaveTerminalResult = Awaited<ProjectSaveAcceptedResult['settled']>;
type ProjectSaveStaleDiagnostic = {
  observerId: string;
  operationId: string;
  requestedAt: number;
  acceptedAt: number;
  detectedAt: number;
  ageMs: number;
};

type ProjectSaveObservationArgs = {
  observerId: string;
  handle: ProjectSaveAcceptedResult;
  onSettled: (result: ProjectSaveTerminalResult) => void;
  onRejected: (error: unknown) => void;
  onObserverError?: (error: unknown) => void;
  watchdog?: {
    staleAfterMs: number;
    onStale: (diagnostic: ProjectSaveStaleDiagnostic) => void;
  };
};

export type ProjectSaveObserverCapabilities = {
  observe: (args: ProjectSaveObservationArgs) => unknown;
  buildRejected: (error: unknown) => ProjectSaveTerminalResult;
  reportObserverError: (op: string, error: unknown) => void;
  reportStale: (diagnostic: ProjectSaveStaleDiagnostic) => void;
};

export function observeProjectSaveFeedback(
  handle: ProjectSaveAcceptedResult,
  feedback: ProjectFeedbackLike | null | undefined,
  capabilities: ProjectSaveObserverCapabilities
): void {
  capabilities.observe({
    observerId: PROJECT_SAVE_FEEDBACK_OBSERVER_ID,
    handle,
    onSettled: result => {
      scheduleSaveResultToast(feedback, result, error => {
        capabilities.reportObserverError('feedback.callback', error);
      });
    },
    onRejected: error => {
      scheduleSaveResultToast(feedback, capabilities.buildRejected(error), observerError => {
        capabilities.reportObserverError('feedback.callback', observerError);
      });
    },
    onObserverError: error => {
      capabilities.reportObserverError('feedback.observer', error);
    },
  });
}

export function observeProjectSaveWatchdog(
  handle: ProjectSaveAcceptedResult,
  capabilities: ProjectSaveObserverCapabilities
): void {
  capabilities.observe({
    observerId: PROJECT_SAVE_WATCHDOG_OBSERVER_ID,
    handle,
    onSettled: () => undefined,
    onRejected: () => undefined,
    watchdog: {
      staleAfterMs: PROJECT_SAVE_STALE_AFTER_MS,
      onStale: diagnostic => {
        capabilities.reportStale(diagnostic);
      },
    },
    onObserverError: error => {
      capabilities.reportObserverError('watchdog.observer', error);
    },
  });
}
