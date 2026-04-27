import type {
  ActionMetaLike,
  AppContainer,
  ProjectPreChestStateLike,
  ProjectSavedNotesLike,
  UnknownRecord,
} from '../../../../../types';

import {
  applyConfigPatchReplaceKeys as applyConfigPatchReplaceKeysApi,
  cfgSetScalar as cfgSetScalarApi,
  setCfgCustomUploadedDataURL as setCfgCustomUploadedDataURLApi,
} from '../../../services/api.js';
import { asStringOrNull, getConfigNamespace, readRecord, readSavedNotes } from './store_actions_state.js';

function setCfgSavedNotes(
  app: AppContainer,
  next: ProjectSavedNotesLike | null | unknown,
  meta?: ActionMetaLike
): void {
  const normalized = readSavedNotes(next);
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setSavedNotes === 'function') {
    cfgNs.setSavedNotes(normalized, meta);
    return;
  }
  void cfgSetScalarApi(app, 'savedNotes', normalized, meta);
}

function setCfgCustomUploadedDataURL(
  app: AppContainer,
  value: string | null | unknown,
  meta?: ActionMetaLike
): void {
  const normalized = asStringOrNull(value);
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setCustomUploadedDataURL === 'function') {
    cfgNs.setCustomUploadedDataURL(normalized, meta);
    return;
  }
  void setCfgCustomUploadedDataURLApi(app, normalized, meta);
}

function setCfgPreChestState(
  app: AppContainer,
  next: ProjectPreChestStateLike | unknown,
  meta?: ActionMetaLike
): void {
  const normalized: ProjectPreChestStateLike = readRecord(next) || null;
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setPreChestState === 'function') {
    cfgNs.setPreChestState(normalized, meta);
    return;
  }
  void cfgSetScalarApi(app, 'preChestState', normalized, meta);
}

function applyProjectConfigSnapshot(app: AppContainer, snapshot: UnknownRecord, meta?: ActionMetaLike): void {
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.applyProjectSnapshot === 'function') {
    cfgNs.applyProjectSnapshot(snapshot, meta);
    return;
  }
  void applyConfigPatchReplaceKeysApi(
    app,
    snapshot,
    {
      modulesConfiguration: true,
      stackSplitLowerModulesConfiguration: true,
      cornerConfiguration: true,
      groovesMap: true,
      splitDoorsMap: true,
      splitDoorsBottomMap: true,
      removedDoorsMap: true,
      drawerDividersMap: true,
      individualColors: true,
      doorSpecialMap: true,
      doorStyleMap: true,
      savedColors: true,
      handlesMap: true,
      hingeMap: true,
      curtainMap: true,
      doorTrimMap: true,
    },
    meta
  );
}

export { applyProjectConfigSnapshot, setCfgCustomUploadedDataURL, setCfgPreChestState, setCfgSavedNotes };
