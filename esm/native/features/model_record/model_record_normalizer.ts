import type { SavedModelLike, UnknownRecord } from '../../../../types/index.js';

import { canonicalizeProjectConfigListsForLoad } from '../project_config/project_config_lists_canonical.js';
import { canonicalizeComparableProjectConfigSnapshot } from '../project_config/project_config_snapshot_canonical.js';
import { calculateModuleStructure } from '../modules_configuration/calc_module_structure.js';
import { materializeTopModulesConfigurationForStructure } from '../modules_configuration/modules_config_api.js';

type SavedModelRecordLike = Record<string, unknown> & {
  settings?: unknown;
  toggles?: unknown;
  chestSettings?: unknown;
  chest_settings?: unknown;
  data?: unknown;
  modulesConfiguration?: unknown;
  stackSplitLowerModulesConfiguration?: unknown;
  cornerConfiguration?: unknown;
  savedNotes?: unknown;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? { ...value } : null;
}

function cloneJsonValue<T>(value: T, fallback: T): T {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch {
    // ignore
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return fallback;
  }
}

function cloneMapRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? cloneJsonValue(value, {}) : {};
}

function cloneArrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? cloneJsonValue(value, []) : [];
}

function isSavedModelRecordLike(value: unknown): value is SavedModelRecordLike {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeWardrobeType(value: unknown): 'hinged' | 'sliding' {
  return value === 'sliding' ? 'sliding' : 'hinged';
}

function toIntMin(v: unknown, fallback: number, min: number): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

function buildTopModulesStructure(settings: unknown): unknown[] {
  const rec = isRecord(settings) ? settings : {};
  try {
    return calculateModuleStructure(
      toIntMin(rec.doors, 2, 0),
      typeof rec.singleDoorPos === 'string' ? rec.singleDoorPos : '',
      typeof rec.structureSelection === 'string' ? rec.structureSelection : '',
      normalizeWardrobeType(rec.wardrobeType)
    );
  } catch {
    return [];
  }
}

export function normalizeModelRecord(model: SavedModelRecordLike): SavedModelLike {
  const presetId =
    typeof model.id === 'string' && model.id.trim()
      ? model.id.trim()
      : `preset_${String(model.name || 'unnamed').trim() || 'unnamed'}`;
  const presetName = typeof model.name === 'string' && model.name.trim() ? model.name.trim() : presetId;

  const out: UnknownRecord = Object.assign({}, model, { id: presetId, name: presetName });

  out.toggles = model.toggles && typeof model.toggles === 'object' ? cloneJsonValue(model.toggles, {}) : {};
  if (model.chestSettings && typeof model.chestSettings === 'object') {
    out.chestSettings = cloneJsonValue(model.chestSettings, {});
  } else if (model.chest_settings && typeof model.chest_settings === 'object') {
    out.chestSettings = cloneJsonValue(model.chest_settings, {});
  }

  delete out.data;
  delete out.chest_settings;

  const settings = cloneRecord(model.settings) ?? {};
  out.settings = settings;
  const canonicalConfigLists = canonicalizeProjectConfigListsForLoad(out, settings);
  out.modulesConfiguration = materializeTopModulesConfigurationForStructure(
    canonicalConfigLists.modulesConfiguration,
    buildTopModulesStructure(out.settings)
  );
  out.stackSplitLowerModulesConfiguration = canonicalConfigLists.stackSplitLowerModulesConfiguration;
  out.cornerConfiguration = canonicalConfigLists.cornerConfiguration;

  const mapKeys = [
    'groovesMap',
    'grooveLinesCountMap',
    'splitDoorsMap',
    'splitDoorsBottomMap',
    'removedDoorsMap',
    'drawerDividersMap',
    'individualColors',
    'doorSpecialMap',
    'doorStyleMap',
    'handlesMap',
    'hingeMap',
    'curtainMap',
    'mirrorLayoutMap',
    'doorTrimMap',
  ];
  mapKeys.forEach(k => {
    out[k] = cloneMapRecord(out[k]);
  });

  out.savedNotes = cloneArrayValue(out.savedNotes);
  out.savedColors = cloneArrayValue(out.savedColors);

  if (typeof out.preChestState !== 'undefined') {
    out.preChestState = out.preChestState === null ? null : cloneMapRecord(out.preChestState);
  }

  if (typeof out.orderPdfEditorDraft !== 'undefined') {
    out.orderPdfEditorDraft = cloneJsonValue(out.orderPdfEditorDraft, null);
  }

  if (typeof out.orderPdfEditorZoom !== 'undefined') {
    const zoom = Number(out.orderPdfEditorZoom);
    out.orderPdfEditorZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }

  const canonicalConfigSnapshot = canonicalizeComparableProjectConfigSnapshot(out, {
    topMode: 'clone',
    cornerMode: 'full',
    savedColorsMode: 'mixed',
  });

  const normalizedModel: SavedModelLike = { ...canonicalConfigSnapshot, id: presetId, name: presetName };
  return normalizedModel;
}

export function normalizeModelList(list: unknown): SavedModelLike[] {
  const arr = Array.isArray(list) ? list.filter(isSavedModelRecordLike) : [];
  return arr.map(normalizeModelRecord);
}

export type { SavedModelRecordLike };
