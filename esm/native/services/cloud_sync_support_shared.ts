// Cloud sync support shared facade.
//
// Keeps the public shared surface stable while delegating focused concerns to:
// - core normalization + payload field readers
// - payload section readers
// - runtime status canonicalization
// - stable serialization + hashing helpers

export {
  asRecord,
  asString,
  asUiState,
  normalizeModelList,
  normalizeSavedColorsList,
  readCloudSyncErrorMessage,
  readCloudSyncScalarField,
  readCloudSyncNumberOrStringField,
  readCloudSyncStringField,
  readCloudSyncJsonField,
  normalizeList,
  readPayloadList,
  hasPayloadKey,
  safeParseJSON,
} from './cloud_sync_support_shared_core.js';

export {
  readCloudSyncSketchPayloadLike,
  readCloudSyncSyncPinPayloadLike,
  readCloudSyncTabsGatePayloadFields,
} from './cloud_sync_support_payload.js';

export { cloneRuntimeStatus, buildRuntimeStatusSnapshotKey } from './cloud_sync_support_runtime_status.js';

export {
  stableSerializeCloudSyncValue,
  computeHash,
  hashString32,
  parseIsoTimeMs,
} from './cloud_sync_support_serialize.js';

export type { CloudSyncStableSerializeOptions } from './cloud_sync_support_serialize.js';
