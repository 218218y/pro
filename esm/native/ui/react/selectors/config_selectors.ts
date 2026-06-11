// React-facing config selectors (typed)
//
// Purpose:
// - Centralize high-value reads from the config slice.
// - Keep defaulting rules consistent by delegating to canonical snapshot readers.
// - Avoid ad-hoc casts in React components.

import type {
  ConfigStateLike,
  HingeMap,
  ModuleConfigLike,
  ProjectPreChestStateLike,
  SavedColorLike,
  UnknownRecord,
} from '../../../../../types';
import {
  readConfigArrayFromSnapshot,
  readConfigMapFromSnapshot,
  readConfigScalarOrDefault,
  readCornerConfigurationFromConfigSnapshot,
} from '../../../services/api.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../../../features/modules_configuration/modules_config_api.js';
import { moduleHasAnyActiveSpecialDims } from '../../../features/special_dims/special_dims.js';

type CornerDrawersLike = {
  intDrawersSlot?: unknown;
  intDrawersList?: unknown[];
  internalDrawers?: unknown[];
} & UnknownRecord;

type ModuleConfigReadLike = ModuleConfigLike & CornerDrawersLike;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readHingeEntry(value: unknown): HingeMap[string] | undefined {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (isRecord(value)) return { ...value };
  return undefined;
}

function readHingeMap(value: unknown): HingeMap {
  const rec = readRecord(value);
  if (!rec) return {};
  const out: HingeMap = {};
  for (const key of Object.keys(rec)) {
    const normalized = readHingeEntry(rec[key]);
    if (typeof normalized !== 'undefined') out[key] = normalized;
  }
  return out;
}

function isModuleConfigReadLike(value: unknown): value is ModuleConfigReadLike {
  return isRecord(value);
}

function isCornerDrawersLike(value: unknown): value is CornerDrawersLike {
  return isRecord(value);
}

export function selectWardrobeType(cfg: ConfigStateLike): 'hinged' | 'sliding' {
  const v = readConfigScalarOrDefault(cfg, 'wardrobeType');
  return v === 'sliding' ? 'sliding' : 'hinged';
}

export function selectBoardMaterial(cfg: ConfigStateLike): 'sandwich' | 'melamine' {
  const v = readConfigScalarOrDefault(cfg, 'boardMaterial');
  return v === 'melamine' ? 'melamine' : 'sandwich';
}

export function selectIsManualWidth(cfg: ConfigStateLike): boolean {
  return !!readConfigScalarOrDefault(cfg, 'isManualWidth');
}

export function selectIsLibraryMode(cfg: ConfigStateLike): boolean {
  return !!readConfigScalarOrDefault(cfg, 'isLibraryMode');
}

export function selectPreChestState(cfg: ConfigStateLike): ProjectPreChestStateLike {
  const rec = readRecord(cfg.preChestState);
  return rec ? { ...rec } : null;
}

export function selectHingeMap(cfg: ConfigStateLike): HingeMap {
  return readHingeMap(readConfigMapFromSnapshot(cfg, 'hingeMap', {}));
}

export function selectSavedNotes(cfg: ConfigStateLike): unknown[] {
  return readConfigArrayFromSnapshot(cfg, 'savedNotes', []);
}

export function selectSavedNotesCount(cfg: ConfigStateLike): number {
  return selectSavedNotes(cfg).length;
}

export function selectSavedColors(cfg: ConfigStateLike): SavedColorLike[] {
  return readConfigArrayFromSnapshot(cfg, 'savedColors', []);
}

export function selectColorSwatchesOrder(cfg: ConfigStateLike): string[] {
  return readConfigArrayFromSnapshot(cfg, 'colorSwatchesOrder', []);
}

export function selectCustomUploadedDataURL(cfg: ConfigStateLike): string {
  const raw = readConfigScalarOrDefault(cfg, 'customUploadedDataURL');
  return typeof raw === 'string' && raw.trim() ? raw : '';
}

export function selectIsMultiColorMode(cfg: ConfigStateLike): boolean {
  return !!readConfigScalarOrDefault(cfg, 'isMultiColorMode');
}

export function selectGrooveLinesCount(cfg: ConfigStateLike): number | null {
  const raw = readConfigScalarOrDefault(cfg, 'grooveLinesCount', null);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : null;
}

export function selectGroovesDirty(cfg: ConfigStateLike): boolean {
  const map = readConfigMapFromSnapshot(cfg, 'groovesMap', {});
  try {
    return Object.values(map).some(v => v === true);
  } catch {
    return false;
  }
}

export function selectRemovedDoorsDirty(cfg: ConfigStateLike): boolean {
  const map = readConfigMapFromSnapshot(cfg, 'removedDoorsMap', {});
  try {
    return Object.values(map).some(v => v === true);
  } catch {
    return false;
  }
}

export function selectLibraryUpperDoorsRemoved(cfg: ConfigStateLike, upperDoorsCount: unknown): boolean {
  const count = Math.max(0, Math.round(Number(upperDoorsCount) || 0));
  if (count <= 0) return false;

  const map = readConfigMapFromSnapshot(cfg, 'removedDoorsMap', {});
  for (let doorId = 1; doorId <= count; doorId += 1) {
    if (map[`removed_d${doorId}_full`] !== true) return false;
  }

  return true;
}

export function selectHasAnyCellDimsOverrides(cfg: ConfigStateLike): boolean {
  try {
    const modules = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
    for (const item of modules) {
      if (!isModuleConfigReadLike(item)) continue;
      if (moduleHasAnyActiveSpecialDims(item, 0)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

function hasInternalDrawersData(value: CornerDrawersLike | null): boolean {
  if (!value) return false;
  if (typeof value.intDrawersSlot !== 'undefined') {
    const slot = String(value.intDrawersSlot);
    if (slot !== '0' && slot !== '') return true;
  }
  if (Array.isArray(value.intDrawersList) && value.intDrawersList.length) return true;
  return Array.isArray(value.internalDrawers) && value.internalDrawers.length > 0;
}

function readCornerDrawersFromConfig(cfg: ConfigStateLike): CornerDrawersLike | null {
  const corner = readCornerConfigurationFromConfigSnapshot(cfg);
  return isCornerDrawersLike(corner) ? corner : null;
}

export function selectHasInternalDrawersData(cfg: ConfigStateLike): boolean {
  try {
    const modules = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
    for (const item of modules) {
      if (isModuleConfigReadLike(item) && hasInternalDrawersData(item)) return true;
    }

    return hasInternalDrawersData(readCornerDrawersFromConfig(cfg));
  } catch {
    return false;
  }
}
