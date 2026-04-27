import type { AppContainer, ModelsCommandResult, ProjectDataLike } from '../../../types';

import { flushOrPushHistoryStateMaybe } from '../runtime/history_system_access.js';
import { normalizeUnknownError } from '../runtime/error_normalization.js';
import { loadProjectDataActionResultViaService } from '../runtime/project_io_access.js';

import { _modelsReportNonFatal } from './models_registry.js';
import { buildModelLoadFailureResult, normalizeModelLoadReason } from './models_apply_project_contracts.js';

function pushHistoryStateSafely(App: AppContainer, tag: string): void {
  try {
    flushOrPushHistoryStateMaybe(App, {});
  } catch (e) {
    _modelsReportNonFatal(App, tag, e, 1500);
  }
}

function readLoadFailureMessage(value: unknown): string | undefined {
  const message = typeof value === 'string' ? value.trim() : '';
  return message || undefined;
}

export function loadProjectStructureResult(
  App: AppContainer,
  projectStructure: ProjectDataLike
): ModelsCommandResult {
  try {
    pushHistoryStateSafely(App, 'applyModel.pushBefore');

    const loadResult = loadProjectDataActionResultViaService(
      App,
      projectStructure,
      {
        toast: false,
        meta: { source: 'model.apply' },
      },
      'error',
      '[WardrobePro] Model apply project load failed.'
    );

    if (loadResult.ok === false) {
      return buildModelLoadFailureResult(
        normalizeModelLoadReason(loadResult.reason),
        readLoadFailureMessage(loadResult.message)
      );
    }

    pushHistoryStateSafely(App, 'applyModel.pushAfter');
    return { ok: true };
  } catch (e) {
    _modelsReportNonFatal(App, 'applyModel.load', e, 1500);
    return buildModelLoadFailureResult('error', normalizeUnknownError(e).message);
  }
}

export function loadProjectStructure(App: AppContainer, projectStructure: ProjectDataLike): boolean {
  return loadProjectStructureResult(App, projectStructure).ok === true;
}
