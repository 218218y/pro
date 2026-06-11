import { getCfg as __getCfgStore } from '../kernel/api.js';
import { setCfgMultiColorMode } from '../runtime/cfg_access.js';
import { metaMerge, metaRestore } from '../runtime/meta_profiles_access.js';
import { writeColorSwatchesOrder, writeSavedColors } from '../runtime/maps_access.js';

import {
  type AppLike,
  cloneUnknownArray,
  getCfgSafe,
  getColorsActions,
  getStorage,
  isRecord,
} from './boot_seeds_part02_shared.js';

function readCfg(App: AppLike) {
  return getCfgSafe(App, __getCfgStore);
}

function cfgMeta(App: AppLike, meta: Record<string, unknown> | null | undefined) {
  const m = isRecord(meta) ? { ...meta } : {};
  if (!m.source) m.source = 'boot:seed';
  try {
    return metaMerge(App, m, undefined, undefined);
  } catch (_) {
    return m;
  }
}

function cfgMetaRestoreProfile(
  App: AppLike,
  meta: Record<string, unknown> | null | undefined,
  source: string
) {
  const m = isRecord(meta) ? { ...meta } : {};
  if (!m.source) m.source = source;
  try {
    return metaRestore(App, m, source);
  } catch (_) {
    return cfgMeta(App, m);
  }
}

function readSavedColorsStorageKey(storage: ReturnType<typeof getStorage>): string {
  return storage && storage.KEYS && storage.KEYS.SAVED_COLORS
    ? String(storage.KEYS.SAVED_COLORS)
    : 'wardrobeSavedColors';
}

function readStorageJsonArray(storage: ReturnType<typeof getStorage>, key: string): unknown[] {
  if (!storage) return [];

  if (typeof storage.getString === 'function') {
    const raw = storage.getString(key);
    if (raw == null) return [];
    const parsed = raw ? JSON.parse(String(raw)) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  if (typeof storage.getJSON === 'function') {
    const parsed = storage.getJSON(key, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  return [];
}

function normalizeStoredColorOrder(value: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const next = String(value[i] || '').trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

function cloneStoredArray(value: unknown[]): unknown[] {
  return cloneUnknownArray(value, value.slice());
}

export function seedMultiColorMode(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  const cfg0 = readCfg(App);
  if (typeof cfg0.isMultiColorMode === 'boolean') return;

  const defMulti = typeof cfg0.isMultiColorMode === 'boolean' ? cfg0.isMultiColorMode : false;
  const meta = cfgMetaRestoreProfile(App, null, 'boot:defaultMultiColor');

  try {
    const colors = getColorsActions(App);
    if (colors && typeof colors.setMultiMode === 'function') {
      colors.setMultiMode(defMulti, meta);
      return;
    }
  } catch (_) {}

  try {
    setCfgMultiColorMode(App, defMulti, meta);
  } catch (_) {}
}

export function seedSavedColors(App: AppLike): void {
  if (!App || typeof App !== 'object') return;

  const cfg0 = readCfg(App);
  const cur = cfg0 && typeof cfg0 === 'object' ? cfg0.savedColors : undefined;
  const curArr = Array.isArray(cur) ? cur : null;
  if (curArr && curArr.length > 0) return;

  let vSavedColors: unknown[] = [];
  try {
    const storage = getStorage(App);
    if (storage) {
      vSavedColors = readStorageJsonArray(storage, readSavedColorsStorageKey(storage));
    }
  } catch (_) {
    vSavedColors = [];
  }

  if (!Array.isArray(vSavedColors) || vSavedColors.length <= 0) {
    if (curArr) return;
    try {
      const cfg2 = readCfg(App);
      vSavedColors = Array.isArray(cfg2.savedColors) ? cfg2.savedColors : [];
    } catch (_) {
      vSavedColors = [];
    }
  }

  try {
    const meta = cfgMetaRestoreProfile(App, { noStorageWrite: true }, 'core:initSavedColorsSeed');
    writeSavedColors(App, cloneStoredArray(vSavedColors), meta);
  } catch (_) {}
}

export function seedColorSwatchesOrder(App: AppLike): void {
  if (!App || typeof App !== 'object') return;

  const cfg0 = readCfg(App);

  let curArr: unknown[] | null = null;
  try {
    const cur = cfg0.colorSwatchesOrder;
    if (Array.isArray(cur)) curArr = cur;
  } catch (_) {}
  if (curArr && curArr.length > 0) return;

  let clean: string[] = [];
  try {
    const storage = getStorage(App);
    if (!storage) return;

    const keyColors = readSavedColorsStorageKey(storage);
    const keyOrder = `${keyColors}:order`;
    clean = normalizeStoredColorOrder(readStorageJsonArray(storage, keyOrder));
  } catch (_) {
    clean = [];
  }

  if (!Array.isArray(clean)) clean = [];

  try {
    const meta = cfgMetaRestoreProfile(App, { noStorageWrite: true }, 'core:initColorSwatchOrderSeed');
    writeColorSwatchesOrder(App, clean, meta);
  } catch (_) {}
}
