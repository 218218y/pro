import type { AppContainer } from '../../../types';

import { loadProjectFileInput } from '../runtime/project_file_ingress_access.js';
import type { ProjectLoadActionResult } from '../runtime/project_load_action_result.js';

export async function loadProjectFileInputViaService(
  App: AppContainer,
  eventOrFile: unknown
): Promise<ProjectLoadActionResult> {
  return await loadProjectFileInput(App, eventOrFile);
}
