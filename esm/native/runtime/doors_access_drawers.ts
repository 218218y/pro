import type {
  BuilderDrawerRebuildIntentSnapshot,
  BuilderDrawerRebuildMotionSnapshot,
  UnknownRecord,
} from '../../../types';

import { asRecord } from './record.js';
import {
  asKey,
  createNullProtoRecord,
  type DrawerRuntimeLike,
  type MutableRecord,
} from './doors_access_shared.js';
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

export function setDrawerRebuildIntent(
  App: unknown,
  drawerId: unknown,
  opts?: Readonly<{ preserveMotion?: boolean; motion?: BuilderDrawerRebuildMotionSnapshot | null }>
): unknown {
  const targetId = drawerId == null ? null : typeof drawerId === 'number' ? drawerId : asKey(drawerId);
  const runtime = initDrawerRuntime(App);
  const currentVersion = Number(runtime.rebuildIntentVersion);
  runtime.rebuildIntentVersion = currentVersion >= Number.MAX_SAFE_INTEGER ? 1 : currentVersion + 1;
  runtime.snapAfterBuildId = targetId;
  runtime.openAfterBuildId = targetId;
  runtime.preserveMotionAfterBuild = opts?.preserveMotion === true;
  runtime.rebuildMotionSnapshot = runtime.preserveMotionAfterBuild ? (opts?.motion ?? null) : null;
  return targetId;
}

export function clearDrawerRebuildIntent(App: unknown): void {
  const runtime = initDrawerRuntime(App);
  runtime.snapAfterBuildId = null;
  runtime.openAfterBuildId = null;
  runtime.preserveMotionAfterBuild = false;
  runtime.rebuildMotionSnapshot = null;
}

export function getDrawerRebuildIntent(App: unknown): unknown {
  const runtime = asRecord<DrawerRuntimeLike>(getDrawerService(App)?.runtime);
  if (!runtime) return null;
  const targetId = runtime.snapAfterBuildId ?? runtime.openAfterBuildId ?? null;
  return typeof targetId === 'string' || typeof targetId === 'number' ? targetId : null;
}

export function getDrawerRebuildIntentSnapshot(App: unknown): BuilderDrawerRebuildIntentSnapshot | null {
  const runtime = asRecord<DrawerRuntimeLike>(getDrawerService(App)?.runtime);
  const targetId = getDrawerRebuildIntent(App);
  if (!runtime || (typeof targetId !== 'string' && typeof targetId !== 'number')) return null;
  const version = Number(runtime.rebuildIntentVersion);
  const preserveMotion = runtime.preserveMotionAfterBuild === true;
  const base = {
    targetId,
    version: Number.isSafeInteger(version) && version >= 0 ? version : 0,
  };
  if (!preserveMotion) return Object.freeze(base);
  const motion = runtime.rebuildMotionSnapshot as BuilderDrawerRebuildMotionSnapshot | null | undefined;
  return Object.freeze({ ...base, preserveMotion: true, motion: motion ?? null });
}

function sameRebuildIntent(
  current: BuilderDrawerRebuildIntentSnapshot | null,
  expected: BuilderDrawerRebuildIntentSnapshot | null
): boolean {
  return !!(
    current &&
    expected &&
    String(current.targetId) === String(expected.targetId) &&
    current.version === expected.version
  );
}

export function consumeDrawerRebuildIntent(
  App: unknown,
  expected?: BuilderDrawerRebuildIntentSnapshot | null
): unknown {
  const current = getDrawerRebuildIntentSnapshot(App);
  if (expected !== undefined && !sameRebuildIntent(current, expected)) return null;
  const targetId = current?.targetId ?? null;
  clearDrawerRebuildIntent(App);
  return targetId;
}

export { getDrawerRuntime, initDrawerRuntime };
