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
  loadProjectDataResultViaService,
  loadProjectDataResultViaServiceOrThrow,
  loadProjectDataViaServiceOrThrow,
  normalizeProjectExportResult,
} from './project_io_access_load.js';
import {
  type ProjectAutosavePayloadReadResult,
  type ProjectAutosavePayloadSuccessResult,
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
  restoreProjectSessionActionResultViaService,
  restoreProjectSessionActionResultViaServiceOrThrow,
} from './project_io_access_restore.js';

export type {
  ProjectExportAccessResult,
  ProjectAutosavePayloadReadResult,
  ProjectAutosavePayloadSuccessResult,
};

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
  loadProjectDataResultViaService,
  loadProjectDataActionResultViaService,
  loadProjectDataResultViaServiceOrThrow,
  loadProjectDataActionResultViaServiceOrThrow,
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
  restoreProjectSessionActionResultViaService,
  restoreProjectSessionActionResultViaServiceOrThrow,
  loadProjectDataViaServiceOrThrow,
  buildDefaultProjectDataViaServiceOrThrow,
};
