// Project/data workflow service access public API section extracted from api_services_surface.ts

import type { AppContainer, CloudCollectionsEnvelope, SavedModelLike } from '../../../types';

import {
  getProjectIoServiceMaybe,
  ensureProjectIoService,
  getProjectIoRuntime,
  ensureProjectIoRuntime,
  nextProjectIoRestoreGeneration,
  getProjectIoRestoreGeneration,
  isProjectIoRestoreGenerationCurrent,
  normalizeProjectExportResult,
  exportProjectResultViaService,
  loadProjectDataActionResultViaService,
  loadProjectDataActionResultViaServiceOrThrow,
  loadProjectDataFailFastResultViaService,
  loadProjectDataFailFastResultViaServiceOrThrow,
  readAutosaveProjectPayload,
  restoreProjectAutosaveFailFastResultViaService,
  type ProjectExportAccessResult,
} from '../runtime/project_io_access.js';
import { loadProjectFileInputViaService } from './project_file_ingress_service.js';
import {
  buildProjectLoadActionErrorResult,
  buildProjectLoadFailureResult,
  isProjectLoadAcceptedResult,
  normalizeProjectLoadActionResult,
  settleProjectLoadActionResult,
  type ProjectLoadAcceptedResult,
  type ProjectLoadActionResult,
  type ProjectLoadFailureReason,
  type ProjectLoadFailureResult,
  type ProjectLoadTerminalResult,
} from '../runtime/project_load_action_result.js';
import {
  buildProjectSaveActionErrorResult,
  normalizeProjectSaveActionResult,
  type ProjectSaveActionResult,
  type ProjectSaveAcceptedResult,
  type ProjectSaveFailureReason,
  type ProjectSaveFailureResult,
  type ProjectSaveSuccessOutcome,
  type ProjectSaveTerminalResult,
} from '../runtime/project_save_action_result.js';
import {
  createAsyncOperationHandle,
  observeAsyncOperation,
  readAsyncOperationStaleDiagnostics,
  reuseAsyncOperationHandle,
} from '../runtime/async_operation.js';
import {
  buildProjectRecoverySuccessResult,
  buildProjectRestoreFailureResult,
  buildProjectResetDefaultFailureResult,
  buildProjectResetDefaultActionErrorResult,
  buildProjectRestoreActionErrorResult,
  normalizeProjectResetDefaultActionResult,
  normalizeProjectRestoreActionResult,
  type ProjectRecoverySuccessResult,
  type ProjectResetDefaultActionResult,
  type ProjectResetDefaultFailureReason,
  type ProjectResetDefaultFailureResult,
  type ProjectRestoreActionResult,
  type ProjectRestoreFailureReason,
  type ProjectRestoreFailureResult,
} from '../runtime/project_recovery_action_result.js';
import { normalizeModelsCommandReason } from '../runtime/models_access.js';
import {
  normalizeModelList,
  normalizeModelRecord,
  readSavedModelRecordList,
  savedModelCodec,
} from './saved_model_codec_access.js';
import { planImportedModelsCollectionsMutationFromCanonicalModels } from './models_registry_mutations.js';

export {
  getProjectIoServiceMaybe,
  ensureProjectIoService,
  getProjectIoRuntime,
  ensureProjectIoRuntime,
  nextProjectIoRestoreGeneration,
  getProjectIoRestoreGeneration,
  isProjectIoRestoreGenerationCurrent,
  normalizeProjectExportResult,
  exportProjectResultViaService,
  loadProjectDataActionResultViaService,
  loadProjectDataActionResultViaServiceOrThrow,
  loadProjectDataFailFastResultViaService,
  loadProjectDataFailFastResultViaServiceOrThrow,
  readAutosaveProjectPayload,
  restoreProjectAutosaveFailFastResultViaService,
};

export {
  buildProjectLoadActionErrorResult,
  buildProjectLoadFailureResult,
  normalizeProjectLoadActionResult,
  isProjectLoadAcceptedResult,
  settleProjectLoadActionResult,
  buildProjectSaveActionErrorResult,
  normalizeProjectSaveActionResult,
  createAsyncOperationHandle,
  observeAsyncOperation,
  readAsyncOperationStaleDiagnostics,
  reuseAsyncOperationHandle,
  buildProjectRecoverySuccessResult,
  buildProjectRestoreFailureResult,
  buildProjectResetDefaultFailureResult,
  buildProjectResetDefaultActionErrorResult,
  buildProjectRestoreActionErrorResult,
  normalizeProjectResetDefaultActionResult,
  normalizeProjectRestoreActionResult,
  normalizeModelsCommandReason,
  normalizeModelRecord,
  normalizeModelList,
  readSavedModelRecordList,
  savedModelCodec,
};

export type {
  ProjectExportAccessResult,
  ProjectLoadActionResult,
  ProjectLoadAcceptedResult,
  ProjectLoadFailureReason,
  ProjectLoadFailureResult,
  ProjectLoadTerminalResult,
  ProjectSaveActionResult,
  ProjectSaveAcceptedResult,
  ProjectSaveFailureReason,
  ProjectSaveFailureResult,
  ProjectSaveSuccessOutcome,
  ProjectSaveTerminalResult,
  ProjectRecoverySuccessResult,
  ProjectResetDefaultActionResult,
  ProjectResetDefaultFailureReason,
  ProjectResetDefaultFailureResult,
  ProjectRestoreActionResult,
  ProjectRestoreFailureReason,
  ProjectRestoreFailureResult,
};

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
export function planImportedModelsCollectionsMutation(
  App: AppContainer,
  envelope: Readonly<CloudCollectionsEnvelope>,
  list: SavedModelLike[]
) {
  return planImportedModelsCollectionsMutationFromCanonicalModels(App, envelope, normalizeModelList(list));
}
