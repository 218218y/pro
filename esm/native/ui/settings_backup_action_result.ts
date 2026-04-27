import { asRecord, normalizeUnknownError } from '../services/api.js';

import type {
  SettingsBackupActionKind,
  SettingsBackupActionResult,
  SettingsBackupExportFailureReason,
  SettingsBackupExportFailureResult,
  SettingsBackupExportSuccessResult,
  SettingsBackupImportFailureReason,
  SettingsBackupImportFailureResult,
  SettingsBackupImportSuccessResult,
} from './settings_backup_contracts.js';

type SettingsBackupActionResultRecord = {
  ok?: unknown;
  kind?: unknown;
  reason?: unknown;
  message?: unknown;
  modelsCount?: unknown;
  colorsCount?: unknown;
  modelsAdded?: unknown;
  colorsAdded?: unknown;
};

function normalizeBackupCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function normalizeBackupMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function normalizeSettingsBackupExportFailureReason(
  value: unknown,
  fallbackReason: SettingsBackupExportFailureReason = 'error'
): SettingsBackupExportFailureReason {
  const reason = typeof value === 'string' ? value.trim().toLowerCase() : '';
  switch (reason) {
    case 'download-unavailable':
    case 'busy':
    case 'error':
      return reason;
    case 'download unavailable':
    case 'download_unavailable':
      return 'download-unavailable';
    default:
      return fallbackReason;
  }
}

export function normalizeSettingsBackupImportFailureReason(
  value: unknown,
  fallbackReason: SettingsBackupImportFailureReason = 'error'
): SettingsBackupImportFailureReason {
  const reason = typeof value === 'string' ? value.trim().toLowerCase() : '';
  switch (reason) {
    case 'cancelled':
    case 'invalid-json':
    case 'invalid-backup':
    case 'read-failed':
    case 'models-unavailable':
    case 'busy':
    case 'error':
      return reason;
    case 'invalid_json':
    case 'invalid json':
      return 'invalid-json';
    case 'invalid_backup':
    case 'invalid backup':
      return 'invalid-backup';
    case 'read_failed':
    case 'read failed':
      return 'read-failed';
    case 'models_unavailable':
    case 'models unavailable':
      return 'models-unavailable';
    default:
      return fallbackReason;
  }
}

export function buildSettingsBackupExportSuccessResult(
  modelsCount: unknown,
  colorsCount: unknown
): SettingsBackupExportSuccessResult {
  return {
    ok: true,
    kind: 'export',
    modelsCount: normalizeBackupCount(modelsCount),
    colorsCount: normalizeBackupCount(colorsCount),
  };
}

export function buildSettingsBackupImportSuccessResult(
  modelsAdded: unknown,
  colorsAdded: unknown
): SettingsBackupImportSuccessResult {
  return {
    ok: true,
    kind: 'import',
    modelsAdded: normalizeBackupCount(modelsAdded),
    colorsAdded: normalizeBackupCount(colorsAdded),
  };
}

export function buildSettingsBackupExportFailureResult(
  reason: unknown,
  message?: unknown
): SettingsBackupExportFailureResult {
  const normalizedReason = normalizeSettingsBackupExportFailureReason(reason, 'error');
  const normalizedMessage = normalizeBackupMessage(message);
  return normalizedMessage
    ? { ok: false, kind: 'export', reason: normalizedReason, message: normalizedMessage }
    : { ok: false, kind: 'export', reason: normalizedReason };
}

export function buildSettingsBackupImportFailureResult(
  reason: unknown,
  message?: unknown
): SettingsBackupImportFailureResult {
  const normalizedReason = normalizeSettingsBackupImportFailureReason(reason, 'error');
  const normalizedMessage = normalizeBackupMessage(message);
  return normalizedMessage
    ? { ok: false, kind: 'import', reason: normalizedReason, message: normalizedMessage }
    : { ok: false, kind: 'import', reason: normalizedReason };
}

export function buildSettingsBackupActionErrorResult(
  kind: SettingsBackupActionKind,
  error: unknown,
  fallbackMessage: string
): SettingsBackupActionResult {
  const message = normalizeUnknownError(error, fallbackMessage).message;
  return kind === 'import'
    ? buildSettingsBackupImportFailureResult('error', message)
    : buildSettingsBackupExportFailureResult('error', message);
}

export function normalizeSettingsBackupActionResult(
  value: unknown,
  fallbackKind: SettingsBackupActionKind = 'export'
): SettingsBackupActionResult {
  const rec = asRecord<SettingsBackupActionResultRecord>(value);
  if (!rec) {
    return fallbackKind === 'import'
      ? buildSettingsBackupImportFailureResult('error')
      : buildSettingsBackupExportFailureResult('error');
  }

  const kind = rec.kind === 'import' ? 'import' : 'export';
  if (rec.ok === true) {
    return kind === 'import'
      ? buildSettingsBackupImportSuccessResult(rec.modelsAdded, rec.colorsAdded)
      : buildSettingsBackupExportSuccessResult(rec.modelsCount, rec.colorsCount);
  }

  return kind === 'import'
    ? buildSettingsBackupImportFailureResult(rec.reason, rec.message)
    : buildSettingsBackupExportFailureResult(rec.reason, rec.message);
}
