// UI-facing service access public API section extracted from api_services_surface.ts

export {
  getAppStartServiceMaybe,
  ensureAppStartService,
  getUiBootServiceMaybe,
  ensureUiBootService,
  getBootStartEntry,
} from '../runtime/boot_entry_access.js';
export {
  getUiBootRuntimeServiceMaybe,
  getUiBootRuntimeState,
  ensureUiBootRuntimeService,
  markUiBootDidInit,
  setUiBootBooting,
  setUiBootBuildScheduled,
} from '../runtime/ui_boot_state_access.js';
export {
  getUiFeedbackRuntimeServiceMaybe,
  ensureUiFeedbackRuntimeService,
  getReactFeedbackHost,
  setReactFeedbackHost,
  restoreReactFeedbackHost,
  isUiFeedbackInstalled,
  markUiFeedbackInstalled,
  isModeToastSyncInstalled,
  markModeToastSyncInstalled,
  getModeToastSyncUnsub,
  setModeToastSyncUnsub,
  getFeedbackModalStateMaybe,
  ensureFeedbackModalState,
  hasFeedbackModalBindingsInstalled,
  markFeedbackModalBindingsInstalled,
  getStickyStatusToastElement,
  setStickyStatusToastElement,
} from '../runtime/ui_feedback_runtime_access.js';
export {
  getUiModesRuntimeServiceMaybe,
  ensureUiModesRuntimeService,
  getModesControllerMaybe,
  setModesController,
  getPrimaryModeEffectsMaybe,
  setPrimaryModeEffects,
} from '../runtime/ui_modes_runtime_access.js';
export {
  getUiNotesExportServiceMaybe,
  ensureUiNotesExportService,
  getUiNotesExportRuntimeServiceMaybe,
  ensureUiNotesExportRuntimeService,
  isUiNotesExportInstalled,
  markUiNotesExportInstalled,
  getNotesExportTransform,
  setNotesExportTransform,
  clearNotesExportTransform,
} from '../runtime/ui_notes_export_access.js';
export {
  getProjectCaptureServiceMaybe,
  ensureProjectCaptureService,
  captureProjectSnapshotMaybe,
} from '../runtime/project_capture_access.js';
export {
  getNotesServiceMaybe,
  getUiNotesServiceMaybe,
  ensureNotesService,
  ensureUiNotesService,
  getNotesForSaveFn,
  captureSavedNotesViaService,
  getRestoreNotesFromSaveFn,
  restoreNotesFromSaveViaService,
  getNotesRuntime,
  ensureNotesRuntime,
  getNotesDraw,
  ensureNotesDraw,
  isNotesScreenDrawMode,
  subscribeNotesDrawMode,
  setNotesScreenDrawMode,
  exitNotesDrawModeViaService,
  getNotesPersistFn,
  persistNotesViaService,
  getNotesSanitizeFn,
  sanitizeNotesHtmlViaService,
} from '../runtime/notes_access.js';

export { beginUiBootSession, clearUiBootRuntimeState, installUiBootReadyTimers } from './ui_boot_runtime.js';
