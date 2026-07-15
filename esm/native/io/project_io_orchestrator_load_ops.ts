import { createProjectDataLoader } from './project_io_orchestrator_project_load.js';
import { createProjectFileLoadHandler } from './project_io_orchestrator_load_file.js';
import { createProjectSessionRestore } from './project_io_orchestrator_restore.js';
import type {
  ProjectLoadActionResult,
  ProjectLoadFailFastOpts,
  ProjectLoadInputLike,
  ProjectLoadOpts,
  ProjectLoadTerminalResult,
} from '../../../types/index.js';
import type { ProjectRestoreActionResult } from '../runtime/project_recovery_action_result.js';
import type { ProjectIoOwnerDeps } from './project_io_orchestrator_shared.js';

export function createProjectIoLoadOps(deps: ProjectIoOwnerDeps) {
  const handleFileLoadImpl = createProjectFileLoadHandler(deps);
  const loadProjectDataImpl = createProjectDataLoader(deps);
  const restoreLastSessionImpl = createProjectSessionRestore(deps);

  async function handleFileLoad(eventOrFile: unknown): Promise<ProjectLoadActionResult> {
    return handleFileLoadImpl(eventOrFile);
  }

  function loadProjectData(input: ProjectLoadInputLike, options?: ProjectLoadOpts): ProjectLoadActionResult {
    return loadProjectDataImpl(input, options);
  }

  function loadProjectDataFailFast(
    input: ProjectLoadInputLike,
    options?: ProjectLoadFailFastOpts
  ): ProjectLoadTerminalResult {
    return loadProjectDataImpl(input, {
      ...options,
      queueIfBusy: false,
    });
  }

  async function restoreLastSession(): Promise<ProjectRestoreActionResult> {
    return await restoreLastSessionImpl();
  }

  return {
    handleFileLoad,
    loadProjectData,
    loadProjectDataFailFast,
    restoreLastSession,
  };
}
