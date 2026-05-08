import type {
  AppContainer,
  ActionMetaLike,
  ConfigSlicePatch,
  CornerConfigurationLike,
  ModuleConfigPatchLike,
  StateKernelLike,
  UnknownCallable,
  UnknownRecord,
  NormalizedTopModuleConfigLike,
} from '../../../types';

import { getCfg } from './store_access.js';
import { normalizeLowerModuleConfig } from '../features/stack_split/module_config.js';
import { normalizeTopModuleConfigTyped } from '../features/modules_configuration/modules_config_api.js';
import type { ModulesConfigBucketKey } from '../features/modules_configuration/modules_config_api.js';
import {
  createDefaultLowerCornerConfiguration,
  sanitizeCornerConfigurationForPatch,
  sanitizeLowerCornerConfigurationForPatch,
} from '../features/modules_configuration/corner_cells_api.js';

export interface KernelStateKernelConfigContext {
  App: AppContainer;
  __sk: StateKernelLike & UnknownRecord;
  asMeta: (meta: unknown) => ActionMetaLike;
  asRecord: (x: unknown, defaultValue?: UnknownRecord) => UnknownRecord;
  isRecord: (x: unknown) => x is UnknownRecord;
  isFn: (x: unknown) => x is UnknownCallable;
  cloneKernelValue: (App: AppContainer, v: unknown, defaultValue?: unknown) => unknown;
  setStoreConfigPatch: (App: AppContainer, patch: ConfigSlicePatch, meta: ActionMetaLike) => boolean;
  asString: (x: unknown) => string;
  readCornerCfgFromStoreConfig: (cfg: unknown) => UnknownRecord;
  readLowerCornerCfgFromCornerCfg: (cornerCfg: UnknownRecord) => UnknownRecord | null;
}

export interface KernelStateKernelConfigHelpers extends KernelStateKernelConfigContext {
  emptyRecord: () => UnknownRecord;
  emptyCornerLowerConfig: () => UnknownRecord;
  clone: (v: unknown, defaultValue?: unknown) => unknown;
  cloneRecord: (v: unknown, defaultValue?: UnknownRecord) => UnknownRecord;
  cloneArray: (v: unknown) => unknown[];
  asBucketKey: (name: string) => ModulesConfigBucketKey;
  sanitizeCornerRecord: (value: unknown, prev: UnknownRecord) => UnknownRecord;
  normalizeTopModuleRecord: (value: unknown, idx: number, doors: number) => NormalizedTopModuleConfigLike;
  normalizeLowerModuleRecord: (value: unknown, idx: number) => UnknownRecord;
  asCornerConfiguration: (value: unknown) => CornerConfigurationLike;
  asModuleConfigPatch: (patchIn: unknown) => ModuleConfigPatchLike;
  readStoreConfigSnapshot: () => UnknownRecord;
  parseCornerCellIndex: (k: unknown) => number | null;
  normalizeSplitLowerCornerConfig: (value: unknown) => UnknownRecord;
}

export function createKernelStateKernelConfigHelpers(
  ctx: KernelStateKernelConfigContext
): KernelStateKernelConfigHelpers {
  const {
    App,
    __sk,
    asMeta,
    asRecord,
    isRecord,
    isFn,
    cloneKernelValue,
    setStoreConfigPatch,
    asString,
    readCornerCfgFromStoreConfig,
    readLowerCornerCfgFromCornerCfg,
  } = ctx;

  const emptyRecord = (): UnknownRecord => ({});
  const emptyCornerLowerConfig = (): UnknownRecord => asRecord(createDefaultLowerCornerConfiguration(), {});
  const clone = (v: unknown, defaultValue?: unknown) => cloneKernelValue(App, v, defaultValue);
  const cloneRecord = (v: unknown, defaultValue?: UnknownRecord): UnknownRecord =>
    asRecord(clone(v, defaultValue || {}), defaultValue || {});
  const cloneArray = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice() : []);
  const asBucketKey = (name: string): ModulesConfigBucketKey =>
    name === 'stackSplitLowerModulesConfiguration'
      ? 'stackSplitLowerModulesConfiguration'
      : 'modulesConfiguration';
  const sanitizeCornerRecord = (value: unknown, prev: UnknownRecord): UnknownRecord =>
    asRecord(sanitizeCornerConfigurationForPatch(value, prev), {});
  const normalizeTopModuleRecord = (
    value: unknown,
    idx: number,
    doors: number
  ): NormalizedTopModuleConfigLike => normalizeTopModuleConfigTyped(value, idx, doors);
  const normalizeLowerModuleRecord = (value: unknown, idx: number): UnknownRecord =>
    asRecord(normalizeLowerModuleConfig(value, idx), {});
  const asCornerConfiguration = (value: unknown): CornerConfigurationLike => ({
    ...(isRecord(value) ? value : {}),
  });
  const asModuleConfigPatch = (patchIn: unknown): ModuleConfigPatchLike => ({
    ...(isRecord(patchIn) ? patchIn : emptyRecord()),
  });
  const readStoreConfigSnapshot = (): UnknownRecord =>
    __sk && typeof __sk.getStoreConfig === 'function'
      ? asRecord(__sk.getStoreConfig() || {}, {})
      : asRecord(getCfg(App), {});

  const parseCornerCellIndex = (k: unknown): number | null => {
    if (typeof k !== 'string') return null;
    const m = /^corner:(\d+)$/.exec(k.trim());
    if (!m) return null;
    const idx = parseInt(m[1], 10);
    return Number.isFinite(idx) ? idx : null;
  };

  const normalizeSplitLowerCornerConfig = (value: unknown): UnknownRecord =>
    asRecord(sanitizeLowerCornerConfigurationForPatch(value, value), {});

  return {
    App,
    __sk,
    asMeta,
    asRecord,
    isRecord,
    isFn,
    cloneKernelValue,
    setStoreConfigPatch,
    asString,
    readCornerCfgFromStoreConfig,
    readLowerCornerCfgFromCornerCfg,
    emptyRecord,
    emptyCornerLowerConfig,
    clone,
    cloneRecord,
    cloneArray,
    asBucketKey,
    sanitizeCornerRecord,
    normalizeTopModuleRecord,
    normalizeLowerModuleRecord,
    asCornerConfiguration,
    asModuleConfigPatch,
    readStoreConfigSnapshot,
    parseCornerCellIndex,
    normalizeSplitLowerCornerConfig,
  };
}

export function createDefaultLowerCornerConfig(): UnknownRecord {
  return Object.assign({}, createDefaultLowerCornerConfiguration());
}
