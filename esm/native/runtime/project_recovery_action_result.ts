import type {
  ProjectRecoverySuccessResult,
  ProjectResetDefaultActionResult,
  ProjectResetDefaultFailureReason,
  ProjectResetDefaultFailureResult,
  ProjectRestoreActionResult,
  ProjectRestoreFailureReason,
  ProjectRestoreFailureResult,
} from '../../../types';

export type {
  ProjectRecoverySuccessResult,
  ProjectResetDefaultActionResult,
  ProjectResetDefaultFailureReason,
  ProjectResetDefaultFailureResult,
  ProjectRestoreActionResult,
  ProjectRestoreFailureReason,
  ProjectRestoreFailureResult,
} from '../../../types';

import { normalizeUnknownError } from './error_normalization.js';
import { asRecord } from './record.js';
import { buildProjectLoadSuccessResult } from './project_load_action_result.js';

type ProjectRecoveryResultRecord = {
  ok?: unknown;
  pending?: unknown;
  restoreGen?: unknown;
  reason?: unknown;
  message?: unknown;
  warnings?: unknown;
};

function normalizeRecoveryMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function buildProjectRecoverySuccessResult(options?: {
  restoreGen?: unknown;
  warnings?: unknown;
}): ProjectRecoverySuccessResult {
  return buildProjectLoadSuccessResult(options);
}

function buildUnsupportedPendingRestoreFailure(): ProjectRestoreFailureResult {
  return buildProjectRestoreFailureResult('error', {
    message: 'Legacy pending restore results are not supported; recovery operations must settle terminally.',
  });
}

function buildUnsupportedPendingResetFailure(): ProjectResetDefaultFailureResult {
  return buildProjectResetDefaultFailureResult('error', {
    message: 'Legacy pending reset results are not supported; recovery operations must settle terminally.',
  });
}

function normalizeProjectRestoreFailureReason(
  value: unknown,
  defaultReason: ProjectRestoreFailureReason = 'error'
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
      return defaultReason;
  }
}

function normalizeProjectResetDefaultFailureReason(
  value: unknown,
  defaultReason: ProjectResetDefaultFailureReason = 'error'
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
      return defaultReason;
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
  defaultReason: ProjectRestoreFailureReason = 'error'
): ProjectRestoreActionResult {
  if (value === true) return buildProjectRecoverySuccessResult();
  if (value === false) return buildProjectRestoreFailureResult(defaultReason);

  const rec = asRecord<ProjectRecoveryResultRecord>(value);
  if (!rec) return buildProjectRestoreFailureResult(defaultReason);
  if (rec.pending === true) return buildUnsupportedPendingRestoreFailure();
  if (rec.ok === true) return buildProjectRecoverySuccessResult(rec);

  return buildProjectRestoreFailureResult(
    normalizeProjectRestoreFailureReason(rec.reason, defaultReason),
    rec
  );
}

export function normalizeProjectResetDefaultActionResult(
  value: unknown,
  defaultReason: ProjectResetDefaultFailureReason = 'error'
): ProjectResetDefaultActionResult {
  if (value === true) return buildProjectRecoverySuccessResult();
  if (value === false) return buildProjectResetDefaultFailureResult(defaultReason);

  const rec = asRecord<ProjectRecoveryResultRecord>(value);
  if (!rec) return buildProjectResetDefaultFailureResult(defaultReason);
  if (rec.pending === true) return buildUnsupportedPendingResetFailure();
  if (rec.ok === true) return buildProjectRecoverySuccessResult(rec);

  return buildProjectResetDefaultFailureResult(
    normalizeProjectResetDefaultFailureReason(rec.reason, defaultReason),
    rec
  );
}

export function buildProjectRestoreActionErrorResult(
  error: unknown,
  defaultMessage: string
): ProjectRestoreFailureResult {
  return buildProjectRestoreFailureResult('error', {
    message: normalizeUnknownError(error, defaultMessage).message,
  });
}

export function buildProjectResetDefaultActionErrorResult(
  error: unknown,
  defaultMessage: string
): ProjectResetDefaultFailureResult {
  return buildProjectResetDefaultFailureResult('error', {
    message: normalizeUnknownError(error, defaultMessage).message,
  });
}
