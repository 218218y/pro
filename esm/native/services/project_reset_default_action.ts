import type { AppContainer, ProjectLoadOpts } from '../../../types';

import {
  isProjectLoadAcceptedResult,
  loadProjectDataActionResultViaService,
} from '../runtime/project_io_access.js';
import {
  buildProjectResetDefaultFailureResult,
  normalizeProjectResetDefaultActionResult,
  type ProjectResetDefaultActionResult,
} from '../runtime/project_recovery_action_result.js';
import { readResetDefaultProjectPayload } from './project_reset_default_payload.js';

export function resetProjectToDefaultActionResult(
  App: AppContainer,
  opts?: ProjectLoadOpts | null
): ProjectResetDefaultActionResult {
  const payload = readResetDefaultProjectPayload(App, opts);
  if (!payload.ok) return payload;

  const loadResult = loadProjectDataActionResultViaService(
    App,
    payload.data,
    payload.opts,
    'error',
    '[WardrobePro] Default project reset failed.'
  );
  if (isProjectLoadAcceptedResult(loadResult)) {
    return buildProjectResetDefaultFailureResult('error', {
      message: '[WardrobePro] Default project reset violated its fail-fast load contract.',
    });
  }
  return normalizeProjectResetDefaultActionResult(loadResult, 'error');
}

export function resetProjectToDefault(
  App: AppContainer,
  opts?: ProjectLoadOpts | null
): ProjectResetDefaultActionResult {
  return resetProjectToDefaultActionResult(App, opts);
}
