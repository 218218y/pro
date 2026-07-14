import type { AppContainer, ProjectExportResultLike, SaveProjectAction } from '../../../types';

import {
  buildProjectSaveActionErrorResult,
  createAsyncOperationHandle,
  exportProjectResultViaService,
  getUiFeedback,
  metaUiOnly,
  reportError,
  reuseAsyncOperationHandle,
  setDirtyViaActions,
  type ProjectSaveAcceptedResult,
  type ProjectSaveTerminalResult,
} from '../services/api.js';
import { downloadJsonTextResultViaBrowser, normalizeDownloadFilename } from './browser_file_download.js';
import type { ProjectSaveActionResult } from './project_action_feedback.js';
import type { ProjectSaveRuntimeDeps } from './project_save_runtime_contracts.js';
import { asUiFeedbackPrompt, createProjectSaveBrowserPrompt } from './project_save_runtime_prompt.js';
import { runPromptedAction } from './feedback_action_runtime.js';
import { requestPromptFromFeedback } from './feedback_prompt_runtime.js';
import { beginProjectActionFamily } from './project_action_family_shared.js';
import {
  buildProjectSaveDefaultName,
  buildProjectSaveDownloadFailureResult,
  buildProjectSaveExportFailureResult,
  buildProjectSaveFailureResult,
  reportSaveResultWithToast,
  scheduleSaveResultToast,
} from './project_save_runtime_results.js';

const activeSaveOperations = new WeakMap<AppContainer, ProjectSaveAcceptedResult>();

type PreparedProjectSaveExport =
  | { ok: true; exported: ProjectExportResultLike; defaultName: string }
  | { ok: false; result: ProjectSaveActionResult };

function reportProjectSaveRuntimeNonFatal(App: AppContainer, op: string, error: unknown): void {
  reportError(
    App,
    error,
    { where: 'native/ui/project_save_runtime_action', op, fatal: false },
    { consoleOutput: false }
  );
}

function prepareProjectSaveExport(App: AppContainer): PreparedProjectSaveExport {
  const exportResult = exportProjectResultViaService(
    App,
    { source: 'ui:saveProject' },
    'אירעה שגיאה בעת ייצוא הפרויקט'
  );
  if (exportResult.ok === false) {
    return { ok: false, result: buildProjectSaveExportFailureResult(exportResult) };
  }

  return {
    ok: true,
    exported: exportResult.exported,
    defaultName: buildProjectSaveDefaultName(exportResult.exported),
  };
}

function runPreparedProjectSaveFlow(
  App: AppContainer,
  deps: ProjectSaveRuntimeDeps,
  promptHost: ReturnType<typeof asUiFeedbackPrompt>,
  prepared: Extract<PreparedProjectSaveExport, { ok: true }>
): Promise<ProjectSaveActionResult> {
  const { win, doc } = deps;
  const browserPrompt = createProjectSaveBrowserPrompt(win);
  const promptDeps = promptHost || { prompt: browserPrompt };

  return runPromptedAction<ProjectSaveActionResult>({
    request: () =>
      requestPromptFromFeedback(
        promptDeps,
        'בחר שם לקובץ השמירה:',
        prepared.defaultName,
        'שמירה לא זמינה כרגע (prompt)'
      ),
    onRequestError: message => buildProjectSaveFailureResult('error', message),
    onCancelled: () => buildProjectSaveFailureResult('cancelled'),
    normalizeValue: value => String(value || '').trim(),
    runSubmitted: fileName => {
      const normalizedFileName = normalizeDownloadFilename(fileName, prepared.defaultName, '.json');
      const downloadResult = downloadJsonTextResultViaBrowser(
        { docMaybe: doc, winMaybe: win },
        normalizedFileName,
        prepared.exported.jsonStr
      );
      if (downloadResult.ok === false) {
        return buildProjectSaveDownloadFailureResult(downloadResult);
      }

      try {
        const meta = metaUiOnly(App, undefined, 'saveProject');
        setDirtyViaActions(App, false, meta);
      } catch (error) {
        reportProjectSaveRuntimeNonFatal(App, 'saveProject.clearDirty', error);
      }

      return {
        ok: true,
        outcome: 'browser-delivery-completed',
      } satisfies ProjectSaveActionResult;
    },
  });
}

export function runEnsureSaveProjectAction(
  App: AppContainer,
  deps: ProjectSaveRuntimeDeps
): SaveProjectAction | null {
  const { toast } = deps;
  try {
    const promptHost = asUiFeedbackPrompt(getUiFeedback(App));

    return function saveProject() {
      const actionFamily = beginProjectActionFamily(App, 'save');
      if (actionFamily.status === 'busy') {
        return buildProjectSaveFailureResult('busy');
      }
      if (actionFamily.status === 'reused') {
        const active = activeSaveOperations.get(App);
        return active ? reuseAsyncOperationHandle(active) : buildProjectSaveFailureResult('busy');
      }

      const prepared = prepareProjectSaveExport(App);
      if (prepared.ok === false) {
        actionFamily.release();
        return prepared.result;
      }

      const flight = runPreparedProjectSaveFlow(App, deps, promptHost, prepared);
      const settled: Promise<ProjectSaveTerminalResult> = flight
        .then(result => result as ProjectSaveTerminalResult)
        .catch(error => buildProjectSaveActionErrorResult(error, 'Project save failed.'));
      const operation = createAsyncOperationHandle(
        'project-save',
        settled
      ) satisfies ProjectSaveAcceptedResult;
      activeSaveOperations.set(App, operation);
      settled
        .then(result => {
          scheduleSaveResultToast(toast, result);
        })
        .catch(error => {
          scheduleSaveResultToast(toast, buildProjectSaveActionErrorResult(error, 'אירעה שגיאה בעת השמירה'));
        })
        .finally(() => {
          if (activeSaveOperations.get(App) === operation) activeSaveOperations.delete(App);
          actionFamily.release();
        });
      return operation;
    };
  } catch (error) {
    reportProjectSaveRuntimeNonFatal(App, 'saveProject.install', error);
    reportSaveResultWithToast(toast, buildProjectSaveActionErrorResult(error, 'שמירה נכשלה'));
    return null;
  }
}
