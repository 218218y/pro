import type { AutosaveServiceLike, ProjectLoadInputLike } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import { getStorageKey, getStorageString, removeStorageKey } from './storage_access.js';

export type AutosaveInfoLike = {
  timestamp?: number;
  dateString?: string;
};

export type AutosavePayloadStorageReadResult =
  | { ok: true; payload: ProjectLoadInputLike }
  | { ok: false; reason: 'missing-autosave' | 'invalid' };

function asAutosaveService(value: unknown): AutosaveServiceLike | null {
  return asRecord<AutosaveServiceLike>(value);
}

function callBooleanMethod(
  owner: AutosaveServiceLike | null,
  key: 'cancelPending' | 'flushPending' | 'forceSaveNow'
): boolean {
  const fn = owner ? owner[key] : null;
  if (typeof fn !== 'function') return false;
  return !!Reflect.apply(fn, owner, []);
}

function getAutosaveStorageKey(App: unknown): string {
  return getStorageKey(App, 'AUTOSAVE_LATEST', 'wardrobe_autosave_latest');
}

function clearInvalidAutosaveStorage(App: unknown, autosaveKey: string): void {
  try {
    removeStorageKey(App, autosaveKey);
  } catch {
    // ignore autosave cleanup failures
  }
}

export function normalizeAutosavePayload(value: unknown): ProjectLoadInputLike | null {
  return asRecord<ProjectLoadInputLike>(value);
}

export function normalizeAutosaveInfo(value: unknown): AutosaveInfoLike | null {
  const rec = asRecord<Record<string, unknown>>(value);
  if (!rec) return null;

  const out: AutosaveInfoLike = {};
  if (typeof rec.timestamp === 'number' && Number.isFinite(rec.timestamp)) out.timestamp = rec.timestamp;
  if (typeof rec.dateString === 'string') out.dateString = rec.dateString;
  return out;
}

export function readAutosavePayloadFromStorageResult(App: unknown): AutosavePayloadStorageReadResult {
  const autosaveKey = getAutosaveStorageKey(App);
  const autosaveData = getStorageString(App, autosaveKey);
  if (typeof autosaveData !== 'string' || !autosaveData) return { ok: false, reason: 'missing-autosave' };

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(autosaveData);
  } catch {
    clearInvalidAutosaveStorage(App, autosaveKey);
    return { ok: false, reason: 'invalid' };
  }

  const payload = normalizeAutosavePayload(parsedData);
  if (!payload) {
    clearInvalidAutosaveStorage(App, autosaveKey);
    return { ok: false, reason: 'invalid' };
  }

  return { ok: true, payload };
}

export function readAutosavePayloadFromStorage(App: unknown): ProjectLoadInputLike | null {
  const result = readAutosavePayloadFromStorageResult(App);
  return result.ok ? result.payload : null;
}

export function readAutosaveInfoFromStorage(App: unknown): AutosaveInfoLike | null {
  const payload = readAutosavePayloadFromStorage(App);
  return payload ? normalizeAutosaveInfo(payload) : null;
}

export function getAutosaveServiceMaybe(App: unknown): AutosaveServiceLike | null {
  try {
    return asAutosaveService(getServiceSlotMaybe<AutosaveServiceLike>(App, 'autosave'));
  } catch {
    return null;
  }
}

export function ensureAutosaveService(App: unknown): AutosaveServiceLike {
  return (
    asAutosaveService(getServiceSlotMaybe<AutosaveServiceLike>(App, 'autosave')) ||
    ensureServiceSlot<AutosaveServiceLike>(App, 'autosave')
  );
}

export function setAutosaveAllowed(App: unknown, allow: boolean): boolean {
  try {
    const svc = ensureAutosaveService(App);
    svc.allow = !!allow;
    return true;
  } catch {
    return false;
  }
}

export function scheduleAutosaveViaService(App: unknown): boolean {
  try {
    const svc = getAutosaveServiceMaybe(App);
    if (svc && typeof svc.schedule === 'function') {
      Reflect.apply(svc.schedule, svc, []);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function cancelAutosavePendingViaService(App: unknown): boolean {
  try {
    return callBooleanMethod(getAutosaveServiceMaybe(App), 'cancelPending');
  } catch {
    // ignore
  }
  return false;
}

export function flushAutosavePendingViaService(App: unknown): boolean {
  try {
    return callBooleanMethod(getAutosaveServiceMaybe(App), 'flushPending');
  } catch {
    // ignore
  }
  return false;
}

export function forceAutosaveNowViaService(App: unknown): boolean {
  try {
    return callBooleanMethod(getAutosaveServiceMaybe(App), 'forceSaveNow');
  } catch {
    // ignore
  }
  return false;
}
