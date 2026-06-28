import type {
  ModelsCommandReason,
  ModelsCommandResult,
  ProjectDataLike,
  UnknownRecord,
} from '../../../types';

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asProjectData(value: unknown): ProjectDataLike | null {
  return isRecord(value) ? value : null;
}

export function normalizeModelLoadReason(value: unknown): ModelsCommandReason {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason === 'missing') return 'missing';
  if (reason === 'invalid') return 'invalid';
  if (reason === 'superseded') return 'superseded';
  if (reason === 'not-installed') return 'not-installed';
  if (reason === 'error') return 'error';
  return 'load';
}

export function buildModelLoadFailureResult(
  reason: ModelsCommandReason,
  message?: string
): ModelsCommandResult {
  return message ? { ok: false, reason, message } : { ok: false, reason };
}
