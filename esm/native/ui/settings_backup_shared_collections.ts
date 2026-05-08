import type { SavedModelLike } from '../../../types';
import { normalizeModelRecord } from '../services/api.js';
import type {
  SettingsBackupData,
  SettingsBackupIdList,
  SettingsBackupSavedColorEntry,
} from './settings_backup_shared_contracts.js';
import {
  cloneJsonValue,
  isRecord,
  sanitizeSettingsBackupJsonText,
} from './settings_backup_shared_contracts.js';

export function normalizeSettingsBackupId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    const next = String(value).trim();
    return next || null;
  }
  return null;
}

export function getSavedColorId(value: unknown): string | null {
  if (typeof value === 'string') return normalizeSettingsBackupId(value);
  if (!isRecord(value)) return null;
  return normalizeSettingsBackupId(value.id);
}

export function readSavedColorEntry(value: unknown): SettingsBackupSavedColorEntry | null {
  if (typeof value === 'string') {
    const id = normalizeSettingsBackupId(value);
    return id ?? null;
  }
  if (!isRecord(value)) return null;
  const id = normalizeSettingsBackupId(value.id);
  if (id === null) return null;
  return cloneJsonValue({ ...value, id });
}

function shouldPreferSavedColorEntry(
  prev: SettingsBackupSavedColorEntry,
  next: SettingsBackupSavedColorEntry
): boolean {
  return getSavedColorEntryScore(next) > getSavedColorEntryScore(prev);
}

function getSavedColorEntryScore(value: SettingsBackupSavedColorEntry): number {
  if (typeof value === 'string') return 0;
  let score = 1;
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'id') continue;
    if (entry === null || typeof entry === 'undefined') continue;
    if (Array.isArray(entry) && entry.length <= 0) continue;
    if (isRecord(entry) && Object.keys(entry).length <= 0) continue;
    score += 1;
  }
  return score;
}

export function readSavedColorList(value: unknown): SettingsBackupSavedColorEntry[] {
  if (!Array.isArray(value)) return [];
  const out: SettingsBackupSavedColorEntry[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < value.length; i += 1) {
    const entry = readSavedColorEntry(value[i]);
    if (entry === null) continue;
    const id = getSavedColorId(entry);
    if (!id) continue;
    const prevIndex = seen.get(id);
    if (typeof prevIndex === 'number') {
      if (shouldPreferSavedColorEntry(out[prevIndex], entry)) out[prevIndex] = entry;
      continue;
    }
    seen.set(id, out.length);
    out.push(entry);
  }
  return out;
}

export function mergeSavedColorLists(
  currentValue: unknown,
  importedValue: unknown
): {
  list: SettingsBackupSavedColorEntry[];
  added: number;
  changed: boolean;
} {
  const current = readSavedColorList(currentValue);
  const imported = readSavedColorList(importedValue);
  if (imported.length <= 0) {
    return {
      list: current,
      added: 0,
      changed: Array.isArray(currentValue) ? current.length !== currentValue.length : current.length > 0,
    };
  }

  const out = current.slice();
  const seen = new Map<string, number>();
  let added = 0;
  let changed = Array.isArray(currentValue) ? current.length !== currentValue.length : current.length > 0;

  for (let i = 0; i < out.length; i += 1) {
    const id = getSavedColorId(out[i]);
    if (id) seen.set(id, i);
  }

  for (let i = 0; i < imported.length; i += 1) {
    const entry = imported[i];
    const id = getSavedColorId(entry);
    if (!id) continue;
    const prevIndex = seen.get(id);
    if (typeof prevIndex !== 'number') {
      seen.set(id, out.length);
      out.push(entry);
      added += 1;
      changed = true;
      continue;
    }
    if (!shouldPreferSavedColorEntry(out[prevIndex], entry)) continue;
    out[prevIndex] = entry;
    changed = true;
  }

  return { list: out, added, changed };
}

export function readSettingsBackupIdList(value: unknown): SettingsBackupIdList {
  if (!Array.isArray(value)) return [];
  const out: SettingsBackupIdList = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i += 1) {
    const id = normalizeSettingsBackupId(value[i]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function sameSettingsBackupIdList(left: unknown, right: unknown): boolean {
  const a = readSettingsBackupIdList(left);
  const b = readSettingsBackupIdList(right);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function collectSavedColorIds(value: unknown): Set<string> {
  const ids = new Set<string>();
  for (const entry of readSavedColorList(value)) {
    const id = getSavedColorId(entry);
    if (id) ids.add(id);
  }
  return ids;
}

export function sanitizeSettingsBackupCollectionIds(
  ids: unknown,
  availableIds: Set<string> | null | undefined
): SettingsBackupIdList {
  const normalizedIds = readSettingsBackupIdList(ids);
  if (!availableIds || availableIds.size <= 0) return normalizedIds;
  const out: SettingsBackupIdList = [];
  for (let i = 0; i < normalizedIds.length; i += 1) {
    const id = normalizedIds[i];
    if (!availableIds.has(id)) continue;
    out.push(id);
  }
  return out;
}

export function sanitizeColorSwatchesOrder(
  savedColors: unknown,
  order: unknown,
  fallbackOrder: SettingsBackupIdList = []
): SettingsBackupIdList {
  const normalizedOrder = readSettingsBackupIdList(order);
  const normalizedFallback = readSettingsBackupIdList(fallbackOrder);
  const colorIds = collectSavedColorIds(savedColors);
  if (colorIds.size <= 0) return normalizedFallback;
  const out: SettingsBackupIdList = [];
  const seen = new Set<string>();
  for (let i = 0; i < normalizedOrder.length; i += 1) {
    const id = normalizedOrder[i];
    if (!colorIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (let i = 0; i < normalizedFallback.length; i += 1) {
    const id = normalizedFallback[i];
    if (!colorIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function readCanonicalSavedColorOrder(savedColors: unknown): SettingsBackupIdList {
  const ids: SettingsBackupIdList = [];
  const seen = new Set<string>();
  for (const entry of readSavedColorList(savedColors)) {
    const id = getSavedColorId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function resolveColorSwatchesOrder(
  savedColors: unknown,
  preferredOrder: unknown,
  ...fallbackOrders: unknown[]
): SettingsBackupIdList {
  const flattenedFallback: SettingsBackupIdList = [];
  for (let i = 0; i < fallbackOrders.length; i += 1) {
    const normalized = readSettingsBackupIdList(fallbackOrders[i]);
    if (normalized.length <= 0) continue;
    flattenedFallback.push(...normalized);
  }
  return sanitizeColorSwatchesOrder(savedColors, preferredOrder, flattenedFallback);
}

export function isSettingsBackupData(v: unknown): v is SettingsBackupData {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return 'type' in v && v.type === 'system_backup';
}

export function readSavedModelList(value: unknown): SavedModelLike[] {
  if (!Array.isArray(value)) return [];
  const out: SavedModelLike[] = [];
  const byId = new Map<string, number>();
  for (let i = 0; i < value.length; i += 1) {
    const entry = value[i];
    if (!isRecord(entry)) continue;
    const id = normalizeSettingsBackupId(entry.id);
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!id || !name) continue;
    const cloned = cloneJsonValue(entry);
    if (!isRecord(cloned)) continue;
    cloned.id = id;
    cloned.name = name;
    const normalized = normalizeModelRecord(cloned);
    const existingIndex = byId.get(id);
    if (typeof existingIndex === 'number') {
      out[existingIndex] = normalized;
      continue;
    }
    byId.set(id, out.length);
    out.push(normalized);
  }
  return out;
}

export function normalizeSettingsBackupData(value: unknown): SettingsBackupData | null {
  if (!isSettingsBackupData(value)) return null;
  const timestamp = Number.isFinite(Number(value.timestamp)) ? Number(value.timestamp) : Date.now();
  const savedModels = readSavedModelList(value.savedModels);
  const savedColors = readSavedColorList(value.savedColors);
  return {
    type: 'system_backup',
    timestamp,
    presetOrder: readSettingsBackupIdList(value.presetOrder),
    hiddenPresets: readSettingsBackupIdList(value.hiddenPresets),
    savedModels,
    savedColors,
    colorSwatchesOrder: resolveColorSwatchesOrder(savedColors, value.colorSwatchesOrder),
  };
}

export function parseSettingsBackup(text: string): SettingsBackupData | null {
  const parsed: unknown = JSON.parse(sanitizeSettingsBackupJsonText(text));
  return normalizeSettingsBackupData(parsed);
}
