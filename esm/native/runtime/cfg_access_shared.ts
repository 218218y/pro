// Shared helper primitives for runtime/cfg_access (Pure ESM)
//
// Keep the public config access contract in cfg_access.ts. This file owns
// normalization, namespace lookup, and typed snapshot/read helpers.

import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ConfigActionsNamespaceLike,
  ConfigScalarKey,
  ConfigScalarValueMap,
  ConfigSnapshotLike,
  CornerConfigurationLike,
  HistoryActionsNamespaceLike,
  MetaActionsNamespaceLike,
  ModulesConfigurationLike,
  KnownMapName,
  MapsByName,
  RootStoreLike,
  UnknownRecord,
} from '../../../types';

import { readMirrorLayoutMap as readCanonicalMirrorLayoutMap } from '../../shared/mirror_layout_contracts_shared.js';
import { assertStore } from './assert.js';

export type RootStateLike = UnknownRecord & { config?: ConfigSnapshotLike };
export type ConfigMapPatchFn<K extends KnownMapName = KnownMapName> = (
  nextDraft: MapsByName[K],
  curVal: MapsByName[K]
) => unknown;
export type ScalarUpdaterFn<K extends ConfigScalarKey = ConfigScalarKey> = (
  prev: ConfigScalarValueMap[K] | undefined,
  cfg?: ConfigSnapshotLike
) => unknown;
export type BatchFn = () => unknown;
type MetaMergeFn = (
  meta?: ActionMetaLike,
  defaults?: ActionMetaLike,
  sourceFallback?: string
) => ActionMetaLike;

type ConfigAccessAppLike = {
  actions?: ActionsNamespaceLike;
  store?: RootStoreLike;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function readActionMeta(value: unknown): ActionMetaLike | null {
  return asRecord(value);
}

function readConfigAccessAppLike(App: unknown): ConfigAccessAppLike | null {
  const app = asRecord(App);
  return app ? app : null;
}

export function readScalarUpdaterFn<K extends ConfigScalarKey = ConfigScalarKey>(
  value: unknown
): ScalarUpdaterFn<K> | null {
  if (typeof value !== 'function') return null;
  return (prev: ConfigScalarValueMap[K] | undefined, cfg?: ConfigSnapshotLike) =>
    Reflect.apply(value, undefined, [prev, cfg]);
}

export function readBatchFn(value: unknown): BatchFn | null {
  if (typeof value !== 'function') return null;
  return () => Reflect.apply(value, undefined, []);
}

export function readBooleanMap(value: unknown): Record<string, boolean> | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const out: Record<string, boolean> = {};
  for (const key of Object.keys(rec)) {
    out[key] = !!rec[key];
  }
  return out;
}

export function readRootState(value: unknown): RootStateLike {
  const rec = asRecord(value);
  return rec ? rec : {};
}

export function readMapRecord(value: unknown): UnknownRecord {
  const rec = asRecord(value);
  return rec ? rec : {};
}

type UnknownConfigMapPatchFn = (nextDraft: UnknownRecord, curVal: UnknownRecord) => unknown;

function readUnknownConfigMapPatchFn(value: unknown): UnknownConfigMapPatchFn | null {
  if (typeof value !== 'function') return null;
  return (nextDraft: UnknownRecord, curVal: UnknownRecord) =>
    Reflect.apply(value, undefined, [nextDraft, curVal]);
}

export function readPatchMapInput(value: unknown): UnknownRecord | UnknownConfigMapPatchFn | null {
  const patchFn = readUnknownConfigMapPatchFn(value);
  if (patchFn) return patchFn;
  const patch = asRecord(value);
  return patch ? patch : null;
}

function readConfigSnapshot(App: unknown): ConfigSnapshotLike {
  const store = getStore(App, 'cfgMapRecord');
  const root = readRootState(store.getState());
  const cfg = asRecord(root.config);
  return cfg || {};
}

export function cfgMapRecord(App: unknown, mapName: string): UnknownRecord {
  if (!mapName) return {};
  const snap = readConfigSnapshot(App);
  return readMapRecord(snap[mapName]);
}

function normalizeMapEntries<T>(
  value: unknown,
  readValue: (entry: unknown) => T | undefined
): Record<string, T> {
  const rec = asRecord(value);
  if (!rec) return {};
  const out: Record<string, T> = {};
  for (const key of Object.keys(rec)) {
    const normalized = readValue(rec[key]);
    if (normalized !== undefined) out[key] = normalized;
  }
  return out;
}

function readStringOrNullMap(value: unknown): Record<string, string | null> {
  return normalizeMapEntries(value, entry => {
    if (entry === null) return null;
    return typeof entry === 'string' ? entry : undefined;
  });
}

export function readHingeMapSnapshot(value: unknown): MapsByName['hingeMap'] {
  return normalizeMapEntries(value, entry => {
    if (entry === null) return null;
    if (typeof entry === 'string') return entry;
    const rec = asRecord(entry);
    return rec ? { ...rec } : undefined;
  });
}

export function readHandlesMapSnapshot(value: unknown): MapsByName['handlesMap'] {
  return readStringOrNullMap(value);
}

export function readCurtainMapSnapshot(value: unknown): MapsByName['curtainMap'] {
  return readStringOrNullMap(value);
}

export function readIndividualColorsMapSnapshot(value: unknown): MapsByName['individualColors'] {
  return readStringOrNullMap(value);
}

export function readDoorSpecialMapSnapshot(value: unknown): MapsByName['doorSpecialMap'] {
  return readStringOrNullMap(value);
}

export function readMirrorLayoutMapSnapshot(value: unknown): MapsByName['mirrorLayoutMap'] {
  return readCanonicalMirrorLayoutMap(value);
}

function getAppLike(App: unknown): ConfigAccessAppLike | null {
  return readConfigAccessAppLike(App);
}

function getActions(App: unknown): ActionsNamespaceLike | null {
  const actions = getAppLike(App)?.actions;
  return actions && typeof actions === 'object' ? actions : null;
}

export function getConfigNamespace(App: unknown): ConfigActionsNamespaceLike | null {
  const config = getActions(App)?.config;
  return config && typeof config === 'object' ? config : null;
}

export function getHistoryNamespace(App: unknown): HistoryActionsNamespaceLike | null {
  const history = getActions(App)?.history;
  return history && typeof history === 'object' ? history : null;
}

export function getMetaNamespace(App: unknown): MetaActionsNamespaceLike | null {
  const meta = getActions(App)?.meta;
  return meta && typeof meta === 'object' ? meta : null;
}

export function asModulesConfiguration(value: unknown): ModulesConfigurationLike {
  return Array.isArray(value) ? [...value] : [];
}

export function asCornerConfiguration(value: unknown): CornerConfigurationLike {
  const rec = asRecord(value);
  return rec ? { ...rec } : {};
}

export function getStore(App: unknown, where: string): RootStoreLike {
  return assertStore(App, where);
}

export function normMeta(App: unknown, meta: unknown, defaults: ActionMetaLike): ActionMetaLike {
  const metaNs = getMetaNamespace(App);
  const merge: MetaMergeFn | null = metaNs && typeof metaNs.merge === 'function' ? metaNs.merge : null;

  if (merge) {
    try {
      const metaInput = readActionMeta(meta) || undefined;
      const out = merge(metaInput, defaults, String(defaults.source || 'config'));
      const mergedMeta = readActionMeta(out);
      return mergedMeta ? { ...mergedMeta } : defaults;
    } catch {
      // Fall through to local defaults.
    }
  }

  const metaRecord = asRecord(meta);
  const merged: ConfigSnapshotLike = metaRecord ? { ...metaRecord } : {};
  for (const key of Object.keys(defaults)) {
    if (typeof merged[key] === 'undefined') merged[key] = defaults[key];
  }
  if (!merged.source) merged.source = defaults.source || 'config';
  const normalized = readActionMeta(merged);
  return normalized ? normalized : defaults;
}
