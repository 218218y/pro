import { asRecord } from './record.js';

export type CanonicalErrorReason = 'unavailable' | 'invalid' | 'cancelled' | 'error';

export type NormalizedUnknownError = {
  message: string;
  name?: string;
};

export type NormalizedUnknownErrorInfo = NormalizedUnknownError & {
  stack?: string;
};

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringifyUnknown(value: unknown): string {
  try {
    return typeof value === 'symbol' ? String(value) : String(value ?? '');
  } catch {
    return '';
  }
}

function stringifyRecord(value: Record<string, unknown>): string {
  try {
    const json = JSON.stringify(value);
    return typeof json === 'string' && json !== '{}' ? json : '';
  } catch {
    return '';
  }
}

function readErrorRecord(err: unknown): Record<string, unknown> | null {
  return asRecord<Record<string, unknown>>(err);
}

function readErrorStack(err: unknown): string {
  if (err instanceof Error) return readTrimmedString(err.stack);
  return readTrimmedString(readErrorRecord(err)?.stack);
}

function readReasonToken(source: unknown): string {
  if (typeof source === 'string') return readTrimmedString(source).toLowerCase();
  const rec = readErrorRecord(source);
  if (!rec) return '';
  const fromReason = readTrimmedString(rec.reason).toLowerCase();
  if (fromReason) return fromReason;
  const fromCode = readTrimmedString(rec.code).toLowerCase();
  if (fromCode) return fromCode;
  const fromName = readTrimmedString(rec.name).toLowerCase();
  return fromName;
}

export function normalizeUnknownError(err: unknown, defaultMessage = ''): NormalizedUnknownError {
  const defaultText = readTrimmedString(defaultMessage);

  if (err instanceof Error) {
    const message =
      readTrimmedString(err.message) || defaultText || readTrimmedString(err.name) || 'Unexpected error';
    const name = readTrimmedString(err.name);
    return name ? { message, name } : { message };
  }

  const text = readTrimmedString(err);
  if (text) return { message: text };

  if (
    typeof err === 'number' ||
    typeof err === 'boolean' ||
    typeof err === 'bigint' ||
    typeof err === 'symbol'
  ) {
    const message = stringifyUnknown(err).trim() || defaultText || 'Unexpected error';
    return { message };
  }

  const rec = readErrorRecord(err);
  if (rec) {
    const name = readTrimmedString(rec.name);
    const message =
      readTrimmedString(rec.message) || stringifyRecord(rec) || defaultText || name || 'Unexpected error';
    return name ? { message, name } : { message };
  }

  const message = stringifyUnknown(err).trim() || defaultText || 'Unexpected error';
  return { message };
}

export function normalizeUnknownErrorInfo(err: unknown, defaultMessage = ''): NormalizedUnknownErrorInfo {
  const normalized = normalizeUnknownError(err, defaultMessage);
  const stack = readErrorStack(err);
  return stack ? { ...normalized, stack } : normalized;
}

export function getNormalizedErrorHead(err: unknown, defaultMessage = ''): string {
  const stack = readErrorStack(err);
  if (stack) return stack.split('\n')[0] || stack;
  return normalizeUnknownError(err, defaultMessage).message;
}

export function normalizeErrorReason(
  value: unknown,
  defaultReason: CanonicalErrorReason = 'error'
): CanonicalErrorReason {
  const token = readReasonToken(value);
  if (!token) return defaultReason;

  if (
    token === 'cancelled' ||
    token === 'canceled' ||
    token === 'cancel' ||
    token === 'aborted' ||
    token === 'abort' ||
    token === 'aborterror' ||
    token === 'cancellederror' ||
    token === 'cancelederror'
  ) {
    return 'cancelled';
  }

  if (
    token === 'unavailable' ||
    token === 'unsupported' ||
    token === 'not-supported' ||
    token === 'notsupported' ||
    token === 'missing' ||
    token === 'missing-sdk'
  ) {
    return 'unavailable';
  }

  if (
    token === 'invalid' ||
    token === 'invalid-file' ||
    token === 'invalid-json' ||
    token === 'invalid-backup' ||
    token === 'syntaxerror' ||
    token === 'parseerror'
  ) {
    return 'invalid';
  }

  return 'error';
}

type BuildErrorResult = {
  <TExtras extends Record<string, unknown> = Record<never, never>>(
    reason: string,
    err: unknown,
    defaultMessage?: string,
    extras?: TExtras | null
  ): { ok: false; reason: string; message: string } & TExtras;
  (
    reason: string,
    err: unknown,
    defaultMessage?: string,
    extras?: Record<string, unknown> | null
  ): { ok: false; reason: string; message: string } & Record<string, unknown>;
};

export const buildErrorResult: BuildErrorResult = (
  reason: string,
  err: unknown,
  defaultMessage = '',
  extras?: Record<string, unknown> | null
) => {
  const normalized = normalizeUnknownError(err, defaultMessage);
  const base: { ok: false; reason: string; message: string } = {
    ok: false,
    reason,
    message: normalized.message,
  };
  return Object.assign(base, extras ?? {});
};

export function attachErrorMessage<T extends { ok: false; message?: string }>(
  res: T,
  err: unknown,
  defaultMessage?: string
): T & { message: string } {
  const current = readTrimmedString(res.message);
  const normalized = normalizeUnknownError(err, current || defaultMessage || 'Unexpected error');
  return { ...res, message: normalized.message };
}
