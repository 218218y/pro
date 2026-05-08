import type {
  ModuleConfigLike,
  ModuleConfigPatchLike,
  ModuleCustomDataLike,
  ModulesConfigurationLike,
  ModulesStructureItemLike,
} from '../../../../types';

import { createDefaultModuleCustomData } from './module_defaults.js';

export type UnknownBag = Record<string, unknown>;
export type ModulesConfigBucketKey = 'modulesConfiguration' | 'stackSplitLowerModulesConfiguration';
export type TopModuleStructureLike = Pick<ModulesStructureItemLike, 'doors'> | Record<string, unknown>;

export interface EnsureModuleConfigItemOptions {
  doors?: number;
  modulesStructure?: unknown;
  uiSnapshot?: unknown;
  cfgSnapshot?: unknown;
}

export interface PatchModulesConfigurationListOptions extends EnsureModuleConfigItemOptions {}

export function isRecord(v: unknown): v is UnknownBag {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function toInt(v: unknown, defaultValue: number): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

export function toIntMin(v: unknown, defaultValue: number, min: number): number {
  const n = toInt(v, defaultValue);
  return n >= min ? n : defaultValue;
}

export function asUnknownList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asModuleConfigRecord(value: unknown): ModuleConfigLike {
  return isRecord(value) ? { ...value } : {};
}

export function cloneModuleConfig(src: unknown): ModuleConfigLike {
  return isRecord(src) ? { ...src } : {};
}

function cloneMutableUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(entry => cloneMutableUnknown(entry));

  if (isRecord(value)) {
    const out: UnknownBag = {};
    for (const key of Object.keys(value)) {
      out[key] = cloneMutableUnknown(value[key]);
    }
    return out;
  }

  return value;
}

export function cloneMutableValue<T>(value: T): T {
  return cloneMutableUnknown(value) as T;
}

export function cloneModuleConfigForPatch(src: unknown): ModuleConfigLike {
  return isRecord(src) ? cloneMutableValue(src) : {};
}

export function isModuleConfigPatchLike(value: unknown): value is ModuleConfigPatchLike {
  return isRecord(value);
}

export function readDoorsCount(value: unknown, defaultValue = 2): number {
  return toIntMin(isRecord(value) ? value.doors : undefined, defaultValue, 1);
}

export function cloneModuleCustomData(src: unknown): ModuleCustomDataLike {
  const base = isRecord(src) ? Object.assign({}, src) : {};
  const defaults = createDefaultModuleCustomData();
  return {
    ...base,
    shelves: Array.isArray(base.shelves) ? base.shelves.slice() : defaults.shelves.slice(),
    rods: Array.isArray(base.rods) ? base.rods.slice() : defaults.rods.slice(),
    storage: !!base.storage,
  };
}

/**
 * Read a module-configuration bucket from a config snapshot.
 * Always returns an array (never null/undefined).
 */
export function readModulesConfigurationListFromConfigSnapshot(
  cfg: unknown,
  key: ModulesConfigBucketKey = 'modulesConfiguration'
): ModulesConfigurationLike {
  const c = isRecord(cfg) ? cfg : null;
  const v = c ? c[key] : null;
  return Array.isArray(v) ? v : [];
}

/**
 * Ensure required config containers exist (in-place) for older snapshots.
 * This is intentionally minimal (only the two module buckets).
 */
export function normalizeConfigModulesConfigurationContainersInPlace(cfg: UnknownBag): void {
  if (!Array.isArray(cfg.modulesConfiguration)) cfg.modulesConfiguration = [];
  if (!Array.isArray(cfg.stackSplitLowerModulesConfiguration)) cfg.stackSplitLowerModulesConfiguration = [];
}
