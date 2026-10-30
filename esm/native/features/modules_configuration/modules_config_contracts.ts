import type {
  ModuleConfigLike,
  ModuleConfigPatchLike,
  ModuleCustomDataLike,
  ModulesConfigurationLike,
  ModulesStructureItemLike,
} from '../../../../types';
import { readInteger, readNumericInput } from '../../../shared/numeric_value_shared.js';

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
  const n = readInteger(readNumericInput(v));
  return n ?? defaultValue;
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

export function readExplicitLowerDoorSignature(cfg: unknown, expectedTotalDoors: number): number[] | null {
  const list = readModulesConfigurationListFromConfigSnapshot(cfg, 'stackSplitLowerModulesConfiguration');
  if (!list.length) return null;

  const signature: number[] = [];
  let sum = 0;
  for (const entry of list) {
    if (!isRecord(entry)) return null;
    const doors = toInt(entry.doors, 0);
    if (doors < 1) return null;
    signature.push(doors);
    sum += doors;
  }

  const expected = Math.max(0, Math.round(Number(expectedTotalDoors) || 0));
  return signature.length > 0 && sum === expected ? signature : null;
}

export function readExplicitLowerStructureSelect(cfg: unknown, expectedTotalDoors: number): string | null {
  const signature = readExplicitLowerDoorSignature(cfg, expectedTotalDoors);
  return signature ? JSON.stringify(signature) : null;
}

/**
 * Ensure required config containers exist (in-place) for older snapshots.
 * This is intentionally minimal (only the two module buckets).
 */
export function normalizeConfigModulesConfigurationContainersInPlace(cfg: UnknownBag): void {
  if (!Array.isArray(cfg.modulesConfiguration)) cfg.modulesConfiguration = [];
  if (!Array.isArray(cfg.stackSplitLowerModulesConfiguration)) cfg.stackSplitLowerModulesConfiguration = [];
}

type WinterBraceConfigRecord = Record<string, unknown>;
const winterBraceRecord = (value: unknown): WinterBraceConfigRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as WinterBraceConfigRecord) : null;
function ownsWinterBrace(config: WinterBraceConfigRecord, source: 'module' | 'box'): boolean {
  const custom = winterBraceRecord(config.customData);
  const active = Array.isArray(custom?.shelves) ? custom.shelves : [];
  if (
    source === 'module' &&
    config.isCustom === true &&
    Array.isArray(custom?.shelfVariants) &&
    custom.shelfVariants.some((v, i) => v === 'winter_brace' && active[i] === true)
  )
    return true;
  const extras = source === 'box' ? config : winterBraceRecord(config.sketchExtras);
  return (
    Array.isArray(extras?.shelves) &&
    extras.shelves.some(shelf => winterBraceRecord(shelf)?.variant === 'winter_brace')
  );
}

function visitHosts(
  config: WinterBraceConfigRecord,
  visit: (host: WinterBraceConfigRecord, source: 'module' | 'box') => void
) {
  const module = (value: unknown) => {
    const host = winterBraceRecord(value);
    if (!host) return;
    visit(host, 'module');
    const boxes = winterBraceRecord(host.sketchExtras)?.boxes;
    if (Array.isArray(boxes))
      for (const box of boxes) {
        const item = winterBraceRecord(box);
        if (item) visit(item, 'box');
      }
  };
  for (const key of ['modulesConfiguration', 'stackSplitLowerModulesConfiguration']) {
    const list = config[key];
    if (Array.isArray(list)) list.forEach(module);
  }
  const corner = winterBraceRecord(config.cornerConfiguration);
  if (corner)
    for (const host of [corner, winterBraceRecord(corner.stackSplitLower)]) {
      if (!host) continue;
      module(host);
      if (Array.isArray(host.modulesConfiguration)) host.modulesConfiguration.forEach(module);
    }
}

export function readWinterBraceDoorLockState(config: unknown): { hasWinterBrace: boolean; locked: boolean } {
  let hasWinterBrace = false,
    locked = false;
  const cfg = winterBraceRecord(config);
  if (cfg)
    visitHosts(cfg, (host, source) => {
      if (!ownsWinterBrace(host, source)) return;
      hasWinterBrace = true;
      if (host.winterBraceDoorsUnlocked !== true) locked = true;
    });
  return { hasWinterBrace, locked };
}

export function buildWinterBraceDoorLockPatch(config: unknown, locked: boolean): WinterBraceConfigRecord {
  const cfg = winterBraceRecord(config);
  if (!cfg) throw new TypeError('Winter brace door lock requires a config snapshot');
  const patch: WinterBraceConfigRecord = {};
  for (const key of ['modulesConfiguration', 'stackSplitLowerModulesConfiguration', 'cornerConfiguration']) {
    if (cfg[key] !== undefined) patch[key] = structuredClone(cfg[key]);
  }
  visitHosts(patch, (host, source) => {
    if (ownsWinterBrace(host, source)) host.winterBraceDoorsUnlocked = !locked;
  });
  return patch;
}
