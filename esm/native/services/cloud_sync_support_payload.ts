import type {
  CloudSyncSketchPayload,
  CloudSyncSyncPinPayload,
  CloudSyncTabsGatePayload,
} from '../../../types';

import {
  asRecord,
  readCloudSyncJsonField,
  readCloudSyncNumberOrStringField,
  readCloudSyncScalarField,
  readCloudSyncStringField,
} from './cloud_sync_support_shared_core.js';

export function readCloudSyncSketchPayloadLike(payload: unknown): CloudSyncSketchPayload | null {
  const rec = asRecord(payload);
  if (!rec) return null;
  return {
    sketchRev: readCloudSyncNumberOrStringField(rec.sketchRev),
    sketchHash: readCloudSyncStringField(rec.sketchHash),
    sketchBy: readCloudSyncStringField(rec.sketchBy),
    sketch: readCloudSyncJsonField(rec.sketch),
  };
}

export function readCloudSyncSyncPinPayloadLike(payload: unknown): CloudSyncSyncPinPayload | null {
  const rec = asRecord(payload);
  if (!rec) return null;
  return {
    syncPinEnabled: readCloudSyncScalarField(rec.syncPinEnabled),
    syncPinRev: readCloudSyncNumberOrStringField(rec.syncPinRev),
    syncPinBy: readCloudSyncStringField(rec.syncPinBy),
  };
}

export function readCloudSyncTabsGatePayloadFields(payload: unknown): CloudSyncTabsGatePayload | null {
  const rec = asRecord(payload);
  if (!rec) return null;
  return {
    tabsGateOpen: readCloudSyncScalarField(rec.tabsGateOpen),
    tabsGateUntil: readCloudSyncNumberOrStringField(rec.tabsGateUntil),
    tabsGateRev: readCloudSyncNumberOrStringField(rec.tabsGateRev),
    tabsGateBy: readCloudSyncStringField(rec.tabsGateBy),
  };
}
