import type { AppContainer, ProjectFileLike, ProjectFileLoadEventLike } from '../../../types';

import { loadProjectFileInput } from '../io/project_file_ingress_command.js';
import type { ProjectLoadActionResult } from '../runtime/project_load_action_result.js';

export async function loadProjectFileInputViaService(
  App: AppContainer,
  eventOrFile: ProjectFileLoadEventLike | ProjectFileLike | unknown
): Promise<ProjectLoadActionResult> {
  return await loadProjectFileInput(App, eventOrFile);
}
