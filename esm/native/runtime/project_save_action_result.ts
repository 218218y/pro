import { normalizeUnknownError } from './error_normalization.js';
import { asRecord } from './record.js';

export type ProjectSaveFailureReason =
  | 'cancelled'
  | 'download-unavailable'
  | 'not-installed'
  | 'invalid'
  | 'superseded'
  | 'busy'
  | 'error';

export type ProjectSavePendingResult = {
  ok: true;
  pending: true;
};

export type ProjectSaveSuccessResult = {
  ok: true;
  pending?: false | undefined;
};

export type ProjectSaveFailureResult = {
  ok: false;
  reason: ProjectSaveFailureReason;
  message?: string;
};

export type ProjectSaveActionResult =
  | ProjectSavePendingResult
  | ProjectSaveSuccessResult
  | ProjectSaveFailureResult;

type ProjectSaveResultRecord = {
  ok?: unknown;
  pending?: unknown;
  reason?: unknown;
  message?: unknown;
};

export function normalizeProjectSaveFailureReason(
  value: unknown,
  fallbackReason: ProjectSaveFailureReason = 'error'
): ProjectSaveFailureReason {
  const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : '';
  switch (trimmed) {
    case 'cancelled':
    case 'download-unavailable':
    case 'not-installed':
    case 'invalid':
    case 'superseded':
    case 'busy':
    case 'error':
      return trimmed;
    case 'download unavailable':
    case 'download_unavailable':
      return 'download-unavailable';
    case 'not installed':
    case 'not_installed':
      return 'not-installed';
    default:
      return fallbackReason;
  }
}

export function normalizeProjectSaveActionResult(
  value: unknown,
  fallbackReason: ProjectSaveFailureReason = 'not-installed'
): ProjectSaveActionResult {
  if (value === true) return { ok: true };
  if (value === false) return { ok: false, reason: fallbackReason };

  const rec = asRecord<ProjectSaveResultRecord>(value);
  if (!rec) return { ok: false, reason: fallbackReason };

  if (rec.ok === true) {
    return rec.pending === true ? { ok: true, pending: true } : { ok: true };
  }

  const reason = normalizeProjectSaveFailureReason(rec.reason, fallbackReason);
  const message = typeof rec.message === 'string' && rec.message.trim() ? rec.message.trim() : undefined;
  return message ? { ok: false, reason, message } : { ok: false, reason };
}

export function buildProjectSaveActionErrorResult(
  error: unknown,
  fallbackMessage: string
): ProjectSaveFailureResult {
  return {
    ok: false,
    reason: 'error',
    message: normalizeUnknownError(error, fallbackMessage).message,
  };
}
