import { normalizeUnknownError } from './error_normalization.js';
import { asRecord } from './record.js';

export type ProjectLoadFailureReason =
  'missing-file' | 'invalid' | 'not-installed' | 'superseded' | 'busy' | 'error';

export type ProjectLoadWarningEffect =
  'edit-modes' | 'autosave-finalize' | 'autosave-refresh' | 'notes' | 'build';

export type ProjectLoadWarning = {
  effect: ProjectLoadWarningEffect;
  message: string;
};

export type ProjectLoadSuccessResult = {
  ok: true;
  pending?: true | undefined;
  restoreGen?: number | undefined;
  warnings?: ProjectLoadWarning[] | undefined;
};

export type ProjectLoadFailureResult = {
  ok: false;
  reason: ProjectLoadFailureReason;
  message?: string;
  restoreGen?: number | undefined;
};

export type ProjectLoadActionResult = ProjectLoadSuccessResult | ProjectLoadFailureResult;

type ProjectLoadResultRecord = {
  ok?: unknown;
  pending?: unknown;
  restoreGen?: unknown;
  reason?: unknown;
  message?: unknown;
  warnings?: unknown;
};

function normalizeProjectLoadMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeProjectLoadRestoreGen(value: unknown): number | undefined {
  const restoreGen = Number(value);
  return Number.isFinite(restoreGen) && restoreGen > 0 ? Math.floor(restoreGen) : undefined;
}

export function buildProjectLoadSuccessResult(options?: {
  pending?: unknown;
  restoreGen?: unknown;
  warnings?: unknown;
}): ProjectLoadSuccessResult {
  const restoreGen = normalizeProjectLoadRestoreGen(options?.restoreGen);
  const warnings = Array.isArray(options?.warnings)
    ? options.warnings.filter((warning): warning is ProjectLoadWarning => {
        const rec = asRecord<ProjectLoadWarning>(warning);
        return !!(
          rec &&
          typeof rec.effect === 'string' &&
          typeof rec.message === 'string' &&
          rec.message.trim()
        );
      })
    : [];
  return {
    ok: true,
    ...(options?.pending === true ? { pending: true } : {}),
    ...(typeof restoreGen === 'number' ? { restoreGen } : {}),
    ...(warnings.length ? { warnings } : {}),
  };
}

export function normalizeProjectLoadFailureReason(
  value: unknown,
  defaultReason: ProjectLoadFailureReason = 'error'
): ProjectLoadFailureReason {
  const reason = typeof value === 'string' ? value.trim().toLowerCase() : '';
  switch (reason) {
    case 'missing-file':
    case 'invalid':
    case 'not-installed':
    case 'superseded':
    case 'busy':
    case 'error':
      return reason;
    case 'missing_file':
    case 'missing file':
      return 'missing-file';
    case 'not_installed':
    case 'not installed':
      return 'not-installed';
    case 'load':
    case 'result':
    case 'restore':
    case 'reset':
      return 'error';
    default:
      return defaultReason;
  }
}

export function buildProjectLoadFailureResult(
  reason: unknown,
  options?: {
    restoreGen?: unknown;
    message?: unknown;
  }
): ProjectLoadFailureResult {
  const normalizedReason = normalizeProjectLoadFailureReason(reason, 'error');
  const restoreGen = normalizeProjectLoadRestoreGen(options?.restoreGen);
  const message = normalizeProjectLoadMessage(options?.message);
  return {
    ok: false,
    reason: normalizedReason,
    ...(typeof restoreGen === 'number' ? { restoreGen } : {}),
    ...(message ? { message } : {}),
  };
}

export function normalizeProjectLoadActionResult(
  value: unknown,
  defaultReason: ProjectLoadFailureReason = 'error'
): ProjectLoadActionResult {
  if (value === true) return buildProjectLoadSuccessResult();
  if (value === false) return buildProjectLoadFailureResult(defaultReason);

  const rec = asRecord<ProjectLoadResultRecord>(value);
  if (!rec) return buildProjectLoadFailureResult(defaultReason);
  if (rec.ok === true) return buildProjectLoadSuccessResult(rec);

  return buildProjectLoadFailureResult(normalizeProjectLoadFailureReason(rec.reason, defaultReason), rec);
}

export function buildProjectLoadActionErrorResult(
  error: unknown,
  defaultMessage: string
): ProjectLoadFailureResult & { reason: 'error'; message: string } {
  const normalizedMessage = normalizeProjectLoadMessage(normalizeUnknownError(error, defaultMessage).message);
  return {
    ok: false,
    reason: 'error',
    message: normalizedMessage || defaultMessage,
  };
}
