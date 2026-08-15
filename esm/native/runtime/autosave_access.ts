import type {
  AutosaveOwnerRefreshResult,
  AutosaveReadinessDiagnosticDetail,
  AutosaveRuntimeRefreshResult,
  AutosaveServiceLike,
  AutosaveSuspensionLike,
  ProjectLoadInputLike,
} from '../../../types';

import { asRecord } from './record.js';
import { reportError } from './errors.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import { getStorageKey, getStorageString, removeStorageKey } from './storage_access.js';

export type AutosaveInfoLike = {
  timestamp?: number;
  dateString?: string;
};

export type AutosavePayloadStorageReadResult =
  { ok: true; payload: ProjectLoadInputLike } | { ok: false; reason: 'missing-autosave' | 'invalid' };

const AUTOSAVE_READINESS_DETAILS = new Set<AutosaveReadinessDiagnosticDetail>([
  'system-not-ready',
  'restore-in-progress',
  'runtime-state-unavailable',
]);

const SAFE_AUTOSAVE_OWNER_ERROR_NAMES = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'EvalError',
  'AggregateError',
]);

function reportAutosaveAccessNonFatal(App: unknown, op: string, error: unknown): void {
  reportError(App, error, { where: 'native/runtime/autosave_access', op, fatal: false });
}

function asAutosaveService(value: unknown): AutosaveServiceLike | null {
  return asRecord<AutosaveServiceLike>(value);
}

function callBooleanMethod(
  owner: AutosaveServiceLike | null,
  key: 'cancelPending' | 'flushPending'
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
  const payload = asRecord<ProjectLoadInputLike>(value);
  if (!payload) return null;

  // Autosave used to stamp a retired root `version` field for its own bookkeeping.
  // Current project payloads use `__schema`/`__version`, and the project loader
  // correctly rejects root `version` as retired import data. Keep that strict
  // project-file validation intact, but sanitize this autosave-only seam so older
  // localStorage entries written by the autosave service remain restorable.
  if (!Object.prototype.hasOwnProperty.call(payload, 'version')) return payload;

  const normalized: ProjectLoadInputLike = { ...payload };
  delete (normalized as Record<string, unknown>).version;
  return normalized;
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
  } catch (error) {
    reportAutosaveAccessNonFatal(App, 'schedule.ownerRejected', error);
  }
  return false;
}

export function cancelAutosavePendingViaService(App: unknown): boolean {
  try {
    return callBooleanMethod(getAutosaveServiceMaybe(App), 'cancelPending');
  } catch (error) {
    reportAutosaveAccessNonFatal(App, 'cancelPending.ownerRejected', error);
  }
  return false;
}

export function flushAutosavePendingViaService(App: unknown): boolean {
  try {
    return callBooleanMethod(getAutosaveServiceMaybe(App), 'flushPending');
  } catch (error) {
    reportAutosaveAccessNonFatal(App, 'flushPending.ownerRejected', error);
  }
  return false;
}

export function forceAutosaveNowViaService(App: unknown): boolean {
  return forceAutosaveNowResultViaService(App).ok;
}

function observeRejectedThenable(value: unknown): boolean {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return false;

  let then: unknown;
  try {
    then = Reflect.get(value, 'then');
  } catch {
    return false;
  }
  if (typeof then !== 'function') return false;

  try {
    void Promise.resolve(value).catch(() => {
      // Malformed async owners remain isolated; rejection data is intentionally discarded.
    });
  } catch {
    // Thenable observation is diagnostic containment only and must remain best-effort.
  }
  return true;
}

function normalizeAutosaveOwnerRefreshResult(value: unknown): AutosaveOwnerRefreshResult | null {
  const result = asRecord<Record<string, unknown>>(value);
  if (!result) return null;
  try {
    if (typeof Reflect.get(result, 'then') === 'function') return null;
  } catch {
    return null;
  }

  const hasExactKeys = (expected: readonly string[]): boolean => {
    try {
      const keys = Reflect.ownKeys(result);
      return keys.length === expected.length && expected.every(key => keys.includes(key));
    } catch {
      return false;
    }
  };

  if (result.ok === true) return hasExactKeys(['ok']) ? { ok: true } : null;
  const reason = result?.reason;
  if (result?.ok !== false || typeof reason !== 'string') return null;

  if (
    reason === 'autosave-not-ready' &&
    hasExactKeys(['ok', 'reason', 'detail']) &&
    typeof result.detail === 'string' &&
    AUTOSAVE_READINESS_DETAILS.has(result.detail as AutosaveReadinessDiagnosticDetail)
  ) {
    return {
      ok: false,
      reason: 'autosave-not-ready',
      detail: result.detail as AutosaveReadinessDiagnosticDetail,
    };
  }
  if (reason === 'snapshot-unavailable' && hasExactKeys(['ok', 'reason'])) {
    return { ok: false, reason: 'snapshot-unavailable' };
  }
  if (reason === 'storage-write-failed' && hasExactKeys(['ok', 'reason'])) {
    return { ok: false, reason: 'storage-write-failed' };
  }
  return null;
}

export function createAutosaveOwnerDiagnosticError(error: unknown): Error {
  let safeErrorName = 'Error';
  try {
    const candidate = error instanceof Error ? error.name : '';
    if (SAFE_AUTOSAVE_OWNER_ERROR_NAMES.has(candidate)) safeErrorName = candidate;
  } catch {
    // A hostile thrown value must not leak through diagnostic normalization.
  }
  return new Error(`Autosave owner threw: ${safeErrorName}`);
}

export function forceAutosaveNowResultViaService(
  App: unknown,
  reportOwnerThrow?: (error: Error) => void
): AutosaveRuntimeRefreshResult {
  let service: AutosaveServiceLike | null;
  try {
    service = getAutosaveServiceMaybe(App);
  } catch {
    return { ok: false, reason: 'service-unavailable' };
  }
  if (!service) return { ok: false, reason: 'service-unavailable' };

  try {
    if (typeof service.forceSaveNowResult === 'function') {
      const ownerResult = Reflect.apply(service.forceSaveNowResult, service, []);
      if (observeRejectedThenable(ownerResult)) {
        return { ok: false, reason: 'owner-rejected', detail: 'owner-invalid-result' };
      }
      const result = normalizeAutosaveOwnerRefreshResult(ownerResult);
      return result || { ok: false, reason: 'owner-rejected', detail: 'owner-invalid-result' };
    }

    return { ok: false, reason: 'service-unavailable' };
  } catch (error) {
    try {
      reportOwnerThrow?.(createAutosaveOwnerDiagnosticError(error));
    } catch {
      // Diagnostics must not replace the autosave owner failure.
    }
    return { ok: false, reason: 'owner-rejected', detail: 'owner-threw' };
  }
}

export function suspendAutosaveViaServiceOrThrow(App: unknown): AutosaveSuspensionLike {
  const service = getAutosaveServiceMaybe(App);
  if (!service || typeof service.suspend !== 'function') {
    throw new Error('[WardrobePro] project load requires services.autosave.suspend().');
  }
  const suspension = Reflect.apply(service.suspend, service, []);
  if (!suspension || typeof suspension.commit !== 'function' || typeof suspension.resume !== 'function') {
    throw new Error('[WardrobePro] autosave.suspend() returned an invalid compensation handle.');
  }
  return suspension;
}
