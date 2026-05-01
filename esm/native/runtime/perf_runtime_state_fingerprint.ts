import type { AppContainer, RootStateLike, WardrobeProPerfStateFingerprint } from '../../../types/index.js';

import { asRecord } from './record.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';

function normalizePerfStateString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePerfSavedColorValue(value: unknown): string {
  return normalizePerfStateString(value).toLowerCase();
}

function normalizePerfStateBoolean(value: unknown): boolean {
  return !!value;
}

function normalizePerfStateNullablePositiveInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.floor(n));
}

function readPerfSavedColorValue(entry: unknown): string {
  const rec = asRecord<Record<string, unknown>>(entry);
  if (!rec) return '';
  const value = normalizePerfSavedColorValue(rec.value);
  if (value) return value;
  return normalizePerfSavedColorValue(rec.id);
}

function readPerfStateSavedColorValues(config: unknown): string[] {
  const cfg = asRecord<Record<string, unknown>>(config);
  const savedColors = Array.isArray(cfg?.savedColors) ? cfg.savedColors : [];
  return savedColors
    .map(readPerfSavedColorValue)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function countTruthyRecordEntries(value: unknown): number {
  const rec = asRecord<Record<string, unknown>>(value);
  if (!rec) return 0;
  let count = 0;
  for (const entry of Object.values(rec)) {
    if (!entry) continue;
    if (Array.isArray(entry)) {
      if (entry.length > 0) count += 1;
      continue;
    }
    if (typeof entry === 'object') {
      if (Object.keys(asRecord<Record<string, unknown>>(entry) || {}).length > 0) count += 1;
      continue;
    }
    count += 1;
  }
  return count;
}

function countDoorTrimEntries(value: unknown): number {
  const rec = asRecord<Record<string, unknown>>(value);
  if (!rec) return 0;
  let count = 0;
  for (const trims of Object.values(rec)) {
    if (Array.isArray(trims)) {
      count += trims.filter(item => asRecord<Record<string, unknown>>(item)).length;
      continue;
    }
    if (asRecord<Record<string, unknown>>(trims)) count += 1;
  }
  return count;
}

function normalizePerfStatePlacementCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function countInternalDrawerPlacementsFromModuleList(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  let total = 0;
  for (const item of value) {
    const rec = asRecord<Record<string, unknown>>(item);
    if (!rec) continue;
    const list = Array.isArray(rec.intDrawersList) ? rec.intDrawersList.length : 0;
    const slot = normalizePerfStatePlacementCount(rec.intDrawersSlot) > 0 ? 1 : 0;
    total += list + slot;
  }
  return total;
}

function countExternalDrawerSelectionsFromModuleList(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  let total = 0;
  for (const item of value) {
    const rec = asRecord<Record<string, unknown>>(item);
    if (!rec) continue;
    total += normalizePerfStatePlacementCount(rec.extDrawersCount);
  }
  return total;
}

function countPerfStateInternalDrawerPlacements(config: unknown): number {
  const cfg = asRecord<Record<string, unknown>>(config);
  if (!cfg) return 0;
  const corner = asRecord<Record<string, unknown>>(cfg.cornerConfiguration);
  const lowerCorner = asRecord<Record<string, unknown>>(corner?.stackSplitLower);
  return (
    countInternalDrawerPlacementsFromModuleList(cfg.modulesConfiguration) +
    countInternalDrawerPlacementsFromModuleList(cfg.stackSplitLowerModulesConfiguration) +
    countInternalDrawerPlacementsFromModuleList(corner?.modulesConfiguration) +
    countInternalDrawerPlacementsFromModuleList(lowerCorner?.modulesConfiguration)
  );
}

function countPerfStateExternalDrawerSelections(config: unknown): number {
  const cfg = asRecord<Record<string, unknown>>(config);
  if (!cfg) return 0;
  const corner = asRecord<Record<string, unknown>>(cfg.cornerConfiguration);
  const lowerCorner = asRecord<Record<string, unknown>>(corner?.stackSplitLower);
  return (
    countExternalDrawerSelectionsFromModuleList(cfg.modulesConfiguration) +
    countExternalDrawerSelectionsFromModuleList(cfg.stackSplitLowerModulesConfiguration) +
    countExternalDrawerSelectionsFromModuleList(corner?.modulesConfiguration) +
    countExternalDrawerSelectionsFromModuleList(lowerCorner?.modulesConfiguration)
  );
}

export function getPerfStateFingerprint(App: AppContainer): WardrobeProPerfStateFingerprint | null {
  try {
    const store = getStoreSurfaceMaybe<RootStateLike>(App);
    if (!store || typeof store.getState !== 'function') return null;
    const root = asRecord<Record<string, unknown>>(store.getState());
    if (!root) return null;
    const ui = asRecord<Record<string, unknown>>(root.ui);
    const savedColorValues = readPerfStateSavedColorValues(root.config);
    const config = asRecord<Record<string, unknown>>(root.config);
    return {
      projectName: normalizePerfStateString(ui?.projectName),
      savedColorCount: savedColorValues.length,
      savedColorValues,
      wardrobeType: normalizePerfStateString(config?.wardrobeType),
      boardMaterial: normalizePerfStateString(config?.boardMaterial),
      doorStyle: normalizePerfStateString(ui?.doorStyle),
      groovesEnabled: normalizePerfStateBoolean(ui?.groovesEnabled),
      grooveLinesCount: normalizePerfStateNullablePositiveInt(config?.grooveLinesCount),
      splitDoors: normalizePerfStateBoolean(ui?.splitDoors),
      removeDoorsEnabled: normalizePerfStateBoolean(ui?.removeDoorsEnabled),
      internalDrawersEnabled: normalizePerfStateBoolean(ui?.internalDrawersEnabled),
      groovesMapCount: countTruthyRecordEntries(config?.groovesMap),
      grooveLinesCountMapCount: countTruthyRecordEntries(config?.grooveLinesCountMap),
      splitDoorMapCount: countTruthyRecordEntries(config?.splitDoorsMap),
      splitDoorBottomMapCount: countTruthyRecordEntries(config?.splitDoorsBottomMap),
      removedDoorMapCount: countTruthyRecordEntries(config?.removedDoorsMap),
      doorTrimCount: countDoorTrimEntries(config?.doorTrimMap),
      drawerDividerCount: countTruthyRecordEntries(config?.drawerDividersMap),
      internalDrawerPlacementCount: countPerfStateInternalDrawerPlacements(config),
      externalDrawerSelectionCount: countPerfStateExternalDrawerSelections(config),
    };
  } catch {
    return null;
  }
}
