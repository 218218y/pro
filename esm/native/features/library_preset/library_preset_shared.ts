import type {
  DoorSpecialMap,
  ModuleConfigLike,
  ModuleCustomDataLike,
  ModulesConfigurationLike,
  UnknownRecord,
} from '../../../../types';
import type {
  LibraryPresetConfigSnapshot,
  LibraryPresetUiRawState,
  LibraryPresetUiSnapshot,
} from './library_preset_types.js';

import { cloneLightModulesConfigurationSnapshot } from '../modules_configuration/modules_config_api.js';
import {
  calculateModuleStructure,
  normalizeModuleStructureDoorCount,
  normalizeModuleStructureSelectForDoors,
} from '../modules_configuration/calc_module_structure.js';
import { buildLibraryModuleCfgs } from './module_defaults.js';

type LibraryPresetRawKey =
  | 'width'
  | 'height'
  | 'depth'
  | 'doors'
  | 'chestDrawersCount'
  | 'stackSplitLowerHeight'
  | 'stackSplitLowerDepth'
  | 'stackSplitLowerWidth'
  | 'stackSplitLowerDoors'
  | 'stackSplitLowerDepthManual'
  | 'stackSplitLowerWidthManual'
  | 'stackSplitLowerDoorsManual';

const LIBRARY_PRESET_RAW_KEYS: LibraryPresetRawKey[] = [
  'width',
  'height',
  'depth',
  'doors',
  'chestDrawersCount',
  'stackSplitLowerHeight',
  'stackSplitLowerDepth',
  'stackSplitLowerWidth',
  'stackSplitLowerDoors',
  'stackSplitLowerDepthManual',
  'stackSplitLowerWidthManual',
  'stackSplitLowerDoorsManual',
];

function copyLibraryPresetUiRawKey<K extends LibraryPresetRawKey>(
  out: LibraryPresetUiRawState,
  src: Partial<LibraryPresetUiRawState>,
  key: K
): void {
  out[key] = src[key];
}

export function isRec(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function readLibraryPresetUiRawState(raw: unknown): LibraryPresetUiRawState {
  const out: LibraryPresetUiRawState = {};
  if (!isRec(raw)) return out;
  for (const key of LIBRARY_PRESET_RAW_KEYS) {
    if (key in raw) copyLibraryPresetUiRawKey(out, raw, key);
  }
  return out;
}

export function cloneModuleConfigList(
  value: ModulesConfigurationLike | null
): ModulesConfigurationLike | null {
  if (!Array.isArray(value)) return null;
  return value.map(item => (isRec(item) ? { ...item } : {}));
}

export function cloneStringMap(value: unknown): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {};
  if (!isRec(value)) return out;
  for (const [key, raw] of Object.entries(value)) {
    if (raw === undefined) {
      out[key] = undefined;
      continue;
    }
    if (raw === null) {
      out[key] = null;
      continue;
    }
    out[key] = typeof raw === 'string' ? raw : String(raw);
  }
  return out;
}

export function cloneDoorSpecialMap(value: unknown): DoorSpecialMap {
  const out: DoorSpecialMap = {};
  if (!isRec(value)) return out;
  for (const [key, raw] of Object.entries(value)) {
    if (raw === undefined) {
      out[key] = undefined;
      continue;
    }
    if (raw === null) {
      out[key] = null;
      continue;
    }
    out[key] = typeof raw === 'string' ? raw : String(raw);
  }
  return out;
}

export function asModuleConfig(value: unknown): ModuleConfigLike | null {
  if (!isRec(value)) return null;
  const out: ModuleConfigLike = { ...value };
  return out;
}

export function doorPartKeys(doorId: number): string[] {
  const base = `d${doorId}`;
  return [`${base}_full`, `${base}_top`, `${base}_mid`, `${base}_bot`];
}

export function normDoorCount(raw: unknown, wardrobeType: 'hinged' | 'sliding'): number {
  return normalizeModuleStructureDoorCount(raw, wardrobeType);
}

export function normalizeLibraryStructureSelectForDoors(
  doorsCount: number,
  wardrobeType: 'hinged' | 'sliding',
  structureSelect: unknown
): unknown {
  return normalizeModuleStructureSelectForDoors(doorsCount, wardrobeType, structureSelect);
}

function readDoorCountFromStructureItem(value: unknown): number {
  const n = isRec(value) ? Number(value.doors) : Number(value);
  return Math.max(1, Number.isFinite(n) ? Math.round(n) : 1);
}

export function calcDoorsSignatureFromUi(
  doorsCount: number,
  wardrobeType: 'hinged' | 'sliding',
  ui: LibraryPresetUiSnapshot
): number[] {
  const normalizedDoorsCount = normDoorCount(doorsCount, wardrobeType);
  const structureSelect = normalizeLibraryStructureSelectForDoors(
    normalizedDoorsCount,
    wardrobeType,
    ui.structureSelect
  );
  const structure = calculateModuleStructure(
    normalizedDoorsCount,
    ui.singleDoorPos,
    structureSelect,
    wardrobeType
  );
  return Array.isArray(structure) ? structure.map(readDoorCountFromStructureItem) : [];
}

export function captureModulesConfigurationSnapshot(
  cfg: LibraryPresetConfigSnapshot,
  key: 'modulesConfiguration' | 'stackSplitLowerModulesConfiguration'
): ModulesConfigurationLike | null {
  try {
    const hasKey = Object.prototype.hasOwnProperty.call(cfg, key);
    if (!hasKey) return null;
    return cloneLightModulesConfigurationSnapshot(cfg, key);
  } catch {
    return null;
  }
}

export function buildLibraryModuleConfigLists(
  topDoorsCount: number,
  bottomDoorsCount: number,
  wardrobeType: 'hinged' | 'sliding',
  ui: LibraryPresetUiSnapshot
): { topCfgList: ModulesConfigurationLike; bottomCfgList: ModulesConfigurationLike } {
  const topDoorsSig = calcDoorsSignatureFromUi(topDoorsCount, wardrobeType, ui);
  const bottomDoorsSig = calcDoorsSignatureFromUi(bottomDoorsCount, wardrobeType, ui);
  return buildLibraryModuleCfgs(topDoorsSig, bottomDoorsSig);
}

function hasUsableInteriorState(cfg: ModuleConfigLike): boolean {
  if (!!cfg.isCustom) return true;
  return typeof cfg.layout === 'string' && cfg.layout.trim().length > 0;
}

export function cloneExpectedLibraryModuleCfg(cfg: ModuleConfigLike): ModuleConfigLike {
  return {
    ...cfg,
    customData: isRec(cfg.customData)
      ? {
          ...cfg.customData,
          shelves: Array.isArray(cfg.customData.shelves) ? cfg.customData.shelves.slice() : [],
          rods: Array.isArray(cfg.customData.rods) ? cfg.customData.rods.slice() : [],
        }
      : cfg.customData,
    intDrawersList: Array.isArray(cfg.intDrawersList) ? cfg.intDrawersList.slice() : [],
  };
}

function readFiniteInt(raw: unknown, defaultValue: number, min = 0): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return defaultValue;
  return n >= min ? n : defaultValue;
}

function normalizeBoolArrayAgainstLength(
  value: unknown,
  defaultValue: unknown,
  targetLength: number
): boolean[] {
  const defaultList = Array.isArray(defaultValue) ? defaultValue : [];
  const srcList = Array.isArray(value) ? value : [];
  const out = new Array(targetLength);
  for (let i = 0; i < targetLength; i += 1) {
    const raw = i < srcList.length ? srcList[i] : defaultList[i];
    out[i] = !!raw;
  }
  return out;
}

function normalizeStringArrayAgainstLength(
  value: unknown,
  defaultValue: unknown,
  targetLength: number
): string[] {
  const defaultList = Array.isArray(defaultValue) ? defaultValue : [];
  const srcList = Array.isArray(value) ? value : [];
  const out = new Array(targetLength);
  for (let i = 0; i < targetLength; i += 1) {
    const raw = i < srcList.length ? srcList[i] : defaultList[i];
    out[i] = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  }
  return out;
}

function cloneArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice() : [];
}

function hasFiniteSavedGridFrame(cfg: ModuleConfigLike): boolean {
  const saved = isRec(cfg.savedDims) ? cfg.savedDims : null;
  if (!saved) return false;
  const top = Number(saved.top);
  const bottom = Number(saved.bottom);
  return Number.isFinite(top) && Number.isFinite(bottom) && top > bottom;
}

function hasManualLayoutGridProvenance(cfg: ModuleConfigLike): boolean {
  return cfg.manualLayoutGridEdited === true;
}

function areLibraryModuleValuesEqual(prev: unknown, next: unknown): boolean {
  if (Object.is(prev, next)) return true;

  if (Array.isArray(prev) || Array.isArray(next)) {
    if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i += 1) {
      if (!areLibraryModuleValuesEqual(prev[i], next[i])) return false;
    }
    return true;
  }

  if (!isRec(prev) || !isRec(next)) return false;

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;

  for (let i = 0; i < prevKeys.length; i += 1) {
    const key = prevKeys[i];
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if (!areLibraryModuleValuesEqual(prev[key], next[key])) return false;
  }

  return true;
}

export function normalizePreservedLibraryModuleCfg(
  current: unknown,
  expected: ModuleConfigLike
): ModuleConfigLike {
  const template = cloneExpectedLibraryModuleCfg(expected);
  const src = asModuleConfig(current) || {};
  const templateCustom: UnknownRecord = isRec(template.customData) ? template.customData : {};
  const srcCustom: UnknownRecord = isRec(src.customData) ? src.customData : {};
  const templateGridDivisions = readFiniteInt(template.gridDivisions, 1, 1);
  const hasExplicitSrcGridDivisions =
    Object.prototype.hasOwnProperty.call(src, 'gridDivisions') && src.gridDivisions != null;
  const srcGridDivisions = readFiniteInt(src.gridDivisions, templateGridDivisions, 1);
  const hasManualCustomGrid =
    !!src.isCustom &&
    hasExplicitSrcGridDivisions &&
    (hasFiniteSavedGridFrame(src) || hasManualLayoutGridProvenance(src));
  const gridDivisions = hasManualCustomGrid ? srcGridDivisions : templateGridDivisions;
  const preserveCustomGridData =
    hasManualCustomGrid || (hasExplicitSrcGridDivisions && srcGridDivisions === templateGridDivisions);
  const customData: ModuleCustomDataLike = {
    ...templateCustom,
    ...srcCustom,
    shelves: normalizeBoolArrayAgainstLength(
      preserveCustomGridData ? srcCustom.shelves : undefined,
      templateCustom.shelves,
      gridDivisions
    ),
    rods: normalizeBoolArrayAgainstLength(
      preserveCustomGridData ? srcCustom.rods : undefined,
      templateCustom.rods,
      gridDivisions
    ),
    storage: preserveCustomGridData
      ? srcCustom.storage == null
        ? !!templateCustom.storage
        : !!srcCustom.storage
      : !!templateCustom.storage,
  };

  const hasSourceShelfVariants = preserveCustomGridData && Array.isArray(srcCustom.shelfVariants);
  const hasTemplateShelfVariants = Array.isArray(templateCustom.shelfVariants);
  if (hasSourceShelfVariants || hasTemplateShelfVariants) {
    customData.shelfVariants = normalizeStringArrayAgainstLength(
      hasSourceShelfVariants ? srcCustom.shelfVariants : undefined,
      templateCustom.shelfVariants,
      gridDivisions
    );
  } else {
    delete customData.shelfVariants;
  }

  const hasSourceRodOps = preserveCustomGridData && Array.isArray(srcCustom.rodOps);
  const hasTemplateRodOps = Array.isArray(templateCustom.rodOps);
  if (hasSourceRodOps || hasTemplateRodOps) {
    customData.rodOps = hasSourceRodOps ? cloneArray(srcCustom.rodOps) : cloneArray(templateCustom.rodOps);
  } else {
    delete customData.rodOps;
  }

  const next: ModuleConfigLike = {
    ...src,
    ...template,
    layout:
      typeof src.layout === 'string' && src.layout.trim() ? src.layout : String(template.layout || 'shelves'),
    extDrawersCount: readFiniteInt(src.extDrawersCount, readFiniteInt(template.extDrawersCount, 0, 0), 0),
    hasShoeDrawer: src.hasShoeDrawer == null ? !!template.hasShoeDrawer : !!src.hasShoeDrawer,
    intDrawersSlot: readFiniteInt(src.intDrawersSlot, readFiniteInt(template.intDrawersSlot, 0, 0), 0),
    intDrawersList: Array.isArray(src.intDrawersList)
      ? src.intDrawersList.slice()
      : Array.isArray(template.intDrawersList)
        ? template.intDrawersList.slice()
        : [],
    isCustom: src.isCustom == null ? !!template.isCustom : !!src.isCustom,
    gridDivisions,
    customData,
    doors: readFiniteInt(template.doors, 0, 0),
  };

  if (preserveCustomGridData && Array.isArray(src.braceShelves)) {
    next.braceShelves = src.braceShelves.slice();
  } else if (Array.isArray(template.braceShelves)) {
    next.braceShelves = template.braceShelves.slice();
  } else {
    delete next.braceShelves;
  }

  return next;
}

export function canPreserveLibraryModuleCfg(
  cfg: unknown,
  expected: ModuleConfigLike
): cfg is ModuleConfigLike {
  if (!isRec(cfg) || !isRec(expected)) return false;
  const c = asModuleConfig(cfg);
  if (!c) return false;
  if (!hasUsableInteriorState(c)) return false;
  return Number(c.doors || 0) === Number(expected.doors || 0);
}

export function buildNextLibraryModuleCfgList(
  list: unknown,
  expectedList: ModulesConfigurationLike
): ModulesConfigurationLike | null {
  const curList = Array.isArray(list) ? list : [];
  let changed = curList.length !== expectedList.length;
  const nextList: ModulesConfigurationLike = new Array(expectedList.length);

  for (let i = 0; i < expectedList.length; i++) {
    const expected = expectedList[i];
    const current = curList[i];
    if (canPreserveLibraryModuleCfg(current, expected)) {
      const normalized = normalizePreservedLibraryModuleCfg(current, expected);
      nextList[i] = normalized;
      if (!areLibraryModuleValuesEqual(current, normalized)) changed = true;
      continue;
    }
    nextList[i] = cloneExpectedLibraryModuleCfg(expected);
    changed = true;
  }

  return changed ? nextList : null;
}
