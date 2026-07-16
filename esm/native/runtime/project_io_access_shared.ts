import type {
  ProjectIoRuntimeLike,
  ProjectIoServiceLike,
  ProjectLoadFailFastOpts,
  ProjectLoadOpts,
} from '../../../types';

import { asRecord, createNullRecord } from './record.js';
import { reportError } from './errors.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import type { ProjectLoadActionResult } from './project_load_action_result.js';

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

export function buildProjectIoLoadFailureMessage(
  result: ProjectLoadActionResult,
  label: string,
  defaultErrorMessage: string
): string {
  const message = 'message' in result && typeof result.message === 'string' ? result.message.trim() : '';
  if (message) return message;
  const reason = 'reason' in result && typeof result.reason === 'string' ? result.reason.trim() : '';
  if (reason === 'not-installed') return `[WardrobePro] ${label} is not installed.`;
  if (reason === 'invalid') return `[WardrobePro] ${label} returned an invalid result.`;
  if (reason === 'superseded') return `[WardrobePro] ${label} was superseded.`;
  return defaultErrorMessage;
}

export function buildAutosaveRestoreLoadOpts(opts?: ProjectLoadOpts): ProjectLoadFailFastOpts {
  const nextMeta = opts?.meta && typeof opts.meta === 'object' ? { ...opts.meta } : {};
  if (typeof nextMeta.source !== 'string' || !nextMeta.source.trim()) nextMeta.source = 'restore.local';
  return {
    ...(opts && typeof opts === 'object' ? opts : {}),
    queueIfBusy: false,
    toast: typeof opts?.toast === 'boolean' ? opts.toast : false,
    meta: nextMeta,
  };
}
