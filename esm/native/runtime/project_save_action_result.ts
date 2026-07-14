import { normalizeUnknownError } from './error_normalization.js';
import { asRecord } from './record.js';
import type { AsyncOperationHandle } from '../../../types';

export type ProjectSaveFailureReason =
  'cancelled' | 'download-unavailable' | 'not-installed' | 'invalid' | 'superseded' | 'busy' | 'error';

export type ProjectSaveSuccessOutcome = 'browser-delivery-completed';

export type ProjectSaveAcceptedResult = AsyncOperationHandle<ProjectSaveTerminalResult>;

export type ProjectSaveSuccessResult = {
  accepted?: false | undefined;
  ok: true;
  outcome?: ProjectSaveSuccessOutcome;
};

export type ProjectSaveFailureResult = {
  accepted?: false | undefined;
  ok: false;
  reason: ProjectSaveFailureReason;
  message?: string;
};

export type ProjectSaveActionResult =
  ProjectSaveAcceptedResult | ProjectSaveSuccessResult | ProjectSaveFailureResult;

export type ProjectSaveTerminalResult = ProjectSaveSuccessResult | ProjectSaveFailureResult;

type ProjectSaveResultRecord = {
  accepted?: unknown;
  reused?: unknown;
  ok?: unknown;
  pending?: unknown;
  outcome?: unknown;
  reason?: unknown;
  message?: unknown;
  operationId?: unknown;
  requestedAt?: unknown;
  acceptedAt?: unknown;
  settled?: unknown;
};

export function normalizeProjectSaveFailureReason(
  value: unknown,
  defaultReason: ProjectSaveFailureReason = 'error'
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
      return defaultReason;
  }
}

export function normalizeProjectSaveActionResult(
  value: unknown,
  defaultReason: ProjectSaveFailureReason = 'not-installed'
): ProjectSaveActionResult {
  if (value === true) return { ok: true };
  if (value === false) return { ok: false, reason: defaultReason };

  const rec = asRecord<ProjectSaveResultRecord>(value);
  if (!rec) return { ok: false, reason: defaultReason };

  if (rec.pending === true) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Legacy project save pending results are not supported; return an accepted operation handle.',
    };
  }

  if (rec.accepted === true) {
    const operationId = typeof rec.operationId === 'string' ? rec.operationId.trim() : '';
    const requestedAt = Number(rec.requestedAt);
    const acceptedAt = Number(rec.acceptedAt);
    const settled = rec.settled as Promise<ProjectSaveTerminalResult> | undefined;
    if (
      !operationId ||
      !Number.isFinite(requestedAt) ||
      requestedAt <= 0 ||
      !Number.isFinite(acceptedAt) ||
      acceptedAt <= 0 ||
      requestedAt > acceptedAt ||
      !settled ||
      typeof settled.then !== 'function'
    ) {
      return {
        ok: false,
        reason: 'invalid',
        message: 'Project save accepted result is missing its terminal operation handle.',
      };
    }
    return {
      accepted: true,
      reused: rec.reused === true,
      operationId,
      requestedAt: Math.floor(requestedAt),
      acceptedAt: Math.floor(acceptedAt),
      settled: Promise.resolve(settled),
    };
  }

  if (rec.ok === true) {
    return rec.outcome === 'browser-delivery-completed'
      ? { ok: true, outcome: 'browser-delivery-completed' }
      : { ok: true };
  }

  const reason = normalizeProjectSaveFailureReason(rec.reason, defaultReason);
  const message = typeof rec.message === 'string' && rec.message.trim() ? rec.message.trim() : undefined;
  return message ? { ok: false, reason, message } : { ok: false, reason };
}

export function buildProjectSaveActionErrorResult(
  error: unknown,
  defaultMessage: string
): ProjectSaveFailureResult {
  return {
    ok: false,
    reason: 'error',
    message: normalizeUnknownError(error, defaultMessage).message,
  };
}
