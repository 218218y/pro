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

  let vSavedColors: unknown[] = [];
  try {
    if (Array.isArray(cfg0.savedColors)) {
      vSavedColors = cloneUnknownArray(cfg0.savedColors, cfg0.savedColors.slice());
    } else {
      const cfg2 = readCfg(App);
      vSavedColors = Array.isArray(cfg2.savedColors) ? cfg2.savedColors : [];
    }
  } catch (_) {
    vSavedColors = [];
  }
  if (!Array.isArray(vSavedColors)) vSavedColors = [];

  try {
    const cur = cfg0 && typeof cfg0 === 'object' ? cfg0.savedColors : undefined;
    const missing = !Array.isArray(cur);
    if (!missing) return;

    const meta = cfgMetaRestoreProfile(App, { noStorageWrite: true }, 'core:initSavedColorsSeed');
    const cloned = cloneUnknownArray(vSavedColors, vSavedColors.slice());
    writeSavedColors(App, cloned, meta);
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

    const keyColors =
      storage.KEYS && storage.KEYS.SAVED_COLORS ? String(storage.KEYS.SAVED_COLORS) : 'wardrobeSavedColors';
    const keyOrder = `${keyColors}:order`;

    if (typeof storage.getString === 'function') {
      const s = storage.getString(keyOrder);
      if (s == null) return;
      const parsed = s ? JSON.parse(String(s)) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      const out: string[] = [];
      for (let i = 0; i < arr.length; i++) {
        const v = String(arr[i] || '').trim();
        if (v) out.push(v);
      }
      clean = out;
    } else if (typeof storage.getJSON === 'function') {
      const parsed = storage.getJSON(keyOrder, []);
      const arr = Array.isArray(parsed) ? parsed : [];
      const out: string[] = [];
      for (let i = 0; i < arr.length; i++) {
        const v = String(arr[i] || '').trim();
        if (v) out.push(v);
      }
      clean = out;
    }
  } catch (_) {
    clean = [];
  }

  if (!Array.isArray(clean)) clean = [];

  try {
    const meta = cfgMetaRestoreProfile(App, { noStorageWrite: true }, 'core:initColorSwatchOrderSeed');
    writeColorSwatchesOrder(App, clean, meta);
  } catch (_) {}
}
