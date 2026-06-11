import type { UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import { asKey, createNullProtoRecord, type MutableRecord } from './doors_access_shared.js';
import {
  ensureDrawerService,
  getDrawerRuntime,
  getDrawerService,
  initDrawerRuntime,
} from './doors_access_services.js';

export function getDrawerMetaMap(App: unknown): MutableRecord {
  try {
    const drawer = getDrawerService(App);
    return drawer
      ? asRecord<MutableRecord>(drawer.metaById) || createNullProtoRecord()
      : createNullProtoRecord();
  } catch {
    return createNullProtoRecord();
  }
}

export function ensureDrawerMetaMap(App: unknown): MutableRecord {
  const drawer = ensureDrawerService(App);
  const current = asRecord<MutableRecord>(drawer.metaById);
  if (current) return current;
  const next = createNullProtoRecord<MutableRecord>();
  drawer.metaById = next;
  return next;
}

export function resetDrawerMetaMap(App: unknown): MutableRecord {
  const drawer = ensureDrawerService(App);
  const next = createNullProtoRecord<MutableRecord>();
  drawer.metaById = next;
  return next;
}

export function getDrawerMetaEntry(App: unknown, drawerId: unknown): MutableRecord | null {
  const key = asKey(drawerId);
  if (!key) return null;
  return asRecord<MutableRecord>(getDrawerMetaMap(App)[key]);
}

export function setDrawerMetaEntry(App: unknown, drawerId: unknown, value: unknown): boolean {
  const key = asKey(drawerId);
  const entry = asRecord<UnknownRecord>(value);
  if (!key || !entry) return false;
  try {
    ensureDrawerMetaMap(App)[key] = entry;
    return true;
  } catch {
    return false;
  }
}

export function setDrawerRebuildIntent(App: unknown, drawerId: unknown): unknown {
  const targetId = drawerId == null ? null : typeof drawerId === 'number' ? drawerId : asKey(drawerId);
  const runtime = initDrawerRuntime(App);
  runtime.snapAfterBuildId = targetId;
  runtime.openAfterBuildId = targetId;
  return targetId;
}

export function consumeDrawerRebuildIntent(App: unknown): unknown {
  const runtime = initDrawerRuntime(App);
  const targetId = runtime.snapAfterBuildId || runtime.openAfterBuildId || null;
  runtime.snapAfterBuildId = null;
  runtime.openAfterBuildId = null;
  return targetId;
}

export { getDrawerRuntime, initDrawerRuntime };
