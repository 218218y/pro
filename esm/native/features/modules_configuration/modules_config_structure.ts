import type { ModuleConfigLike, NormalizedTopModuleConfigLike } from '../../../../types';

import { createDefaultTopModuleConfig } from './module_defaults.js';
import { calculateModuleStructure } from './calc_module_structure.js';
import { createDefaultLowerModuleConfig, normalizeLowerModuleConfig } from '../stack_split/module_config.js';
import {
  cloneModuleCustomData,
  isRecord,
  readDoorsCount,
  readModulesConfigurationListFromConfigSnapshot,
  toInt,
  toIntMin,
} from './modules_config_contracts.js';
import type {
  EnsureModuleConfigItemOptions,
  ModulesConfigBucketKey,
  PatchModulesConfigurationListOptions,
  TopModuleStructureLike,
} from './modules_config_contracts.js';

function readTopModulesStructureDoorCount(modulesStructure: unknown, index: number): number | null {
  const list = Array.isArray(modulesStructure) ? modulesStructure : [];
  if (index < 0 || index >= list.length) return null;
  return readDoorsCount(list[index], 2);
}

export function resolveTopModulesStructureFromUiConfig(
  uiSnapshot: unknown,
  cfgSnapshot: unknown
): TopModuleStructureLike[] {
  const ui = isRecord(uiSnapshot) ? uiSnapshot : {};
  const raw = isRecord(ui.raw) ? ui.raw : {};
  const doorsCount = toIntMin(ui.doors ?? raw.doors, 2, 0);
  const singleDoorPos = String(ui.singleDoorPos ?? raw.singleDoorPos ?? '');
  const structureSelect = String(ui.structureSelect ?? raw.structureSelect ?? '');
  const cfg = isRecord(cfgSnapshot) ? cfgSnapshot : {};
  const wardrobeType = String(cfg.wardrobeType ?? 'hinged');

  try {
    const structure = calculateModuleStructure(doorsCount, singleDoorPos, structureSelect, wardrobeType);
    return Array.isArray(structure) ? structure : [];
  } catch {
    return [];
  }
}

export function resolveTopModuleDoorsFromUiConfigAt(
  uiSnapshot: unknown,
  cfgSnapshot: unknown,
  index: number,
  fallback = 2
): number {
  const parsedIndex = Number.isFinite(index) && index >= 0 ? Math.floor(index) : -1;
  if (parsedIndex < 0) return toIntMin(fallback, 2, 1);

  const structureDoors = readTopModulesStructureDoorCount(
    resolveTopModulesStructureFromUiConfig(uiSnapshot, cfgSnapshot),
    parsedIndex
  );
  return structureDoors == null ? readDoorsCount(undefined, fallback) : structureDoors;
}

export function resolveTopModuleDoorsForIndex(
  candidate: unknown,
  index: number,
  options?: EnsureModuleConfigItemOptions
): number {
  if (options && Number.isFinite(options.doors)) {
    return toIntMin(options.doors, 2, 1);
  }

  const structureDoors = readTopModulesStructureDoorCount(options?.modulesStructure, index);
  if (structureDoors != null) return structureDoors;

  if (options && ('uiSnapshot' in options || 'cfgSnapshot' in options)) {
    return resolveTopModuleDoorsFromUiConfigAt(
      options?.uiSnapshot,
      options?.cfgSnapshot,
      index,
      readDoorsCount(candidate)
    );
  }

  return readDoorsCount(candidate);
}

/**
 * Typed normalization for TOP module config items.
 * Door-aware defaults are important for odd door counts / custom module layouts.
 */
export function normalizeTopModuleConfigTyped(
  src: unknown,
  index: number,
  doors: number
): NormalizedTopModuleConfigLike {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  const d = Number.isFinite(doors) && doors > 0 ? Math.floor(doors) : 2;

  const base: ModuleConfigLike = isRecord(src) ? Object.assign({}, src) : createDefaultTopModuleConfig(i, d);
  const layout =
    typeof base.layout === 'string' && base.layout ? base.layout : i === 0 ? 'hanging_top2' : 'shelves';

  return {
    ...base,
    layout,
    extDrawersCount: toInt(base.extDrawersCount, 0),
    hasShoeDrawer: !!base.hasShoeDrawer,
    intDrawersSlot: toInt(base.intDrawersSlot, 0),
    intDrawersList: Array.isArray(base.intDrawersList) ? base.intDrawersList.slice() : [],
    isCustom: !!base.isCustom,
    doors: toIntMin(base.doors, d, 1),
    customData: cloneModuleCustomData(base.customData),
  };
}

export function normalizeModuleItemForBucket(
  bucket: ModulesConfigBucketKey,
  candidate: ModuleConfigLike,
  index: number,
  options?: EnsureModuleConfigItemOptions | PatchModulesConfigurationListOptions
): ModuleConfigLike {
  if (bucket === 'stackSplitLowerModulesConfiguration') {
    return normalizeLowerModuleConfig(candidate, index);
  }
  return normalizeTopModuleConfigTyped(
    candidate,
    index,
    resolveTopModuleDoorsForIndex(candidate, index, options)
  );
}

export function ensureModulesConfigurationItemFromListSnapshot(
  bucket: ModulesConfigBucketKey,
  listValue: unknown,
  index: number,
  options?: EnsureModuleConfigItemOptions
): ModuleConfigLike | null {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : -1;
  if (i < 0) return null;

  const list = Array.isArray(listValue) ? listValue : [];
  const raw = list[i];

  if (bucket === 'stackSplitLowerModulesConfiguration') {
    const base = isRecord(raw) ? raw : createDefaultLowerModuleConfig(i);
    return normalizeLowerModuleConfig(base, i);
  }

  const doors = resolveTopModuleDoorsForIndex(raw, i, options);
  const base = isRecord(raw) ? { ...raw, doors } : { doors };
  return normalizeTopModuleConfigTyped(base, i, doors);
}

export function ensureModulesConfigurationItemFromConfigSnapshot(
  cfg: unknown,
  bucket: ModulesConfigBucketKey,
  index: number,
  options?: EnsureModuleConfigItemOptions
): ModuleConfigLike | null {
  return ensureModulesConfigurationItemFromListSnapshot(
    bucket,
    readModulesConfigurationListFromConfigSnapshot(cfg, bucket),
    index,
    options
  );
}

function ensureNormalizedTopModuleFromListSnapshot(
  prevListValue: unknown,
  index: number,
  modulesStructure: TopModuleStructureLike[]
): NormalizedTopModuleConfigLike {
  const ensured = ensureModulesConfigurationItemFromListSnapshot(
    'modulesConfiguration',
    prevListValue,
    index,
    {
      modulesStructure,
    }
  );
  return normalizeTopModuleConfigTyped(
    ensured,
    index,
    resolveTopModuleDoorsForIndex(ensured, index, { modulesStructure })
  );
}

export function materializeTopModulesConfigurationForStructure(
  prevListValue: unknown,
  modulesStructure: unknown
): NormalizedTopModuleConfigLike[] {
  const structureList = Array.isArray(modulesStructure) ? modulesStructure : [];
  const out: NormalizedTopModuleConfigLike[] = new Array(structureList.length);

  for (let i = 0; i < structureList.length; i += 1) {
    out[i] = ensureNormalizedTopModuleFromListSnapshot(prevListValue, i, structureList);
  }

  return out;
}
