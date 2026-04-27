// Project/data workflow service access public API section extracted from api_services_surface.ts

import type { AppContainer } from '../../../types';

import {
  getProjectIoServiceMaybe,
  ensureProjectIoService,
  getProjectIoRuntime,
  ensureProjectIoRuntime,
  nextProjectIoRestoreGeneration,
  getProjectIoRestoreGeneration,
  isProjectIoRestoreGenerationCurrent,
  normalizeProjectIoLoadResult,
  exportProjectViaService,
  normalizeProjectExportResult,
  exportProjectResultViaService,
  handleProjectFileLoadActionResultViaService as handleProjectFileLoadActionResultViaRuntimeService,
  loadProjectDataViaService,
  loadProjectDataActionResultViaService,
  loadProjectDataActionResultViaServiceOrThrow,
  loadProjectDataResultViaService,
  loadProjectDataResultViaServiceOrThrow,
  restoreProjectSessionViaService,
  buildDefaultProjectDataViaService,
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
  restoreProjectSessionActionResultViaService,
  restoreProjectSessionActionResultViaServiceOrThrow,
  type ProjectExportAccessResult,
} from '../runtime/project_io_access.js';
import { loadProjectFileInputViaService } from './project_file_ingress_service.js';
import {
  buildProjectLoadActionErrorResult,
  buildProjectLoadFailureResult,
  normalizeProjectLoadActionResult,
  type ProjectLoadActionResult,
  type ProjectLoadFailureReason,
  type ProjectLoadFailureResult,
} from '../runtime/project_load_action_result.js';
import {
  buildProjectSaveActionErrorResult,
  normalizeProjectSaveActionResult,
  type ProjectSaveActionResult,
  type ProjectSaveFailureReason,
  type ProjectSaveFailureResult,
} from '../runtime/project_save_action_result.js';
import {
  buildProjectRecoverySuccessResult,
  buildProjectRestoreFailureResult,
  buildProjectResetDefaultFailureResult,
  buildProjectResetDefaultActionErrorResult,
  buildProjectRestoreActionErrorResult,
  normalizeProjectResetDefaultActionResult,
  normalizeProjectRestoreActionResult,
  normalizeProjectRestoreLoadResult,
  normalizeProjectResetDefaultLoadResult,
  type ProjectRecoverySuccessResult,
  type ProjectResetDefaultActionResult,
  type ProjectResetDefaultFailureReason,
  type ProjectResetDefaultFailureResult,
  type ProjectRestoreActionResult,
  type ProjectRestoreFailureReason,
  type ProjectRestoreFailureResult,
} from '../runtime/project_recovery_action_result.js';
import { normalizeModelsCommandReason } from '../runtime/models_access.js';
import { assertApp } from '../runtime/api.js';
import {
  normalizeModelRecord,
  normalizeModelList,
} from '../features/model_record/model_record_normalizer.js';

export {
  getProjectIoServiceMaybe,
  ensureProjectIoService,
  getProjectIoRuntime,
  ensureProjectIoRuntime,
  nextProjectIoRestoreGeneration,
  getProjectIoRestoreGeneration,
  isProjectIoRestoreGenerationCurrent,
  normalizeProjectIoLoadResult,
  exportProjectViaService,
  normalizeProjectExportResult,
  exportProjectResultViaService,
  loadProjectDataViaService,
  loadProjectDataActionResultViaService,
  loadProjectDataActionResultViaServiceOrThrow,
  loadProjectDataResultViaService,
  loadProjectDataResultViaServiceOrThrow,
  restoreProjectSessionViaService,
  buildDefaultProjectDataViaService,
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
  restoreProjectSessionActionResultViaService,
  restoreProjectSessionActionResultViaServiceOrThrow,
};

export {
  buildProjectLoadActionErrorResult,
  buildProjectLoadFailureResult,
  normalizeProjectLoadActionResult,
  buildProjectSaveActionErrorResult,
  normalizeProjectSaveActionResult,
  buildProjectRecoverySuccessResult,
  buildProjectRestoreFailureResult,
  buildProjectResetDefaultFailureResult,
  buildProjectResetDefaultActionErrorResult,
  buildProjectRestoreActionErrorResult,
  normalizeProjectResetDefaultActionResult,
  normalizeProjectRestoreActionResult,
  normalizeProjectRestoreLoadResult,
  normalizeProjectResetDefaultLoadResult,
  normalizeModelsCommandReason,
  normalizeModelRecord,
  normalizeModelList,
};

export type {
  ProjectExportAccessResult,
  ProjectLoadActionResult,
  ProjectLoadFailureReason,
  ProjectLoadFailureResult,
  ProjectSaveActionResult,
  ProjectSaveFailureReason,
  ProjectSaveFailureResult,
  ProjectRecoverySuccessResult,
  ProjectResetDefaultActionResult,
  ProjectResetDefaultFailureReason,
  ProjectResetDefaultFailureResult,
  ProjectRestoreActionResult,
  ProjectRestoreFailureReason,
  ProjectRestoreFailureResult,
};

export async function handleProjectFileLoadViaService(
  App: AppContainer | unknown,
  eventOrFile: unknown
): Promise<ProjectLoadActionResult> {
  const canonical = normalizeProjectLoadActionResult(
    await loadProjectFileInputViaService(assertApp(App, 'services/project_file_ingress'), eventOrFile),
    'not-installed'
  );
  if (canonical.ok) return canonical;
  if (!('reason' in canonical) || canonical.reason !== 'not-installed') return canonical;

  return normalizeProjectLoadActionResult(
    await handleProjectFileLoadActionResultViaRuntimeService(
      App,
      eventOrFile,
      'not-installed',
      '[WardrobePro] Project file load failed.'
    ),
    'not-installed'
  );
}

export {
  buildResetDefaultProjectData,
  readResetDefaultProjectPayload,
  resetProjectToDefaultActionResult,
  resetProjectToDefault,
} from './project_reset_default.js';
export { loadProjectFileInputViaService };
export {
  getCanvasPickingServiceMaybe,
  ensureCanvasPickingService,
  getCanvasPickingRuntime,
  ensureCanvasPickingRuntime,
  getCanvasPickingClickHandler,
  getCanvasPickingHoverHandler,
} from '../runtime/canvas_picking_access.js';
export {
  getAutosaveServiceMaybe,
  ensureAutosaveService,
  readAutosaveInfoFromStorage,
  readAutosavePayloadFromStorage,
  readAutosavePayloadFromStorageResult,
  normalizeAutosaveInfo,
  normalizeAutosavePayload,
  setAutosaveAllowed,
  scheduleAutosaveViaService,
  flushAutosavePendingViaService,
  forceAutosaveNowViaService,
} from '../runtime/autosave_access.js';
export {
  getEditStateServiceMaybe,
  ensureEditStateService,
  resetAllEditModesViaService,
} from '../runtime/edit_state_access.js';
export {
  getTexturesCacheServiceMaybe,
  ensureTexturesCacheService,
  getCustomUploadedTextureMaybe,
  setCustomUploadedTextureViaService,
  hasCustomUploadedTexture,
} from '../runtime/textures_cache_access.js';
export {
  getModelsServiceSourceMaybe,
  getModelsServiceMaybe,
  ensureModelsService,
  ensureModelsLoadedViaService,
  ensureModelsLoadedViaServiceOrThrow,
  exportUserModelsViaService,
  mergeImportedModelsViaService,
  mergeImportedModelsViaServiceOrThrow,
  setModelNormalizerViaService,
  setPresetModelsViaService,
} from '../runtime/models_access.js';
