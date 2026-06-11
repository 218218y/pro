import type { ProjectIoLoadResultLike } from '../../../types';

import { normalizeUnknownError } from './error_normalization.js';
import { asRecord } from './record.js';

export type ProjectRecoverySuccessResult = {
  ok: true;
  pending?: true | undefined;
  restoreGen?: number | undefined;
};

export type ProjectRestoreFailureReason =
  | 'busy'
  | 'cancelled'
  | 'missing-autosave'
  | 'invalid'
  | 'not-installed'
  | 'superseded'
  | 'error';

export type ProjectResetDefaultFailureReason =
  | 'busy'
  | 'cancelled'
  | 'invalid'
  | 'not-installed'
  | 'superseded'
  | 'error';

export type ProjectRestoreFailureResult = {
  ok: false;
  reason: ProjectRestoreFailureReason;
  message?: string;
};

export type ProjectResetDefaultFailureResult = {
  ok: false;
  reason: ProjectResetDefaultFailureReason;
  message?: string;
};

export type ProjectRestoreActionResult = ProjectRecoverySuccessResult | ProjectRestoreFailureResult;
export type ProjectResetDefaultActionResult = ProjectRecoverySuccessResult | ProjectResetDefaultFailureResult;

type ProjectRecoveryResultRecord = {
  ok?: unknown;
  pending?: unknown;
  restoreGen?: unknown;
  reason?: unknown;
  message?: unknown;
};

function normalizeRecoveryMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeRecoveryRestoreGen(value: unknown): number | undefined {
  const restoreGen = Number(value);
  return Number.isFinite(restoreGen) && restoreGen > 0 ? Math.floor(restoreGen) : undefined;
}

export function buildProjectRecoverySuccessResult(options?: {
  pending?: unknown;
  restoreGen?: unknown;
}): ProjectRecoverySuccessResult {
  const restoreGen = normalizeRecoveryRestoreGen(options?.restoreGen);
  const result: ProjectRecoverySuccessResult = { ok: true };
  if (options?.pending === true) result.pending = true;
  if (typeof restoreGen === 'number') result.restoreGen = restoreGen;
  return result;
}

function normalizeProjectRestoreFailureReason(
  value: unknown,
  fallbackReason: ProjectRestoreFailureReason = 'error'
): ProjectRestoreFailureReason {
  const reason = typeof value === 'string' ? value.trim().toLowerCase() : '';
  switch (reason) {
    case 'busy':
    case 'cancelled':
    case 'missing-autosave':
    case 'invalid':
    case 'not-installed':
    case 'superseded':
    case 'error':
      return reason;
    case 'missing_autosave':
    case 'missing autosave':
      return 'missing-autosave';
    case 'not_installed':
    case 'not installed':
      return 'not-installed';
    case 'restore':
    case 'result':
    case 'load':
    case 'reset':
      return 'error';
    default:
      return fallbackReason;
  }
}

function normalizeProjectResetDefaultFailureReason(
  value: unknown,
  fallbackReason: ProjectResetDefaultFailureReason = 'error'
): ProjectResetDefaultFailureReason {
  const reason = typeof value === 'string' ? value.trim().toLowerCase() : '';
  switch (reason) {
    case 'busy':
    case 'cancelled':
    case 'invalid':
    case 'not-installed':
    case 'superseded':
    case 'error':
      return reason;
    case 'not_installed':
    case 'not installed':
      return 'not-installed';
    case 'reset':
    case 'result':
    case 'load':
      return 'error';
    default:
      return fallbackReason;
  }
}

export function buildProjectRestoreFailureResult(
  reason: unknown,
  options?: {
    message?: unknown;
  }
): ProjectRestoreFailureResult {
  const normalizedReason = normalizeProjectRestoreFailureReason(reason, 'error');
  const message = normalizeRecoveryMessage(options?.message);
  return {
    ok: false,
    reason: normalizedReason,
    ...(message ? { message } : {}),
  };
}

export function buildProjectResetDefaultFailureResult(
  reason: unknown,
  options?: {
    message?: unknown;
  }
): ProjectResetDefaultFailureResult {
  const normalizedReason = normalizeProjectResetDefaultFailureReason(reason, 'error');
  const message = normalizeRecoveryMessage(options?.message);
  return {
    ok: false,
    reason: normalizedReason,
    ...(message ? { message } : {}),
  };
}

export function normalizeProjectRestoreActionResult(
  value: unknown,
  fallbackReason: ProjectRestoreFailureReason = 'error'
): ProjectRestoreActionResult {
  if (value === true) return buildProjectRecoverySuccessResult();
  if (value === false) return buildProjectRestoreFailureResult(fallbackReason);

  const rec = asRecord<ProjectRecoveryResultRecord>(value);
  if (!rec) return buildProjectRestoreFailureResult(fallbackReason);
  if (rec.ok === true) return buildProjectRecoverySuccessResult(rec);

  return buildProjectRestoreFailureResult(
    normalizeProjectRestoreFailureReason(rec.reason, fallbackReason),
    rec
  );
}

export function normalizeProjectResetDefaultActionResult(
  value: unknown,
  fallbackReason: ProjectResetDefaultFailureReason = 'error'
): ProjectResetDefaultActionResult {
  if (value === true) return buildProjectRecoverySuccessResult();
  if (value === false) return buildProjectResetDefaultFailureResult(fallbackReason);

  const rec = asRecord<ProjectRecoveryResultRecord>(value);
  if (!rec) return buildProjectResetDefaultFailureResult(fallbackReason);
  if (rec.ok === true) return buildProjectRecoverySuccessResult(rec);

  return buildProjectResetDefaultFailureResult(
    normalizeProjectResetDefaultFailureReason(rec.reason, fallbackReason),
    rec
  );
}

export function buildProjectRestoreActionErrorResult(
  error: unknown,
  fallbackMessage: string
): ProjectRestoreFailureResult {
  return buildProjectRestoreFailureResult('error', {
    message: normalizeUnknownError(error, fallbackMessage).message,
  });
}

export function buildProjectResetDefaultActionErrorResult(
  error: unknown,
  fallbackMessage: string
): ProjectResetDefaultFailureResult {
  return buildProjectResetDefaultFailureResult('error', {
    message: normalizeUnknownError(error, fallbackMessage).message,
  });
}

export function normalizeProjectRestoreLoadResult(value: unknown): ProjectIoLoadResultLike {
  return normalizeProjectRestoreActionResult(value, 'error');
}

export function normalizeProjectResetDefaultLoadResult(value: unknown): ProjectIoLoadResultLike {
  return normalizeProjectResetDefaultActionResult(value, 'error');
}
