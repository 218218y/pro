import type {
  AppContainer,
  CornerConfigurationLike,
  ModuleConfigLike,
  ModulesStructureItemLike,
  NormalizedTopModuleConfigLike,
  UnknownRecord,
} from '../../../types';

import { cfgDefaultCornerConfiguration } from '../runtime/cfg_access.js';
import {
  createDefaultLowerCornerConfiguration,
  sanitizeCornerConfigurationSnapshot,
  sanitizeLowerCornerConfigurationForPatch,
} from '../features/modules_configuration/corner_cells_api.js';
import { normalizeTopModuleConfigTyped } from '../features/modules_configuration/modules_config_api.js';

export type ModulesStructureItem = ModulesStructureItemLike;
export type ModuleCfgItem = NormalizedTopModuleConfigLike;
export type NormalizedCornerConfigurationLike = CornerConfigurationLike;

export interface DomainModulesSelectSurface extends UnknownRecord {
  list?: () => ModuleConfigLike[];
  count?: () => number;
  get?: (index: unknown) => ModuleConfigLike | null;
  hasInternalDrawers?: () => boolean;
}

export interface DomainCornerSelectSurface extends UnknownRecord {
  config?: () => NormalizedCornerConfigurationLike;
  hasInternalDrawers?: () => boolean;
  lowerConfig?: () => CornerConfigurationLike;
}

export interface DomainModulesCornerSelectRoot extends UnknownRecord {
  modules: DomainModulesSelectSurface;
  corner: DomainCornerSelectSurface;
}

export type DomainCornerReportNonFatal = (
  app: AppContainer,
  op: string,
  err: unknown,
  opts?: { throttleMs?: number; failFast?: boolean } | UnknownRecord
) => void;

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asRecordOrEmpty(value: unknown): UnknownRecord {
  return asRecord(value) || {};
}

export function readDoorsCount(value: unknown, fallback = 2): number {
  const rec = asRecord(value);
  const raw = rec ? rec.doors : undefined;
  const parsed = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asModulesStructureList(value: unknown): ModulesStructureItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => asRecord(item))
    .filter((item): item is UnknownRecord => !!item)
    .map(item => Object.assign({ doors: readDoorsCount(item) }, item));
}

export function readModulesList(select: DomainModulesCornerSelectRoot): ModuleConfigLike[] {
  return typeof select.modules.list === 'function' ? select.modules.list() : [];
}

export function readCornerConfig(select: DomainModulesCornerSelectRoot): NormalizedCornerConfigurationLike {
  return typeof select.corner.config === 'function' ? select.corner.config() : {};
}

export function readLowerCornerConfig(select: DomainModulesCornerSelectRoot): CornerConfigurationLike {
  return typeof select.corner.lowerConfig === 'function' ? select.corner.lowerConfig() : {};
}

export function cloneJsonRecord(value: unknown): UnknownRecord | null {
  const rec = asRecord(value);
  if (!rec) return null;
  try {
    return asRecord(JSON.parse(JSON.stringify(rec)));
  } catch {
    return cloneJsonCompatibleRecord(rec);
  }
}

function readCloneToJSONValue(value: object): unknown {
  try {
    const maybe = value as { toJSON?: () => unknown };
    return typeof maybe.toJSON === 'function' ? maybe.toJSON() : value;
  } catch {
    return undefined;
  }
}

function cloneJsonCompatibleValue(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): unknown {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol')
    return undefined;
  if (typeof value === 'bigint') return undefined;
  if (Array.isArray(value)) {
    if (seen.has(value)) return undefined;
    seen.add(value);
    try {
      const out: unknown[] = [];
      for (const entry of value) {
        const cloned = cloneJsonCompatibleValue(entry, seen);
        out.push(typeof cloned === 'undefined' ? null : cloned);
      }
      return out;
    } finally {
      seen.delete(value);
    }
  }
  const rec = asRecord(value);
  if (!rec) return undefined;
  if (seen.has(rec)) return undefined;
  seen.add(rec);
  try {
    const toJsonValue = readCloneToJSONValue(rec);
    if (toJsonValue !== rec) return cloneJsonCompatibleValue(toJsonValue, seen);
    const out: UnknownRecord = {};
    for (const [key, entry] of Object.entries(rec)) {
      const cloned = cloneJsonCompatibleValue(entry, seen);
      if (typeof cloned !== 'undefined') out[key] = cloned;
    }
    return out;
  } finally {
    seen.delete(rec);
  }
}

function cloneJsonCompatibleRecord(value: UnknownRecord): UnknownRecord | null {
  const cloned = cloneJsonCompatibleValue(value);
  return asRecord(cloned);
}

export function readLayout(value: unknown): unknown {
  return asRecord(value)?.layout;
}

export function readCornerConfiguration(cfg: unknown): CornerConfigurationLike {
  return asRecord(asRecord(cfg)?.cornerConfiguration) || {};
}

export function cloneModuleConfig(
  dst: ModuleCfgItem,
  patch?: UnknownRecord | null,
  index = 0,
  doors?: number
): ModuleCfgItem {
  const idx = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  const nextDoors = typeof doors === 'number' ? doors : readDoorsCount(patch, readDoorsCount(dst, 2));
  return normalizeTopModuleConfigTyped(
    {
      ...dst,
      ...(patch || {}),
      doors: nextDoors,
    },
    idx,
    nextDoors
  );
}

export function isFreePlacementSketchBox(value: unknown): boolean {
  return asRecord(value)?.freePlacement === true;
}

export function sanitizeSketchExtrasForNoMain(value: unknown): UnknownRecord {
  const extra = asRecord(value) || {};
  const boxes = Array.isArray(extra.boxes) ? extra.boxes.filter(isFreePlacementSketchBox) : [];
  return {
    boxes: boxes.map(item => cloneJsonRecord(item) || { ...(asRecord(item) || {}) }),
    shelves: [],
    storageBarriers: [],
    rods: [],
    drawers: [],
  };
}

export function sanitizeModuleConfigForNoMain(value: unknown): ModuleConfigLike {
  const next = cloneJsonRecord(value) || asRecord(value) || {};
  next.sketchExtras = sanitizeSketchExtrasForNoMain(next.sketchExtras);
  return next;
}

export function createDefaultCornerCfg(
  App: AppContainer,
  reportNonFatal: DomainCornerReportNonFatal
): NormalizedCornerConfigurationLike {
  try {
    const value = cfgDefaultCornerConfiguration(App);
    if (value) return sanitizeCornerConfigurationSnapshot(value);
  } catch (error) {
    reportNonFatal(App, 'defaultCornerCfg.cfgDefaultCornerConfiguration', error, {
      throttleMs: 8000,
    });
  }
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    intDrawersList: [],
    intDrawersSlot: 0,
    isCustom: false,
    gridDivisions: 6,
    customData: {
      shelves: [false, false, false, false, false, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
  };
}

export function sanitizeCornerCfg(
  App: AppContainer,
  reportNonFatal: DomainCornerReportNonFatal,
  value: unknown
): NormalizedCornerConfigurationLike {
  try {
    const src: UnknownRecord = asRecord(value) || createDefaultCornerCfg(App, reportNonFatal);
    return sanitizeCornerConfigurationSnapshot(src);
  } catch (error) {
    reportNonFatal(App, 'sanitizeCornerCfg', error, { throttleMs: 8000 });
    return createDefaultCornerCfg(App, reportNonFatal);
  }
}

export function createDefaultLowerCornerCfg(): UnknownRecord {
  return Object.assign({}, createDefaultLowerCornerConfiguration());
}

export function sanitizeLowerCornerCfg(value: unknown): UnknownRecord {
  return Object.assign({}, sanitizeLowerCornerConfigurationForPatch(value, value));
}
