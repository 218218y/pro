import { getCfg as __getCfgStore } from '../kernel/api.js';
import { readCloudCollectionsEnvelopeViaServiceOrThrow } from '../runtime/cloud_collections_access.js';
import { setCfgMultiColorMode } from '../runtime/cfg_access.js';
import { metaMerge, metaRestore } from '../runtime/meta_profiles_access.js';
import { writeColorSwatchesOrder, writeSavedColors } from '../runtime/maps_access.js';

import {
  type AppLike,
  cloneUnknownArray,
  getCfgSafe,
  getColorsActions,
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

function normalizeStoredColorOrder(value: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const candidate = value[i];
    const next = typeof candidate === 'string' ? candidate.trim() : '';
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

export async function seedSavedColors(App: AppLike): Promise<void> {
  if (!App || typeof App !== 'object') return;

  const cfg0 = readCfg(App);
  const cur = cfg0 && typeof cfg0 === 'object' ? cfg0.savedColors : undefined;
  const curArr = Array.isArray(cur) ? cur : null;
  if (curArr && curArr.length > 0) return;

  let vSavedColors: unknown[] = [];
  try {
    vSavedColors = readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'boot saved colors seed').savedColors;
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
    await writeSavedColors(App, cloneStoredArray(vSavedColors), meta);
  } catch (_) {}
}

export async function seedColorSwatchesOrder(App: AppLike): Promise<void> {
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
    clean = normalizeStoredColorOrder(
      readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'boot color order seed').colorOrder
    );
  } catch (_) {
    clean = [];
  }

  if (!Array.isArray(clean)) clean = [];

  try {
    const meta = cfgMetaRestoreProfile(App, { noStorageWrite: true }, 'core:initColorSwatchOrderSeed');
    await writeColorSwatchesOrder(App, clean, meta);
  } catch (_) {}
}
