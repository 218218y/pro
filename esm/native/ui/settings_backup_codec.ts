import type { SettingsBackupData } from './settings_backup_shared_contracts.js';
import { sanitizeSettingsBackupJsonText } from './settings_backup_shared_contracts.js';
import {
  normalizeSavedModelForSettingsBackup,
  readSavedColorList,
  readSavedModelList,
  readSettingsBackupIdList,
  resolveColorSwatchesOrder,
  validateSavedModelForSettingsBackup,
} from './settings_backup_shared_collections.js';

export const SETTINGS_BACKUP_SCHEMA_VERSION = 1 as const;

type SettingsBackupRecord = Record<string, unknown> & { type: 'system_backup' };

function serializeCanonicalBackupValue(value: unknown): string {
  const seen = new WeakSet<object>();
  function serialize(entry: unknown): string | undefined {
    if (entry === null) return 'null';
    if (typeof entry === 'string') return JSON.stringify(entry);
    if (typeof entry === 'boolean') return entry ? 'true' : 'false';
    if (typeof entry === 'number') return Number.isFinite(entry) ? String(entry) : 'null';
    if (typeof entry === 'undefined' || typeof entry === 'function' || typeof entry === 'symbol')
      return undefined;
    if (typeof entry === 'bigint') throw new TypeError('Settings backup JSON cannot serialize bigint values');
    if (typeof entry !== 'object') return undefined;
    if (seen.has(entry)) throw new TypeError('Settings backup JSON cannot serialize circular values');
    seen.add(entry);
    try {
      if (Array.isArray(entry)) return `[${entry.map(item => serialize(item) ?? 'null').join(',')}]`;
      const record = entry as Record<string, unknown>;
      const parts: string[] = [];
      for (const key of Object.keys(record).sort()) {
        const serialized = serialize(record[key]);
        if (typeof serialized !== 'undefined') parts.push(`${JSON.stringify(key)}:${serialized}`);
      }
      return `{${parts.join(',')}}`;
    } finally {
      seen.delete(entry);
    }
  }
  const serialized = serialize(value);
  if (typeof serialized === 'undefined')
    throw new TypeError('Settings backup requires a serializable root value');
  return serialized;
}

function fingerprintSettingsBackup(value: unknown): string {
  const serialized = serializeCanonicalBackupValue(value);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${serialized.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function readSettingsBackupRecord(value: unknown): SettingsBackupRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return record.type === 'system_backup' ? (record as SettingsBackupRecord) : null;
}

function hasSupportedSettingsBackupVersion(value: SettingsBackupRecord): boolean {
  // Pre-codec backups were unversioned. Treat that shape as the one explicit v0 migration path.
  return typeof value.schemaVersion === 'undefined' || value.schemaVersion === SETTINGS_BACKUP_SCHEMA_VERSION;
}

export function isSettingsBackupData(value: unknown): value is SettingsBackupData {
  const record = readSettingsBackupRecord(value);
  return !!record && record.schemaVersion === SETTINGS_BACKUP_SCHEMA_VERSION;
}

export function normalizeSettingsBackupData(value: unknown): SettingsBackupData | null {
  const record = readSettingsBackupRecord(value);
  if (!record || !hasSupportedSettingsBackupVersion(record)) return null;
  const timestamp = Number.isFinite(Number(record.timestamp)) ? Number(record.timestamp) : Date.now();
  const savedModels = readSavedModelList(record.savedModels);
  const savedColors = readSavedColorList(record.savedColors);
  return {
    type: 'system_backup',
    schemaVersion: SETTINGS_BACKUP_SCHEMA_VERSION,
    timestamp,
    presetOrder: readSettingsBackupIdList(record.presetOrder),
    hiddenPresets: readSettingsBackupIdList(record.hiddenPresets),
    savedModels,
    savedColors,
    colorSwatchesOrder: resolveColorSwatchesOrder(savedColors, record.colorSwatchesOrder),
  };
}

function validateCanonicalSettingsBackup(value: unknown): value is SettingsBackupData {
  if (!isSettingsBackupData(value)) return false;
  if (typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) return false;
  if (
    !Array.isArray(value.presetOrder) ||
    !Array.isArray(value.hiddenPresets) ||
    !Array.isArray(value.savedModels) ||
    !Array.isArray(value.savedColors) ||
    !Array.isArray(value.colorSwatchesOrder)
  )
    return false;
  if (!value.savedModels.every(validateSavedModelForSettingsBackup)) return false;
  const normalized = normalizeSettingsBackupData(value);
  if (!normalized) return false;
  return serializeCanonicalBackupValue(value) === serializeCanonicalBackupValue(normalized);
}

export function parseSettingsBackup(text: string): SettingsBackupData | null {
  const parsed: unknown = JSON.parse(sanitizeSettingsBackupJsonText(text));
  return normalizeSettingsBackupData(parsed);
}

export const settingsBackupCodec = Object.freeze({
  validate: validateCanonicalSettingsBackup,
  normalize: normalizeSettingsBackupData,
  clone(value: SettingsBackupData): SettingsBackupData {
    return JSON.parse(serializeCanonicalBackupValue(value)) as SettingsBackupData;
  },
  serialize(value: SettingsBackupData): string {
    return serializeCanonicalBackupValue(value);
  },
  fingerprint(value: SettingsBackupData): string {
    return fingerprintSettingsBackup(value);
  },
});
