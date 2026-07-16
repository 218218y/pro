import {
  ensureProjectIoRuntime,
  ensureProjectIoService,
  getProjectIoRestoreGeneration,
  getProjectIoRuntime,
  getProjectIoServiceMaybe,
  isProjectIoRestoreGenerationCurrent,
  normalizeProjectIoLoadResult,
  normalizeProjectLoadActionResultViaProjectIo,
  nextProjectIoRestoreGeneration,
} from './project_io_access_shared.js';
import {
  type ProjectExportAccessResult,
  buildDefaultProjectDataViaServiceOrThrow,
  exportProjectResultViaService,
  loadProjectDataActionResultViaService,
  loadProjectDataActionResultViaServiceOrThrow,
  loadProjectDataFailFastResultViaService,
  loadProjectDataFailFastResultViaServiceOrThrow,
  normalizeProjectExportResult,
} from './project_io_access_load.js';
import {
  type ProjectAutosavePayloadReadResult,
  readAutosaveProjectPayload,
  restoreProjectAutosaveFailFastResultViaService,
} from './project_io_access_restore.js';

export type { ProjectExportAccessResult, ProjectAutosavePayloadReadResult };

export {
  getProjectIoServiceMaybe,
  ensureProjectIoService,
  getProjectIoRuntime,
  ensureProjectIoRuntime,
  nextProjectIoRestoreGeneration,
  getProjectIoRestoreGeneration,
  isProjectIoRestoreGenerationCurrent,
  normalizeProjectIoLoadResult,
  normalizeProjectLoadActionResultViaProjectIo,
  normalizeProjectExportResult,
  exportProjectResultViaService,
  loadProjectDataActionResultViaService,
  loadProjectDataActionResultViaServiceOrThrow,
  loadProjectDataFailFastResultViaService,
  loadProjectDataFailFastResultViaServiceOrThrow,
  readAutosaveProjectPayload,
  restoreProjectAutosaveFailFastResultViaService,
  buildDefaultProjectDataViaServiceOrThrow,
};

export {
  buildProjectLoadActionErrorResult,
  isProjectLoadAcceptedResult,
  settleProjectLoadActionResult,
} from './project_load_action_result.js';
export type { ProjectLoadActionResult, ProjectLoadTerminalResult } from './project_load_action_result.js';
