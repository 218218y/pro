import type { AppContainer, ProjectFileLike, ProjectFileLoadEventLike } from '../../../types';

import {
  buildProjectLoadFailureResult,
  handleProjectFileLoadViaService,
  normalizeProjectLoadActionResult,
  type ProjectLoadActionResult,
} from '../services/api.js';
import {
  buildProjectActionErrorResult,
  reportProjectLoadResult,
  type ProjectFeedbackLike,
} from './project_action_feedback.js';
import {
  clearProjectLoadInputEventTarget,
  executeAsyncProjectActionResult,
} from './project_action_execution.js';
import { runProjectLoadActionSingleFlight } from './project_load_action_singleflight.js';
import {
  asProjectFileLoadEvent,
  readProjectLoadFlightKey,
  resolveProjectLoadFallbackMessage,
} from './project_load_runtime_shared.js';

export async function runProjectLoadActionResult(
  feedback: ProjectFeedbackLike | null | undefined,
  run: () => ProjectLoadActionResult | Promise<ProjectLoadActionResult>,
  options?: {
    fallbackMessage?: string;
    clearInputTargetFrom?: unknown;
  }
): Promise<ProjectLoadActionResult> {
  return await executeAsyncProjectActionResult<
    ProjectFeedbackLike | null | undefined,
    ProjectLoadActionResult
  >({
    feedback,
    run,
    report: reportProjectLoadResult,
    buildError: buildProjectActionErrorResult,
    fallbackMessage: resolveProjectLoadFallbackMessage(options?.fallbackMessage),
    finally: () => clearProjectLoadInputEventTarget(options?.clearInputTargetFrom),
  });
}

export async function runProjectLoadAction(
  App: AppContainer,
  feedback: ProjectFeedbackLike | null | undefined,
  eventOrFile: ProjectFileLoadEventLike | ProjectFileLike | unknown,
  options?: {
    fallbackMessage?: string;
    clearInputTargetFrom?: unknown;
  }
): Promise<ProjectLoadActionResult> {
  const loadEvent = asProjectFileLoadEvent(eventOrFile);
  const actionInput = loadEvent ?? eventOrFile;
  const clearInputTargetFrom = Object.prototype.hasOwnProperty.call(options || {}, 'clearInputTargetFrom')
    ? options?.clearInputTargetFrom
    : eventOrFile;
  const fallbackMessage = options?.fallbackMessage;
  const loadFlightKey = readProjectLoadFlightKey(actionInput);
  const runLoad = () =>
    runProjectLoadActionResult(
      feedback,
      async () => normalizeProjectLoadActionResult(await handleProjectFileLoadViaService(App, actionInput)),
      {
        fallbackMessage,
        clearInputTargetFrom,
      }
    );

  return await runProjectLoadActionSingleFlight({
    app: App,
    key: loadFlightKey,
    run: runLoad,
    onBusy: () =>
      runProjectLoadActionResult(feedback, () => buildProjectLoadFailureResult('busy'), {
        fallbackMessage,
        clearInputTargetFrom,
      }),
    onReuse: () => clearProjectLoadInputEventTarget(clearInputTargetFrom),
  });
}
