import type {
  CloudSyncSketchState,
  CloudSyncSyncPinState,
  CloudSyncTabsGatePayload,
  CloudSyncTabsGateState,
} from '../../../types';

import { asBool, asNumber } from './cloud_sync_config.js';
import {
  readCloudSyncNumberOrStringField,
  readCloudSyncScalarField,
  readCloudSyncSketchPayloadLike,
  readCloudSyncStringField,
  readCloudSyncSyncPinPayloadLike,
  readCloudSyncTabsGatePayloadFields,
} from './cloud_sync_support.js';

function resolveCloudSyncBooleanState(value: unknown): boolean {
  const normalized = readCloudSyncScalarField(value);
  return normalized === true || normalized === false ? normalized : (asBool(normalized) ?? false);
}

function resolveCloudSyncNumberState(value: unknown): number {
  const normalized = readCloudSyncNumberOrStringField(value);
  return typeof normalized === 'number' ? normalized : (asNumber(normalized) ?? 0);
}

function resolveCloudSyncTrimmedStringState(value: unknown): string {
  const normalized = readCloudSyncStringField(value);
  return typeof normalized === 'string' ? normalized.trim() : '';
}

function resolveCloudSyncTabsGateUntilMs(
  payload: CloudSyncTabsGatePayload,
  updatedAt: string,
  ttlMs: number
): number {
  const normalized = readCloudSyncNumberOrStringField(payload.tabsGateUntil);
  const explicitUntil = typeof normalized === 'number' ? normalized : asNumber(normalized);
  if (explicitUntil) return explicitUntil;
  if (!resolveCloudSyncBooleanState(payload.tabsGateOpen)) return 0;
  const parsedUpdatedAt = Date.parse(String(updatedAt || ''));
  return Number.isFinite(parsedUpdatedAt) && parsedUpdatedAt > 0 ? parsedUpdatedAt + ttlMs : 0;
}

export function parseFloatingSyncPayload(payload: unknown): CloudSyncSyncPinState {
  const rec = readCloudSyncSyncPinPayloadLike(payload);
  if (!rec) return { enabled: false, rev: 0, by: '' };
  return {
    enabled: resolveCloudSyncBooleanState(rec.syncPinEnabled),
    rev: resolveCloudSyncNumberState(rec.syncPinRev),
    by: resolveCloudSyncTrimmedStringState(rec.syncPinBy),
  };
}

export function parseSketchPayload(payload: unknown): CloudSyncSketchState {
  const rec = readCloudSyncSketchPayloadLike(payload);
  if (!rec) return { rev: 0, hash: '', by: '', sketch: undefined };
  return {
    rev: resolveCloudSyncNumberState(rec.sketchRev),
    hash: resolveCloudSyncTrimmedStringState(rec.sketchHash),
    by: resolveCloudSyncTrimmedStringState(rec.sketchBy),
    sketch: rec.sketch,
  };
}

export function resolveCloudSyncTabsGateState(
  payload: unknown,
  updatedAt: string,
  ttlMs: number,
  now = Date.now()
): CloudSyncTabsGateState {
  const rec = readCloudSyncTabsGatePayloadFields(payload);
  if (!rec) return { open: false, until: 0, rev: 0, by: '' };
  const until = resolveCloudSyncTabsGateUntilMs(rec, updatedAt, ttlMs);
  return {
    open: resolveCloudSyncBooleanState(rec.tabsGateOpen) && until > now,
    until,
    rev: resolveCloudSyncNumberState(rec.tabsGateRev),
    by: resolveCloudSyncTrimmedStringState(rec.tabsGateBy),
  };
}
