import {
  buildResetDefaultProjectData as buildResetDefaultProjectDataImpl,
  readResetDefaultProjectPayload as readResetDefaultProjectPayloadImpl,
} from './project_reset_default_payload.js';
import {
  resetProjectToDefaultActionResult as resetProjectToDefaultActionResultImpl,
  resetProjectToDefault as resetProjectToDefaultImpl,
} from './project_reset_default_action.js';

export type { ResetDefaultProjectPayloadReadResult } from './project_reset_default_payload.js';

export function buildResetDefaultProjectData(App: import('../../../types').AppContainer) {
  return buildResetDefaultProjectDataImpl(App);
}

export function readResetDefaultProjectPayload(
  App: import('../../../types').AppContainer,
  opts?: import('../../../types').ProjectLoadOpts | null
) {
  return readResetDefaultProjectPayloadImpl(App, opts);
}

export function resetProjectToDefaultActionResult(
  App: import('../../../types').AppContainer,
  opts?: import('../../../types').ProjectLoadOpts | null
) {
  return resetProjectToDefaultActionResultImpl(App, opts);
}

export function resetProjectToDefault(
  App: import('../../../types').AppContainer,
  opts?: import('../../../types').ProjectLoadOpts | null
) {
  return resetProjectToDefaultImpl(App, opts);
}
