import type { AppContainer, ProjectDataLike, SavedModelLike, UnknownRecord } from '../../../types';

import { getCfg } from '../kernel/api.js';
import { captureProjectSnapshotMaybe } from '../runtime/project_capture_access.js';
import { cloneProjectJson } from '../io/project_payload_shared.js';
import { normalizeModelRecord } from '../features/model_record/model_record_normalizer.js';
import { canonicalizeComparableProjectConfigSnapshot } from '../features/project_config/project_config_snapshot_canonical.js';
import { readPersistedProjectConfigSnapshot } from '../features/project_config/project_config_persisted_snapshot.js';
import { asCornerConfiguration } from '../runtime/cfg_access_shared.js';

import {
  _attachPdfEditorDraft,
  _modelsReportNonFatal,
  getHistorySystem,
  getUtil,
  hasMeaningfulOrderPdfDraft,
  readUiPdfState,
} from './models_registry.js';
import { asProjectData, normalizeSplitDoorsMap } from './models_apply_project_contracts.js';

function cloneObjectSnapshot(value: unknown): UnknownRecord {
  const cloned = cloneProjectJson(value);
  return cloned && typeof cloned === 'object' && !Array.isArray(cloned) ? cloned : {};
}

function readSavedColorsSnapshot(App: AppContainer): ProjectDataLike['savedColors'] {
  try {
    const cfg = getCfg(App);
    const cloned = cloneProjectJson(Array.isArray(cfg.savedColors) ? cfg.savedColors : []);
    return Array.isArray(cloned) ? cloned : [];
  } catch (e) {
    _modelsReportNonFatal(App, 'applyModel.savedColors', e, 1500);
  }
  return [];
}

function captureCanonicalModelConfigSnapshot(model: SavedModelLike): UnknownRecord {
  return canonicalizeComparableProjectConfigSnapshot(model, {
    topMode: 'clone',
    cornerMode: 'full',
    savedColorsMode: 'mixed',
  });
}

function preserveOrderPdfEditorDraft(App: AppContainer, projectStructure: ProjectDataLike): void {
  try {
    const ui = readUiPdfState(App);
    const draft = ui?.orderPdfEditorDraft;
    const zoom = ui?.orderPdfEditorZoom;
    if (!hasMeaningfulOrderPdfDraft(draft)) return;
    projectStructure.orderPdfEditorDraft = cloneProjectJson(draft);
    const zoomNumber = Number(zoom);
    projectStructure.orderPdfEditorZoom = Number.isFinite(zoomNumber) && zoomNumber > 0 ? zoomNumber : 1;
  } catch (e) {
    _modelsReportNonFatal(App, 'applyModel.preservePdfDraft', e, 1500);
  }
}

function normalizeProjectStructureSplitDoors(App: AppContainer, projectStructure: ProjectDataLike): void {
  try {
    const normalizeSplitDoorsMapWithDoors = getUtil(App)?.normalizeSplitDoorsMapWithDoors;
    if (projectStructure.splitDoorsMap && typeof normalizeSplitDoorsMapWithDoors === 'function') {
      const normalizedSplitDoorsMap = normalizeSplitDoorsMap(
        normalizeSplitDoorsMapWithDoors(projectStructure.splitDoorsMap, projectStructure.settings?.doors)
      );
      if (normalizedSplitDoorsMap) projectStructure.splitDoorsMap = normalizedSplitDoorsMap;
      else delete projectStructure.splitDoorsMap;
    }
  } catch (e) {
    _modelsReportNonFatal(App, 'applyModel.normalizeSplitDoors', e, 1500);
  }
}

export function captureCurrentSnapshot(App: AppContainer): ProjectDataLike | null {
  try {
    const snap = captureProjectSnapshotMaybe(App, 'persist');
    if (snap) {
      _attachPdfEditorDraft(App, snap);
      return snap;
    }
  } catch (e) {
    _modelsReportNonFatal(App, 'captureCurrentSnapshot.capture', e, 1500);
  }

  try {
    const historySystem = getHistorySystem(App);
    const getCurrentSnapshot =
      historySystem && typeof historySystem.getCurrentSnapshot === 'function'
        ? historySystem.getCurrentSnapshot
        : null;
    if (!getCurrentSnapshot) return null;
    const snapshotText = getCurrentSnapshot();
    if (typeof snapshotText !== 'string') return null;
    const parsed = asProjectData(JSON.parse(snapshotText));
    if (parsed) _attachPdfEditorDraft(App, parsed);
    return parsed;
  } catch (e) {
    _modelsReportNonFatal(App, 'captureCurrentSnapshot.history', e, 1500);
  }

  return null;
}

export function buildProjectStructureFromModel(
  App: AppContainer,
  modelData: SavedModelLike
): ProjectDataLike {
  const normalizedModel = normalizeModelRecord(modelData);
  const canonicalConfig = captureCanonicalModelConfigSnapshot(normalizedModel);
  const persistedConfig = readPersistedProjectConfigSnapshot(canonicalConfig);
  const projectStructure: ProjectDataLike = {
    settings: cloneObjectSnapshot(normalizedModel.settings),
    toggles: cloneObjectSnapshot(normalizedModel.toggles),
    chestSettings: cloneObjectSnapshot(normalizedModel.chestSettings),
    ...persistedConfig,
    cornerConfiguration: asCornerConfiguration(persistedConfig.cornerConfiguration),
    isLibraryMode: !!persistedConfig.isLibraryMode,
    savedColors: readSavedColorsSnapshot(App),
    grooveLinesCount:
      typeof persistedConfig.grooveLinesCount === 'number' || persistedConfig.grooveLinesCount === null
        ? persistedConfig.grooveLinesCount
        : normalizedModel.grooveLinesCount,
  };

  preserveOrderPdfEditorDraft(App, projectStructure);
  normalizeProjectStructureSplitDoors(App, projectStructure);

  return projectStructure;
}
