import type { SavedModelLike, StorageNamespaceLike, UnknownRecord } from '../../../types';
import type {
  SettingsBackupExportFailureReason,
  SettingsBackupImportFailureReason,
} from './settings_backup_contracts.js';

export type InputTargetLike = { files?: ArrayLike<File> | null; value?: string | null };

export type SettingsBackupSavedColorRecord = UnknownRecord & {
  id: string | number;
  value?: string;
  type?: string;
  textureData?: unknown;
};

export type SettingsBackupSavedColorEntry = SettingsBackupSavedColorRecord | string;
export type SettingsBackupIdList = string[];

export type SettingsBackupData = {
  type: 'system_backup';
  timestamp: number;
  presetOrder: SettingsBackupIdList;
  hiddenPresets: SettingsBackupIdList;
  savedModels: SavedModelLike[];
  savedColors: SettingsBackupSavedColorEntry[];
  colorSwatchesOrder: SettingsBackupIdList;
};

export type SettingsStorageServiceLike = StorageNamespaceLike & {
  KEYS?: {
    SAVED_MODELS?: string;
    SAVED_COLORS?: string;
  };
};

export type SettingsStorageKeys = {
  models: string;
  presetOrder: string;
  hiddenPresets: string;
  colors: string;
  colorSwatchesOrder: string;
};

export type ReadBackupFileTextResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'read-failed'; message?: string };

export type ParseSettingsBackupResult =
  | { ok: true; data: SettingsBackupData }
  | { ok: false; reason: 'invalid-json' | 'invalid-backup'; message?: string };

export class SettingsBackupActionError extends Error {
  reason: SettingsBackupExportFailureReason | SettingsBackupImportFailureReason;

  constructor(
    reason: SettingsBackupExportFailureReason | SettingsBackupImportFailureReason,
    message: string
  ) {
    super(message);
    this.name = 'SettingsBackupActionError';
    this.reason = reason;
  }
}

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function cloneDetached(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (value === null || typeof value !== 'object') return value;
  const prior = seen.get(value);
  if (typeof prior !== 'undefined') return prior;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(value, out);
    for (let i = 0; i < value.length; i += 1) out[i] = cloneDetached(value[i], seen);
    return out;
  }
  const out: UnknownRecord = {};
  seen.set(value, out);
  for (const [key, entry] of Object.entries(value)) {
    out[key] = cloneDetached(entry, seen);
  }
  return out;
}

function cloneJsonUnknown(value: unknown): unknown {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch {
    // ignore structuredClone failures
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return cloneDetached(value, new WeakMap());
  }
}

export function cloneJsonValue<T>(value: T): T {
  return cloneJsonUnknown(value) as T;
}

export function cloneJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? cloneJsonValue(value) : [];
}

export function sanitizeSettingsBackupJsonText(text: string): string {
  return typeof text === 'string' ? text.replace(/^\uFEFF+/, '') : '';
}

export function countItems(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}
