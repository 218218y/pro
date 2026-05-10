import type {
  ProjectIoLoadResultLike,
  ProjectIoRuntimeLike,
  ProjectIoServiceLike,
  ProjectLoadOpts,
} from '../../../types';

import { asRecord, createNullRecord } from './record.js';
import { reportError } from './errors.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import {
  normalizeProjectLoadActionResult,
  type ProjectLoadActionResult,
  type ProjectLoadFailureReason,
} from './project_load_action_result.js';
import type { ProjectRestoreActionResult } from './project_recovery_action_result.js';

type ProjectIoLoadFailureLike = ProjectLoadFailureReason | string;

export type { ProjectIoLoadFailureLike };

export function reportProjectIoAccessNonFatal(App: unknown, op: string, error: unknown): void {
  reportError(App, error, {
    where: 'native/runtime/project_io_access',
    op,
    fatal: false,
  });
}

export function getProjectIoServiceMaybe(App: unknown): ProjectIoServiceLike | null {
  try {
    return asRecord<ProjectIoServiceLike>(getServiceSlotMaybe(App, 'projectIO'));
  } catch {
    return null;
  }
}

export function ensureProjectIoService(App: unknown): ProjectIoServiceLike {
  const app = asRecord(App);
  if (!app) return createNullRecord<ProjectIoServiceLike>();
  const service = ensureServiceSlot<ProjectIoServiceLike>(app, 'projectIO');
  return asRecord<ProjectIoServiceLike>(service) || service;
}

export function getProjectIoRuntime(App: unknown): ProjectIoRuntimeLike | null {
  try {
    const svc = getProjectIoServiceMaybe(App);
    return svc ? asRecord<ProjectIoRuntimeLike>(svc.runtime) : null;
  } catch {
    return null;
  }
}

export function ensureProjectIoRuntime(App: unknown): ProjectIoRuntimeLike {
  const svc = ensureProjectIoService(App);
  const current = asRecord<ProjectIoRuntimeLike>(svc.runtime);
  if (current) return current;
  const next: ProjectIoRuntimeLike = {};
  svc.runtime = next;
  return next;
}

export function nextProjectIoRestoreGeneration(App: unknown): number {
  try {
    const runtime = ensureProjectIoRuntime(App);
    const cur = Number(runtime.restoreGen);
    const next = Number.isFinite(cur) && cur > 0 ? Math.floor(cur) + 1 : 1;
    runtime.restoreGen = next;
    return next;
  } catch {
    return 0;
  }
}

export function getProjectIoRestoreGeneration(App: unknown): number {
  try {
    const runtime = getProjectIoRuntime(App);
    const cur = Number(runtime?.restoreGen);
    return Number.isFinite(cur) && cur > 0 ? Math.floor(cur) : 0;
  } catch {
    return 0;
  }
}

export function isProjectIoRestoreGenerationCurrent(App: unknown, restoreGen: unknown): boolean {
  const expected = Number(restoreGen);
  if (!Number.isFinite(expected) || expected <= 0) return false;
  return getProjectIoRestoreGeneration(App) === Math.floor(expected);
}

function readProjectIoLoadResultRecord(value: unknown): ProjectIoLoadResultLike | null {
  return asRecord<ProjectIoLoadResultLike>(value);
}

export function normalizeProjectIoLoadResult(
  value: unknown,
  fallbackReason: ProjectIoLoadFailureLike = 'result'
): ProjectIoLoadResultLike {
  if (value === true) return { ok: true };
  if (value === false) return { ok: false, reason: fallbackReason };

  const rec = readProjectIoLoadResultRecord(value);
  if (!rec) return { ok: false, reason: fallbackReason };

  const ok = rec.ok === true;
  const pending = rec.pending === true;
  const restoreGenRaw = Number(rec.restoreGen);
  const restoreGen =
    Number.isFinite(restoreGenRaw) && restoreGenRaw > 0 ? Math.floor(restoreGenRaw) : undefined;
  const reason =
    typeof rec.reason === 'string' && rec.reason.trim() ? rec.reason.trim() : ok ? undefined : fallbackReason;
  const message = typeof rec.message === 'string' && rec.message.trim() ? rec.message.trim() : undefined;

  return {
    ok,
    ...(typeof restoreGen === 'number' ? { restoreGen } : {}),
    ...(pending ? { pending: true } : {}),
    ...(reason ? { reason } : {}),
    ...(message ? { message } : {}),
  };
}

export function normalizeProjectLoadActionResultViaProjectIo(
  value: unknown,
  fallbackReason: ProjectLoadFailureReason = 'error'
): ProjectLoadActionResult {
  return normalizeProjectLoadActionResult(value, fallbackReason);
}

export function buildProjectIoLoadFailureMessage(
  result: ProjectLoadActionResult | ProjectIoLoadResultLike | ProjectRestoreActionResult,
  label: string,
  errorFallback: string
): string {
  const message = 'message' in result && typeof result.message === 'string' ? result.message.trim() : '';
  if (message) return message;
  const reason = 'reason' in result && typeof result.reason === 'string' ? result.reason.trim() : '';
  if (reason === 'not-installed') return `[WardrobePro] ${label} is not installed.`;
  if (reason === 'invalid') return `[WardrobePro] ${label} returned an invalid result.`;
  if (reason === 'superseded') return `[WardrobePro] ${label} was superseded.`;
  if ('pending' in result && result.pending === true) {
    return `[WardrobePro] ${label} returned an unexpected pending result.`;
  }
  return errorFallback;
}

export function buildAutosaveRestoreLoadOpts(opts?: ProjectLoadOpts): ProjectLoadOpts {
  const nextMeta = opts?.meta && typeof opts.meta === 'object' ? { ...opts.meta } : {};
  if (typeof nextMeta.source !== 'string' || !nextMeta.source.trim()) nextMeta.source = 'restore.local';
  return {
    ...(opts && typeof opts === 'object' ? opts : {}),
    toast: typeof opts?.toast === 'boolean' ? opts.toast : false,
    meta: nextMeta,
  };
}
