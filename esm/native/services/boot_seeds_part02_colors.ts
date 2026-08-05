import { getCfg as __getCfgStore } from '../kernel/api.js';
import { readCloudCollectionsEnvelopeViaServiceOrThrow } from '../runtime/cloud_collections_access.js';
import { setCfgMultiColorMode } from '../runtime/cfg_access.js';
import { writeColorSwatchesOrderOrThrow, writeSavedColorsOrThrow } from '../runtime/maps_access.js';

import {
  type AppLike,
  cloneUnknownArray,
  createBootSeedRestoreMeta,
  getCfgSafe,
  getColorsActions,
  reportBootSeedNonFatal,
} from './boot_seeds_part02_shared.js';

function readCfg(App: AppLike) {
  return getCfgSafe(App, __getCfgStore, 'colors.config.read');
}

function normalizeStoredColorOrder(value: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i += 1) {
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
  const meta = createBootSeedRestoreMeta(App, null, 'boot:defaultMultiColor');

  try {
    const colors = getColorsActions(App);
    if (colors && typeof colors.setMultiMode === 'function') {
      colors.setMultiMode(defMulti, meta);
      return;
    }
  } catch (error) {
    reportBootSeedNonFatal(App, 'colors.setMultiMode.action', error);
  }

  try {
    setCfgMultiColorMode(App, defMulti, meta);
  } catch (error) {
    reportBootSeedNonFatal(App, 'colors.setMultiMode.configWriter', error, true);
  }
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
  } catch (error) {
    reportBootSeedNonFatal(App, 'savedColors.readCloudCollections', error);
    vSavedColors = [];
  }

  if (!Array.isArray(vSavedColors) || vSavedColors.length <= 0) {
    if (curArr) return;
    try {
      const cfg2 = readCfg(App);
      vSavedColors = Array.isArray(cfg2.savedColors) ? cfg2.savedColors : [];
    } catch (error) {
      reportBootSeedNonFatal(App, 'savedColors.readConfigSecondary', error);
      vSavedColors = [];
    }
  }

  try {
    const meta = createBootSeedRestoreMeta(App, { noStorageWrite: true }, 'core:initSavedColorsSeed');
    await writeSavedColorsOrThrow(App, cloneStoredArray(vSavedColors), meta);
  } catch (error) {
    reportBootSeedNonFatal(App, 'savedColors.write', error, true);
  }
}

export async function seedColorSwatchesOrder(App: AppLike): Promise<void> {
  if (!App || typeof App !== 'object') return;

  const cfg0 = readCfg(App);

  let curArr: unknown[] | null = null;
  try {
    const cur = cfg0.colorSwatchesOrder;
    if (Array.isArray(cur)) curArr = cur;
  } catch (error) {
    reportBootSeedNonFatal(App, 'colorOrder.readCurrent', error);
  }
  if (curArr && curArr.length > 0) return;

  let clean: string[] = [];
  try {
    clean = normalizeStoredColorOrder(
      readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'boot color order seed').colorOrder
    );
  } catch (error) {
    reportBootSeedNonFatal(App, 'colorOrder.readCloudCollections', error);
    clean = [];
  }

  if (!Array.isArray(clean)) clean = [];

  try {
    const meta = createBootSeedRestoreMeta(App, { noStorageWrite: true }, 'core:initColorSwatchOrderSeed');
    await writeColorSwatchesOrderOrThrow(App, clean, meta);
  } catch (error) {
    reportBootSeedNonFatal(App, 'colorOrder.write', error, true);
  }
}
