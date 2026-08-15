import type {
  ActionMetaLike,
  AppContainer,
  ProjectPreChestStateLike,
  StateSnapshotTransactionHandleLike,
  UiConfigStateSnapshotLike,
  UnknownRecord,
} from '../../../../../types';

import {
  cfgSetScalar as cfgSetScalarApi,
  commitUiConfigSnapshotViaActionsOrThrow,
  setCfgCustomUploadedDataURL as setCfgCustomUploadedDataURLApi,
} from '../../../services/api.js';
import { asStringOrNull, getConfigNamespace, readRecord, readSavedNotes } from './store_actions_state.js';

function commitUiConfigSnapshot(
  app: AppContainer,
  snapshot: UiConfigStateSnapshotLike,
  meta?: ActionMetaLike
): StateSnapshotTransactionHandleLike {
  return commitUiConfigSnapshotViaActionsOrThrow(
    app,
    snapshot,
    meta,
    'Sketch No-Main ui/config snapshot transaction'
  );
}

function setCfgSavedNotes(app: AppContainer, next: unknown, meta?: ActionMetaLike): void {
  const normalized = readSavedNotes(next);
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setSavedNotes === 'function') {
    cfgNs.setSavedNotes(normalized, meta);
    return;
  }
  void cfgSetScalarApi(app, 'savedNotes', normalized, meta);
}

function setCfgCustomUploadedDataURL(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const normalized = asStringOrNull(value);
  const cfgNs = getConfigNamespace(app);
  if (typeof cfgNs.setCustomUploadedDataURL === 'function') {
    cfgNs.setCustomUploadedDataURL(normalized, meta);
    return;
  }
  void setCfgCustomUploadedDataURLApi(app, normalized, meta);
}

function setCfgPreChestState(app: AppContainer, next: unknown, meta?: ActionMetaLike): void {
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
  throw new Error(
    '[WardrobePro] applyProjectConfigSnapshot requires canonical actions.config.applyProjectSnapshot(snapshot, meta).'
  );
}

export {
  applyProjectConfigSnapshot,
  commitUiConfigSnapshot,
  setCfgCustomUploadedDataURL,
  setCfgPreChestState,
  setCfgSavedNotes,
};
