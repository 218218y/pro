import type { AppContainer, ProjectLoadOpts } from '../../../types';

import { loadProjectDataFailFastResultViaService } from '../runtime/project_io_access.js';
import {
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

  const loadResult = loadProjectDataFailFastResultViaService(
    App,
    payload.data,
    payload.opts,
    'error',
    '[WardrobePro] Default project reset failed.'
  );
  return normalizeProjectResetDefaultActionResult(loadResult, 'error');
}

export function resetProjectToDefault(
  App: AppContainer,
  opts?: ProjectLoadOpts | null
): ProjectResetDefaultActionResult {
  return resetProjectToDefaultActionResult(App, opts);
}
