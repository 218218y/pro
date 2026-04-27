import { loadProjectFileInput } from './project_file_ingress_command.js';
import { readProjectLoadToastMessage, type ProjectIoOwnerDeps } from './project_io_orchestrator_shared.js';
import type { ProjectLoadActionResult } from '../runtime/project_load_action_result.js';

export function createProjectFileLoadHandler(deps: ProjectIoOwnerDeps) {
  const { App, showToast } = deps;
  return async function handleFileLoad(eventOrFile: unknown): Promise<ProjectLoadActionResult> {
    const result = await loadProjectFileInput(App, eventOrFile);
    const toastMessage = readProjectLoadToastMessage(result);
    if (toastMessage) showToast(toastMessage, result.ok ? 'success' : 'error');
    return result;
  };
}
