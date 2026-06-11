// Cloud Sync shared support owner.
//
// Keeps the public support surface stable while delegating focused concerns to
// dedicated support modules:
// - shared normalization + payload readers
// - feedback/reporting/meta helpers
// - storage wrapping + local/remote collections
// - sketch capture helpers

export {
  normalizeModelList,
  normalizeSavedColorsList,
  asRecord,
  asString,
  asUiState,
  readCloudSyncErrorMessage,
  readCloudSyncSketchPayloadLike,
  readCloudSyncSyncPinPayloadLike,
  readCloudSyncTabsGatePayloadFields,
  readCloudSyncScalarField,
  readCloudSyncNumberOrStringField,
  readCloudSyncStringField,
  readCloudSyncJsonField,
  normalizeList,
  readPayloadList,
  hasPayloadKey,
  safeParseJSON,
  cloneRuntimeStatus,
  buildRuntimeStatusSnapshotKey,
  computeHash,
  hashString32,
  parseIsoTimeMs,
} from './cloud_sync_support_shared.js';

export {
  _cloudSyncReportNonFatal,
  buildUiOnlyMeta,
  buildRestoreMeta,
  applyCloudSyncUiPatch,
  __wp_toast,
} from './cloud_sync_support_feedback.js';

export {
  storageWithMarker,
  restoreWrappedStorageFns,
  rememberWrappedStorageFns,
  getStorage,
  readLocal,
  applyRemote,
} from './cloud_sync_support_storage.js';

export { captureSketchSnapshot } from './cloud_sync_support_capture.js';
